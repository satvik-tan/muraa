import { InvokeModelWithBidirectionalStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "./services/novaClient.js"
import { generateStream } from "./novaStream.js";
import type { SessionSignal } from "./novaStream.js";
import { AudioQueue } from "./services/audioQueue.js"
import { WebSocket } from "ws";

export async function startNovaSession(ws: WebSocket, queue: AudioQueue) {
  // Fresh signal per session — avoids stale resolved promise on reconnect
  const sessionSignal: SessionSignal = { resolve: () => {} };

  const command = new InvokeModelWithBidirectionalStreamCommand({
    modelId: "amazon.nova-2-sonic-v1:0",
    body: generateStream(queue, sessionSignal),
  });

  const response = await bedrockClient.send(command);

  // Track the role for each contentName from contentStart events
  const roleMap = new Map<string, string>();

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
      // role may live on textOutput directly OR in the preceding contentStart
      const role = evt.textOutput.role ?? roleMap.get(evt.textOutput.contentName);
      const isUser = role === "USER";
      ws.send(JSON.stringify({
        type: isUser ? "user_transcript" : "transcript",
        text: evt.textOutput.content,
      }));
    }

    if (evt.audioOutput) ws.send(JSON.stringify({ type: "audio", audio: evt.audioOutput.content }));

    if (evt.contentEnd) {
      const role = roleMap.get(evt.contentEnd.contentName);
      if (role === "ASSISTANT") {
        // Unblock generateStream so it sends promptEnd+sessionEnd to Nova
        sessionSignal.resolve();
        ws.send(JSON.stringify({ type: "turn_end" }));
      }
      roleMap.delete(evt.contentEnd.contentName);
    }

    if (evt.sessionEnd) ws.send(JSON.stringify({ type: "session_end" }));
  }
}