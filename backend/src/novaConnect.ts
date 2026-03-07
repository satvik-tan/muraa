import { InvokeModelWithBidirectionalStreamCommand } from "@aws-sdk/client-bedrock-runtime";
import { bedrockClient } from "./services/novaClient.js"
import { generateStream, resolveSession } from "./novaStream.js";
import { AudioQueue } from "./services/audioQueue.js"
import { WebSocket } from "ws";

export async function startNovaSession(ws: WebSocket, queue: AudioQueue) {
  const command = new InvokeModelWithBidirectionalStreamCommand({
    modelId: "amazon.nova-2-sonic-v1:0",
    body: generateStream(queue),
  });

  const response = await bedrockClient.send(command);

  for await (const event of response.body!) {
    if (!event.chunk?.bytes) continue;

    const decoded = JSON.parse(Buffer.from(event.chunk.bytes).toString("utf-8"));
    const evt = decoded?.event;

    if (!evt) continue;

    if (evt.textOutput) ws.send(JSON.stringify({ type: "transcript", text: evt.textOutput.content }));
    if (evt.audioOutput) ws.send(JSON.stringify({ type: "audio", audio: evt.audioOutput.content }));
    if (evt.contentEnd) { resolveSession(); ws.send(JSON.stringify({ type: "turn_end" })); }
    if (evt.sessionEnd) ws.send(JSON.stringify({ type: "session_end" }));
  }
}