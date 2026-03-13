import { useConnectionStore } from "../../lib/store";

export default function StatusBar() {
  const { status, error } = useConnectionStore();

  const color =
    status === "connected" ? "bg-emerald-500" :
    status === "connecting" ? "bg-amber-500 animate-pulse" :
    status === "error" ? "bg-red-500" :
    "bg-zinc-600";

  const label =
    status === "connected" ? "已连接" :
    status === "connecting" ? "连接中..." :
    status === "error" ? `错误: ${error ?? "未知"}` :
    "未连接";

  return (
    <div className="h-7 bg-zinc-900 border-t border-zinc-800 flex items-center px-3 gap-2 text-xs text-zinc-500 shrink-0">
      <span className={`w-2 h-2 rounded-full ${color}`} />
      <span>{label}</span>
    </div>
  );
}
