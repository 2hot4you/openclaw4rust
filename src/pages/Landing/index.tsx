import { useEffect, useState } from "react";
import { checkEnvironment, installDependency } from "../../lib/gateway";
import type { EnvStatus } from "../../lib/gateway";
import { listen } from "@tauri-apps/api/event";

interface InstallProgress {
  dep: string;
  stage: string;
  percent: number;
  message: string;
}

type Phase = "checking" | "not-installed" | "installed";

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [phase, setPhase] = useState<Phase>("checking");
  const [version, setVersion] = useState<string | null>(null);
  const [installing, setInstalling] = useState(false);
  const [progress, setProgress] = useState<InstallProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  const detect = async () => {
    setPhase("checking");
    setError(null);
    try {
      const env: EnvStatus = await checkEnvironment();
      if (env.openclaw.installed) {
        setVersion(env.openclaw.version);
        setPhase("installed");
      } else {
        setPhase("not-installed");
      }
    } catch (err) {
      setError(String(err));
      setPhase("not-installed");
    }
  };

  useEffect(() => {
    detect();
    const unlisten = listen<InstallProgress>("install:progress", (e) => {
      setProgress(e.payload);
    });
    return () => { unlisten.then((f) => f()); };
  }, []);

  // fade-in after mount
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 50);
    return () => clearTimeout(t);
  }, []);

  const handleInstall = async () => {
    setInstalling(true);
    setError(null);
    try {
      await installDependency("openclaw");
      setProgress(null);
      await detect();
    } catch (err) {
      setError(String(err));
    } finally {
      setInstalling(false);
      setProgress(null);
    }
  };

  return (
    <div
      className={`h-screen w-screen bg-zinc-950 flex flex-col items-center justify-center transition-opacity duration-700 ${ready ? "opacity-100" : "opacity-0"}`}
    >
      {/* Title */}
      <h1 className="text-4xl font-bold text-white tracking-tight mb-2">
        OpenClaw
      </h1>

      {/* Checking */}
      {phase === "checking" && (
        <div className="mt-8 flex flex-col items-center gap-3 animate-fade-in">
          <div className="w-6 h-6 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
          <span className="text-sm text-zinc-500">正在检测环境...</span>
        </div>
      )}

      {/* Installed */}
      {phase === "installed" && (
        <div className="mt-4 flex flex-col items-center gap-6 animate-fade-in">
          <p className="text-lg text-zinc-400 tracking-wide">
            AI 世界的最后一个界面
          </p>
          {version && (
            <span className="text-xs text-zinc-600">v{version}</span>
          )}
          <button
            onClick={onEnter}
            className="mt-2 px-8 py-2.5 rounded-lg bg-white text-zinc-950 font-medium text-sm hover:bg-zinc-200 active:scale-[0.97] transition-all duration-150"
          >
            进入
          </button>
        </div>
      )}

      {/* Not Installed */}
      {phase === "not-installed" && (
        <div className="mt-6 flex flex-col items-center gap-4 animate-fade-in">
          <p className="text-sm text-zinc-400">未检测到 OpenClaw</p>

          {error && (
            <p className="text-xs text-red-400 max-w-sm text-center">{error}</p>
          )}

          {installing && progress ? (
            <div className="w-64 space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>{progress.message}</span>
                <span>{progress.percent.toFixed(0)}%</span>
              </div>
              <div className="h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-blue-500 rounded-full transition-all duration-300"
                  style={{ width: `${progress.percent}%` }}
                />
              </div>
            </div>
          ) : installing ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-zinc-600 border-t-white rounded-full animate-spin" />
              <span className="text-sm text-zinc-500">正在安装...</span>
            </div>
          ) : (
            <button
              onClick={handleInstall}
              className="px-6 py-2 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 active:scale-[0.97] transition-all duration-150"
            >
              安装 OpenClaw
            </button>
          )}
        </div>
      )}
    </div>
  );
}
