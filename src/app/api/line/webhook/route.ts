import { NextResponse } from "next/server";
import { getLineEnv } from "@/lib/env";
import { verifyLineSignature } from "@/lib/line/signature";
import { routeEvent } from "@/services/line-router";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-line-signature") ?? "";

  let secret: string;
  try {
    secret = getLineEnv().LINE_CHANNEL_SECRET;
  } catch (err) {
    console.error("[line/webhook] LINE env missing or invalid:", err);
    // Only LINE secret/token missing should 500 here — other integrations are lazy.
    return NextResponse.json({ error: "line misconfigured" }, { status: 500 });
  }

  if (!verifyLineSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let events: unknown[] = [];
  try {
    const payload = JSON.parse(rawBody || "{}") as { events?: unknown[] };
    events = payload.events ?? [];
  } catch (err) {
    console.error("[line/webhook] invalid JSON body after signature ok:", err);
    // Signature already verified — acknowledge so LINE Verify / retries stay healthy.
    return NextResponse.json({ ok: true });
  }

  for (const event of events) {
    try {
      await routeEvent(event as Parameters<typeof routeEvent>[0]);
    } catch (err) {
      // Feature env (OpenAI/Supabase/…) must not turn a signed webhook into HTTP 500.
      console.error("[line/webhook] event handling failed:", err);
    }
  }

  return NextResponse.json({ ok: true });
}
