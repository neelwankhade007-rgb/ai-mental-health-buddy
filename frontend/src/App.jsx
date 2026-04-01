import { useState, useRef, useEffect } from "react";
import {
  Moon, Sun, Send, Sparkles, Smile, HeartPulse,
  Plus, MessageSquare, Trash2, Menu,
} from "lucide-react";

const generateId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

const WELCOME_MSG = () => ({
  text: "Hi there! I'm here to listen. How is your heart doing today?",
  sender: "bot",
  time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
});

const freshConversation = () => ({
  id: generateId(),
  title: "New Chat",
  messages: [WELCOME_MSG()],
  createdAt: Date.now(),
});

function App() {
  // ── Dark mode ──────────────────────────────────────────────────────────────
  const [isDarkMode, setIsDarkMode] = useState(() => {
    try {
      const s = localStorage.getItem("darkMode");
      return s !== null ? JSON.parse(s) : false;
    } catch {
      return false;
    }
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDarkMode);
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // ── Conversations ──────────────────────────────────────────────────────────
  const [conversations, setConversations] = useState(() => {
    try {
      const saved = localStorage.getItem("conversations");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}
    return [freshConversation()];
  });

  const [activeId, setActiveId] = useState(() => {
    try {
      return localStorage.getItem("activeConversationId") || null;
    } catch {
      return null;
    }
  });

  // Keep activeId valid
  useEffect(() => {
    const valid = conversations.find((c) => c.id === activeId);
    if (!valid) setActiveId(conversations[0]?.id ?? null);
  }, [conversations, activeId]);

  // Persist
  useEffect(() => {
    localStorage.setItem("conversations", JSON.stringify(conversations));
  }, [conversations]);

  useEffect(() => {
    if (activeId) localStorage.setItem("activeConversationId", activeId);
  }, [activeId]);

  const activeConversation = conversations.find((c) => c.id === activeId);
  const messages = activeConversation?.messages ?? [];

  // ── Input / loading ────────────────────────────────────────────────────────
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // ── Helpers ────────────────────────────────────────────────────────────────
  const updateConversation = (id, updater) =>
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, ...updater(c) } : c))
    );

  const startNewChat = () => {
    const conv = freshConversation();
    setConversations((prev) => [conv, ...prev]);
    setActiveId(conv.id);
    setInput("");
  };

  const deleteConversation = (id, e) => {
    e.stopPropagation();
    setConversations((prev) => {
      const updated = prev.filter((c) => c.id !== id);
      if (updated.length === 0) {
        const conv = freshConversation();
        setActiveId(conv.id);
        return [conv];
      }
      if (id === activeId) setActiveId(updated[0].id);
      return updated;
    });
  };

  // ── Send message ───────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || loading || !activeId) return;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
    const userInput = input.trim();
    setInput("");
    setLoading(true);

    const userMsg = { text: userInput, sender: "user", time };
    const loadingMsg = { text: "...", sender: "bot", loading: true };

    // Append user msg + loading placeholder; auto-title on first user message
    updateConversation(activeId, (c) => {
      const isFirst = !c.messages.some((m) => m.sender === "user");
      return {
        messages: [...c.messages, userMsg, loadingMsg],
        ...(isFirst ? { title: userInput.slice(0, 42) } : {}),
      };
    });

    try {
      const history = messages.filter((m) => !m.loading);
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, history }),
      });

      if (!res.ok) throw new Error("API error");
      const data = await res.json();

      const botMsg = { text: data.reply, sender: "bot", time, mood: data.mood };
      updateConversation(activeId, (c) => ({
        messages: c.messages.map((m) => (m.loading ? botMsg : m)),
      }));
    } catch {
      updateConversation(activeId, (c) => ({
        messages: c.messages.map((m) =>
          m.loading
            ? {
                text: "Oh no, couldn't reach the server. Please try again.",
                sender: "bot",
                time,
              }
            : m
        ),
      }));
    } finally {
      setLoading(false);
    }
  };

  // ── Mood maps ──────────────────────────────────────────────────────────────
  const moodEmoji = {
    Happy: "✨", Sad: "🌧️", Stressed: "⛈️", Anxious: "🍃", Neutral: "☕",
  };
  const moodColor = {
    Happy: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 border border-pink-200 dark:border-pink-800",
    Sad: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    Stressed: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
    Anxious: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-200 dark:border-teal-800",
    Neutral: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600",
  };

  // ── Affirmation ────────────────────────────────────────────────────────────
  const affirmations = [
    "Take a deep breath. You are doing your best. 🌸",
    "It's okay to feel whatever you're feeling. 💛",
    "You are worthy of care. ✨",
    "One step at a time. Be gentle with yourself. 🍃",
  ];
  const [affirmation] = useState(
    () => affirmations[Math.floor(Math.random() * affirmations.length)]
  );

  // ── Sidebar grouping ───────────────────────────────────────────────────────
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

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="h-screen flex font-sans overflow-hidden transition-colors duration-500 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100 dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900">

      {/* ── Sidebar ── */}
      <aside
        className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out ${
          sidebarOpen ? "w-64" : "w-0"
        } overflow-hidden bg-slate-900/97 dark:bg-slate-950/97 backdrop-blur-xl border-r border-slate-700/40`}
      >
        {/* New Chat */}
        <div className="p-3 border-b border-slate-700/40 flex-shrink-0">
          <button
            onClick={startNewChat}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl border border-slate-700 hover:border-slate-500 hover:bg-slate-800 text-slate-300 hover:text-white transition-all duration-200 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            New Chat
          </button>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {Object.entries(grouped).map(([label, convs]) => (
            <div key={label}>
              <p className="px-3 py-1 text-[11px] font-semibold uppercase tracking-widest text-slate-500">
                {label}
              </p>
              <div className="space-y-0.5 mt-0.5">
                {convs.map((conv) => (
                  <button
                    key={conv.id}
                    onClick={() => { setActiveId(conv.id); setInput(""); }}
                    className={`w-full group flex items-center gap-2 px-3 py-2.5 rounded-lg text-left text-[13px] transition-all duration-150 ${
                      conv.id === activeId
                        ? "bg-slate-700/80 text-white"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                    }`}
                  >
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                    <span className="flex-1 truncate leading-snug">{conv.title}</span>
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-slate-600/80 text-slate-500 hover:text-red-400 transition-all duration-150 flex-shrink-0"
                      aria-label="Delete conversation"
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

      {/* ── Main ── */}
      <div className="flex-1 flex flex-col min-w-0 relative">

        {/* Background blobs */}
        <div className="pointer-events-none absolute top-[-100px] left-[-100px] w-96 h-96 bg-pink-300/30 dark:bg-fuchsia-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-pulse z-0" />
        <div className="pointer-events-none absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-purple-300/30 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-60 animate-pulse delay-1000 z-0" />

        {/* Header */}
        <header className="relative z-10 sticky top-0 flex-shrink-0 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-b border-rose-100 dark:border-purple-800/50 px-5 py-3.5 flex justify-between items-center shadow-sm transition-colors duration-500">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 rounded-lg hover:bg-rose-50 dark:hover:bg-slate-800 text-gray-400 dark:text-slate-400 transition-colors"
              aria-label="Toggle sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div>
              <h1 className="text-xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-pink-500 dark:text-pink-400 fill-pink-500/20" />
                Vibe Catcher
              </h1>
              <p className="text-[12px] font-medium text-purple-600/60 dark:text-purple-300/60 ml-7">
                A cozy corner for your mind
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsDarkMode((d) => !d)}
            className="p-2.5 rounded-full bg-white/80 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-rose-500 dark:text-pink-300 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm border border-rose-100 dark:border-slate-700"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 fill-rose-500/10" />}
          </button>
        </header>

        {/* Chat */}
        <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-3xl w-full mx-auto scroll-smooth">

          {/* Affirmation — only on fresh chats */}
          {messages.length <= 1 && (
            <div className="flex justify-center mb-6 mt-4">
              <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-4 rounded-3xl shadow-sm border border-rose-100 dark:border-slate-700/50 flex flex-col items-center gap-2 max-w-sm text-center transform hover:scale-[1.02] transition-transform duration-300">
                <HeartPulse className="w-5 h-5 text-pink-400 animate-bounce" />
                <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed italic">
                  "{affirmation}"
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${
                msg.sender === "user" ? "items-end text-right" : "items-start text-left"
              }`}
            >
              {/* Mood badge */}
              {msg.sender === "bot" && msg.mood && (
                <span
                  className={`text-xs px-3 py-1.5 rounded-full mb-2 inline-flex items-center gap-1.5 shadow-sm font-bold ${moodColor[msg.mood]} transition-all duration-300 hover:-translate-y-0.5 cursor-default`}
                >
                  {moodEmoji[msg.mood] || "💌"}
                  <span className="uppercase tracking-widest text-[10px]">{msg.mood}</span>
                </span>
              )}

              <div
                className={`flex items-end gap-3 max-w-[85%] sm:max-w-lg ${
                  msg.sender === "user" ? "flex-row-reverse" : "flex-row"
                }`}
              >
                {/* Avatar */}
                <div
                  className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-md transform rotate-3 hover:rotate-12 transition-transform duration-300 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-purple-400 to-indigo-500 text-white"
                      : "bg-gradient-to-br from-pink-400 to-rose-400 text-white"
                  }`}
                >
                  {msg.sender === "user" ? (
                    <Smile className="w-5 h-5 fill-white/20" />
                  ) : (
                    <Sparkles className="w-5 h-5 fill-white/20" />
                  )}
                </div>

                {/* Bubble */}
                <div
                  className={`px-6 py-4 text-[15px] whitespace-pre-wrap break-words shadow-sm leading-relaxed transition-all duration-300 ${
                    msg.sender === "user"
                      ? "bg-gradient-to-br from-purple-500 to-indigo-500 dark:from-purple-600 dark:to-indigo-600 text-white rounded-3xl rounded-br-sm shadow-purple-500/20"
                      : "bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-gray-800 dark:text-gray-100 border border-rose-50 dark:border-slate-700/50 rounded-3xl rounded-bl-sm font-medium"
                  }`}
                >
                  {msg.loading ? (
                    <div className="flex gap-1.5 items-center h-5 px-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                  ) : (
                    msg.text
                  )}
                </div>
              </div>

              {/* Timestamp */}
              {!msg.loading && (
                <p
                  className={`text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-1.5 ${
                    msg.sender === "user" ? "mr-12" : "ml-12"
                  }`}
                >
                  {msg.time}
                </p>
              )}
            </div>
          ))}

          <div ref={chatEndRef} className="h-4" />
        </main>

        {/* Input */}
        <div className="relative z-10 flex-shrink-0 p-4 sm:p-5 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-t border-rose-100 dark:border-purple-900/50 transition-colors duration-500">
          <div className="max-w-3xl mx-auto flex gap-3 items-end">
            <textarea
              className="flex-1 px-5 py-3.5 rounded-3xl border-2 border-transparent bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-pink-300 dark:focus:border-purple-500 focus:ring-4 focus:ring-pink-100 dark:focus:ring-purple-900/30 transition-all duration-300 resize-none text-[15px] shadow-sm font-medium"
              rows={1}
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  sendMessage();
                }
              }}
              placeholder="Tell me what's on your mind today..."
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className={`p-4 rounded-full flex items-center justify-center transition-all duration-300 aspect-square h-[52px] ${
                loading || !input.trim()
                  ? "bg-gray-200 text-gray-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                  : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white hover:scale-110 active:scale-95 shadow-lg shadow-pink-500/30"
              }`}
              aria-label="Send message"
            >
              <Send className={`w-5 h-5 ${loading ? "animate-pulse" : ""} -ml-0.5 mt-0.5`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
