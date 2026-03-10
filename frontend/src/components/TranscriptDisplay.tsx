"use client";

import { useRef, useEffect, useCallback } from "react";

export type TranscriptEntry = { role: "ai" | "user"; text: string };

type Props = {
  messages: TranscriptEntry[];
  sessionEnded: boolean;
};

export function TranscriptDisplay({ messages, sessionEnded }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleDownload = useCallback(() => {
    const text = messages
      .map((m) => `[${m.role === "ai" ? "Interviewer (Nova)" : "You"}]\n${m.text}`)
      .join("\n\n");
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `interview-transcript-${new Date().toISOString().split("T")[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [messages]);

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-display font-bold text-xl text-foreground">Transcript</h2>
        {messages.length > 0 && (
          <button
            onClick={handleDownload}
            className="flex items-center gap-1.5 text-sm font-body font-medium text-muted-foreground hover:text-foreground border border-border rounded-full px-3 py-1.5 transition-colors hover:bg-muted"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            Download
          </button>
        )}
      </div>

      <div className="flex-1 overflow-y-auto rounded-2xl border border-border bg-background p-4 space-y-4 min-h-75 max-h-130">
        {messages.length === 0 ? (
          <div className="flex items-center justify-center h-70 text-muted-foreground font-body text-sm">
            {sessionEnded
              ? "Session ended. Download your transcript above."
              : "Connect and start speaking — the conversation will appear here."}
          </div>
        ) : (
          messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold font-body shrink-0 ${
                  msg.role === "ai"
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-secondary-foreground"
                }`}
              >
                {msg.role === "ai" ? "AI" : "Me"}
              </div>
              <div
                className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm font-body leading-relaxed ${
                  msg.role === "ai"
                    ? "bg-muted text-foreground rounded-tl-sm"
                    : "bg-primary text-primary-foreground rounded-tr-sm"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}