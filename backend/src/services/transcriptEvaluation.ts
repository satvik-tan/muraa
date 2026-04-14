import { createHash } from "crypto";

export type TranscriptRow = {
  role: "user" | "nova";
  content: string;
  timestamp: Date;
};

export type TranscriptEvaluation = {
  cognitive_score: number;
  communication_score: number;
  growth_score: number;
  culture_score: number;
  summary: string;
  strengths: string[];
  weaknesses: string[];
};

type CachedEvaluation = {
  transcriptHash: string;
  result: TranscriptEvaluation;
  createdAt: number;
};

const cache = new Map<string, CachedEvaluation>();
const CACHE_TTL_MS = 1000 * 60 * 30;

function normalizeScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return 1;
  if (n < 1) return 1;
  if (n > 5) return 5;
  return Math.round(n);
}

function normalizeList(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((v) => String(v ?? "").trim())
    .filter(Boolean)
    .slice(0, 3);
}

function normalizeSummary(value: unknown): string {
  const text = String(value ?? "").trim();
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 2);
  return lines.join("\n").slice(0, 320);
}

function tryParseJson(raw: string): Record<string, unknown> | null {
  try {
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    const start = raw.indexOf("{");
    const end = raw.lastIndexOf("}");
    if (start === -1 || end === -1 || end <= start) return null;
    try {
      return JSON.parse(raw.slice(start, end + 1)) as Record<string, unknown>;
    } catch {
      return null;
    }
  }
}

function sanitizeTranscript(transcript: TranscriptRow[]): string {
  const filler = /\b(um+|uh+|like|you know|i mean|sort of|kind of)\b/gi;

  return transcript
    .map((row) => {
      const speaker = row.role === "user" ? "Candidate" : "Interviewer";
      const cleaned = row.content
        .replace(/\s+/g, " ")
        .replace(filler, "")
        .replace(/\s{2,}/g, " ")
        .trim();
      return cleaned ? `${speaker}: ${cleaned}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

function buildPrompt(cleanedTranscript: string): string {
  return `Evaluate the interview transcript.

Score candidate (1-5):
1. Cognitive Agility
2. Communication
3. Growth & Coachability
4. Cultural Fit

Return ONLY valid JSON:
{
  "cognitive_score": number,
  "communication_score": number,
  "growth_score": number,
  "culture_score": number,
  "summary": "max 2 lines",
  "strengths": ["max 3 points"],
  "weaknesses": ["max 3 points"]
}

Transcript:
${cleanedTranscript}`;
}

function normalizeEvaluation(input: Record<string, unknown>): TranscriptEvaluation {
  return {
    cognitive_score: normalizeScore(input.cognitive_score),
    communication_score: normalizeScore(input.communication_score),
    growth_score: normalizeScore(input.growth_score),
    culture_score: normalizeScore(input.culture_score),
    summary: normalizeSummary(input.summary),
    strengths: normalizeList(input.strengths),
    weaknesses: normalizeList(input.weaknesses),
  };
}

export function getCachedEvaluation(sessionId: string, transcriptHash: string): TranscriptEvaluation | null {
  const existing = cache.get(sessionId);
  if (!existing) return null;
  if (Date.now() - existing.createdAt > CACHE_TTL_MS) {
    cache.delete(sessionId);
    return null;
  }
  if (existing.transcriptHash !== transcriptHash) return null;
  return existing.result;
}

export function hashTranscript(transcript: TranscriptRow[]): string {
  const payload = transcript.map((t) => `${t.role}|${t.timestamp.toISOString()}|${t.content}`).join("\n");
  return createHash("sha256").update(payload).digest("hex");
}

export function setCachedEvaluation(sessionId: string, transcriptHash: string, result: TranscriptEvaluation): void {
  cache.set(sessionId, {
    transcriptHash,
    result,
    createdAt: Date.now(),
  });
}

async function evaluateWithGroq(cleanedTranscript: string): Promise<TranscriptEvaluation> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing in backend environment");
  }

  const primaryModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";
  const modelCandidates = [
    primaryModel,
    "llama-3.3-70b-versatile",
    "llama-3.1-8b-instant",
  ].filter((m, i, arr) => Boolean(m) && arr.indexOf(m) === i);

  const prompt = buildPrompt(cleanedTranscript);
  let lastError: unknown = null;

  for (const modelName of modelCandidates) {
    try {
      const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelName,
          temperature: 0.1,
          max_tokens: 420,
          response_format: { type: "json_object" },
          messages: [
            {
              role: "user",
              content: prompt,
            },
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Groq API error (${response.status}) for model ${modelName}: ${errorText}`);
      }

      const payload = (await response.json()) as {
        choices?: Array<{ message?: { content?: string } }>;
      };

      const rawText = payload.choices?.[0]?.message?.content?.trim() || "";
      const parsed = tryParseJson(rawText);
      if (!parsed) {
        throw new Error(`Groq returned non-JSON output for model ${modelName}`);
      }

      return normalizeEvaluation(parsed);
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      const canFallback =
        message.includes("429") ||
        message.includes("503") ||
        message.includes("404") ||
        message.includes("non-JSON");
      if (!canFallback) {
        throw error;
      }
    }
  }

  if (lastError instanceof Error) throw lastError;
  throw new Error("Groq evaluation failed for all configured models");
}

export async function evaluateTranscript(transcript: TranscriptRow[]): Promise<TranscriptEvaluation> {
  const cleanedTranscript = sanitizeTranscript(transcript);
  if (!cleanedTranscript) {
    throw new Error("Transcript is empty after cleanup");
  }

  return evaluateWithGroq(cleanedTranscript);
}