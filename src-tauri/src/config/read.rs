use std::path::PathBuf;

pub fn config_path() -> PathBuf {
    if let Ok(p) = std::env::var("OPENCLAW_CONFIG_PATH") {
        PathBuf::from(p)
    } else {
        dirs_next_home().join(".openclaw").join("openclaw.json")
    }
}

pub fn read_config() -> Result<String, String> {
    let path = config_path();
    std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read {}: {e}", path.display()))
}

fn dirs_next_home() -> PathBuf {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .map(PathBuf::from)
        .unwrap_or_else(|_| PathBuf::from("."))
}
