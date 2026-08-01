import { describe, it, expect } from "vitest";
import {
  isAudioTooLong,
  MAX_AUDIO_SECONDS,
} from "@/lib/audio/duration";

describe("isAudioTooLong", () => {
  it("allows audio at or under 60 seconds", () => {
    expect(isAudioTooLong(60_000)).toBe(false);
    expect(isAudioTooLong(1)).toBe(false);
    expect(isAudioTooLong(59_999)).toBe(false);
  });

  it("rejects audio longer than 60 seconds", () => {
    expect(isAudioTooLong(60_001)).toBe(true);
    expect(isAudioTooLong(120_000)).toBe(true);
  });

  it("does not reject missing or invalid duration", () => {
    expect(isAudioTooLong(undefined)).toBe(false);
    expect(isAudioTooLong(null)).toBe(false);
    expect(isAudioTooLong(0)).toBe(false);
    expect(isAudioTooLong(-1)).toBe(false);
    expect(isAudioTooLong(Number.NaN)).toBe(false);
  });

  it("exports MAX_AUDIO_SECONDS as 60", () => {
    expect(MAX_AUDIO_SECONDS).toBe(60);
  });
});
