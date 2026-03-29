import { useState, useRef, useEffect } from "react";

import { Moon, Sun, Send, Bot, User } from "lucide-react";

function App() {
  // state for dark mode
  const [isDarkMode, setIsDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("darkMode");
      if (saved !== null) {
        return JSON.parse(saved);
      }
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
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
    Happy: "😊",
    Sad: "😔",
    Stressed: "😣",
    Anxious: "😰",
    Neutral: "😐",
  };

  // 🔥 Color map (BONUS)
  const moodColor = {
    Happy: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300",
    Sad: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300",
    Stressed: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-300",
    Anxious: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300",
    Neutral: "bg-gray-200 text-gray-700 dark:bg-slate-700 dark:text-gray-300",
  };

  const [messages, setMessages] = useState([
    {
      text: "Hey, how are you feeling today?",
      sender: "bot",
      time: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    },
  ]);

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
      const res = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput }),
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
            text: "Unable to connect. Please check your backend.",
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
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-300">
      {/* Header */}
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-white/70 dark:bg-slate-900/70 border-b border-gray-200 dark:border-slate-800 px-6 py-4 flex justify-between items-center shadow-sm transition-colors duration-300">
        <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 dark:from-blue-400 dark:to-indigo-400 bg-clip-text text-transparent flex items-center gap-2">
            <Bot className="w-6 h-6 text-blue-500 dark:text-blue-400" />
            AI Mental Health Buddy
          </h1>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-0.5 ml-8">A space to talk and reflect</p>
        </div>
        <button
          onClick={toggleDarkMode}
          className="p-2.5 rounded-full bg-gray-100 hover:bg-gray-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-600 dark:text-gray-300 transition-all duration-300 hover:scale-105 active:scale-95 shadow-inner"
          aria-label="Toggle dark mode"
        >
          {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
        </button>
      </header>

      {/* Chat Area */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6 max-w-4xl w-full mx-auto">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex flex-col ${
              msg.sender === "user" ? "items-end text-right" : "items-start text-left"
            } duration-300 ease-out`}
            style={{ animationFillMode: 'both' }}
          >
            {/* Mood Badge */}
            {msg.sender === "bot" && msg.mood && (
              <span
                className={`text-xs px-2.5 py-1 rounded-full mb-2 inline-flex items-center gap-1 shadow-sm font-medium ${moodColor[msg.mood]} transition-colors duration-300`}
              >
                {moodEmoji[msg.mood] || "😐"} <span className="uppercase tracking-wider text-[10px]">{msg.mood}</span>
              </span>
            )}

            <div
              className={`flex items-end gap-2 max-w-[85%] sm:max-w-lg ${
                msg.sender === "user" ? "flex-row-reverse" : "flex-row"
              }`}
            >
              {/* Avatar */}
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center shadow-sm transition-colors duration-300 ${
                msg.sender === 'user' ? 'bg-indigo-100 dark:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400' : 'bg-blue-100 dark:bg-blue-900/50 text-blue-600 dark:text-blue-400'
              }`}>
                 {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              {/* Message Bubble */}
              <div
                className={`relative px-5 py-3.5 text-sm sm:text-base whitespace-pre-wrap break-words shadow-sm leading-relaxed transition-colors duration-300 ${
                  msg.sender === "user"
                    ? "bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-2xl rounded-br-sm"
                    : "bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100 border border-gray-100 dark:border-slate-700/50 rounded-2xl rounded-bl-sm"
                }`}
              >
                {msg.loading ? (
                  <div className="flex gap-1 items-center h-5 px-1">
                     <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                     <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                     <span className="w-2 h-2 rounded-full bg-gray-400 dark:bg-gray-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
                  </div>
                ) : (
                  msg.text
                )}
              </div>
            </div>

            {/* Timestamp */}
            {!msg.loading && (
              <p className={`text-[11px] text-gray-400 dark:text-gray-500 mt-1.5 transition-colors duration-300 ${msg.sender === 'user' ? 'mr-10' : 'ml-10'}`}>
                {msg.time}
              </p>
            )}
          </div>
        ))}

        <div ref={chatEndRef} className="h-4" />
      </main>

      {/* Input Form */}
      <div className="p-4 sm:p-6 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-t border-gray-200 dark:border-slate-800 transition-colors duration-300">
        <div className="max-w-4xl mx-auto flex gap-3 relative items-end">
          <textarea
            className="flex-1 px-5 py-4 rounded-2xl border border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/50 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500 transition-all duration-300 resize-none text-[15px] shadow-inner"
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
            placeholder="Type how you feel..."
          />

          <button
            onClick={sendMessage}
            disabled={loading || !input.trim()}
            className={`p-4 rounded-2xl flex items-center justify-center transition-all duration-300 shadow-sm ${
              loading || !input.trim()
                ? "bg-gray-100 text-gray-400 dark:bg-slate-800 dark:text-slate-500 cursor-not-allowed"
                : "bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white hover:scale-105 active:scale-95 shadow-blue-500/25"
            }`}
            aria-label="Send message"
          >
             <Send className={`w-5 h-5 ${loading ? 'animate-pulse' : ''} ${!input.trim() && !loading ? 'opacity-50' : 'opacity-100'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default App;
