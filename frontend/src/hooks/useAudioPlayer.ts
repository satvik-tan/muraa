import { useRef, useCallback } from "react";

export function useAudioPlayer() {
  const audioCtxRef = useRef<AudioContext | null>(null);
  const nextPlayTimeRef = useRef<number>(0);

  // Call this inside a user-gesture handler (e.g. Connect click) so the browser
  // activates the AudioContext before any audio arrives from the WebSocket.
  const initAudio = useCallback(() => {
    if (audioCtxRef.current && audioCtxRef.current.state !== "closed") return;
    audioCtxRef.current = new AudioContext({ sampleRate: 24000 });
    nextPlayTimeRef.current = 0;
    // resume() here is redundant when called from a gesture, but belt-and-suspenders
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
  }, []);

  const playAudio = useCallback((base64: string,onSourceCreated?:(source:AudioBufferSourceNode)=>void) => {
    console.log("playAudio called, AudioContext state:", audioCtxRef.current?.state)
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);

    const pcm16 = new Int16Array(bytes.buffer);
    const float32 = new Float32Array(pcm16.length);
    for (let i = 0; i < pcm16.length; i++) float32[i] = pcm16[i] / 32768;

    // Reuse existing ctx; create one if somehow missing (fallback)
    const audioCtx = audioCtxRef.current ?? new AudioContext({ sampleRate: 24000 });
    audioCtxRef.current = audioCtx;

    const schedule = () => {
      const buffer = audioCtx.createBuffer(1, float32.length, 24000);
      buffer.copyToChannel(float32, 0);
      const source = audioCtx.createBufferSource();
      source.buffer = buffer;
      source.connect(audioCtx.destination);

      onSourceCreated?.(source)
      const startTime = Math.max(audioCtx.currentTime, nextPlayTimeRef.current);
      source.start(startTime);
      nextPlayTimeRef.current = startTime + buffer.duration;
    };

    if (audioCtx.state === "suspended") {
      audioCtx.resume().then(schedule);
    } else {
      schedule();
    }
  }, []);

  const stopAudio = useCallback(() => {
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    nextPlayTimeRef.current = 0;
  }, []);

  const getAudioContext = useCallback(()=>audioCtxRef.current,[])

  return { initAudio, playAudio, stopAudio,getAudioContext };
}