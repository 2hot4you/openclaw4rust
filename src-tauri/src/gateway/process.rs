use serde::{Deserialize, Serialize};
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct GatewayStatus {
    pub running: bool,
    pub pid: Option<u32>,
    pub port: Option<u16>,
    pub uptime: Option<String>,
    pub version: Option<String>,
}

pub fn status() -> GatewayStatus {
    let output = Command::new("openclaw")
        .args(["gateway", "status", "--json"])
        .output();

    match output {
        Ok(o) if o.status.success() => {
            let raw = String::from_utf8_lossy(&o.stdout).trim().to_string();
            if let Ok(val) = serde_json::from_str::<serde_json::Value>(&raw) {
                return GatewayStatus {
                    running: val.get("running").and_then(|v| v.as_bool()).unwrap_or(false),
                    pid: val.get("pid").and_then(|v| v.as_u64()).map(|v| v as u32),
                    port: val.get("port").and_then(|v| v.as_u64()).map(|v| v as u16),
                    uptime: val.get("uptime").and_then(|v| v.as_str()).map(String::from),
                    version: val.get("version").and_then(|v| v.as_str()).map(String::from),
                };
            }
            GatewayStatus { running: false, pid: None, port: None, uptime: None, version: None }
        }
        _ => GatewayStatus { running: false, pid: None, port: None, uptime: None, version: None },
    }
}

pub fn start() -> Result<String, String> { run_cmd(&["gateway", "start"]) }
pub fn stop() -> Result<String, String> { run_cmd(&["gateway", "stop"]) }
pub fn restart() -> Result<String, String> { run_cmd(&["gateway", "restart"]) }
pub fn install_service() -> Result<String, String> { run_cmd(&["gateway", "install"]) }
pub fn uninstall_service() -> Result<String, String> { run_cmd(&["gateway", "uninstall"]) }

fn run_cmd(args: &[&str]) -> Result<String, String> {
    let output = Command::new("openclaw").args(args).output()
        .map_err(|e| format!("Failed to run openclaw: {e}"))?;
    let stdout = String::from_utf8_lossy(&output.stdout).trim().to_string();
    let stderr = String::from_utf8_lossy(&output.stderr).trim().to_string();
    if output.status.success() {
        Ok(if stdout.is_empty() { stderr } else { stdout })
    } else {
        Err(if stderr.is_empty() { stdout } else { stderr })
    }
}
