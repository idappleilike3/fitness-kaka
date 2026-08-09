import { describe, expect, it } from "vitest";
import { buildGeminiImagePrompt, extractGeminiJson } from "@/lib/gemini/image-understanding";

describe("Gemini image understanding", () => {
  it("requires food photos to return direct nutrition analysis without conversational preface", () => {
    const prompt = buildGeminiImagePrompt();
    expect(prompt).toContain("食物照片不要聊天");
    expect(prompt).toContain("直接回傳營養分析");
    expect(prompt).toContain("非食物圖片才自然聊天");
  });

  it("extracts JSON even when Gemini wraps it in a markdown fence", () => {
    expect(extractGeminiJson('```json\n{"kind":"pet","reply":"好可愛"}\n```')).toBe('{"kind":"pet","reply":"好可愛"}');
  });
});
