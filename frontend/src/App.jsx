import { useState, useRef, useEffect } from "react";

function App() {
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

  // Auto scroll
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async () => {
    if (!input.trim() || loading) return;

    const currentTime = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });

    const userMsg = { text: input, sender: "user", time: currentTime };
    const loadingMsg = { text: "Thinking...", sender: "bot", loading: true };

    setMessages((prev) => [...prev, userMsg, loadingMsg]);

    const userInput = input;
    setInput("");
    setLoading(true);

    try {
      const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000";

      const res = await fetch(`${API_URL}/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ message: userInput }),
      });

      const data = await res.json();

      const botMsg = {
        text: data.reply, // ✅ no cutting anymore
        sender: "bot",
        time: currentTime,
      };

      setMessages((prev) => prev.map((msg) => (msg.loading ? botMsg : msg)));
    } catch (error) {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.loading
            ? {
                text: "Unable to connect. Try again.",
                sender: "bot",
                time: currentTime,
              }
            : msg
        )
      );
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
      <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth">
        {messages.map((msg, index) => (
          <div
            key={index}
            className={`flex ${
              msg.sender === "user" ? "justify-end" : "justify-start"
            }`}
          >
            <div className="max-w-lg">
              <div
                className={`px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap break-words leading-relaxed ${
                  msg.sender === "user"
                    ? "bg-blue-500 text-white"
                    : "bg-white text-gray-700 border"
                }`}
              >
                {msg.text.split("\n").map((line, i) => (
                  <p key={i} className="mb-2 last:mb-0">
                    {line}
                  </p>
                ))}
              </div>

              {/* timestamp */}
              {!msg.loading && (
                <p className="text-[10px] text-gray-400 mt-1 px-1">
                  {msg.time}
                </p>
              )}
            </div>
          </div>
        ))}

        <div ref={chatEndRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-white border-t flex gap-2 items-end">
        <textarea
          className="flex-1 p-3 rounded-xl border focus:outline-none resize-none text-sm"
          rows={1}
          value={input}
          disabled={loading}
          onChange={(e) => setInput(e.target.value)}
          onInput={(e) => {
            e.target.style.height = "auto";
            e.target.style.height = e.target.scrollHeight + "px";
          }}
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
          className={`px-5 py-2 rounded-xl text-sm text-white transition ${
            loading
              ? "bg-blue-300 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600"
          }`}
        >
          {loading ? "..." : "Send"}
        </button>
      </div>
    </div>
  );
}

export default App;
