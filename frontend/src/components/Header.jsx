import React from "react";
import { Menu, Sparkles, Brain, Activity, Sun, Moon } from "lucide-react";

export default function Header({
  setSidebarOpen,
  moodDetectionEnabled,
  setMoodDetectionEnabled,
  setVibeAnalysisOpen,
  isDarkMode,
  setIsDarkMode
}) {
  return (
    <header className="relative z-10 flex-shrink-0 flex justify-between items-center px-5 py-3.5
      bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl
      border-b border-black/5 dark:border-white/5 shadow-sm">

      <div className="flex items-center gap-3">
        <button
          onClick={() => setSidebarOpen((o) => !o)}
          className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
          aria-label="Toggle sidebar"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-pink-500 to-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="w-4 h-4 text-white fill-white/30" />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-pink-600 to-violet-600 dark:from-pink-400 dark:to-violet-400 bg-clip-text text-transparent leading-none">
              Vibe Catcher
            </h1>
            <p className="text-[11px] text-gray-400 dark:text-gray-500 mt-0.5">your mental health buddy 💜</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {/* Mood Detection Toggle */}
        <button
          onClick={() => setMoodDetectionEnabled((prev) => !prev)}
          className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-110 active:scale-95 flex items-center gap-1.5 text-xs font-semibold ${
            moodDetectionEnabled
              ? "bg-violet-500/10 text-violet-600 dark:bg-violet-400/10 dark:text-violet-400 border border-violet-500/20"
              : "bg-black/5 dark:bg-white/5 text-gray-500 dark:text-gray-400 border border-transparent"
          }`}
          title="Toggle Mood Detection Mode"
        >
          <Brain className="w-4 h-4" />
          <span className="hidden sm:inline">Mood Mode</span>
        </button>

        {/* Vibe Analysis Button */}
        {moodDetectionEnabled && (
          <button
            onClick={() => setVibeAnalysisOpen(true)}
            className="p-2.5 rounded-xl bg-gradient-to-br from-pink-500 to-rose-500 text-white shadow-md shadow-pink-500/20 hover:shadow-pink-500/40 hover:scale-110 active:scale-95 transition-all duration-300 flex items-center gap-1.5 text-xs font-semibold border border-pink-400/20"
            title="Open Vibe Analysis"
          >
            <Activity className="w-4 h-4" />
            <span>Vibe Analysis</span>
          </button>
        )}

        <button
          onClick={() => setIsDarkMode((d) => !d)}
          className="p-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
            text-gray-600 dark:text-gray-300 transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
        </button>
      </div>
    </header>
  );
}
