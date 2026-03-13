import { create } from "zustand";
import { listen } from "@tauri-apps/api/event";
import type { EnvStatus, GatewayStatus } from "./gateway";

// --- Connection Store ---

interface ConnectionState {
  status: "disconnected" | "connecting" | "connected" | "error";
  error: string | null;
  snapshot: Record<string, unknown> | null;
}

interface ConnectionStore extends ConnectionState {
  setStatus: (s: ConnectionState["status"], error?: string) => void;
  setSnapshot: (s: Record<string, unknown>) => void;
}

export const useConnectionStore = create<ConnectionStore>((set) => ({
  status: "disconnected",
  error: null,
  snapshot: null,
  setStatus: (status, error) => set({ status, error: error ?? null }),
  setSnapshot: (snapshot) => set({ snapshot }),
}));

// --- Environment Store ---

interface EnvStore {
  env: EnvStatus | null;
  loading: boolean;
  setEnv: (e: EnvStatus) => void;
  setLoading: (l: boolean) => void;
}

export const useEnvStore = create<EnvStore>((set) => ({
  env: null,
  loading: false,
  setEnv: (env) => set({ env, loading: false }),
  setLoading: (loading) => set({ loading }),
}));

// --- Gateway Process Store ---

interface GwProcessStore {
  status: GatewayStatus | null;
  setStatus: (s: GatewayStatus) => void;
}

export const useGwProcessStore = create<GwProcessStore>((set) => ({
  status: null,
  setStatus: (status) => set({ status }),
}));

// --- Chat Store ---

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: number;
  state?: "sending" | "streaming" | "done" | "error" | "aborted";
  runId?: string;
}

interface ChatStore {
  sessionKey: string;
  messages: ChatMessage[];
  streaming: boolean;
  currentRunId: string | null;
  addMessage: (m: ChatMessage) => void;
  updateMessage: (id: string, patch: Partial<ChatMessage>) => void;
  appendContent: (runId: string, delta: string) => void;
  setMessages: (msgs: ChatMessage[]) => void;
  setStreaming: (s: boolean) => void;
  setCurrentRunId: (id: string | null) => void;
  setSessionKey: (key: string) => void;
  clear: () => void;
}

export const useChatStore = create<ChatStore>((set, _get) => ({
  sessionKey: "main::default",
  messages: [],
  streaming: false,
  currentRunId: null,
  addMessage: (m) => set((s) => ({ messages: [...s.messages, m] })),
  updateMessage: (id, patch) =>
    set((s) => ({
      messages: s.messages.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),
  appendContent: (runId, delta) =>
    set((s) => ({
      messages: s.messages.map((m) =>
        m.runId === runId ? { ...m, content: m.content + delta } : m,
      ),
    })),
  setMessages: (messages) => set({ messages }),
  setStreaming: (streaming) => set({ streaming }),
  setCurrentRunId: (currentRunId) => set({ currentRunId }),
  setSessionKey: (sessionKey) => set({ sessionKey }),
  clear: () => set({ messages: [], streaming: false, currentRunId: null }),
}));

// --- Event listeners setup ---

export async function setupEventListeners() {
  await listen<string>("gateway:connection-state", (e) => {
    if (typeof e.payload === "string") {
      useConnectionStore.getState().setStatus(e.payload as ConnectionState["status"]);
    } else if (typeof e.payload === "object" && e.payload !== null) {
      const obj = e.payload as Record<string, string>;
      useConnectionStore.getState().setStatus(
        (obj.state ?? "error") as ConnectionState["status"],
        obj.error,
      );
    }
  });

  await listen("gateway:hello-ok", (e) => {
    useConnectionStore.getState().setSnapshot(e.payload as Record<string, unknown>);
    useConnectionStore.getState().setStatus("connected");
  });

  await listen("gateway:chat-event", (e) => {
    const payload = e.payload as Record<string, unknown> | null;
    if (!payload) return;
    const store = useChatStore.getState();
    const state = payload.state as string;
    const runId = payload.runId as string;

    if (state === "delta") {
      if (!store.streaming) {
        store.setStreaming(true);
        store.setCurrentRunId(runId);
        store.addMessage({
          id: `assistant-${runId}`,
          role: "assistant",
          content: "",
          timestamp: Date.now(),
          state: "streaming",
          runId,
        });
      }
      const msg = payload.message;
      if (typeof msg === "string") {
        store.appendContent(runId, msg);
      }
    } else if (state === "final") {
      const msg = payload.message;
      store.updateMessage(`assistant-${runId}`, {
        content: typeof msg === "string" ? msg : store.messages.find(m => m.runId === runId)?.content ?? "",
        state: "done",
      });
      store.setStreaming(false);
      store.setCurrentRunId(null);
    } else if (state === "aborted") {
      store.updateMessage(`assistant-${runId}`, { state: "aborted" });
      store.setStreaming(false);
      store.setCurrentRunId(null);
    } else if (state === "error") {
      store.updateMessage(`assistant-${runId}`, {
        state: "error",
        content: (payload.errorMessage as string) ?? "Unknown error",
      });
      store.setStreaming(false);
      store.setCurrentRunId(null);
    }
  });
}
