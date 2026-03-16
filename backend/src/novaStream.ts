import { randomUUID } from "crypto";
import { AudioQueue } from "./services/audioQueue.js";

const encoder = new TextEncoder();

// Signal is created fresh per session inside generateStream — see SessionSignal type
export type SessionSignal = { resolve: () => void };

function encodeEvent(event: object) {
  return {
    chunk: {
      bytes: encoder.encode(JSON.stringify({ event })),
    },
  };
}

export async function* generateStream(queue: AudioQueue, sessionSignal: SessionSignal) {
  const promptName = randomUUID();
  const systemContentName = randomUUID();
  const userTextContentName = randomUUID();
  const userAudioContentName = randomUUID();

  // 1. Session start
  yield encodeEvent({
    sessionStart: {
      inferenceConfiguration: { maxTokens: 1024, topP: 0.9, temperature: 0.7 },
    },
  });

  // 2. Prompt start
  yield encodeEvent({
    promptStart: {
      promptName,
      textOutputConfiguration: { mediaType: "text/plain" },
      audioOutputConfiguration: {
        mediaType: "audio/lpcm",
        sampleRateHertz: 24000,
        sampleSizeBits: 16,
        channelCount: 1,
        voiceId: "matthew",
        encoding: "base64",
        audioType: "SPEECH",
      },
      audioInputConfiguration: {
        mediaType: "audio/lpcm",
        sampleRateHertz: 16000,
        sampleSizeBits: 16,
        channelCount: 1,
        encoding: "base64",
      },
    },
  });

  // 3. System prompt
  yield encodeEvent({ contentStart: { promptName, contentName: systemContentName, type: "TEXT", interactive: false, role: "SYSTEM", textInputConfiguration: { mediaType: "text/plain" } } });
  yield encodeEvent({
    textInput: {
      promptName,
      contentName: systemContentName,
      content:
        "You are an interviewer conducting a live candidate interview. Ask exactly one concise question at a time and wait for the candidate reply before asking the next question. Do not answer your own questions and do not invent candidate responses. Start with personal background questions first: full name, current role, years of experience, primary tech stack, and target role. After collecting these basics, continue to role-relevant technical and behavioral questions.",
    },
  });
  yield encodeEvent({ contentEnd: { promptName, contentName: systemContentName } });

  // 4. User text — kick off conversation
  yield encodeEvent({ contentStart: { promptName, contentName: userTextContentName, type: "TEXT", interactive: false, role: "USER", textInputConfiguration: { mediaType: "text/plain" } } });
  yield encodeEvent({ textInput: { promptName, contentName: userTextContentName, content: "Hello, I am ready for the interview." } });
  yield encodeEvent({ contentEnd: { promptName, contentName: userTextContentName } });

  // 5. User audio — live stream from browser via queue
  yield encodeEvent({ contentStart: { promptName, contentName: userAudioContentName, type: "AUDIO", interactive: true, role: "USER", audioInputConfiguration: { mediaType: "audio/lpcm", sampleRateHertz: 16000, sampleSizeBits: 16, channelCount: 1, encoding: "base64" } } });

  // keep feeding audio chunks from the queue until client stops
  while (true) {
    const chunk = await queue.pop();
    if (chunk === "STOP") break; // client signals end of audio
    yield encodeEvent({
      audioInput: {
        promptName,
        contentName: userAudioContentName,
        content: chunk, // base64 PCM from browser
      },
    });
  }

  yield encodeEvent({ contentEnd: { promptName, contentName: userAudioContentName } });

  // wait for Nova to finish responding — resolved externally when ASSISTANT contentEnd arrives
  const sessionDone = new Promise<void>((res) => { sessionSignal.resolve = res; });
  await sessionDone;

  yield encodeEvent({ promptEnd: { promptName } });
  yield encodeEvent({ sessionEnd: {} });
}