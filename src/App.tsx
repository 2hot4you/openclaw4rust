import { useState, useEffect } from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Sidebar from "./components/layout/Sidebar";
import StatusBar from "./components/layout/StatusBar";
import ChatPage from "./pages/Chat";
import ChannelsPage from "./pages/Channels";
import ProvidersPage from "./pages/Providers";
import SettingsPage from "./pages/Settings";
import MonitorPage from "./pages/Monitor";
import EnvironmentPage from "./pages/Environment";
import LandingPage from "./pages/Landing";
import { setupEventListeners } from "./lib/store";

export default function App() {
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    setupEventListeners();
  }, []);

  if (!entered) {
    return (
      <>
        <LandingPage onEnter={() => setEntered(true)} />
        {/* DEV: skip landing */}
        <button
          onClick={() => setEntered(true)}
          className="fixed bottom-4 right-4 px-3 py-1 text-xs rounded bg-zinc-800 text-zinc-500 hover:text-white z-50"
        >
          跳过
        </button>
      </>
    );
  }

  return (
    <BrowserRouter>
      <div className="flex h-screen bg-zinc-950 text-zinc-200 overflow-hidden">
        <Sidebar />
        <div className="flex flex-col flex-1 min-w-0">
          <main className="flex-1 overflow-hidden">
            <Routes>
              <Route path="/" element={<ChatPage />} />
              <Route path="/channels" element={<ChannelsPage />} />
              <Route path="/providers" element={<ProvidersPage />} />
              <Route path="/settings" element={<SettingsPage />} />
              <Route path="/monitor" element={<MonitorPage />} />
              <Route path="/environment" element={<EnvironmentPage />} />
            </Routes>
          </main>
          <StatusBar />
        </div>
      </div>
    </BrowserRouter>
  );
}
