import { useState, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
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

// Determine backend API URL: always use localhost in development mode
const API_BASE_URL = import.meta.env.DEV
  ? "http://localhost:5000"
  : (import.meta.env.VITE_API_URL || "http://localhost:5000");


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

  // ── Warmup Ping on Load ────────────────────────────────────────────────────
  useEffect(() => {
    const warmupBackend = async () => {
      try {
        await fetch(API_BASE_URL);
      } catch (error) {
        console.warn("Silent warmup ping failed (the server might still be starting up):", error);
      }
    };
    warmupBackend();
  }, []);

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

  const abortControllerRef = useRef(null);

  // ── Send — uses robust SSE streaming ────────────────────────────────────────
  const sendMessage = async (overrideInput) => {
    const userInput = (typeof overrideInput === 'string' ? overrideInput : input).trim();
    if (!userInput || loading || !activeId) return;

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();

    const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setInput("");
    setLoading(true);

    const userMsg = { text: userInput, sender: "user", time };
    // Streaming placeholder msg — shows bouncing dots until first stream chunk arrives
    const streamingMsgId = generateId();
    const streamingMsg = { id: streamingMsgId, text: "", sender: "bot", time, streaming: true };

    updateConversation(activeId, (c) => {
      const isFirst = !c.messages.some((m) => m.sender === "user");
      return {
        messages: [...c.messages, userMsg, streamingMsg],
        ...(isFirst ? { title: userInput.slice(0, 42) } : {}),
      };
    });

    try {
      const history = messages.filter((m) => !m.loading && !m.streaming);
      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userInput, history }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) throw new Error("API error");

      // Read the SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let finalReply = "";
      let currentMood = "Neutral";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // keep incomplete line in buffer

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);
            
            if (event.error) {
               finalReply += event.delta || "";
            } else if (event.done) {
               // The final complete message
               if (event.reply) finalReply = event.reply;
               if (event.mood) currentMood = event.mood;
            } else {
               if (event.mood) currentMood = event.mood;
               if (event.delta) finalReply += event.delta;
               
               // Update the UI in real-time
               updateConversation(activeId, (c) => ({
                 messages: c.messages.map((m) => 
                   m.id === streamingMsgId 
                     ? { ...m, text: finalReply, mood: currentMood, streaming: true }
                     : m
                 ),
               }));
            }
          } catch {
            // Ignore malformed events during stream
          }
        }
      }

      // Commit the final, clean, and fully-parsed message with mood
      const botMsg = {
        text: finalReply || "Oops! Something went wrong on my end. Please try again 🥺",
        sender: "bot",
        time,
        mood: currentMood,
        streaming: false,
      };

      updateConversation(activeId, (c) => ({
        messages: c.messages.map((m) => (m.id === streamingMsgId ? botMsg : m)),
      }));
    } catch (error) {
      if (error.name === "AbortError") {
         console.log("Request aborted");
         return; // Do not update UI to failure if explicitly aborted
      }
      updateConversation(activeId, (c) => ({
        messages: c.messages.map((m) =>
          m.id === streamingMsgId
            ? { text: "Oops! Couldn't reach the server. Try again 🥺", sender: "bot", time, streaming: false }
            : m
        ),
      }));
    } finally {
      setLoading(false);
    }
  };

  const sendQuickPrompt = (prompt) => {
    if (loading) return;
    setInput(prompt);
    // Small timeout so input state updates before sendMessage reads it
    setTimeout(() => {
      sendMessage(prompt);
    }, 0);
  };

  // ── Affirmations ───────────────────────────────────────────────────────────
  const quickPrompts = [
    "I'm feeling anxious today 😟",
    "I just need to vent 💬",
    "I can't sleep at all 😴",
    "I'm feeling really lonely 🌙",
    "I'm so stressed with studies 📚",
    "I'm actually feeling great today! ✨",
  ];

  const affirmations = [
    "Take a deep breath. You are doing your best. 🌸",
    "It's okay to feel whatever you're feeling. 💛",
    "You are worthy of care & kindness. ✨",
    "One step at a time. Be gentle with yourself. 🍃",
    "Your feelings are valid. You are not alone. 💜",
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
                      onKeyDown={(e) => e.key === "Enter" && deleteConversation(conv.id, e)}
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
            {isDarkMode ? <Sun className="w-[18px] h-[18px]" /> : <Moon className="w-[18px] h-[18px]" />}
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

          {/* Quick prompt chips — only on fresh chats */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap justify-center gap-2 px-2">
              {quickPrompts.map((prompt) => (
                <button
                  key={prompt}
                  onClick={() => sendQuickPrompt(prompt)}
                  disabled={loading}
                  className="px-4 py-2 rounded-full text-[13px] font-medium
                    bg-white/80 dark:bg-white/5 backdrop-blur
                    border border-violet-200 dark:border-violet-500/30
                    text-violet-600 dark:text-violet-300
                    hover:bg-violet-50 dark:hover:bg-violet-500/10
                    hover:border-violet-400 dark:hover:border-violet-400/50
                    transition-all duration-200 hover:scale-105 active:scale-95
                    shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}

          {messages.map((msg, index) => (
            <div key={msg.id ?? index} className={`flex flex-col gap-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}>

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
                <div className={`px-5 py-3.5 text-[14.5px] leading-relaxed break-words transition-all duration-300 ${
                  msg.sender === "user"
                    ? `bg-gradient-to-br from-violet-500 to-indigo-600 text-white
                       rounded-2xl rounded-br-md shadow-lg shadow-violet-500/25`
                    : `bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100
                       rounded-2xl rounded-bl-md
                       border border-gray-100 dark:border-white/5
                       shadow-md shadow-gray-200/60 dark:shadow-black/20`
                }`}>
                  {/* Streaming / loading indicator */}
                  {msg.sender === "bot" && (msg.streaming || msg.loading) && !msg.text ? (
                    <div className="flex gap-1.5 items-center py-0.5">
                      <span className="w-2 h-2 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                      <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "140ms" }} />
                      <span className="w-2 h-2 rounded-full bg-sky-400 animate-bounce" style={{ animationDelay: "280ms" }} />
                    </div>
                  ) : (
                    <>
                      <ReactMarkdown
                        components={{
                          code({ inline, className, children, ...props }) {
                            return inline ? (
                              <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>{children}</code>
                            ) : (
                              <pre className="bg-gray-900 dark:bg-black/40 text-gray-100 rounded-xl p-4 overflow-x-auto my-2 text-[13px] font-mono">
                                <code {...props}>{children}</code>
                              </pre>
                            );
                          },
                          p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
                          ul({ children }) { return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>; },
                          ol({ children }) { return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>; },
                          li({ children }) { return <li className="text-[14px]">{children}</li>; },
                          strong({ children }) { return <strong className="font-semibold">{children}</strong>; },
                        }}
                      >
                        {msg.text}
                      </ReactMarkdown>
                      {msg.streaming && msg.text && (
                        <span className="inline-block w-0.5 h-4 bg-pink-400 ml-0.5 animate-pulse align-middle" />
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Timestamp */}
              {!msg.loading && !msg.streaming && (
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
              <Send className={`w-[18px] h-[18px] ${loading ? "animate-pulse" : ""} -translate-x-px translate-y-px`} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;