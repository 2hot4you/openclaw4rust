import { useEffect, useState } from "react";
import {
  checkEnvironment,
  installDependency,
  configureNpmMirror,
  gatewayStatus,
  gatewayStart,
  gatewayStop,
  gatewayRestart,
  gatewayInstallService,
  gatewayUninstallService,
} from "../../lib/gateway";
import type { EnvStatus, GatewayStatus } from "../../lib/gateway";
import { listen } from "@tauri-apps/api/event";

interface InstallProgress {
  dep: string;
  stage: string;
  percent: number;
  message: string;
}

export default function EnvironmentPage() {
  const [env, setEnv] = useState<EnvStatus | null>(null);
  const [gw, setGw] = useState<GatewayStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [installing, setInstalling] = useState<string | null>(null);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [log, setLog] = useState<string[]>([]);

  const refresh = async () => {
    setLoading(true);
    try {
      const [e, g] = await Promise.all([checkEnvironment(), gatewayStatus()]);
      setEnv(e);
      setGw(g);
    } catch (err) {
      addLog(`错误: ${err}`);
    } finally {
      setLoading(false);
    }
  };

  const addLog = (msg: string) => setLog((l) => [...l.slice(-50), `[${new Date().toLocaleTimeString()}] ${msg}`]);

  useEffect(() => {
    refresh();
    const unlisten = listen<InstallProgress>("install:progress", (e) => {
      setProgress(e.payload);
      addLog(`${e.payload.dep}: ${e.payload.message}`);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  const handleInstall = async (dep: string) => {
    setInstalling(dep);
    addLog(`正在安装 ${dep}...`);
    try {
      const result = await installDependency(dep);
      addLog(`${dep} 安装完成: ${result}`);
    } catch (err) {
      addLog(`${dep} 安装失败: ${err}`);
    } finally {
      setInstalling(null);
      setProgress(null);
      refresh();
    }
  };

  const handleGwAction = async (action: string) => {
    const actionLabels: Record<string, string> = {
      start: "启动", stop: "停止", restart: "重启",
      install: "注册服务", uninstall: "卸载服务",
    };
    const label = actionLabels[action] ?? action;
    addLog(`网关${label}中...`);
    try {
      const fn = { start: gatewayStart, stop: gatewayStop, restart: gatewayRestart, install: gatewayInstallService, uninstall: gatewayUninstallService }[action];
      const result = await fn!();
      addLog(`网关${label}: ${result}`);
    } catch (err) {
      addLog(`网关${label}失败: ${err}`);
    }
    refresh();
  };

  const deps = env ? [
    { key: "node", label: "Node.js", ...env.node, required: "≥ 22" },
    { key: "npm", label: "npm", ...env.npm },
    { key: "git", label: "Git", ...env.git },
    { key: "openclaw", label: "OpenClaw", ...env.openclaw },
  ] : [];

  return (
    <div className="p-6 space-y-4 flex flex-col h-full">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-white">环境</h1>
        <button onClick={refresh} disabled={loading} className="px-3 py-1.5 text-xs rounded bg-zinc-800 text-zinc-300 hover:bg-zinc-700 disabled:opacity-50">
          {loading ? "检测中..." : "刷新"}
        </button>
      </div>

      {/* Dependencies */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-white">依赖项</h2>
        {deps.map((d) => (
          <div key={d.key} className="flex items-center gap-3">
            <span className={`w-2 h-2 rounded-full ${d.installed ? "bg-emerald-500" : "bg-red-500"}`} />
            <span className="text-sm text-zinc-300 w-20">{d.label}</span>
            <span className="text-xs text-zinc-500 flex-1">
              {d.installed ? d.version : "未安装"}
              {"required" in d && d.required ? ` (${d.required})` : ""}
            </span>
            {!d.installed && d.key !== "npm" && (
              <button
                onClick={() => handleInstall(d.key)}
                disabled={installing !== null}
                className="px-2 py-1 text-xs rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
              >
                {installing === d.key ? "安装中..." : "安装"}
              </button>
            )}
          </div>
        ))}
        {env && (
          <div className="flex items-center gap-3 pt-2 border-t border-zinc-700">
            <span className={`w-2 h-2 rounded-full ${env.npm_registry?.includes("npmmirror") ? "bg-emerald-500" : "bg-amber-500"}`} />
            <span className="text-sm text-zinc-300 w-20">镜像源</span>
            <span className="text-xs text-zinc-500 flex-1 truncate">{env.npm_registry ?? "未知"}</span>
            {!env.npm_registry?.includes("npmmirror") && env.npm.installed && (
              <button onClick={() => { configureNpmMirror().then(refresh); }} className="px-2 py-1 text-xs rounded bg-amber-600 text-white hover:bg-amber-700">
                设置镜像
              </button>
            )}
          </div>
        )}
      </div>

      {/* Progress */}
      {progress && (
        <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm mb-1">
            <span className="text-zinc-300">{progress.message}</span>
            <span className="text-zinc-500">{progress.percent.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 bg-zinc-700 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full transition-all" style={{ width: `${progress.percent}%` }} />
          </div>
        </div>
      )}

      {/* Gateway */}
      <div className="bg-zinc-800/60 border border-zinc-700 rounded-lg p-4 space-y-3">
        <h2 className="text-sm font-medium text-white">网关服务</h2>
        <div className="flex items-center gap-3">
          <span className={`w-2 h-2 rounded-full ${gw?.running ? "bg-emerald-500" : "bg-zinc-600"}`} />
          <span className="text-sm text-zinc-300">
            {gw?.running ? `运行中 (PID ${gw.pid}, 端口 ${gw.port})` : "已停止"}
          </span>
          {gw?.version && <span className="text-xs text-zinc-500">{gw.version}</span>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {[
            { label: "启动", action: "start", show: !gw?.running },
            { label: "停止", action: "stop", show: !!gw?.running },
            { label: "重启", action: "restart", show: !!gw?.running },
            { label: "注册服务", action: "install", show: true },
            { label: "卸载服务", action: "uninstall", show: true },
          ]
            .filter((b) => b.show)
            .map((b) => (
              <button key={b.action} onClick={() => handleGwAction(b.action)} className="px-2 py-1 text-xs rounded bg-zinc-700 text-zinc-300 hover:bg-zinc-600">
                {b.label}
              </button>
            ))}
        </div>
      </div>

      {/* Log */}
      <div className="flex-1 min-h-0 bg-zinc-900 border border-zinc-700 rounded-lg p-3 overflow-y-auto">
        <div className="font-mono text-xs text-zinc-500 space-y-0.5">
          {log.map((l, i) => <div key={i}>{l}</div>)}
          {log.length === 0 && <div className="text-zinc-600">暂无活动记录</div>}
        </div>
      </div>
    </div>
  );
}
