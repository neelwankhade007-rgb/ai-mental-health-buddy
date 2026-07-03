import React from "react";
import ReactMarkdown from "react-markdown";
import { HeartPulse, Smile, Sparkles } from "lucide-react";

export default function ChatArea({
  messages,
  loading,
  affirmation,
  quickPrompts,
  sendQuickPrompt,
  chatEndRef
}) {
  return (
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
        <div
          key={msg.id ?? index}
          className={`flex flex-col gap-1 ${msg.sender === "user" ? "items-end" : "items-start"}`}
        >
          <div className={`flex items-end gap-2.5 max-w-[82%] ${msg.sender === "user" ? "flex-row-reverse" : "flex-row"}`}>
            {/* Avatar */}
            <div
              className={`flex-shrink-0 w-8 h-8 rounded-2xl flex items-center justify-center shadow-md ${
                msg.sender === "user"
                  ? "bg-gradient-to-br from-violet-500 to-indigo-600"
                  : "bg-gradient-to-br from-pink-400 to-rose-500"
              }`}
            >
              {msg.sender === "user" ? (
                <Smile className="w-4 h-4 text-white" />
              ) : (
                <Sparkles className="w-4 h-4 text-white fill-white/30" />
              )}
            </div>

            {/* Bubble */}
            <div
              className={`px-5 py-3.5 text-[14.5px] leading-relaxed break-words transition-all duration-300 ${
                msg.sender === "user"
                  ? `bg-gradient-to-br from-violet-500 to-indigo-600 text-white
                     rounded-2xl rounded-br-md shadow-lg shadow-violet-500/25`
                  : `bg-white dark:bg-slate-800 text-gray-800 dark:text-gray-100
                     rounded-2xl rounded-bl-md
                     border border-gray-100 dark:border-white/5
                     shadow-md shadow-gray-200/60 dark:shadow-black/20`
              }`}
            >
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
                          <code className="bg-black/10 dark:bg-white/10 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
                            {children}
                          </code>
                        ) : (
                          <pre className="bg-gray-900 dark:bg-black/40 text-gray-100 rounded-xl p-4 overflow-x-auto my-2 text-[13px] font-mono">
                            <code {...props}>{children}</code>
                          </pre>
                        );
                      },
                      p({ children }) {
                        return <p className="mb-2 last:mb-0">{children}</p>;
                      },
                      ul({ children }) {
                        return <ul className="list-disc pl-4 mb-2 space-y-1">{children}</ul>;
                      },
                      ol({ children }) {
                        return <ol className="list-decimal pl-4 mb-2 space-y-1">{children}</ol>;
                      },
                      li({ children }) {
                        return <li className="text-[14px]">{children}</li>;
                      },
                      strong({ children }) {
                        return <strong className="font-semibold">{children}</strong>;
                      },
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
  );
}
