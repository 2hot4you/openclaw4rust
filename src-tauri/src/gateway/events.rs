// Event type re-exports for frontend consumption.
// All gateway events are forwarded via tauri::Emitter in client.rs.
// This module provides type-safe wrappers if needed in Rust-side handlers.

use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
pub struct ConnectionState {
    pub state: String, // "connecting" | "connected" | "disconnected" | "reconnecting"
    pub error: Option<String>,
}
