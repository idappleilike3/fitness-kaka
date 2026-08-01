import { toFile } from "openai";
import { getOpenAI } from "@/lib/openai/client";

const WHISPER_MODEL = "whisper-1";

/**
 * Transcribe LINE voice (typically m4a/aac) via OpenAI Whisper.
 * Uses the same OPENAI_API_KEY as chat/vision.
 */
export async function transcribeAudio(
  buffer: Buffer,
  filename = "voice.m4a",
): Promise<{ text: string; model: string }> {
  const openai = getOpenAI();
  const file = await toFile(buffer, filename);
  const res = await openai.audio.transcriptions.create({
    file,
    model: WHISPER_MODEL,
    language: "zh",
  });
  const text = (res.text ?? "").trim();
  if (!text) {
    throw new Error("empty transcription");
  }
  return { text, model: WHISPER_MODEL };
}
