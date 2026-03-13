mod config;
mod env;
mod gateway;

use gateway::client::GatewayClient;
use std::sync::Arc;
use tokio::sync::Mutex;

struct AppState {
    gateway: Arc<Mutex<Option<GatewayClient>>>,
}

// --- Environment commands ---

#[tauri::command]
fn check_environment() -> env::detect::EnvStatus {
    env::detect::check_environment()
}

#[tauri::command]
async fn install_dependency(app: tauri::AppHandle, dep: String) -> Result<String, String> {
    match dep.as_str() {
        "node" => env::install::install_node(&app).await,
        "git" => env::install::install_git(&app).await,
        "openclaw" => env::install::install_openclaw(&app).await,
        _ => Err(format!("Unknown dependency: {dep}")),
    }
}

#[tauri::command]
async fn uninstall_openclaw() -> Result<(), String> {
    env::install::uninstall_openclaw().await
}

#[tauri::command]
fn configure_npm_mirror() -> Result<(), String> {
    env::install::configure_npm_mirror()
}

// --- Gateway process commands ---

#[tauri::command]
fn gateway_status() -> gateway::process::GatewayStatus {
    gateway::process::status()
}

#[tauri::command]
fn gateway_start() -> Result<String, String> {
    gateway::process::start()
}

#[tauri::command]
fn gateway_stop() -> Result<String, String> {
    gateway::process::stop()
}

#[tauri::command]
fn gateway_restart() -> Result<String, String> {
    gateway::process::restart()
}

#[tauri::command]
fn gateway_install_service() -> Result<String, String> {
    gateway::process::install_service()
}

#[tauri::command]
fn gateway_uninstall_service() -> Result<String, String> {
    gateway::process::uninstall_service()
}

// --- Gateway WebSocket commands ---

#[tauri::command]
async fn gateway_connect(
    app: tauri::AppHandle,
    state: tauri::State<'_, AppState>,
    url: String,
    token: Option<String>,
) -> Result<(), String> {
    let client = GatewayClient::new(app, &url, token);
    client.connect().await?;
    *state.gateway.lock().await = Some(client);
    Ok(())
}

#[tauri::command]
async fn gateway_disconnect(state: tauri::State<'_, AppState>) -> Result<(), String> {
    let mut g = state.gateway.lock().await;
    if let Some(client) = g.take() {
        client.disconnect().await;
    }
    Ok(())
}

#[tauri::command]
async fn gateway_request(
    state: tauri::State<'_, AppState>,
    method: String,
    params: Option<serde_json::Value>,
) -> Result<serde_json::Value, String> {
    let g = state.gateway.lock().await;
    let client = g.as_ref().ok_or("Gateway not connected")?;
    client.request(&method, params).await
}

// --- Config commands ---

#[tauri::command]
fn read_config() -> Result<String, String> {
    config::read::read_config()
}

// --- Tauri entry ---

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .manage(AppState {
            gateway: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            check_environment,
            install_dependency,
            uninstall_openclaw,
            configure_npm_mirror,
            gateway_status,
            gateway_start,
            gateway_stop,
            gateway_restart,
            gateway_install_service,
            gateway_uninstall_service,
            gateway_connect,
            gateway_disconnect,
            gateway_request,
            read_config,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
