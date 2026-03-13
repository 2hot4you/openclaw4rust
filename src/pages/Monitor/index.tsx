import { useEffect, useState } from "react";
import { getHealth, getPresence } from "../../lib/gateway";

const isNotConnected = (err: string) => /not connected|disconnected/i.test(err);

export default function MonitorPage() {
  const [health, setHealth] = useState<Record<string, unknown> | null>(null);
  const [presence, setPresence] = useState<Record<string, unknown>[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setError(null);
    try {
      const [h, p] = await Promise.all([getHealth(), getPresence()]);
      setHealth(h as Record<string, unknown>);
      setPresence(Array.isArray(p) ? p as Record<string, unknown>[] : []);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">监控</h1>
        <button onClick={refresh} className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors">
          刷新
        </button>
      </div>

      {error && (
        isNotConnected(error) ? (
          <div className="text-zinc-500 text-sm">请先连接网关以查看系统状态</div>
        ) : (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md px-3 py-2">{error}</div>
        )
      )}

      {health && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4">
          <h2 className="text-sm font-medium text-white mb-2">健康状态</h2>
          <pre className="text-xs text-zinc-400 overflow-auto max-h-60">{JSON.stringify(health, null, 2)}</pre>
        </div>
      )}

      {presence && presence.length > 0 && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4">
          <h2 className="text-sm font-medium text-white mb-2">在线客户端</h2>
          <div className="space-y-1">
            {presence.map((p, i) => (
              <div key={i} className="flex items-center gap-2 text-sm">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-zinc-300">{String(p.clientId ?? p.id ?? `客户端 ${i}`)}</span>
                <span className="text-zinc-600 text-xs">{String(p.role ?? "")}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!health && !error && (
        <div className="text-zinc-500 text-sm">请先连接网关以查看系统状态</div>
      )}
    </div>
  );
}
