import { NavLink } from "react-router-dom";

const navItems = [
  { to: "/", label: "对话", icon: "M" },
  { to: "/channels", label: "通道", icon: "C" },
  { to: "/providers", label: "模型", icon: "P" },
  { to: "/settings", label: "设置", icon: "S" },
  { to: "/monitor", label: "监控", icon: "D" },
  { to: "/environment", label: "环境", icon: "E" },
];

export default function Sidebar() {
  return (
    <aside className="w-56 h-screen bg-zinc-900 text-zinc-300 flex flex-col border-r border-zinc-800 shrink-0">
      <div className="px-4 py-4 text-lg font-semibold text-white tracking-tight">
        OpenClaw
      </div>
      <nav className="flex-1 flex flex-col gap-0.5 px-2">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
                isActive
                  ? "bg-zinc-800 text-white font-medium"
                  : "hover:bg-zinc-800/60 hover:text-white"
              }`
            }
          >
            <span className="w-5 h-5 rounded bg-zinc-700 text-[10px] font-bold flex items-center justify-center text-zinc-400">
              {item.icon}
            </span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="px-4 py-3 text-xs text-zinc-600 border-t border-zinc-800">
        v0.1.0
      </div>
    </aside>
  );
}
