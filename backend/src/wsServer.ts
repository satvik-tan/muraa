// ⚡ Load .env BEFORE any other import reads process.env
import './config/env.js';

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { AudioQueue } from "./services/audioQueue.js";
import { startNovaSession } from "./novaConnect.js";
import { prisma } from "./services/prisma.js";

type InterviewJobContext = {
  title: string;
  description: string;
  companyName: string | null;
  experienceLevel: string | null;
  skills: string[];
};

const wss = new WebSocketServer({ port: 8080 });
console.log("WebSocket server running on ws://localhost:8080");

wss.on("connection", async (ws: WebSocket, req: IncomingMessage) => {
  console.log("Client connected");

  // Parse query params from the WS URL
  // e.g. ws://localhost:8080?jobId=xxx&candidateName=yyy&candidateEmail=zzz
  const url = new URL(req.url ?? "/", "http://localhost:8080");
  const jobId         = url.searchParams.get("jobId");
  const candidateName  = url.searchParams.get("candidateName") ?? "Anonymous";
  const candidateEmail = url.searchParams.get("candidateEmail") ?? "";

  const queue = new AudioQueue();
  let sessionId: string | undefined;
  let jobContext: InterviewJobContext | undefined;

  // Create a DB session if a jobId was provided
  if (jobId) {
    try {
      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        ws.send(JSON.stringify({ type: "error", message: "Job not found" }));
        ws.close();
        return;
      }

      jobContext = {
        title: job.title,
        description: job.description,
        companyName: job.companyName,
        experienceLevel: job.experienceLevel,
        skills: job.skills,
      };

      const session = await prisma.interviewSession.create({
        data: { jobId, candidateName, candidateEmail },
      });
      sessionId = session.id;
      ws.send(JSON.stringify({ type: "session_created", sessionId }));
    } catch (err) {
      console.error("Failed to create interview session:", err);
      ws.send(JSON.stringify({ type: "error", message: "Failed to create session" }));
      ws.close();
      return;
    }
  }

  startNovaSession(ws, queue, { sessionId, jobContext }).catch((err) => {
    console.error("Nova session error:", err.message);
    ws.send(JSON.stringify({ type: "error", message: err.message }));
  });

  ws.on("message", (data: Buffer) => {
    queue.push(data.toString("base64"));
  });

  ws.on("close", async () => {
    console.log("Client disconnected");
    queue.push("STOP");
    queue.clear();
    if (sessionId) {
      await prisma.interviewSession.update({
        where: { id: sessionId },
        data: { isCompleted: true, endedAt: new Date() },
      }).catch(() => {});
    }
  });

  ws.on("error", (err) => {
    console.error("WS error:", err.message);
    queue.push("STOP");
  });
});
