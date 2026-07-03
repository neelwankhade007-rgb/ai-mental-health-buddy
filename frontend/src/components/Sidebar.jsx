import React from "react";
import { Plus, MessageSquare, Trash2 } from "lucide-react";

export default function Sidebar({
  sidebarOpen,
  setSidebarOpen,
  conversations,
  activeId,
  setActiveId,
  startNewChat,
  deleteConversation,
  setInput
}) {
  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    if (d.toDateString() === today.toDateString()) return "Today";
    if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
  };

  const grouped = conversations.reduce((acc, conv) => {
    const label = formatDate(conv.createdAt);
    (acc[label] ??= []).push(conv);
    return acc;
  }, {});

  return (
    <>
      {/* Backdrop overlay for mobile when sidebar is open */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-40 md:hidden transition-opacity duration-300"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 md:relative md:z-auto w-60 flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0 md:w-60" : "-translate-x-full md:w-0 md:translate-x-0"
        } overflow-hidden bg-gradient-to-b from-violet-950 via-indigo-950 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950`}
      >
        {/* New Chat */}
        <div className="p-3 pt-4 flex-shrink-0">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl
              bg-white/10 hover:bg-white/20 backdrop-blur
              text-white/80 hover:text-white text-sm font-medium
              border border-white/10 hover:border-white/20
              transition-all duration-200 group"
          >
            <Plus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
            New Chat
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-4">
          {Object.entries(grouped).map(([label, convs]) => (
            <div key={label}>
              <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest text-white/30">
                {label}
              </p>
              <div className="space-y-0.5">
                {convs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => {
                      setActiveId(conv.id);
                      setInput("");
                      if (window.innerWidth < 768) {
                        setSidebarOpen(false);
                      }
                    }}
                    className={`w-full group flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-[13px] transition-all duration-150 ${
                      conv.id === activeId
                        ? "bg-white/15 text-white font-medium"
                        : "text-white/50 hover:bg-white/8 hover:text-white/80"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => deleteConversation(conv.id, e)}
                      onKeyDown={(e) => e.key === "Enter" && deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all flex-shrink-0"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </aside>
    </>
  );
}
