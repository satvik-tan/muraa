"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useNovaSocket } from "@/hooks/useNovaSocket";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { InterviewControls } from "@/components/InterviewControls";
import { InterviewTimer } from "@/components/InterviewTimer";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { NovaMessage } from "@/hooks/useNovaSocket";
import type { TranscriptEntry } from "@/components/TranscriptDisplay";
import { useInterviewRecorder } from "@/hooks/useInterviewRecorder";
import { useInterviewUpload } from "@/hooks/useInterviewUpload"

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

interface JobPublic {
  id: string;
  title: string;
  description: string;
  companyName: string | null;
  experienceLevel: string | null;
  skills: string[];
}

type PageState = "loading" | "form" | "ready" | "error";
type UploadState = "idle" | "uploading" | "uploaded" | "redirecting" | "error";

export default function SharedInterviewPage() {
  const params = useParams<{ shareId: string }>();
  const router = useRouter();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [job, setJob] = useState<JobPublic | null>(null);

  // Candidate info from the form
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");

  // WS URL is set after form submission
  const [wsUrl, setWsUrl] = useState("ws://localhost:8080");

  const [messages, setMessages] = useState<TranscriptEntry[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);
  const [interviewSessionId, setInterviewSessionId] = useState<string | null>(null);
  const [hasInterviewStarted, setHasInterviewStarted] = useState(false);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);
  const [uploadState, setUploadState] = useState<UploadState>("idle");
  const [uploadError, setUploadError] = useState<string | null>(null);

  const { start, connectToNova, stop } = useInterviewRecorder()
  const { uploadRecording } = useInterviewUpload()


  // Fetch job info on mount
  useEffect(() => {
    if (!params.shareId) return;
    fetch(`http://localhost:8000/api/jobs/share/${params.shareId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) { setJob(data.data); setPageState("form"); }
        else setPageState("error");
      })
      .catch(() => setPageState("error"));
  }, [params.shareId]);

  const { initAudio, playAudio, stopAudio, getAudioContext } = useAudioPlayer();

  useEffect(() => {
    if (!isTimerRunning) return;

    const intervalId = window.setInterval(() => {
      setElapsedSeconds((current) => current + 1);
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [isTimerRunning]);

  const handleMessage = useCallback(
    async (msg: NovaMessage) => {
      if (msg.type === "session_created")
        setInterviewSessionId(msg.sessionId);
      if (msg.type === "transcript")
        setMessages((prev) => upsertStreamingTranscript(prev, { role: "ai", text: msg.text }));
      if (msg.type === "user_transcript")
        setMessages((prev) => upsertStreamingTranscript(prev, { role: "user", text: msg.text }));
      if (msg.type === "audio") {
        playAudio(msg.audio, connectToNova)
      };
      if (msg.type === "turn_end") console.log("Nova finished speaking");
      if (msg.type === "session_end") {
        setSessionEnded(true);
        setIsTimerRunning(false);
      }
      if (msg.type === "error") console.error("Error:", msg.message);
    },
    [playAudio,connectToNova],
  );

  const { connect, disconnect, sendAudio, status } = useNovaSocket(handleMessage, wsUrl);
  const { startRecording, stopRecording, isRecording, streamRef } = useMicRecorder(sendAudio);

  useEffect(() => {
    return () => {
      stopRecording();
      stopAudio();
      disconnect();
    };
  }, [disconnect, stopAudio, stopRecording]);

  const handleConnect = useCallback(async () => {
    initAudio();
    setSessionEnded(false);
    setHasInterviewStarted(true);
    setElapsedSeconds(0);
    setIsTimerRunning(true);
    connect();
  }, [initAudio, connect]);

  const handleDisconnect = useCallback(async () => {
    if (uploadState !== "idle") return;

    setUploadError(null);
    setUploadState("uploading");
    stopRecording();
    setIsTimerRunning(false);
    setSessionEnded(true);
    stopAudio();
    disconnect();

    try {
      const blob = await stop();
      if (interviewSessionId) {
        await uploadRecording(interviewSessionId, blob);
      }

      setUploadState("uploaded");
      window.setTimeout(() => {
        setUploadState("redirecting");
        router.replace("/dashboard");
      }, 900);
    } catch (error) {
      setUploadState("error");
      setUploadError(error instanceof Error ? error.message : "Upload failed");
    }
  }, [disconnect, interviewSessionId, router, stop, stopAudio, stopRecording, uploadRecording, uploadState]);

  // Form submission — validate and transition to interview
  function handleFormSubmit() {
    setFormError("");
    if (!name.trim()) { setFormError("Please enter your name."); return; }
    if (!email.trim() || !email.includes("@")) { setFormError("Please enter a valid email."); return; }
    if (!job) return;

    const url =
      `ws://localhost:8080?jobId=${encodeURIComponent(job.id)}` +
      `&candidateName=${encodeURIComponent(name.trim())}` +
      `&candidateEmail=${encodeURIComponent(email.trim())}`;

    setWsUrl(url);
    setPageState("ready");
  }

  const handleStartRecording = useCallback(async () => {
    await startRecording()
    start(streamRef.current, getAudioContext)
  }, [streamRef, start, startRecording, getAudioContext])

  const levelColors: Record<string, string> = {
    Junior: "bg-green-500/10 text-green-700 dark:text-green-400",
    Mid: "bg-blue-500/10 text-blue-700 dark:text-blue-400",
    Senior: "bg-purple-500/10 text-purple-700 dark:text-purple-400",
  };

  // ── Loading ──────────────────────────────────────────────────────────────
  if (pageState === "loading") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
          <div className="rounded-2xl border border-border bg-card h-48 animate-pulse" />
        </main>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (pageState === "error" || !job) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16 text-center">
          <h1 className="font-display font-black text-3xl text-foreground mb-3">Interview Not Found</h1>
          <p className="text-muted-foreground">This interview link is invalid or has been removed.</p>
        </main>
      </div>
    );
  }

  // ── Candidate info form ──────────────────────────────────────────────────
  if (pageState === "form") {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <main className="container mx-auto max-w-2xl px-4 pt-28 pb-16">
          {/* Job header */}
          <div className="mb-8">
            <div className="flex items-center gap-3 flex-wrap mb-1">
              <h1 className="font-display font-black text-4xl text-foreground leading-tight">
                {job.title}
              </h1>
              {job.experienceLevel && (
                <span className={`text-sm font-semibold px-3 py-1 rounded-full ${levelColors[job.experienceLevel] ?? "bg-muted text-muted-foreground"}`}>
                  {job.experienceLevel}
                </span>
              )}
            </div>
            {job.companyName && (
              <p className="text-muted-foreground text-base mb-2">{job.companyName}</p>
            )}
            {job.skills.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-3">
                {job.skills.map((s) => (
                  <Badge key={s} variant="secondary" className="text-xs">{s}</Badge>
                ))}
              </div>
            )}
            <p className="text-muted-foreground text-sm max-w-xl">{job.description}</p>
          </div>

          {/* Candidate form */}
          <div className="rounded-2xl border border-border bg-card p-8 shadow-sm">
            <h2 className="font-display font-bold text-xl text-foreground mb-1">
              Before we begin
            </h2>
            <p className="text-sm text-muted-foreground mb-6">
              Enter your details so the recruiter can identify your submission.
            </p>

            <div className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Your name</label>
                <Input
                  placeholder="Jane Smith"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFormSubmit()}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-sm font-medium">Email address</label>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleFormSubmit()}
                />
              </div>
              {formError && <p className="text-sm text-destructive">{formError}</p>}
              <Button className="w-full mt-2" onClick={handleFormSubmit}>
                Start Interview
              </Button>
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ── Interview UI ─────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto max-w-5xl px-4 pt-28 pb-16">
        {/* Job header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-1 flex-wrap">
            <h1 className="font-display font-black text-4xl sm:text-5xl text-foreground leading-tight">
              {job.title}
            </h1>
            {job.experienceLevel && (
              <span className={`text-sm font-semibold px-3 py-1 rounded-full ${levelColors[job.experienceLevel] ?? "bg-muted text-muted-foreground"}`}>
                {job.experienceLevel}
              </span>
            )}
          </div>
          {job.companyName && (
            <p className="text-muted-foreground text-base mb-2">{job.companyName}</p>
          )}
          <p className="text-muted-foreground text-sm">
            Interviewing as <span className="font-medium text-foreground">{name}</span>
          </p>
          {hasInterviewStarted && (
            <div className="mt-4">
              <InterviewTimer seconds={elapsedSeconds} isRunning={isTimerRunning} />
            </div>
          )}
        </div>

        {/* Interview UI */}
        <div className="relative">
          <div className={`grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start transition-opacity duration-300 ${uploadState === "idle" ? "" : "opacity-35 pointer-events-none"}`}>
            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <h2 className="font-display font-bold text-xl text-foreground mb-5">Controls</h2>
              <InterviewControls
                status={status}
                isRecording={isRecording}
                disabled={uploadState !== "idle"}
                onConnect={handleConnect}
                onDisconnect={handleDisconnect}
                onStartRecording={handleStartRecording}
                onStopRecording={stopRecording}
              />
            </div>

            <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
              <TranscriptDisplay messages={messages} sessionEnded={sessionEnded} />
            </div>
          </div>

          {uploadState !== "idle" && (
            <div className="absolute inset-0 z-10 flex items-center justify-center rounded-2xl border border-border bg-background/85 p-6 backdrop-blur-sm">
              <div className="w-full max-w-md rounded-2xl border border-border bg-card p-6 shadow-lg">
                {uploadState === "error" ? (
                  <>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/15 text-destructive">
                      <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 9v4" />
                        <path d="M12 17h.01" />
                        <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
                      </svg>
                    </div>
                    <h3 className="font-display text-2xl font-bold text-foreground">Upload failed</h3>
                    <p className="mt-2 text-sm text-muted-foreground">{uploadError ?? "We couldn't upload the interview recording."}</p>
                  </>
                ) : (
                  <>
                    <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                      {uploadState === "uploaded" || uploadState === "redirecting" ? (
                        <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 6 9 17l-5-5" />
                        </svg>
                      ) : (
                        <svg className="animate-spin" xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                        </svg>
                      )}
                    </div>
                    <h3 className="font-display text-2xl font-bold text-foreground">
                      {uploadState === "uploaded" || uploadState === "redirecting" ? "Interview uploaded" : "Uploading interview…"}
                    </h3>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {uploadState === "uploaded" || uploadState === "redirecting"
                        ? "Your interview recording is saved. Redirecting you back to the dashboard."
                        : "Please wait while we save your interview recording."}
                    </p>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
