import { useRef, useState, useCallback } from "react";

export type NovaMessage =
  | { type: "transcript"; text: string }
  | { type: "audio"; audio: string }
  | { type: "turn_end" }
  | { type: "session_end" }
  | { type: "error"; message: string };

export function useNovaSocket(onMessage: (msg: NovaMessage) => void) {
  const wsRef = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<"idle" | "connected" | "disconnected" | "error">("idle");

  const connect = useCallback(() => {
    const ws = new WebSocket("ws://localhost:8080");
    wsRef.current = ws;

    ws.onopen = () => {
      setStatus("connected");
      console.log("Connected to backend");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as NovaMessage;
      onMessage(data);
    };

    ws.onclose = () => {
      setStatus("disconnected");
    };

    ws.onerror = () => {
      setStatus("error");
    };
  }, [onMessage]);

  const disconnect = useCallback(() => {
    wsRef.current?.close();
    wsRef.current = null;
    setStatus("idle");
  }, []);

  const sendAudio = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buffer);
    }
  }, []);

  return { connect, disconnect, sendAudio, status };
}