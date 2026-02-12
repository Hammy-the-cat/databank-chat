"use client";

import { useState, useEffect } from "react";
import { Send, User, Bot, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export default function ChatPage() {
  const [messages, setMessages] = useState<
    { role: "user" | "bot"; content: string }[]
  >([
    {
      role: "bot",
      content:
        "データバンクAIです。教員向けの情報を検索・提供します。\n知りたいことがあれば、何でも質問してください。",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remaining, setRemaining] = useState<{ remaining: number; limit: number } | null>(null);

  // 残り回数を取得
  useEffect(() => {
    fetch("/api/chat")
      .then((res) => res.json())
      .then((data) => setRemaining({ remaining: data.remaining, limit: data.limit }))
      .catch(() => { });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setMessages((prev) => [...prev, { role: "user", content: userMessage }]);
    setInput("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: userMessage }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || errorData.details || "Failed to fetch response");
      }

      const data = await response.json();
      setMessages((prev) => [
        ...prev,
        { role: "bot", content: data.reply },
      ]);
      // 残り回数を更新
      if (data.remaining !== undefined) {
        setRemaining({ remaining: data.remaining, limit: data.limit });
      }
    } catch (error) {
      console.error("Error sending message:", error);
      setMessages((prev) => [
        ...prev,
        {
          role: "bot",
          content: `エラーが発生しました: ${error instanceof Error ? error.message : "不明なエラー"}`,
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-black text-cyan-300 font-mono flex flex-col items-center py-6 px-4 md:py-10 md:px-[20%] lg:py-16 lg:px-[20%] relative overflow-hidden selection:bg-pink-500 selection:text-white">
      {/* Background Grid Effect */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,255,255,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(0,255,255,0.05)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none"></div>

      {/* Title */}
      <h1 className="text-3xl md:text-6xl lg:text-[120px] font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 via-purple-500 to-pink-500 mb-2 lg:mb-6 tracking-widest drop-shadow-[0_0_10px_rgba(34,211,238,0.8)] z-10 uppercase text-center leading-tight">
        教員データバンク
      </h1>
      <p className="text-xs md:text-lg lg:text-[40px] text-pink-500 mb-2 md:mb-4 lg:mb-8 tracking-[0.3em] lg:tracking-[0.5em] z-10 animate-pulse">SYSTEM: ONLINE</p>
      {remaining && (
        <p className="text-xs md:text-sm lg:text-[24px] z-10 mb-4 md:mb-8 lg:mb-16 tracking-wider">
          <span className="text-cyan-600">REMAINING_QUERIES:</span>
          <span className={cn(
            "ml-2 font-bold",
            remaining.remaining <= 10 ? "text-red-400 animate-pulse" : "text-cyan-300"
          )}>
            {remaining.remaining}
          </span>
          <span className="text-cyan-800"> / {remaining.limit}</span>
        </p>
      )}

      <div className="w-full space-y-4 md:space-y-8 lg:space-y-16 z-10">
        {/* Input Area (Top) */}
        <div className="w-full">
          <label className="block text-center text-cyan-500 mb-2 lg:mb-6 text-sm md:text-xl lg:text-[48px] font-bold tracking-widest uppercase drop-shadow-[0_0_5px_cyan]">
            Please Input Query
          </label>
          <form onSubmit={handleSubmit} className="relative w-full group">
            <div className="absolute -inset-1 bg-gradient-to-r from-cyan-400 to-pink-600 rounded-xl lg:rounded-2xl blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200 animate-tilt"></div>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              placeholder="SEARCH..."
              className="relative w-full px-6 py-10 md:px-10 md:py-16 lg:px-16 lg:py-32 bg-black border-2 lg:border-4 border-cyan-500/50 rounded-xl lg:rounded-3xl focus:outline-none focus:border-cyan-400 text-2xl md:text-4xl lg:text-[60px] text-cyan-100 placeholder-cyan-900 shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-all font-bold tracking-wider"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="absolute right-3 md:right-6 lg:right-10 top-1/2 -translate-y-1/2 p-2 lg:p-6 text-cyan-400 hover:text-white transition-colors animate-pulse"
            >
              <Send className="w-5 h-5 md:w-8 md:h-8 lg:w-20 lg:h-20 drop-shadow-[0_0_5px_cyan]" />
            </button>
          </form>
        </div>

        {/* Output Area (Bottom) */}
        <div className="w-full min-h-[300px] lg:min-h-[800px] bg-black/80 border-2 lg:border-4 border-pink-500/50 rounded-xl lg:rounded-3xl p-1 lg:p-3 shadow-[0_0_15px_rgba(236,72,153,0.3)] relative">
          {/* Decorative Corners */}
          <div className="absolute top-0 left-0 w-3 h-3 lg:w-6 lg:h-6 border-t-2 lg:border-t-4 border-l-2 lg:border-l-4 border-cyan-400"></div>
          <div className="absolute top-0 right-0 w-3 h-3 lg:w-6 lg:h-6 border-t-2 lg:border-t-4 border-r-2 lg:border-r-4 border-cyan-400"></div>
          <div className="absolute bottom-0 left-0 w-3 h-3 lg:w-6 lg:h-6 border-b-2 lg:border-b-4 border-l-2 lg:border-l-4 border-cyan-400"></div>
          <div className="absolute bottom-0 right-0 w-3 h-3 lg:w-6 lg:h-6 border-b-2 lg:border-b-4 border-r-2 lg:border-r-4 border-cyan-400"></div>

          <div className="w-full h-full bg-[#0a0a0a] rounded-lg lg:rounded-2xl py-4 lg:py-10 border lg:border-2 border-white/5 relative overflow-hidden">

            <div className="overflow-y-auto max-h-[60vh] lg:max-h-[900px] custom-scrollbar">
              <div className="w-[90%] md:w-[85%] lg:w-3/4 mx-auto space-y-6 md:space-y-10 lg:space-y-16">
                {messages.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center text-cyan-900 space-y-4 lg:space-y-10 py-10 lg:py-20">
                    <Bot className="w-16 h-16 md:w-24 md:h-24 lg:w-48 lg:h-48 opacity-50 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]" />
                    <p className="tracking-widest text-sm md:text-2xl lg:text-[48px] font-bold">WAITING FOR INPUT...</p>
                  </div>
                ) : (
                  messages.map((msg, index) => (
                    <div
                      key={index}
                      className={cn(
                        "flex w-full",
                        msg.role === "user" ? "justify-end" : "justify-start"
                      )}
                    >
                      <div
                        className={cn(
                          "max-w-full px-4 py-3 md:px-8 md:py-5 lg:px-12 lg:py-8 shadow-lg relative rounded-xl lg:rounded-3xl",
                          msg.role === "user"
                            ? "bg-pink-900/20 text-pink-100"
                            : "bg-cyan-900/20 text-cyan-100"
                        )}
                      >
                        {msg.role === "user" ? (
                          <div className="whitespace-pre-wrap font-bold tracking-wide text-pink-300 text-sm md:text-xl lg:text-[30px] leading-snug">
                            <span className="text-xs md:text-base lg:text-[36px] block text-pink-700 mb-1 lg:mb-4 opacity-70">&gt; USER_LOG:</span>
                            {msg.content}
                          </div>
                        ) : (
                          <div className="max-w-none">
                            <div className="text-xs md:text-base lg:text-[36px] text-cyan-700 mb-2 lg:mb-6 opacity-70 tracking-widest">&gt; SYSTEM_RESPONSE:</div>
                            <div className="text-cyan-100/90 font-medium text-sm md:text-xl lg:text-[30px] leading-relaxed lg:leading-normal [&_p]:mb-3 lg:[&_p]:mb-8 [&_ul]:ml-4 lg:[&_ul]:ml-8 [&_ol]:ml-4 lg:[&_ol]:ml-8 [&_li]:mb-2 lg:[&_li]:mb-4 [&_h1]:text-xl lg:[&_h1]:text-[72px] [&_h1]:text-cyan-300 [&_h1]:mb-3 lg:[&_h1]:mb-6 [&_h2]:text-lg lg:[&_h2]:text-[64px] [&_h2]:text-cyan-300 [&_h2]:mb-2 lg:[&_h2]:mb-5 [&_h3]:text-base lg:[&_h3]:text-[56px] [&_h3]:text-cyan-300 [&_h3]:mb-2 lg:[&_h3]:mb-4 [&_strong]:text-cyan-200 [&_a]:text-pink-400 [&_code]:text-yellow-300">
                              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
                {isLoading && (
                  <div className="flex justify-start w-full">
                    <div className="bg-cyan-900/10 border-2 lg:border-4 border-cyan-500/30 px-4 py-3 md:px-8 md:py-5 lg:px-12 lg:py-8 flex items-center gap-3 lg:gap-8 text-cyan-400 animate-pulse rounded-lg lg:rounded-2xl">
                      <Loader2 className="w-5 h-5 md:w-8 md:h-8 lg:w-16 lg:h-16 animate-spin" />
                      <span className="tracking-widest text-xs md:text-xl lg:text-[40px] font-bold">PROCESSING_DATA...</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
      <style jsx global>{`
                .custom-scrollbar::-webkit-scrollbar {
                    width: 8px;
                }
                @media (min-width: 1024px) {
                    .custom-scrollbar::-webkit-scrollbar {
                        width: 16px;
                    }
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: #000;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: #06b6d4;
                    border-radius: 0;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: #ec4899;
                }
            `}</style>
    </div>
  );
}
