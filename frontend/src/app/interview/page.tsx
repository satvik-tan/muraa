"use client";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useNovaSocket } from "@/hooks/useNovaSocket";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { InterviewControls } from "@/components/InterviewControls";
import { InterviewTimer } from "@/components/InterviewTimer";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import type { NovaMessage } from "@/hooks/useNovaSocket";
import type { TranscriptEntry } from "@/components/TranscriptDisplay";


function upsertStreamingTranscript(
  prev: TranscriptEntry[],
  next: TranscriptEntry,
): TranscriptEntry[] {
  const text = next.text.trim();
  if (!text) return prev;

  const last = prev[prev.length - 1];
  if (!last || last.role !== next.role) {
    return [...prev, { ...next, text }];
  }

  if (last.text === text) {
    return prev;
  }

  // Nova textOutput is typically cumulative for the same utterance.
  // Replace the latest same-role bubble instead of appending duplicates.
  if (text.startsWith(last.text) || last.text.startsWith(text)) {
    const merged = text.length >= last.text.length ? text : last.text;
    return [...prev.slice(0, -1), { ...last, text: merged }];
  }

  // **NEW: Check recent same-role messages for similarity**
  // Initial transcripts may arrive rapidly without clear contentName grouping
  const recentSameRole = prev
    .slice(-3) // Check last 3 messages
    .filter((m) => m.role === next.role);
  
  for (const recent of recentSameRole) {
    // If new text is very similar to a recent message (>70% overlap)
    const similarity = calculateSimilarity(recent.text, text);
    if (similarity > 0.7) {
      // Find the index and replace it with the longer version
      const idx = prev.lastIndexOf(recent);
      const merged = text.length >= recent.text.length ? text : recent.text;
      return [...prev.slice(0, idx), { ...recent, text: merged }, ...prev.slice(idx + 1)];
    }
  }

  return [...prev, { ...next, text }];
}

// Calculate text similarity (0-1) using Jaccard index
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = new Set([...wordsA].filter(x => wordsB.has(x)));
  const union = new Set([...wordsA, ...wordsB]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export default function InterviewPage() {
  return (
    <Suspense>
      <InterviewContent />
    </Suspense>
  );
}

function InterviewContent() {
  const searchParams = useSearchParams();
  const jobId = searchParams.get("jobId");
  const sessionId = searchParams.get('interviewID')
  const wsUrl = jobId
    ? `ws://localhost:8080?jobId=${encodeURIComponent(jobId)}`
    : "ws://localhost:8080";

  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [hasInterviewStarted, setHasInterviewStarted] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const { initAudio, playAudio, stopAudio } = useAudioPlayer();

  useEffect(() => {
    if (!isTimerRunning) return;

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

  const handleMessage = useCallback(
    (msg: NovaMessage) => {
      if (msg.type === "transcript")
        setMessages((prev) => upsertStreamingTranscript(prev, { role: "ai", text: msg.text }));
      if (msg.type === "user_transcript")
        setMessages((prev) => upsertStreamingTranscript(prev, { role: "user", text: msg.text }));
      if (msg.type === "audio") playAudio(msg.audio);
      if (msg.type === "turn_end") console.log("Ary finished speaking");
      if (msg.type === "session_end") {
        setSessionEnded(true);
        setIsTimerRunning(false);
        console.log("Session ended");
      }
      if (msg.type === "error") console.error("Error:", msg.message);
    },
    [playAudio],
  );

  const { connect, disconnect, sendAudio, status } = useNovaSocket(handleMessage, wsUrl);
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
    setSessionEnded(false);
    setHasInterviewStarted(true);
    setElapsedSeconds(0);
    setIsTimerRunning(true);
    connect();
  }, [initAudio, connect]);

  const handleDisconnect = useCallback(() => {
    stopRecording();
    setIsTimerRunning(false);
    disconnect();
  }, [stopRecording, disconnect]);

  return (
    <div className="min-h-screen bg-background">

      <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-display font-black text-4xl sm:text-5xl text-foreground leading-tight mb-2">
            CogniHire{" "}
            <span className="text-gradient">Interview</span>
          </h1>
          <p className="font-body text-muted-foreground text-base">
            Connect, start speaking, and let Ary guide you through the session.
          </p>
          {hasInterviewStarted && (
            <div className="mt-4">
              <InterviewTimer seconds={elapsedSeconds} isRunning={isTimerRunning} />
            </div>
          )}
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
