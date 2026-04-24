// ⚡ Load .env BEFORE any other import reads process.env
import './config/env.js';

import { WebSocketServer, WebSocket } from "ws";
import { IncomingMessage } from "http";
import { AudioQueue } from "./services/audioQueue.js";
import { startNovaSession } from "./novaConnect.js";
import { prisma } from "./services/prisma.js";
import { verifyStackAccessToken } from "./middleware/stackAuth.middleware.js";

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
  const applicationId = url.searchParams.get("applicationId");
  const accessToken = url.searchParams.get("accessToken");
  const candidateName  = url.searchParams.get("candidateName") ?? "Anonymous";
  const candidateEmail = url.searchParams.get("candidateEmail") ?? "";

  const queue = new AudioQueue();
  let sessionId: string | undefined;
  let jobContext: InterviewJobContext | undefined;

  // Create a DB session only for authenticated candidates with approved application.
  if (jobId) {
    try {
      if (!accessToken) {
        ws.send(JSON.stringify({ type: "error", message: "Missing access token" }));
        ws.close();
        return;
      }

      if (!applicationId) {
        ws.send(JSON.stringify({ type: "error", message: "Missing approved application" }));
        ws.close();
        return;
      }

      const payload = await verifyStackAccessToken(accessToken);
      const stackUserId = payload.sub;
      if (!stackUserId || typeof stackUserId !== "string") {
        ws.send(JSON.stringify({ type: "error", message: "Invalid access token" }));
        ws.close();
        return;
      }

      const user = await prisma.user.findUnique({ where: { stackUserId } });
      if (!user) {
        ws.send(JSON.stringify({ type: "error", message: "User not found" }));
        ws.close();
        return;
      }

      if (user.role !== "CANDIDATE") {
        ws.send(JSON.stringify({ type: "error", message: "Only candidates can start interviews" }));
        ws.close();
        return;
      }

      const job = await prisma.job.findUnique({ where: { id: jobId } });
      if (!job) {
        ws.send(JSON.stringify({ type: "error", message: "Job not found" }));
        ws.close();
        return;
      }

      const application = await prisma.application.findUnique({
        where: { id: applicationId },
      });

      if (!application || application.jobId !== job.id || application.candidateId !== user.id) {
        ws.send(JSON.stringify({ type: "error", message: "Application not valid for this job and user" }));
        ws.close();
        return;
      }

      if (application.status !== "APPROVED") {
        ws.send(JSON.stringify({ type: "error", message: "Application must be approved before interview" }));
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
        data: {
          jobId,
          applicationId: application.id,
          userId: user.id,
          candidateName,
          candidateEmail,
        },
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
