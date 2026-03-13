use serde::Serialize;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct DepStatus {
    pub installed: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

#[derive(Debug, Clone, Serialize)]
pub struct EnvStatus {
    pub node: DepStatus,
    pub npm: DepStatus,
    pub git: DepStatus,
    pub openclaw: DepStatus,
    pub npm_registry: Option<String>,
}

pub fn check_environment() -> EnvStatus {
    EnvStatus {
        node: detect_command("node", "-v"),
        npm: detect_command("npm", "-v"),
        git: detect_command("git", "--version"),
        openclaw: detect_command("openclaw", "--version"),
        npm_registry: detect_npm_registry(),
    }
}

fn detect_command(cmd: &str, flag: &str) -> DepStatus {
    let path = which(cmd);
    let version = Command::new(cmd)
        .arg(flag)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string());

    DepStatus {
        installed: version.is_some(),
        version,
        path,
    }
}

fn which(cmd: &str) -> Option<String> {
    let bin = if cfg!(target_os = "windows") { "where" } else { "which" };
    Command::new(bin)
        .arg(cmd)
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.lines().next().unwrap_or("").trim().to_string())
        .filter(|s| !s.is_empty())
}

fn detect_npm_registry() -> Option<String> {
    Command::new("npm")
        .args(["config", "get", "registry"])
        .output()
        .ok()
        .filter(|o| o.status.success())
        .and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string())
        .filter(|s| !s.is_empty())
}
