import { useState, useRef, useEffect } from "react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Moon, Sun, Send, Sparkles, Smile, HeartPulse, Trash2 } from "lucide-react";

function App() {
  // state for dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("darkMode");
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return false; 
    }
    return false;
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("darkMode", JSON.stringify(isDarkMode));
  }, [isDarkMode]);

  const toggleDarkMode = () => setIsDarkMode(!isDarkMode);

  // 🔥 Emoji map
  const moodEmoji = {
    Happy: "✨",
    Sad: "🌧️",
    Stressed: "⛈️",
    Anxious: "🍃",
    Neutral: "☕",
  };

  // 🔥 Color map 
  const moodColor = {
    Happy: "bg-pink-100 text-pink-700 dark:bg-pink-500/20 dark:text-pink-300 border border-pink-200 dark:border-pink-800 animate-pulse shadow-[0_0_15px_rgba(244,114,182,0.4)]",
    Sad: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300 border border-blue-200 dark:border-blue-800",
    Stressed: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300 border border-orange-200 dark:border-orange-800",
    Anxious: "bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300 border border-teal-200 dark:border-teal-800",
    Neutral: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-gray-300 border border-gray-200 dark:border-slate-600",
  };

  const affirmations = [
    "Take a deep breath. You are doing your best, and that is enough. 🌸",
    "It's okay to feel whatever you're feeling right now. 💛",
    "You are worthy of care, especially from yourself. ✨",
    "One step at a time. Be gentle with your mind today. 🍃"
  ];
  const [dailyAffirmation] = useState(() => affirmations[Math.floor(Math.random() * affirmations.length)]);

  const welcomeMessage = {
    text: "Hi there! I'm here to listen. How is your heart doing today?",
    sender: "bot",
    time: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
  };

  const [messages, setMessages] = useState(() => {
    try {
      const saved = localStorage.getItem("chatHistory");
      return saved ? JSON.parse(saved) : [welcomeMessage];
    } catch {
      return [welcomeMessage];
    }
  });

  // Save messages to localStorage on every update (skip loading placeholders)
  useEffect(() => {
    const toSave = messages.filter((m) => !m.loading);
    localStorage.setItem("chatHistory", JSON.stringify(toSave));
  }, [messages]);

  const clearChat = () => {
    localStorage.removeItem("chatHistory");
    setMessages([welcomeMessage]);
  };

  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg = { text: input, sender: "user", time };
    const loadingMsg = { text: "Thinking...", sender: "bot", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      // Send history (excluding loading placeholders) for context
      const history = messages.filter((m) => !m.loading);

      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput, history }),
      });

      if (!res.ok) throw new Error("API error");

      const data = await res.json();

      const botMsg = {
        text: data.reply,
        sender: "bot",
        time,
        mood: data.mood,
      };

      setMessages((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((msg) => msg.loading);
        if (index !== -1) updated[index] = botMsg;
        return updated;
      });
    } catch (error) {
      console.error(error);

      setMessages((prev) => {
        const updated = [...prev];
        const index = updated.findIndex((msg) => msg.loading);
        if (index !== -1) {
          updated[index] = {
            text: "Oh no, I couldn't reach my server. Could you make sure it's running? 🥺",
            sender: "bot",
            time,
          };
        }
        return updated;
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-500 bg-gradient-to-br from-rose-50 via-pink-50 to-purple-100 dark:from-indigo-950 dark:via-purple-900 dark:to-slate-900 overflow-hidden relative">
      {/* Decorative Blob Background Effects */}
      <div className="absolute top-[-100px] left-[-100px] w-96 h-96 bg-pink-300/30 dark:bg-fuchsia-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-pulse duration-1000 z-0"></div>
      <div className="absolute bottom-[-100px] right-[-100px] w-96 h-96 bg-purple-300/30 dark:bg-indigo-600/20 rounded-full mix-blend-multiply dark:mix-blend-screen filter blur-3xl opacity-70 animate-pulse duration-[3000ms] delay-1000 z-0"></div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 backdrop-blur-xl bg-white/60 dark:bg-slate-900/60 border-b border-rose-100 dark:border-purple-800/50 px-6 py-4 flex justify-between items-center shadow-sm transition-colors duration-500">
        <div>
          <h1 className="text-xl font-extrabold bg-gradient-to-r from-pink-500 to-purple-600 dark:from-pink-400 dark:to-purple-400 bg-clip-text text-transparent flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-pink-500 dark:text-pink-400 fill-pink-500/20" />
            Vibe Catcher
          </h1>
          <p className="text-[13px] font-medium text-purple-600/60 dark:text-purple-300/60 mt-0.5 ml-8">A cozy corner for your mind</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={clearChat}
            title="Clear chat history"
            className="p-2.5 rounded-full bg-white/80 hover:bg-red-50 dark:bg-slate-800/80 dark:hover:bg-red-900/30 text-gray-400 hover:text-red-400 dark:text-slate-500 dark:hover:text-red-400 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm border border-rose-100 dark:border-slate-700"
            aria-label="Clear chat"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={toggleDarkMode}
            className="p-2.5 rounded-full bg-white/80 hover:bg-rose-50 dark:bg-slate-800/80 dark:hover:bg-slate-700 text-rose-500 dark:text-pink-300 transition-all duration-300 hover:scale-110 active:scale-95 shadow-sm border border-rose-100 dark:border-slate-700"
            aria-label="Toggle dark mode"
          >
            {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5 fill-rose-500/10" />}
          </button>
        </div>
      </header>

      {/* Chat Area */}
      <main className="relative z-10 flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto scroll-smooth">
        
        {/* Daily Affirmation Card */}
        <div className="flex justify-center mb-8 mt-4">
          <div className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-md px-6 py-4 rounded-3xl shadow-sm border border-rose-100 dark:border-slate-700/50 flex flex-col items-center gap-2 max-w-sm text-center transform hover:scale-[1.02] transition-transform duration-300">
             <HeartPulse className="w-6 h-6 text-pink-400 animate-bounce" />
             <p className="text-sm font-medium text-gray-700 dark:text-gray-200 leading-relaxed italic">
               "{dailyAffirmation}"
             </p>
          </div>
        </div>

        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end text-right" : "items-start text-left"
            } duration-500 ease-out`}
            style={{ animationFillMode: 'both' }}
          >
            {/* Mood Badge */}
            {msg.sender === "bot" && msg.mood && (
              <span
                className={`text-xs px-3 py-1.5 rounded-full mb-2 inline-flex items-center gap-1.5 shadow-sm font-bold ${moodColor[msg.mood]} transition-all duration-500 transform hover:-translate-y-1 cursor-default`}
              >
                {moodEmoji[msg.mood] || "💌"} <span className="uppercase tracking-widest text-[10px]">{msg.mood}</span>
              </span>
            )}

            <div
              className={`flex items-end gap-3 max-w-[85%] sm:max-w-lg ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-9 h-9 rounded-2xl flex items-center justify-center shadow-md transition-colors duration-500 transform rotate-3 hover:rotate-12 ${
                msg.sender === 'user' 
                  ? 'bg-gradient-to-br from-purple-400 to-indigo-500 text-white' 
                  : 'bg-gradient-to-br from-pink-400 to-rose-400 text-white'
              }`}>
                 {msg.sender === 'user' ? <Smile className="w-5 h-5 fill-white/20" /> : <Sparkles className="w-5 h-5 fill-white/20" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative px-6 py-4 text-[15px] sm:text-base whitespace-pre-wrap break-words shadow-sm leading-relaxed transition-all duration-500 ${
                  msg.sender === "user"
                    ? "bg-gradient-to-br from-purple-500 to-indigo-500 dark:from-purple-600 dark:to-indigo-600 text-white rounded-3xl rounded-br-sm shadow-purple-500/20"
                    : "bg-white/90 dark:bg-slate-800/90 backdrop-blur-md text-gray-800 dark:text-gray-100 border border-rose-50 dark:border-slate-700/50 rounded-3xl rounded-bl-sm font-medium shadow-rose-100/50 dark:shadow-none"
                }`}
              >
                {msg.loading ? (
                  <div className="flex gap-1.5 items-center h-6 px-2">
                     <span className="w-2.5 h-2.5 rounded-full bg-pink-400 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                     <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                     <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>

            {/* Timestamp */}
            {!msg.loading && (
              <p className={`text-[11px] font-medium text-gray-400 dark:text-gray-500 mt-2 transition-colors duration-500 ${msg.sender === 'user' ? 'mr-12' : 'ml-12'}`}>
                {msg.time}
              </p>
            )}
          </div>
        ))}

        <div ref={chatEndRef} className="h-6" />
      </main>

      {/* Input Form */}
      <div className="relative z-10 p-4 sm:p-6 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border-t border-rose-100 dark:border-purple-900/50 transition-colors duration-500 pb-safe">
        <div className="max-w-4xl mx-auto flex gap-3 relative items-end">
          <textarea
            className="flex-1 px-6 py-4 rounded-3xl border-2 border-transparent bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:border-pink-300 dark:focus:border-purple-500 focus:ring-4 focus:ring-pink-100 dark:focus:ring-purple-900/30 transition-all duration-300 resize-none text-[15px] shadow-sm font-medium"
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
            className={`p-4 rounded-full flex items-center justify-center transition-all duration-300 aspect-square h-[56px] ${
              loading || !input.trim()
                ? "bg-gray-200 text-gray-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed shadow-none"
                : "bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-400 hover:to-rose-400 text-white hover:scale-110 active:scale-95 shadow-lg shadow-pink-500/30"
            }`}
            aria-label="Send message"
          >
             <Send className={`w-5 h-5 ${loading ? 'animate-pulse' : ''} ${!input.trim() && !loading ? 'opacity-50' : 'opacity-100'} -ml-0.5 mt-0.5`} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
