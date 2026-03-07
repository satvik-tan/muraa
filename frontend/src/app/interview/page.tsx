"use client";

import { useState, useCallback, useEffect } from "react";
import { useNovaSocket } from "@/hooks/useNovaSocket";
import { useMicRecorder } from "@/hooks/useMicRecorder";
import { useAudioPlayer } from "@/hooks/useAudioPlayer";
import { InterviewControls } from "@/components/InterviewControls";
import { TranscriptDisplay } from "@/components/TranscriptDisplay";
import type { NovaMessage } from "@/hooks/useNovaSocket";

export default function InterviewPage() {
  const [transcript, setTranscript] = useState("");
  const { playAudio, stopAudio } = useAudioPlayer();

  // handle all incoming messages from backend
  const handleMessage = useCallback((msg: NovaMessage) => {
    if (msg.type === "transcript") setTranscript((prev) => prev + msg.text);
    if (msg.type === "audio") playAudio(msg.audio);
    if (msg.type === "turn_end") console.log("Nova finished speaking");
    if (msg.type === "session_end") console.log("Session ended");
    if (msg.type === "error") console.error("Error:", msg.message);
  }, [playAudio]);

  const { connect, disconnect, sendAudio, status } = useNovaSocket(handleMessage);
  const { startRecording, stopRecording, isRecording } = useMicRecorder(sendAudio);

  // cleanup on unmount
  useEffect(() => {
    return () => {
      stopRecording();
      stopAudio();
      disconnect();
    };
  }, []);

  return (
    <div style={{ padding: "2rem", fontFamily: "monospace" }}>
      <h1>AI Mock Interview</h1>

      <InterviewControls
        status={status}
        isRecording={isRecording}
        onConnect={connect}
        onDisconnect={disconnect}
        onStartRecording={startRecording}
        onStopRecording={stopRecording}
      />

      <TranscriptDisplay transcript={transcript} />
    </div>
  );
}