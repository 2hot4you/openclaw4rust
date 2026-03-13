import { useEffect, useState } from "react";
import { getModelsList } from "../../lib/gateway";

interface Model {
  id: string;
  provider: string;
  name: string;
  contextWindow?: number;
}

const isNotConnected = (err: string) => /not connected|disconnected/i.test(err);

export default function ProvidersPage() {
  const [models, setModels] = useState<Model[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await getModelsList();
      if (Array.isArray(res)) setModels(res as Model[]);
      else if (res && typeof res === "object" && "models" in (res as Record<string, unknown>))
        setModels((res as { models: Model[] }).models);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">模型与供应商</h1>
        <button
          onClick={refresh}
          disabled={loading}
          className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors disabled:opacity-50"
        >
          {loading ? "加载中..." : "刷新"}
        </button>
      </div>

      {error && (
        isNotConnected(error) ? (
          <div className="text-zinc-500 text-sm">请先连接网关以查看可用模型</div>
        ) : (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md px-3 py-2">{error}</div>
        )
      )}

      <div className="grid gap-2">
        {models.map((m) => (
          <div key={m.id} className="flex items-center gap-3 bg-zinc-800/60 border border-zinc-700 rounded-lg px-4 py-3">
            <div className="flex-1">
              <div className="text-sm text-white font-medium">{m.name || m.id}</div>
              <div className="text-xs text-zinc-500">{m.provider} &middot; {m.id}</div>
            </div>
            {m.contextWindow && (
              <span className="text-xs text-zinc-500">{(m.contextWindow / 1000).toFixed(0)}k 上下文</span>
            )}
          </div>
        ))}
      </div>

      {!loading && models.length === 0 && !error && (
        <div className="text-zinc-500 text-sm">请先连接网关以查看可用模型</div>
      )}
    </div>
  );
}
