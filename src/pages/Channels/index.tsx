import { useEffect, useState } from "react";
import { getChannelsStatus } from "../../lib/gateway";

interface ChannelAccount {
  accountId: string;
  name?: string;
  enabled?: boolean;
  configured?: boolean;
  linked?: boolean;
  running?: boolean;
  connected?: boolean;
  lastError?: string;
  dmPolicy?: string;
}

interface ChannelsData {
  channelOrder: string[];
  channelLabels: Record<string, string>;
  channelAccounts: Record<string, ChannelAccount[]>;
}

const isNotConnected = (err: string) => /not connected|disconnected/i.test(err);

export default function ChannelsPage() {
  const [data, setData] = useState<ChannelsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = (await getChannelsStatus(true)) as ChannelsData;
      setData(res);
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
        <h1 className="text-lg font-semibold text-white">通道</h1>
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
          <div className="text-zinc-500 text-sm">请先连接网关以查看通道信息</div>
        ) : (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md px-3 py-2">
            {error}
          </div>
        )
      )}

      {data && (
        <div className="space-y-3">
          {data.channelOrder.map((ch) => {
            const label = data.channelLabels[ch] ?? ch;
            const accounts = data.channelAccounts[ch] ?? [];
            return (
              <div key={ch} className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4">
                <div className="flex items-center gap-2 mb-2">
                  <span className="font-medium text-white">{label}</span>
                  <span className="text-xs text-zinc-500 uppercase">{ch}</span>
                </div>
                {accounts.length === 0 ? (
                  <div className="text-zinc-500 text-sm">暂无已配置的账户</div>
                ) : (
                  <div className="space-y-2">
                    {accounts.map((acc) => (
                      <div key={acc.accountId} className="flex items-center gap-3 text-sm">
                        <span className={`w-2 h-2 rounded-full ${
                          acc.connected ? "bg-emerald-500" :
                          acc.running ? "bg-amber-500" :
                          acc.configured ? "bg-zinc-500" :
                          "bg-red-500"
                        }`} />
                        <span className="text-zinc-300">{acc.name ?? acc.accountId}</span>
                        <span className="text-zinc-600 text-xs">
                          {acc.connected ? "已连接" :
                           acc.running ? "运行中" :
                           acc.configured ? "已停止" :
                           "未配置"}
                        </span>
                        {acc.lastError && (
                          <span className="text-red-400 text-xs truncate max-w-[200px]" title={acc.lastError}>
                            {acc.lastError}
                          </span>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {!data && !loading && !error && (
        <div className="text-zinc-500 text-sm">请先连接网关以查看通道信息</div>
      )}
    </div>
  );
}
