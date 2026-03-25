import { useState, useRef, useEffect } from "react";

function App() {
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
    Happy: "bg-green-100 text-green-700",
    Sad: "bg-blue-100 text-blue-700",
    Stressed: "bg-yellow-100 text-yellow-700",
    Anxious: "bg-red-100 text-red-700",
    Neutral: "bg-gray-200 text-gray-700",
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
    <div className="h-screen flex flex-col bg-gradient-to-br from-blue-50 to-blue-100">
      {/* Header */}
      <div className="p-4 text-center border-b bg-white">
        <h1 className="text-lg font-semibold text-gray-800">
          AI Mental Health Buddy
        </h1>
        <p className="text-sm text-gray-500">A space to talk and reflect</p>
      </div>

      {/* Chat */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className="max-w-lg">
              {/* 🔥 MOOD BADGE (NEW) */}
              {msg.sender === "bot" && msg.mood && (
                <span
                  className={`text-xs px-2 py-1 rounded-full mb-1 inline-block ${moodColor[msg.mood]}`}
                >
                  {moodEmoji[msg.mood] || "😐"} {msg.mood}
                </span>
              )}

              {/* Message Bubble */}
              <div
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border"
                }`}
              >
                {msg.text}
              </div>

              {/* Timestamp */}
              {!msg.loading && (
                <p className="text-[10px] text-gray-400 mt-1">{msg.time}</p>
              )}
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex gap-2">
        <textarea
          className="flex-1 p-3 rounded-xl border resize-none text-sm"
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
          disabled={loading}
          className={`px-5 py-2 rounded-xl text-white ${
            loading ? "bg-blue-300" : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default App;
