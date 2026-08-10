import { NextResponse } from "next/server";
import { getLineEnv } from "@/lib/env";
import { getLineProfile, replyMessage } from "@/lib/line/client";
import { verifyLineSignature } from "@/lib/line/signature";
import {
  trialAskFlexMessage,
} from "@/lib/line/guide-flex";
import { consultationStartMessage } from "@/lib/line/messages";
import { setOnboardingStep, upsertMemberByLineUserId } from "@/repositories/members";
import { startOnboardingPrompt } from "@/services/onboarding";
import { routeEvent } from "@/services/line-router";

export const runtime = "nodejs";
export const maxDuration = 60;

type WebhookEvent = {
  type?: string;
  replyToken?: string;
  source?: { userId?: string };
  postback?: { data?: string };
  message?: { type?: string; text?: string };
  [key: string]: unknown;
};

function isHowToText(event: WebhookEvent): boolean {
  if (event.type !== "message" || event.message?.type !== "text") return false;
  const text = event.message.text?.trim() ?? "";
  return /^(怎麼用|怎么用|如何使用|如何開始|如何开始|新手教學|新手教学)$/u.test(text);
}

async function startGuidedTrial(event: WebhookEvent): Promise<boolean> {
  const replyToken = event.replyToken;
  const userId = event.source?.userId;
  if (!replyToken || !userId) return false;

  const profile = await getLineProfile(userId).catch(() => null);
  const member = await upsertMemberByLineUserId(userId, profile?.displayName);
  await setOnboardingStep(member.id, "goal");
  const prompt = startOnboardingPrompt();
  await replyMessage(replyToken, [
    {
      type: "text",
      text: "好 💜 我們從你的目標開始，不用一次填很多資料。我會一題一題問你。",
    },
    {
      type: "text",
      text: prompt.reply,
      ...(prompt.quickReply ? { quickReply: prompt.quickReply } : {}),
    },
  ]);
  return true;
}

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  let secret: string;
  try {
    secret = getLineEnv().LINE_CHANNEL_SECRET;
  } catch (err) {
    console.error("[line/webhook] LINE env missing or invalid:", err);
    return NextResponse.json({ error: "line misconfigured" }, { status: 500 });
  }

  if (!verifyLineSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let events: WebhookEvent[] = [];
  try {
    const payload = JSON.parse(rawBody || "{}") as { events?: WebhookEvent[] };
    events = payload.events ?? [];
  } catch (err) {
    console.error("[line/webhook] invalid JSON body after signature ok:", err);
    return NextResponse.json({ ok: true });
  }

  for (const event of events) {
    try {
      if (isHowToText(event) && event.replyToken) {
        await replyMessage(event.replyToken, [{ type: "text", text: consultationStartMessage() }]);
        continue;
      }

      if (event.type === "postback" && event.replyToken) {
        const data = event.postback?.data ?? "";
        if (data === "trial:ask") {
          await replyMessage(event.replyToken, [trialAskFlexMessage()]);
          continue;
        }
        if (data === "trial:notnow" || data === "guide:how") {
          await replyMessage(event.replyToken, [{ type: "text", text: consultationStartMessage() }]);
          continue;
        }
        if (data === "trial:start") {
          await startGuidedTrial(event);
          continue;
        }
      }

      await routeEvent(event as Parameters<typeof routeEvent>[0]);
    } catch (err) {
      console.error("[line/webhook] event handling failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
