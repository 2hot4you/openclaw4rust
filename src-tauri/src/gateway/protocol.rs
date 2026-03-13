use serde::{Deserialize, Serialize};

// --- Frame types ---

#[derive(Debug, Clone, Serialize)]
pub struct RequestFrame {
    #[serde(rename = "type")]
    pub frame_type: String,
    pub id: String,
    pub method: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub params: Option<serde_json::Value>,
}

static REQ_COUNTER: std::sync::atomic::AtomicU64 = std::sync::atomic::AtomicU64::new(1);

impl RequestFrame {
    pub fn new(method: impl Into<String>, params: Option<serde_json::Value>) -> Self {
        let seq = REQ_COUNTER.fetch_add(1, std::sync::atomic::Ordering::Relaxed);
        Self {
            frame_type: "req".into(),
            id: format!("r{seq}"),
            method: method.into(),
            params,
        }
    }
}

#[derive(Debug, Clone, Deserialize)]
pub struct ResponseFrame {
    pub id: String,
    pub ok: bool,
    pub payload: Option<serde_json::Value>,
    pub error: Option<ErrorShape>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct EventFrame {
    pub event: String,
    pub payload: Option<serde_json::Value>,
    pub seq: Option<i64>,
    #[serde(rename = "stateVersion")]
    pub state_version: Option<StateVersion>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ErrorShape {
    pub code: String,
    pub message: String,
    pub details: Option<serde_json::Value>,
    pub retryable: Option<bool>,
    #[serde(rename = "retryAfterMs")]
    pub retry_after_ms: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StateVersion {
    pub presence: i64,
    pub health: i64,
}

// --- Inbound frame (tagged union) ---

#[derive(Debug, Clone, Deserialize)]
#[serde(tag = "type")]
pub enum GatewayFrame {
    #[serde(rename = "res")]
    Response(ResponseFrame),
    #[serde(rename = "event")]
    Event(EventFrame),
    #[serde(rename = "req")]
    Request {
        id: String,
        method: String,
        params: Option<serde_json::Value>,
    },
}

// --- Connect params builder ---

pub fn build_connect_params(token: Option<&str>, protocol_version: i32) -> serde_json::Value {
    let mut params = serde_json::json!({
        "minProtocol": protocol_version,
        "maxProtocol": protocol_version,
        "client": {
            "id": "gateway-client",
            "version": env!("CARGO_PKG_VERSION"),
            "platform": std::env::consts::OS,
            "mode": "ui"
        },
        "role": "operator",
        "scopes": [
            "operator.read",
            "operator.write",
            "operator.admin",
            "operator.approvals"
        ]
    });

    if let Some(t) = token {
        params["auth"] = serde_json::json!({ "token": t });
    }

    params
}

pub const PROTOCOL_VERSION: i32 = 3;
