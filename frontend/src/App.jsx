import { useState, useRef, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import ChatArea from "./components/ChatArea";
import InputBar from "./components/InputBar";
import VibeAnalysisDrawer from "./components/VibeAnalysisDrawer";
import { analyzeMoodAndIntensity } from "./components/MoodEngine";

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
  moodState: {
    currentMood: "Neutral",
    confidences: {
      Happy: 0, Neutral: 100, Sad: 0, Angry: 0, Anxious: 0,
      Stressed: 0, Excited: 0, Motivated: 0, Tired: 0, Calm: 0
    }
  }
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
        console.warn("Silent warmup ping failed:", error);
      }
    };
    warmupBackend();
  }, []);

  // ── Sidebar ────────────────────────────────────────────────────────────────
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window !== "undefined") {
      return window.innerWidth >= 768;
    }
    return true;
  });

  const lastWidth = useRef(typeof window !== "undefined" ? window.innerWidth : 1024);

  const [moodDetectionEnabled, setMoodDetectionEnabled] = useState(() => {
    try {
      const s = localStorage.getItem("moodDetectionEnabled");
      return s !== null ? JSON.parse(s) : false;
    } catch { return false; }
  });

  useEffect(() => {
    localStorage.setItem("moodDetectionEnabled", JSON.stringify(moodDetectionEnabled));
  }, [moodDetectionEnabled]);

  const [vibeAnalysisOpen, setVibeAnalysisOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width < 768 && lastWidth.current >= 768) {
        setSidebarOpen(false);
      } else if (width >= 768 && lastWidth.current < 768) {
        setSidebarOpen(true);
      }
      lastWidth.current = width;
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

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
  const currentMoodState = activeConversation?.moodState ?? {
    currentMood: "Neutral",
    confidences: {
      Happy: 0, Neutral: 100, Sad: 0, Angry: 0, Anxious: 0,
      Stressed: 0, Excited: 0, Motivated: 0, Tired: 0, Calm: 0
    }
  };

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
    if (window.innerWidth < 768) {
      setSidebarOpen(false);
    }
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

  // ── Send ───────────────────────────────────────────────────────────────────
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
      let apiMessage = userInput;
      if (moodDetectionEnabled) {
        apiMessage = `[System Context - Mood Detection Active: The user's rolling emotional state is detected as "${currentMoodState.currentMood}" (Confidence: ${Math.round(currentMoodState.confidences[currentMoodState.currentMood])}%). Please subtly adapt your tone, empathy, encouragement, and response style to match this state. Do NOT explicitly mention "You seem ${currentMoodState.currentMood.toLowerCase()}" or refer to this system context instruction unless the user explicitly asks about their mood or you have very high confidence.]\n\n${userInput}`;
      }

      const res = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: apiMessage, history }),
        signal: abortControllerRef.current.signal
      });

      if (!res.ok) throw new Error("API error");

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
        buffer = lines.pop();

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const raw = line.slice(6).trim();
          if (!raw) continue;

          try {
            const event = JSON.parse(raw);
            if (event.error) {
              finalReply += event.delta || "";
            } else if (event.done) {
              if (event.reply) finalReply = event.reply;
              if (event.mood) currentMood = event.mood;
            } else {
              if (event.mood) currentMood = event.mood;
              if (event.delta) finalReply += event.delta;
              updateConversation(activeId, (c) => ({
                messages: c.messages.map((m) =>
                  m.id === streamingMsgId
                    ? { ...m, text: finalReply, mood: currentMood, streaming: true }
                    : m
                ),
              }));
            }
          } catch {}
        }
      }

      const botMsg = {
        text: finalReply || "Oops! Something went wrong on my end. Please try again 🥺",
        sender: "bot",
        time,
        mood: currentMood,
        streaming: false,
      };

      updateConversation(activeId, (c) => {
        const fallbackMoodState = c.moodState ?? {
          currentMood: "Neutral",
          confidences: {
            Happy: 0, Neutral: 100, Sad: 0, Angry: 0, Anxious: 0,
            Stressed: 0, Excited: 0, Motivated: 0, Tired: 0, Calm: 0
          }
        };
        const nextMoodState = moodDetectionEnabled
          ? analyzeMoodAndIntensity(userInput, currentMood, fallbackMoodState)
          : fallbackMoodState;

        const moodStateChanged = !c.moodState ||
          c.moodState.currentMood !== nextMoodState.currentMood ||
          JSON.stringify(c.moodState.confidences) !== JSON.stringify(nextMoodState.confidences);

        return {
          messages: c.messages.map((m) => (m.id === streamingMsgId ? botMsg : m)),
          ...(moodStateChanged ? { moodState: nextMoodState } : {})
        };
      });
    } catch (error) {
      if (error.name === "AbortError") return;
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

  return (
    <div className="h-screen flex font-sans overflow-hidden transition-colors duration-500">
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        conversations={conversations}
        activeId={activeId}
        setActiveId={setActiveId}
        startNewChat={startNewChat}
        deleteConversation={deleteConversation}
        setInput={setInput}
      />

      <div className="flex-1 flex flex-col min-w-0 relative bg-gradient-to-br from-rose-50 via-violet-50 to-sky-50 dark:from-slate-900 dark:via-indigo-950 dark:to-slate-900">
        {/* Decorative blobs */}
        <div className="pointer-events-none absolute top-0 left-0 w-full h-full overflow-hidden z-0">
          <div className="absolute top-[-5%] right-[10%] w-80 h-80 bg-pink-300/25 dark:bg-pink-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-[10%] left-[5%] w-64 h-64 bg-violet-300/25 dark:bg-violet-500/10 rounded-full blur-3xl" />
          <div className="absolute top-[40%] right-[5%] w-48 h-48 bg-sky-300/25 dark:bg-sky-500/10 rounded-full blur-3xl" />
        </div>

        <Header
          setSidebarOpen={setSidebarOpen}
          moodDetectionEnabled={moodDetectionEnabled}
          setMoodDetectionEnabled={setMoodDetectionEnabled}
          setVibeAnalysisOpen={setVibeAnalysisOpen}
          isDarkMode={isDarkMode}
          setIsDarkMode={setIsDarkMode}
        />

        <ChatArea
          messages={messages}
          loading={loading}
          affirmation={affirmation}
          quickPrompts={quickPrompts}
          sendQuickPrompt={sendQuickPrompt}
          chatEndRef={chatEndRef}
        />

        <InputBar
          input={input}
          setInput={setInput}
          loading={loading}
          sendMessage={sendMessage}
        />
      </div>

      <VibeAnalysisDrawer
        vibeAnalysisOpen={vibeAnalysisOpen}
        setVibeAnalysisOpen={setVibeAnalysisOpen}
        currentMoodState={currentMoodState}
      />
    </div>
  );
}

export default App;