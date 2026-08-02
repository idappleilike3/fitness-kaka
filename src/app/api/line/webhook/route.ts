import { NextResponse } from "next/server";
import { getLineEnv } from "@/lib/env";
import { replyMessage } from "@/lib/line/client";
import { verifyLineSignature } from "@/lib/line/signature";
import { welcomeFlexMessage } from "@/lib/line/welcome-flex";
import { routeEvent } from "@/services/line-router";

export const runtime = "nodejs";
export const maxDuration = 60;

type WebhookEvent = {
  type?: string;
  replyToken?: string;
  [key: string]: unknown;
};

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
      if (event.type === "follow" && event.replyToken) {
        await replyMessage(event.replyToken, [welcomeFlexMessage()]);
        // Preserve member/profile initialization without sending the old text welcome again.
        await routeEvent({
          ...(event as Parameters<typeof routeEvent>[0]),
          replyToken: undefined,
        });
        continue;
      }
      await routeEvent(event as Parameters<typeof routeEvent>[0]);
    } catch (err) {
      console.error("[line/webhook] event handling failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
