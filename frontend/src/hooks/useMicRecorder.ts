import { useRef, useState, useCallback } from "react";

const TARGET_SAMPLE_RATE = 16000; // Nova requires 16kHz PCM

export function useMicRecorder(onAudioChunk: (buffer: ArrayBuffer) => void) {
  const processorRef = useRef<ScriptProcessorNode | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

    // Use the device's native sample rate — forcing 16kHz causes the
    // "different sample-rate" DOMException when connecting the stream source
    const audioCtx = new AudioContext();
    audioCtxRef.current = audioCtx;

    const nativeSampleRate = audioCtx.sampleRate; // e.g. 44100 or 48000
    const resampleRatio = nativeSampleRate / TARGET_SAMPLE_RATE;

    const source = audioCtx.createMediaStreamSource(stream);
    const processor = audioCtx.createScriptProcessor(4096, 1, 1);
    processorRef.current = processor;

    processor.onaudioprocess = (e) => {
      const float32 = e.inputBuffer.getChannelData(0);

      // Downsample from native rate to 16kHz
      const outputLength = Math.round(float32.length / resampleRatio);
      const downsampled = new Float32Array(outputLength);
      for (let i = 0; i < outputLength; i++) {
        downsampled[i] = float32[Math.round(i * resampleRatio)];
      }

      // float32 → int16 PCM
      const int16 = new Int16Array(downsampled.length);
      for (let i = 0; i < downsampled.length; i++) {
        int16[i] = Math.max(-32768, Math.min(32767, downsampled[i] * 32768));
      }
      onAudioChunk(int16.buffer);
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
