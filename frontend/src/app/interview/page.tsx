"use client";

import { useState, useCallback, useEffect } from "react";
import { useNovaSocket } from "@/hooks/useNovaSocket";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { InterviewControls } from "@/components/InterviewControls";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import Navbar from "@/components/Navbar";
import type { NovaMessage } from "@/hooks/useNovaSocket";
import type { TranscriptEntry } from "@/components/TranscriptDisplay";

export default function InterviewPage() {
  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const { initAudio, playAudio, stopAudio } = useAudioPlayer();

  const handleMessage = useCallback(
    (msg: NovaMessage) => {
      if (msg.type === "transcript")
        setMessages((prev) => [...prev, { role: "ai", text: msg.text }]);
      if (msg.type === "user_transcript")
        setMessages((prev) => [...prev, { role: "user", text: msg.text }]);
      if (msg.type === "audio") playAudio(msg.audio);
      if (msg.type === "turn_end") console.log("Nova finished speaking");
      if (msg.type === "session_end") {
        setSessionEnded(true);
        console.log("Session ended");
      }
      if (msg.type === "error") console.error("Error:", msg.message);
    },
    [playAudio],
  );

  const { connect, disconnect, sendAudio, status } = useNovaSocket(handleMessage);
  const { startRecording, stopRecording, isRecording } = useMicRecorder(sendAudio);

  // Stable cleanup on unmount — deps are all stable useCallback refs
  useEffect(() => {
    return () => {
      stopRecording();
      stopAudio();
      disconnect();
    };
  }, [stopRecording, stopAudio, disconnect]);

  const handleConnect = useCallback(() => {
    initAudio(); // create AudioContext inside the click gesture
    connect();
  }, [initAudio, connect]);

  const handleDisconnect = useCallback(() => {
    stopRecording();
    disconnect();
  }, [stopRecording, disconnect]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-black text-4xl sm:text-5xl text-foreground leading-tight mb-2">
            AI Mock{" "}
            <span className="text-gradient">Interview</span>
          </h1>
          <p className="font-body text-muted-foreground text-base">
            Connect, start speaking, and let Nova guide you through the session.
          </p>
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
          {/* Controls card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <h2 className="font-display font-bold text-xl text-foreground mb-5">Controls</h2>
            <InterviewControls
              status={status}
              isRecording={isRecording}
              onConnect={handleConnect}
              onDisconnect={handleDisconnect}
              onStartRecording={startRecording}
              onStopRecording={stopRecording}
            />
          </div>

          {/* Transcript card */}
          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <TranscriptDisplay messages={messages} sessionEnded={sessionEnded} />
          </div>
        </div>
      </main>
    </div>
  );
}