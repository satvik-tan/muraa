import { useRef, useState, useCallback, useEffect } from "react";

export type NovaMessage =
  | { type: "session_created"; sessionId: string }
  | { type: "transcript"; text: string }
  | { type: "user_transcript"; text: string }
  | { type: "audio"; audio: string }
  | { type: "turn_end" }
  | { type: "session_end" }
  | { type: "error"; message: string };

export function useNovaSocket(onMessage: (msg: NovaMessage) => void, wsUrl = "ws://localhost:8080") {
  const wsRef = useRef<WebSocket | null>(null);
  const mountedRef = useRef(true);
  const [status, setStatus] = useState<"idle" | "connected" | "disconnected" | "error">("idle");

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const connect = useCallback(() => {
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => {
      if (mountedRef.current) setStatus("connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data) as NovaMessage;
      onMessage(data);
    };

    ws.onclose = () => {
      wsRef.current = null;
      if (mountedRef.current) setStatus("disconnected");
    };

    ws.onerror = () => {
      if (mountedRef.current) setStatus("error");
    };
  }, [onMessage, wsUrl]);

  const disconnect = useCallback(() => {
    const ws = wsRef.current;
    if (ws) {
      // Remove handlers before closing to prevent state updates on intentional disconnect
      ws.onclose = null;
      ws.onerror = null;
      ws.close();
      wsRef.current = null;
    }
    if (mountedRef.current) setStatus("idle");
  }, []);

  const sendAudio = useCallback((buffer: ArrayBuffer) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(buffer);
    }
  }, []);

  return { connect, disconnect, sendAudio, status };
}
