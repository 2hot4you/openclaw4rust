import { useEffect, useRef, useState } from "react";
import { getConfig, applyConfig } from "../../lib/gateway";

const isNotConnected = (err: string) => /not connected|disconnected/i.test(err);

export default function SettingsPage() {
  const [config, setConfig] = useState("");
  const [baseHash, setBaseHash] = useState<string | undefined>();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  const loadConfig = async () => {
    setError(null);
    try {
      const res = (await getConfig()) as { raw: string; hash: string };
      setConfig(res.raw ?? JSON.stringify(res, null, 2));
      setBaseHash(res.hash);
    } catch (err) {
      setError(String(err));
    }
  };

  useEffect(() => {
    loadConfig();
    return () => clearTimeout(timerRef.current);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    setSuccess(false);
    try {
      await applyConfig(config, baseHash);
      setSuccess(true);
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => setSuccess(false), 2000);
      await loadConfig();
    } catch (err) {
      setError(String(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">系统设置</h1>
        <div className="flex gap-2">
          <button
            onClick={loadConfig}
            className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 transition-colors"
          >
            重新加载
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-3 py-1.5 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {saving ? "保存中..." : "保存并应用"}
          </button>
        </div>
      </div>

      {error && (
        isNotConnected(error) ? (
          <div className="text-zinc-500 text-sm">请先连接网关以加载配置</div>
        ) : (
          <div className="text-red-400 text-sm bg-red-900/20 border border-red-800 rounded-md px-3 py-2">{error}</div>
        )
      )}
      {success && (
        <div className="text-emerald-400 text-sm bg-emerald-900/20 border border-emerald-800 rounded-md px-3 py-2">
          配置已保存并应用
        </div>
      )}

      <textarea
        value={config}
        onChange={(e) => setConfig(e.target.value)}
        spellCheck={false}
        className="flex-1 bg-zinc-900 text-zinc-300 font-mono text-xs p-4 rounded-lg border border-zinc-700 outline-none focus:ring-1 focus:ring-blue-500 resize-none"
      />

      <div className="text-xs text-zinc-600">
        编辑 openclaw.json（JSON5 格式），修改后支持热重载
      </div>
    </div>
  );
}
