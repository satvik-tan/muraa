import { useRef, useState, useCallback } from "react";

export function useMicRecorder(onAudioChunk: (buffer: ArrayBuffer) => void) {
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const audioCtx = new AudioContext({ sampleRate: 16000 }); // 16kHz for Nova
    audioCtxRef.current = audioCtx;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      // float32 → int16 PCM
      const float32 = e.inputBuffer.getChannelData(0);
      const int16 = new Int16Array(float32.length);
      for (let i = 0; i < float32.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, float32[i] * 32768));
      }
      onAudioChunk(int16.buffer); // send chunk up
    };

    source.connect(processor);
    processor.connect(audioCtx.destination);
    setIsRecording(true);
  }, [onAudioChunk]);

  const stopRecording = useCallback(() => {
    processorRef.current?.disconnect();
    processorRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsRecording(false);
  }, []);

  return { startRecording, stopRecording, isRecording };
}