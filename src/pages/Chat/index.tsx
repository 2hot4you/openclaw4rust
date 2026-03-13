import { useState, useRef, useEffect } from "react";
import { useChatStore } from "../../lib/store";
import { chatSend, chatAbort } from "../../lib/gateway";

export default function ChatPage() {
  const { messages, streaming, currentRunId, sessionKey } = useChatStore();
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || streaming) return;
    setInput("");

    const id = `user-${Date.now()}`;
    useChatStore.getState().addMessage({
      id,
      role: "user",
      content: text,
      timestamp: Date.now(),
      state: "sending",
    });

    try {
      await chatSend(sessionKey, text, crypto.randomUUID());
      useChatStore.getState().updateMessage(id, { state: "done" });
    } catch (err) {
      useChatStore.getState().updateMessage(id, {
        state: "error",
        content: text + `\n\n[发送失败: ${err}]`,
      });
    }
  };

  const handleAbort = async () => {
    if (currentRunId) {
      try { await chatAbort(sessionKey, currentRunId); } catch {}
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {messages.length === 0 && (
          <div className="text-zinc-500 text-sm text-center mt-20">
            发送消息开始对话
          </div>
        )}
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`max-w-[80%] px-3 py-2 rounded-lg text-sm whitespace-pre-wrap ${
              msg.role === "user"
                ? "ml-auto bg-blue-600 text-white"
                : "mr-auto bg-zinc-800 text-zinc-200"
            } ${msg.state === "streaming" ? "border border-blue-500/30" : ""}`}
          >
            {msg.content}
            {msg.state === "streaming" && (
              <span className="inline-block w-1.5 h-4 bg-blue-400 ml-0.5 animate-pulse rounded-sm" />
            )}
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="border-t border-zinc-800 p-3 flex gap-2">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="输入消息..."
          rows={1}
          className="flex-1 bg-zinc-800 text-zinc-200 rounded-md px-3 py-2 text-sm resize-none outline-none focus:ring-1 focus:ring-blue-500 placeholder:text-zinc-500"
        />
        {streaming ? (
          <button
            onClick={handleAbort}
            className="px-4 py-2 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 transition-colors"
          >
            停止
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="px-4 py-2 rounded-md bg-blue-600 text-white text-sm hover:bg-blue-700 transition-colors disabled:opacity-40"
          >
            发送
          </button>
        )}
      </div>
    </div>
  );
}
