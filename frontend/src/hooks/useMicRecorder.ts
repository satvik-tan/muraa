import { useRef, useState, useCallback } from "react";

const TARGET_SAMPLE_RATE = 16000; // Nova requires 16kHz PCM

export function useMicRecorder(onAudioChunk: (buffer: ArrayBuffer) => void) {
  // Keep the live audio objects outside React state so they persist across renders
  // without causing UI updates whenever they change.
  const processorRef = useRef<AudioWorkletNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const [isRecording, setIsRecording] = useState(false);

  const startRecording = useCallback(async () => {
    if (audioCtxRef.current) return;

    // Ask the browser for microphone access and keep the stream for cleanup later.
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    streamRef.current = stream;

    // AudioContext is the browser's audio processing graph for this recording session.
    const audioCtx = new AudioContext({ sampleRate: 16000 }); // 16kHz for Nova
    audioCtxRef.current = audioCtx;

    // Load the custom worklet that converts float audio samples into PCM16 buffers.
    await audioCtx.audioWorklet.addModule("/worklets/mic-recorder-processor.js");

    // Bring the mic stream into the AudioContext graph.
    const source = audioCtx.createMediaStreamSource(stream);
    sourceRef.current = source;

    // This custom processor receives mic samples and posts back PCM16 chunks.
    const processor = new AudioWorkletNode(audioCtx, "mic-recorder-processor", {
      numberOfInputs: 1,
      numberOfOutputs: 1,
      channelCount: 1,
    });
    processorRef.current = processor;

    // Each message from the worklet is a processed audio chunk ready for websocket sending.
    processor.port.onmessage = (event: MessageEvent<ArrayBuffer>) => {
      onAudioChunk(event.data);
    };

    // Wire mic input into the processor. The destination connection keeps the node
    // active in the audio graph while recording.
    source.connect(processor);
    processor.connect(audioCtx.destination);
    setIsRecording(true);
  }, [onAudioChunk]);

  const stopRecording = useCallback(() => {
    // Tear down the graph and release the microphone cleanly.
    if (processorRef.current) {
      processorRef.current.port.onmessage = null;
    }
    processorRef.current?.disconnect();
    processorRef.current = null;
    sourceRef.current?.disconnect();
    sourceRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    setIsRecording(false);
  }, []);

  return { startRecording, stopRecording, isRecording };
}
