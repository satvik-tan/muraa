// ⚡ Load .env BEFORE any other import reads process.env
import './config/env.js';

import { WebSocketServer, WebSocket } from "ws";
import { AudioQueue } from "./services/audioQueue.js"
import { startNovaSession } from "./novaConnect.js"

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  const queue = new AudioQueue();

  startNovaSession(ws, queue).catch((err) => {
    console.error("Nova session error:", err.message);
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  });

  ws.on("message", (data: Buffer) => {
    queue.push(data.toString("base64"));
  });

  ws.on("close", () => {
    console.log("Client disconnected");
    queue.push("STOP");
    queue.clear();
  });

  ws.on("error", (err) => {
    console.error("WS error:", err.message);
    queue.push("STOP");
  });
});