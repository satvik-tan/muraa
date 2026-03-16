"use client";

import { useState, useCallback, useEffect } from "react";
import { useParams } from "next/navigation";
import { useNovaSocket } from "@/hooks/useNovaSocket";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { InterviewControls } from "@/components/InterviewControls";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import Navbar from "@/components/Navbar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  return [...prev, { ...next, text }];
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

export default function SharedInterviewPage() {
  const params = useParams<{ shareId: string }>();

  const [pageState, setPageState] = useState<PageState>("loading");
  const [job, setJob] = useState<JobPublic | null>(null);

  // Candidate info from the form
  const [name, setName]   = useState("");
  const [email, setEmail] = useState("");
  const [formError, setFormError] = useState("");

  // WS URL is set after form submission
  const [wsUrl, setWsUrl] = useState("ws://localhost:8080");

  const [messages, setMessages]       = useState<TranscriptEntry[]>([]);
  const [sessionEnded, setSessionEnded] = useState(false);

  // Fetch job info on mount
  useEffect(() => {
    if (!params.shareId) return;
    fetch(`http://localhost:5000/api/jobs/share/${params.shareId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.success) { setJob(data.data); setPageState("form"); }
        else setPageState("error");
      })
      .catch(() => setPageState("error"));
  }, [params.shareId]);

  const { initAudio, playAudio, stopAudio } = useAudioPlayer();

  const handleMessage = useCallback(
    (msg: NovaMessage) => {
      if (msg.type === "transcript")
        setMessages((prev) => upsertStreamingTranscript(prev, { role: "ai", text: msg.text }));
      if (msg.type === "user_transcript")
        setMessages((prev) => upsertStreamingTranscript(prev, { role: "user", text: msg.text }));
      if (msg.type === "audio") playAudio(msg.audio);
      if (msg.type === "turn_end") console.log("Nova finished speaking");
      if (msg.type === "session_end") setSessionEnded(true);
      if (msg.type === "error") console.error("Error:", msg.message);
    },
    [playAudio],
  );

  const { connect, disconnect, sendAudio, status } = useNovaSocket(handleMessage, wsUrl);
  const { startRecording, stopRecording, isRecording } = useMicRecorder(sendAudio);

  useEffect(() => {
    return () => {
      stopRecording();
      stopAudio();
      disconnect();
    };
  }, [stopRecording, stopAudio, disconnect]);

  const handleConnect = useCallback(() => {
    initAudio();
    connect();
  }, [initAudio, connect]);

  const handleDisconnect = useCallback(() => {
    stopRecording();
    disconnect();
  }, [stopRecording, disconnect]);

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
        </div>

        {/* Interview UI */}
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-6 items-start">
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

          <div className="rounded-2xl border border-border bg-card p-6 shadow-sm">
            <TranscriptDisplay messages={messages} sessionEnded={sessionEnded} />
          </div>
        </div>
      </main>
    </div>
  );
}
