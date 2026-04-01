import { useState, useRef, useEffect } from "react";
import {
  Moon, Sun, Send, Sparkles, Smile, HeartPulse,
  Plus, MessageSquare, Trash2, Menu,
} from "lucide-react";

const generateId = () =>
  Math.random().toString(36).substring(2) + Date.now().toString(36);

const WELCOME_MSG = () => ({
  text: "Hey! 👋 I'm Vibe Catcher, your little mental health buddy. How's your heart doing today?",
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
    } catch { return false; }
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
    try { return localStorage.getItem("activeConversationId") || null; }
    catch { return null; }
  });

  useEffect(() => {
    const valid = conversations.find((c) => c.id === activeId);
    if (!valid) setActiveId(conversations[0]?.id ?? null);
  }, [conversations, activeId]);

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

  // ── Send ───────────────────────────────────────────────────────────────────
  const sendMessage = async () => {
    if (!input.trim() || loading || !activeId) return;
    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const userInput = input.trim();
    setInput("");
    setLoading(true);

    const userMsg = { text: userInput, sender: "user", time };
    const loadingMsg = { text: "...", sender: "bot", loading: true };

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
          m.loading ? { text: "Oops! Couldn't reach the server. Try again 🥺", sender: "bot", time } : m
        ),
      }));
    } finally {
      setLoading(false);
    }
  };

  // ── Mood config ────────────────────────────────────────────────────────────
  const moodConfig = {
    Happy:   { emoji: "✨", bg: "bg-yellow-100 dark:bg-yellow-400/20", text: "text-yellow-700 dark:text-yellow-300", border: "border-yellow-300 dark:border-yellow-500/40", glow: "shadow-yellow-200 dark:shadow-yellow-500/20" },
    Sad:     { emoji: "🌧️", bg: "bg-blue-100 dark:bg-blue-400/20",   text: "text-blue-700 dark:text-blue-300",    border: "border-blue-300 dark:border-blue-500/40",   glow: "shadow-blue-200 dark:shadow-blue-500/20" },
    Stressed:{ emoji: "⛈️", bg: "bg-orange-100 dark:bg-orange-400/20",text: "text-orange-700 dark:text-orange-300",border: "border-orange-300 dark:border-orange-500/40",glow: "shadow-orange-200 dark:shadow-orange-500/20" },
    Anxious: { emoji: "🍃", bg: "bg-teal-100 dark:bg-teal-400/20",   text: "text-teal-700 dark:text-teal-300",    border: "border-teal-300 dark:border-teal-500/40",   glow: "shadow-teal-200 dark:shadow-teal-500/20" },
    Neutral: { emoji: "☕", bg: "bg-purple-100 dark:bg-purple-400/20",text: "text-purple-700 dark:text-purple-300",border: "border-purple-300 dark:border-purple-500/40",glow: "shadow-purple-200 dark:shadow-purple-500/20" },
  };

  // ── Affirmations ───────────────────────────────────────────────────────────
  const affirmations = [
    "Take a deep breath. You are doing your best. 🌸",
    "It's okay to feel whatever you're feeling. 💛",
    "You are worthy of care & kindness. ✨",
    "One step at a time. Be gentle with yourself. 🍃",
  ];
  const [affirmation] = useState(
    () => affirmations[Math.floor(Math.random() * affirmations.length)]
  );

  // ── Sidebar grouping ───────────────────────────────────────────────────────
  const formatDate = (ts) => {
    const d = new Date(ts);
    const today = new Date();
    const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
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
    <div className="h-screen flex font-sans overflow-hidden transition-colors duration-500">

      {/* ── Sidebar ── */}
      <aside className={`flex-shrink-0 flex flex-col transition-all duration-300 ease-in-out ${sidebarOpen ? "w-60" : "w-0"} overflow-hidden
        bg-gradient-to-b from-violet-950 via-indigo-950 to-slate-950 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950
        border-r border-white/5`}>

        {/* New Chat */}
        <div className="p-3 pt-4 flex-shrink-0">
          <button onClick={startNewChat}
            className="w-full flex items-center gap-2 px-4 py-2.5 rounded-2xl
              bg-white/10 hover:bg-white/20 backdrop-blur
              text-white/80 hover:text-white text-sm font-medium
              border border-white/10 hover:border-white/20
              transition-all duration-200 group">
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
                  <button key={conv.id}
                    onClick={() => { setActiveId(conv.id); setInput(""); }}
                    className={`w-full group flex items-center gap-2 px-3 py-2.5 rounded-xl text-left text-[13px] transition-all duration-150 ${
                      conv.id === activeId
                        ? "bg-white/15 text-white font-medium"
                        : "text-white/50 hover:bg-white/8 hover:text-white/80"
                    }`}>
                    <MessageSquare className="w-3.5 h-3.5 flex-shrink-0 opacity-60" />
                    <span className="flex-1 truncate">{conv.title}</span>
                    <span role="button" tabIndex={0}
                      onClick={(e) => deleteConversation(conv.id, e)}
                      className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-red-500/20 text-white/30 hover:text-red-400 transition-all flex-shrink-0">
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
      <div className="flex-1 flex flex-col min-w-0 relative
        bg-gradient-to-br from-rose-50 via-violet-50 to-sky-50
        dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900">

        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-5%] right-[10%] w-80 h-80 bg-pink-300/25 dark:bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] left-[5%] w-64 h-64 bg-violet-300/25 dark:bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute top-[40%] right-[5%] w-48 h-48 bg-sky-300/25 dark:bg-sky-500/10 rounded-full blur-3xl" />
        </div>

        {/* ── Header ── */}
        <header className="relative z-10 flex-shrink-0 flex justify-between items-center px-5 py-3.5
          bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl
          border-b border-black/5 dark:border-white/5 shadow-sm">

          <div className="flex items-center gap-3">
            <button onClick={() => setSidebarOpen((o) => !o)}
              className="p-2 rounded-xl hover:bg-black/5 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 transition-colors"
              aria-label="Toggle sidebar">
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

          <button onClick={() => setIsDarkMode((d) => !d)}
            className="p-2.5 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/5 dark:hover:bg-white/10
              text-gray-600 dark:text-gray-300 transition-all duration-300 hover:scale-110 active:scale-95"
            aria-label="Toggle dark mode">
            {isDarkMode ? <Sun className="w-4.5 h-4.5 w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
          </button>
        </header>

        {/* ── Chat area ── */}
        <main className="relative z-10 flex-1 overflow-y-auto py-6 px-4 sm:px-6 space-y-5 max-w-2xl w-full mx-auto scroll-smooth">

          {/* Affirmation pill — only on fresh chats */}
          {messages.length <= 1 && (
            <div className="flex justify-center py-2">
              <div className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full
                bg-white/80 dark:bg-white/5 backdrop-blur
                border border-pink-200/60 dark:border-pink-500/20
                shadow-sm shadow-pink-100 dark:shadow-none">
                <HeartPulse className="w-4 h-4 text-pink-500 animate-pulse" />
                <p className="text-[13px] font-medium text-gray-600 dark:text-gray-300 italic">
                  {affirmation}
                </p>
              </div>
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={index} className={`flex flex-col gap-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}>

              {/* Mood badge */}
              {msg.sender === "bot" && msg.mood && (() => {
                const m = moodConfig[msg.mood] || moodConfig.Neutral;
                return (
                  <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-widest
                    border shadow-sm ${m.bg} ${m.text} ${m.border} ${m.glow}`}>
                    {m.emoji} {msg.mood}
                  </span>
                );
              })()}

              <div className={`flex items-end gap-2.5 max-w-[82%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>

                {/* Avatar */}
                <div className={`flex-shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center shadow-md ${
                  msg.sender === "user"
                    ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                    : "bg-gradient-to-br from-pink-400 to-rose-500"
                }`}>
                  {msg.sender === "user"
                    ? <Smile className="w-4 h-4 text-white" />
                    : <Sparkles className="w-4 h-4 text-white fill-white/30" />}
                </div>

                {/* Bubble */}
                <div className={`px-5 py-3.5 text-[14.5px] leading-relaxed whitespace-pre-wrap break-words transition-all duration-300 ${
                  msg.sender === "user"
                    ? `bg-gradient-to-br from-violet-500 to-indigo-600 text-white
                       rounded-2xl rounded-br-md shadow-lg shadow-violet-500/25`
                    : `bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100
                       rounded-2xl rounded-bl-md
                       border border-gray-100 dark:border-white/5
                       shadow-md shadow-gray-200/60 dark:shadow-black/20`
                }`}>
                  {msg.loading ? (
                    <div className="flex gap-1.5 items-center py-0.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "140ms" }} />
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "280ms" }} />
                    </div>
                  ) : msg.text}
                </div>
              </div>

              {/* Timestamp */}
              {!msg.loading && (
                <p className={`text-[10.5px] text-gray-400 dark:text-gray-500 ${msg.sender === "user" ? "mr-11" : "ml-11"}`}>
                  {msg.time}
                </p>
              )}
            </div>
          ))}

          <div ref={chatEndRef} className="h-2" />
        </main>

        {/* ── Input bar ── */}
        <div className="relative z-10 flex-shrink-0 px-4 sm:px-6 py-4
          bg-white/70 dark:bg-slate-900/80 backdrop-blur-xl
          border-t border-black/5 dark:border-white/5">
          <div className="max-w-2xl mx-auto flex gap-3 items-end">
            <textarea
              className="flex-1 px-5 py-3.5 rounded-2xl
                bg-white dark:bg-slate-800
                border-2 border-gray-200 dark:border-white/10
                focus:border-violet-400 dark:focus:border-violet-500
                focus:ring-4 focus:ring-violet-100 dark:focus:ring-violet-500/15
                text-gray-800 dark:text-gray-100
                placeholder-gray-400 dark:placeholder-gray-500
                text-[14.5px] font-medium resize-none shadow-sm
                focus:outline-none transition-all duration-300"
              rows={1}
              value={input}
              disabled={loading}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
              }}
              placeholder="Tell me what's on your mind... 💭"
            />
            <button onClick={sendMessage} disabled={loading || !input.trim()}
              aria-label="Send message"
              className={`flex items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0 transition-all duration-300 ${
                loading || !input.trim()
                  ? "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
                  : "bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 hover:scale-110 active:scale-95 hover:shadow-violet-500/50"
              }`}>
              <Send className={`w-4.5 h-4.5 w-[18px] h-[18px] ${loading ? "animate-pulse" : ""} -translate-x-px translate-y-px`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
