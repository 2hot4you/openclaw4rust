use super::protocol::{self, GatewayFrame, RequestFrame, ResponseFrame};
use futures_util::{SinkExt, StreamExt};
use std::collections::HashMap;
use std::sync::Arc;
use tauri::{AppHandle, Emitter};
use tokio::sync::{mpsc, oneshot, Mutex};
use tokio_tungstenite::{connect_async, tungstenite::Message};

pub struct GatewayClient {
    app: AppHandle,
    url: String,
    token: Option<String>,
    pending: Arc<Mutex<HashMap<String, oneshot::Sender<ResponseFrame>>>>,
    tx: Arc<Mutex<Option<mpsc::Sender<String>>>>,
}

impl GatewayClient {
    pub fn new(app: AppHandle, url: &str, token: Option<String>) -> Self {
        Self {
            app,
            url: url.into(),
            token,
            pending: Arc::new(Mutex::new(HashMap::new())),
            tx: Arc::new(Mutex::new(None)),
        }
    }

    pub async fn connect(&self) -> Result<(), String> {
        let _ = self.app.emit("gateway:connection-state", "connecting");

        let (ws, _) = connect_async(&self.url)
            .await
            .map_err(|e| format!("WebSocket connect failed: {e}"))?;

        let (write, read) = ws.split();
        let (msg_tx, mut msg_rx) = mpsc::channel::<String>(64);

        *self.tx.lock().await = Some(msg_tx.clone());

        // Write loop
        let write = Arc::new(Mutex::new(write));
        let write_handle = write.clone();
        tokio::spawn(async move {
            while let Some(msg) = msg_rx.recv().await {
                let mut w = write_handle.lock().await;
                if w.send(Message::Text(msg.into())).await.is_err() {
                    break;
                }
            }
        });

        // Read loop
        let pending = self.pending.clone();
        let app = self.app.clone();
        let token = self.token.clone();
        let tx_for_connect = msg_tx.clone();

        tokio::spawn(async move {
            let mut read = read;
            while let Some(Ok(msg)) = read.next().await {
                if let Message::Text(text) = msg {
                    let text_str: &str = text.as_ref();
                    let Ok(frame) = serde_json::from_str::<GatewayFrame>(text_str) else {
                        continue;
                    };
                    match frame {
                        GatewayFrame::Response(res) => {
                            // hello-ok after connect
                            if res.id == "connect" {
                                if res.ok {
                                    let _ = app.emit("gateway:connection-state", "connected");
                                    if let Some(ref payload) = res.payload {
                                        let _ = app.emit("gateway:hello-ok", payload);
                                    }
                                } else {
                                    let msg = res.error.as_ref()
                                        .map(|e| e.message.clone())
                                        .unwrap_or_else(|| "Connect rejected".into());
                                    let _ = app.emit("gateway:connection-state", serde_json::json!({
                                        "state": "error", "error": msg
                                    }));
                                }
                                continue;
                            }
                            let mut map = pending.lock().await;
                            if let Some(sender) = map.remove(&res.id) {
                                let _ = sender.send(res);
                            }
                        }
                        GatewayFrame::Event(evt) => {
                            if evt.event == "connect.challenge" {
                                let params = protocol::build_connect_params(
                                    token.as_deref(),
                                    protocol::PROTOCOL_VERSION,
                                );
                                let req = RequestFrame {
                                    frame_type: "req".into(),
                                    id: "connect".into(),
                                    method: "connect".into(),
                                    params: Some(params),
                                };
                                if let Ok(json) = serde_json::to_string(&req) {
                                    let _ = tx_for_connect.send(json).await;
                                }
                                continue;
                            }
                            let _ = app.emit("gateway:event", &evt);
                            match evt.event.as_str() {
                                "chat" => { let _ = app.emit("gateway:chat-event", &evt.payload); }
                                "agent" => { let _ = app.emit("gateway:agent-event", &evt.payload); }
                                "presence" => { let _ = app.emit("gateway:presence", &evt.payload); }
                                "tick" => {}
                                "shutdown" => { let _ = app.emit("gateway:shutdown", &evt.payload); }
                                _ => {}
                            }
                        }
                        GatewayFrame::Request { .. } => {} // server-initiated requests (rare)
                    }
                }
            }
            let _ = app.emit("gateway:connection-state", "disconnected");
        });

        Ok(())
    }

    pub async fn request(
        &self,
        method: &str,
        params: Option<serde_json::Value>,
    ) -> Result<serde_json::Value, String> {
        let req = RequestFrame::new(method, params);
        let id = req.id.clone();

        let (resp_tx, resp_rx) = oneshot::channel::<ResponseFrame>();
        self.pending.lock().await.insert(id, resp_tx);

        let json = serde_json::to_string(&req).map_err(|e| format!("Serialize failed: {e}"))?;
        let tx = self.tx.lock().await;
        let sender = tx.as_ref().ok_or("Not connected")?;
        sender.send(json).await.map_err(|e| format!("Send failed: {e}"))?;

        let resp = tokio::time::timeout(std::time::Duration::from_secs(30), resp_rx)
            .await
            .map_err(|_| "Request timed out".to_string())?
            .map_err(|_| "Response channel closed".to_string())?;

        if resp.ok {
            Ok(resp.payload.unwrap_or(serde_json::Value::Null))
        } else {
            Err(resp.error.map(|e| e.message).unwrap_or_else(|| "Unknown error".into()))
        }
    }

    pub async fn disconnect(&self) {
        *self.tx.lock().await = None;
        let _ = self.app.emit("gateway:connection-state", "disconnected");
    }
}
