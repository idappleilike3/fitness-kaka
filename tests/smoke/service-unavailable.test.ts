import { describe, expect, it } from "vitest";
import {
  ADMIN_HINT_OPENAI,
  featureUnavailableMessage,
  parseHealthAdminHint,
  USER_MSG_BUSY,
  USER_MSG_ENV,
  USER_MSG_NEWEBPAY,
  USER_MSG_OPENAI,
  USER_MSG_SUPABASE,
} from "@/lib/service-unavailable";

const LEAK = /Vercel|OPENAI_API_KEY|管理員|環境變數/;

describe("featureUnavailableMessage", () => {
  it("softens OpenAI missing without tech leaks", () => {
    const msg = featureUnavailableMessage(
      new Error("Invalid OpenAI environment variables: OPENAI_API_KEY: Required"),
    );
    expect(msg).toBe(USER_MSG_OPENAI);
    expect(msg).toContain("飲食分析");
    expect(msg).toContain("聯絡客服");
    expect(msg).not.toMatch(LEAK);
    expect(msg.endsWith("。")).toBe(false);
  });

  it("softens Supabase / schema errors", () => {
    const msg = featureUnavailableMessage(
      new Error('Could not find the table "public.members" in the schema cache'),
    );
    expect(msg).toBe(USER_MSG_SUPABASE);
    expect(msg).not.toMatch(LEAK);
    expect(msg.endsWith("。")).toBe(false);
  });

  it("softens NewebPay errors", () => {
    const msg = featureUnavailableMessage(
      new Error("Invalid NewebPay environment variables"),
    );
    expect(msg).toBe(USER_MSG_NEWEBPAY);
    expect(msg).not.toMatch(LEAK);
  });

  it("softens generic env errors", () => {
    const msg = featureUnavailableMessage(
      new Error("Invalid application environment variables: PUBLIC_BASE_URL"),
    );
    expect(msg).toBe(USER_MSG_ENV);
    expect(msg).not.toMatch(LEAK);
  });

  it("softens unknown busy errors", () => {
    const msg = featureUnavailableMessage(new Error("timeout"));
    expect(msg).toBe(USER_MSG_BUSY);
    expect(msg).not.toMatch(LEAK);
  });

  it("health ?hint= unlocks admin 暗號 detail", () => {
    const hint = parseHealthAdminHint("OPEN-SETUP");
    expect(hint).toContain(`暗號 ${ADMIN_HINT_OPENAI}`);
    expect(hint).toContain("OPENAI_API_KEY");
    expect(parseHealthAdminHint("nope")).toBeUndefined();
  });
});
