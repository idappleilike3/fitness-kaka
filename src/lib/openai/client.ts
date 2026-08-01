import OpenAI from "openai";
import { getOpenAIEnv } from "@/lib/env";

let client: OpenAI | null = null;

export function getOpenAI(): OpenAI {
  if (client) return client;
  client = new OpenAI({ apiKey: getOpenAIEnv().OPENAI_API_KEY });
  return client;
}
