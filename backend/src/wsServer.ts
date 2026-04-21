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
  const jobIdParam = url.searchParams.get("jobId");
  const sessionIdParam = url.searchParams.get("sessionId");
  const jobId = jobIdParam && jobIdParam.trim().length > 0 ? jobIdParam : null;
  const existingSessionId = sessionIdParam && sessionIdParam.trim().length > 0 ? sessionIdParam : null;
  const candidateName  = url.searchParams.get("candidateName") ?? "Anonymous";
  const candidateEmail = url.searchParams.get("candidateEmail") ?? "";

  const queue = new AudioQueue();
  let sessionId: string | undefined;
  let jobContext: InterviewJobContext | undefined;

  // Reuse an already-created session when provided by the API.
  if (existingSessionId) {
    try {
      const existingSession = await prisma.interviewSession.findUnique({
        where: { id: existingSessionId },
        include: { job: true },
      });

      if (!existingSession) {
        ws.send(JSON.stringify({ type: "error", message: "Interview session not found" }));
        ws.close();
        return;
      }

      if (existingSession.isCompleted) {
        ws.send(JSON.stringify({ type: "error", message: "Interview session is already completed" }));
        ws.close();
        return;
      }

      // Prevent mixed legacy/new clients from pairing a pre-created session (sessionId)
      // with a different legacy jobId, which could bind interview traffic to the wrong job.
      if (jobId && existingSession.jobId !== jobId) {
        ws.send(JSON.stringify({ type: "error", message: "Session does not match the provided job" }));
        ws.close();
        return;
      }

      jobContext = {
        title: existingSession.job.title,
        description: existingSession.job.description,
        companyName: existingSession.job.companyName,
        experienceLevel: existingSession.job.experienceLevel,
        skills: existingSession.job.skills,
      };

      sessionId = existingSession.id;
      ws.send(JSON.stringify({ type: "session_created", sessionId }));
    } catch (err) {
      console.error("Failed to load interview session:", err);
      ws.send(JSON.stringify({ type: "error", message: "Failed to load session" }));
      ws.close();
      return;
    }
  } else if (jobId) {
    // Backward compatibility: create session via WS if no pre-created sessionId is provided.
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
