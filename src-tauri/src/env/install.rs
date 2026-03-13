use super::mirrors;
use serde::Deserialize;
use std::path::PathBuf;
use std::process::Command;
use tauri::{AppHandle, Emitter};

#[derive(Debug, Clone, serde::Serialize)]
pub struct InstallProgress {
    pub dep: String,
    pub stage: String,
    pub percent: f64,
    pub message: String,
}

#[derive(Debug, Deserialize)]
struct NodeVersion {
    version: String,
    lts: serde_json::Value,
}

fn emit_progress(app: &AppHandle, dep: &str, stage: &str, percent: f64, message: &str) {
    let _ = app.emit(
        "install:progress",
        InstallProgress { dep: dep.into(), stage: stage.into(), percent, message: message.into() },
    );
}

async fn discover_latest_node_lts() -> Result<String, String> {
    let url = format!("{}index.json", mirrors::NODE_DIST);
    let versions: Vec<NodeVersion> = reqwest::get(&url)
        .await.map_err(|e| format!("Fetch failed: {e}"))?
        .json().await.map_err(|e| format!("Parse failed: {e}"))?;

    versions.iter()
        .find(|v| {
            v.lts.is_string()
                && v.version.trim_start_matches('v')
                    .split('.').next()
                    .and_then(|m| m.parse::<u32>().ok())
                    .map_or(false, |major| major >= 22)
        })
        .map(|v| v.version.clone())
        .ok_or_else(|| "No Node.js LTS >= 22 found".into())
}

async fn download_file(url: &str, dest: &PathBuf) -> Result<(), String> {
    let resp = reqwest::get(url).await.map_err(|e| format!("Download failed: {e}"))?;
    if !resp.status().is_success() {
        return Err(format!("HTTP {}: {url}", resp.status()));
    }
    let bytes = resp.bytes().await.map_err(|e| format!("Read failed: {e}"))?;
    std::fs::write(dest, &bytes).map_err(|e| format!("Write failed: {e}"))?;
    Ok(())
}

pub async fn install_node(app: &AppHandle) -> Result<String, String> {
    emit_progress(app, "node", "discover", 0.0, "Fetching latest Node.js LTS...");
    let version = discover_latest_node_lts().await?;

    let filename = if cfg!(target_os = "windows") {
        format!("node-{}-x64.msi", version)
    } else if cfg!(target_os = "macos") {
        format!("node-{}-darwin-arm64.tar.gz", version)
    } else {
        format!("node-{}-linux-x64.tar.xz", version)
    };

    let url = format!("{}{}/{}", mirrors::NODE_DIST, version, filename);
    let temp = std::env::temp_dir().join(&filename);

    emit_progress(app, "node", "download", 20.0, &format!("Downloading {filename}..."));
    download_file(&url, &temp).await?;

    emit_progress(app, "node", "install", 60.0, "Installing Node.js...");
    #[cfg(target_os = "windows")]
    {
        let status = Command::new("msiexec")
            .args(["/i", temp.to_str().unwrap(), "/qn"])
            .status().map_err(|e| format!("Install failed: {e}"))?;
        if !status.success() { return Err("Node.js MSI install failed".into()); }
    }
    #[cfg(not(target_os = "windows"))]
    { return Err("Non-Windows: use system package manager".into()); }

    emit_progress(app, "node", "configure", 80.0, "Configuring npm mirror...");
    configure_npm_mirror()?;
    emit_progress(app, "node", "done", 100.0, &format!("Node.js {version} installed"));
    Ok(version)
}

pub async fn install_git(app: &AppHandle) -> Result<String, String> {
    #[cfg(not(target_os = "windows"))]
    { return Err("Git auto-install only on Windows".into()); }

    #[cfg(target_os = "windows")]
    {
        emit_progress(app, "git", "download", 0.0, "Downloading Git for Windows...");
        let tag = "v2.47.1.windows.1";
        let filename = "Git-2.47.1-64-bit.exe";
        let url = format!("{}{}/{}", mirrors::GIT_BINARY, tag, filename);
        let temp = std::env::temp_dir().join(filename);
        download_file(&url, &temp).await?;

        emit_progress(app, "git", "install", 60.0, "Installing Git...");
        let status = Command::new(temp.to_str().unwrap())
            .args(["/VERYSILENT", "/NORESTART", "/SP-"])
            .status().map_err(|e| format!("Install failed: {e}"))?;
        if !status.success() { return Err("Git install failed".into()); }

        emit_progress(app, "git", "done", 100.0, "Git installed");
        Ok("2.47.1".into())
    }
}

pub async fn install_openclaw(app: &AppHandle) -> Result<String, String> {
    emit_progress(app, "openclaw", "install", 0.0, "Installing openclaw via npm...");
    let output = Command::new("npm")
        .args(["install", "-g", "openclaw@latest"])
        .output().map_err(|e| format!("npm install failed: {e}"))?;

    if !output.status.success() {
        let err = String::from_utf8_lossy(&output.stderr).to_string();
        return Err(err);
    }

    let ver = Command::new("openclaw").args(["--version"]).output()
        .ok().and_then(|o| String::from_utf8(o.stdout).ok())
        .map(|s| s.trim().to_string()).unwrap_or_default();
    emit_progress(app, "openclaw", "done", 100.0, &format!("openclaw {ver} installed"));
    Ok(ver)
}

pub async fn uninstall_openclaw() -> Result<(), String> {
    let status = Command::new("npm")
        .args(["uninstall", "-g", "openclaw"])
        .status().map_err(|e| format!("Uninstall failed: {e}"))?;
    if !status.success() { return Err("Uninstall failed".into()); }
    Ok(())
}

pub fn configure_npm_mirror() -> Result<(), String> {
    Command::new("npm")
        .args(["config", "set", "registry", mirrors::NPM_REGISTRY])
        .status().map_err(|e| format!("npm config failed: {e}"))?;
    Ok(())
}
