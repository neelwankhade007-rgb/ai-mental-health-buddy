import React from "react";
import { Activity, X } from "lucide-react";

export default function VibeAnalysisDrawer({
  vibeAnalysisOpen,
  setVibeAnalysisOpen,
  currentMoodState
}) {
  return (
    <>
      {/* ── Vibe Analysis Drawer ── */}
      <div
        className={`fixed inset-y-0 right-0 z-50 w-80 max-w-full bg-white dark:bg-slate-900 shadow-2xl border-l border-black/5 dark:border-white/5 flex flex-col transition-transform duration-300 ease-in-out ${
          vibeAnalysisOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-black/5 dark:border-white/5 flex justify-between items-center bg-gradient-to-r from-violet-500/5 to-pink-500/5">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-pink-500 animate-pulse" />
            <div>
              <h2 className="text-sm font-bold text-gray-800 dark:text-gray-100 font-sans">Vibe Analysis</h2>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">Real-time rolling confidence</p>
            </div>
          </div>
          <button
            onClick={() => setVibeAnalysisOpen(false)}
            className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 text-gray-400 dark:text-gray-500 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Current Dominant Mood Showcase */}
        <div className="p-4 mx-4 mt-4 rounded-2xl bg-gradient-to-br from-pink-500/10 to-violet-500/10 border border-pink-500/20 text-center">
          <p className="text-[11px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider">Current Dominant State</p>
          <p className="text-3xl font-extrabold bg-gradient-to-r from-pink-600 to-violet-600 dark:from-pink-400 dark:to-violet-400 bg-clip-text text-transparent mt-1">
            {currentMoodState.currentMood}
          </p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400 mt-2 italic leading-relaxed">
            "Your conversations indicate a rolling baseline of {currentMoodState.currentMood.toLowerCase()} feelings."
          </p>
        </div>

        {/* List of confidences */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {Object.entries(currentMoodState.confidences)
            .sort((a, b) => b[1] - a[1]) // Sort highest confidence first
            .map(([mood, val]) => {
              const colors = {
                Happy: "from-yellow-400 to-amber-500 text-amber-600 dark:text-amber-400",
                Neutral: "from-slate-400 to-slate-500 text-slate-600 dark:text-slate-400",
                Sad: "from-blue-400 to-indigo-500 text-blue-600 dark:text-blue-400",
                Angry: "from-rose-500 to-red-600 text-rose-600 dark:text-rose-400",
                Anxious: "from-violet-500 to-purple-600 text-violet-600 dark:text-violet-400",
                Stressed: "from-orange-400 to-amber-600 text-orange-600 dark:text-orange-400",
                Excited: "from-pink-500 to-rose-500 text-pink-600 dark:text-pink-400",
                Motivated: "from-teal-400 to-emerald-500 text-teal-600 dark:text-teal-400",
                Tired: "from-indigo-400 to-blue-600 text-indigo-600 dark:text-indigo-400",
                Calm: "from-emerald-400 to-teal-500 text-emerald-600 dark:text-emerald-400",
              };

              const desc = {
                Happy: "Elevated by joy, celebration, positive sharing, and success.",
                Neutral: "Your baseline calm focus when no specific emotion is prominent.",
                Sad: "Sorrow, disappointment, isolation, or low-energy grief signals.",
                Angry: "Frustration, resentment, opposition, or direct anger keywords.",
                Anxious: "Nervous tension, worry, fear, and future-focused concern.",
                Stressed: "Academic pressure, workloads, deadlines, and exhaustion strain.",
                Excited: "High-energy eagerness, positive surprises, and enthusiastic words.",
                Motivated: "Focused intent on building, creating, coding, and achieving.",
                Tired: "Burnout, sleepiness, low energy, and physical or mental fatigue.",
                Calm: "Gratitude, inner peace, quiet satisfaction, and content baseline.",
              };

              return (
                <div key={mood} className="space-y-1">
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-gray-700 dark:text-gray-300">{mood}</span>
                    <span className={colors[mood]?.split(" ").slice(-1)[0]}>{val}%</span>
                  </div>
                  <div className="h-2 w-full bg-black/5 dark:bg-white/5 rounded-full overflow-hidden">
                    <div
                      className={`h-full bg-gradient-to-r ${colors[mood] || "from-slate-400 to-slate-500"} transition-all duration-500 rounded-full`}
                      style={{ width: `${val}%` }}
                    />
                  </div>
                  <p className="text-[10px] text-gray-400 dark:text-gray-500 leading-snug">
                    {desc[mood]}
                  </p>
                </div>
              );
            })}
        </div>

        {/* Footer/Help note */}
        <div className="p-4 border-t border-black/5 dark:border-white/5 bg-black/5 dark:bg-white/5 text-[10px] text-gray-400 dark:text-gray-500 text-center leading-normal">
          This panel is read-only. Confidences decay or update dynamically based on the emotional context of your recent conversation.
        </div>
      </div>

      {/* Backdrop overlay for drawer */}
      {vibeAnalysisOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-xs z-40 transition-opacity duration-300"
          onClick={() => setVibeAnalysisOpen(false)}
        />
      )}
    </>
  );
}
