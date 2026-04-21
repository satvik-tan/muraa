import { InvokeModelWithBidirectionalStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "./services/novaClient.js"
import { generateStream } from "./novaStream.js";
import type { SessionSignal } from "./novaStream.js";
import type { JobPromptContext } from "./novaStream.js";
import { AudioQueue } from "./services/audioQueue.js"
import { WebSocket } from "ws";
import { prisma } from "./services/prisma.js";

type StartNovaSessionOptions = {
  sessionId?: string;
  jobContext?: JobPromptContext;
};

// Calculate text similarity using Jaccard index (0-1)
function calculateSimilarity(a: string, b: string): number {
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  
  const intersection = new Set(Array.from(wordsA).filter(x => wordsB.has(x)));
  const union = new Set([...Array.from(wordsA), ...Array.from(wordsB)]);
  
  return union.size === 0 ? 0 : intersection.size / union.size;
}

export async function startNovaSession(
  ws: WebSocket,
  queue: AudioQueue,
  options: StartNovaSessionOptions = {},
) {
  const { sessionId, jobContext } = options;

  // Fresh signal per session — avoids stale resolved promise on reconnect
  const sessionSignal: SessionSignal = { resolve: () => {} };

  const command = new InvokeModelWithBidirectionalStreamCommand({
    modelId: "amazon.nova-2-sonic-v1:0",
    body: generateStream(queue, sessionSignal, { jobContext }),
  });

  const response = await bedrockClient.send(command);

  // Track the role for each contentName from contentStart events
  const roleMap = new Map<string, string>();
  // Keep one DB transcript row per streamed content block.
  const transcriptRowByContentName = new Map<string, { id: string; lastContent: string }>();
  // Track recent transcripts without contentName to prevent duplicates
  const recentTranscripts: Array<{ role: string; content: string; id: string; timestamp: number }> = [];

  for await (const event of response.body!) {
    if (!event.chunk?.bytes) continue;

    const decoded = JSON.parse(Buffer.from(event.chunk.bytes).toString("utf-8"));
    const evt = decoded?.event;

    if (!evt) continue;

    // contentStart carries the role — remember it by contentName
    if (evt.contentStart) {
      const name = evt.contentStart.contentName;
      const role = evt.contentStart.role;
      if (name && role) roleMap.set(name, role);
    }

    if (evt.textOutput) {
      const contentName = evt.textOutput.contentName;
      const content = (evt.textOutput.content ?? "").trim();

      // role may live on textOutput directly OR in the preceding contentStart
      const role = evt.textOutput.role ?? roleMap.get(contentName);
      const isUser = role === "USER";

      ws.send(JSON.stringify({
        type: isUser ? "user_transcript" : "transcript",
        text: content,
      }));

      // Save transcript to DB if this session is tracked.
      // Nova may stream multiple chunks for one contentName, so create once then update.
      if (sessionId && content) {
        if (contentName) {
          const existing = transcriptRowByContentName.get(contentName);

          if (!existing) {
            prisma.transcript
              .create({
                data: {
                  sessionId,
                  role: isUser ? "user" : "nova",
                  content,
                },
              })
              .then((row) => {
                transcriptRowByContentName.set(contentName, {
                  id: row.id,
                  lastContent: content,
                });
              })
              .catch(() => {}); // non-blocking — never fail the stream for a DB error
          } else if (existing.lastContent !== content) {
            transcriptRowByContentName.set(contentName, {
              id: existing.id,
              lastContent: content,
            });

            prisma.transcript
              .update({
                where: { id: existing.id },
                data: { content },
              })
              .catch(() => {}); // non-blocking — never fail the stream for a DB error
          }
        } else {
          // Fallback when provider does not send contentName for text output.
          // Check if similar content was recently saved to prevent duplicates.
          const role = isUser ? "user" : "nova";
          const now = Date.now();
          
          // Clean up old entries (older than 30 seconds)
          const cutoff = now - 30000;
          const validIdx = recentTranscripts.findIndex(r => r.timestamp > cutoff);
          if (validIdx > 0) recentTranscripts.splice(0, validIdx);
          
          // Check for similar recent transcripts of the same role
          let foundSimilar = false;
          for (const recent of recentTranscripts.filter(r => r.role === role)) {
            const similarity = calculateSimilarity(recent.content, content);
            
            // If highly similar (>70%), update existing instead of creating new
            if (similarity > 0.7) {
              foundSimilar = true;
              // Update with the longer/newer content
              if (content.length >= recent.content.length) {
                recent.content = content;
                recent.timestamp = now;
                
                prisma.transcript
                  .update({
                    where: { id: recent.id },
                    data: { content },
                  })
                  .catch(() => {}); // non-blocking
              }
              break;
            }
          }
          
          // Create new transcript only if not similar to recent ones
          if (!foundSimilar) {
            prisma.transcript
              .create({
                data: {
                  sessionId,
                  role,
                  content,
                },
              })
              .then((row) => {
                recentTranscripts.push({ role, content, id: row.id, timestamp: now });
              })
              .catch(() => {}); // non-blocking — never fail the stream for a DB error
          }
        }
      }
    }

    if (evt.audioOutput) ws.send(JSON.stringify({ type: "audio", audio: evt.audioOutput.content }));

    if (evt.contentEnd) {
      const contentName = evt.contentEnd.contentName;
      const role = roleMap.get(contentName);

      if (role === "ASSISTANT") {
        // Unblock generateStream so it sends promptEnd+sessionEnd to Nova
        sessionSignal.resolve();
        ws.send(JSON.stringify({ type: "turn_end" }));
      }
      roleMap.delete(contentName);
      transcriptRowByContentName.delete(contentName);
    }

    if (evt.sessionEnd) ws.send(JSON.stringify({ type: "session_end" }));
  }
}