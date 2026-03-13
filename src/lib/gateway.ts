import { invoke } from "@tauri-apps/api/core";
import type { InvokeArgs } from "@tauri-apps/api/core";

// --- Environment ---

export interface DepStatus {
  installed: boolean;
  version: string | null;
  path: string | null;
}

export interface EnvStatus {
  node: DepStatus;
  npm: DepStatus;
  git: DepStatus;
  openclaw: DepStatus;
  npm_registry: string | null;
}

export const checkEnvironment = () => invoke<EnvStatus>("check_environment");
export const installDependency = (dep: string) => invoke<string>("install_dependency", { dep });
export const uninstallOpenclaw = () => invoke<void>("uninstall_openclaw");
export const configureNpmMirror = () => invoke<void>("configure_npm_mirror");

// --- Gateway Process ---

export interface GatewayStatus {
  running: boolean;
  pid: number | null;
  port: number | null;
  uptime: string | null;
  version: string | null;
}

export const gatewayStatus = () => invoke<GatewayStatus>("gateway_status");
export const gatewayStart = () => invoke<string>("gateway_start");
export const gatewayStop = () => invoke<string>("gateway_stop");
export const gatewayRestart = () => invoke<string>("gateway_restart");
export const gatewayInstallService = () => invoke<string>("gateway_install_service");
export const gatewayUninstallService = () => invoke<string>("gateway_uninstall_service");

// --- Gateway WebSocket ---

export const gatewayConnect = (url: string, token?: string) =>
  invoke<void>("gateway_connect", { url, token });

export const gatewayDisconnect = () => invoke<void>("gateway_disconnect");

export const gatewayRequest = <T = unknown>(method: string, params?: unknown) =>
  invoke<T>("gateway_request", { method, params } as InvokeArgs);

// --- Config ---

export const readConfig = () => invoke<string>("read_config");

// --- Convenience wrappers ---

export const getHealth = () => gatewayRequest("health");
export const getStatus = () => gatewayRequest("status");
export const getPresence = () => gatewayRequest("system-presence");
export const getChannelsStatus = (probe?: boolean) =>
  gatewayRequest("channels-status", probe ? { probe } : {});
export const getModelsList = () => gatewayRequest("models.list");
export const getConfigSchema = () => gatewayRequest("config.schema");
export const getConfig = () => gatewayRequest("config.get");
export const applyConfig = (raw: string, baseHash?: string) =>
  gatewayRequest("config.apply", { raw, baseHash });
export const patchConfig = (raw: string, baseHash?: string) =>
  gatewayRequest("config.patch", { raw, baseHash });

// Chat
export const chatSend = (sessionKey: string, message: string, idempotencyKey: string) =>
  gatewayRequest("chat.send", { sessionKey, message, idempotencyKey });
export const chatHistory = (sessionKey: string) =>
  gatewayRequest("chat.history", { sessionKey });
export const chatAbort = (sessionKey: string, runId?: string) =>
  gatewayRequest("chat.abort", { sessionKey, runId });

// Sessions
export const sessionsList = (params?: Record<string, unknown>) =>
  gatewayRequest("sessions.list", params ?? {});
export const sessionsReset = (key: string) =>
  gatewayRequest("sessions.reset", { key });
export const sessionsDelete = (key: string) =>
  gatewayRequest("sessions.delete", { key });
