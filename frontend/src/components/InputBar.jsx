import React from "react";
import { Send } from "lucide-react";

export default function InputBar({
  input,
  setInput,
  loading,
  sendMessage
}) {
  return (
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
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Tell me what's on your mind... 💭"
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          aria-label="Send message"
          className={`flex items-center justify-center w-12 h-12 rounded-2xl flex-shrink-0 transition-all duration-300 ${
            loading || !input.trim()
              ? "bg-gray-200 dark:bg-slate-700 text-gray-400 dark:text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-br from-pink-500 to-violet-600 text-white shadow-lg shadow-violet-500/30 hover:scale-110 active:scale-95 hover:shadow-violet-500/50"
          }`}
        >
          <Send className={`w-[18px] h-[18px] ${loading ? "animate-pulse" : ""} -translate-x-px translate-y-px`} />
        </button>
      </div>
    </div>
  );
}
