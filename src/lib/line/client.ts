import { getLineEnv } from "@/lib/env";
import { sanitizeLineText } from "@/lib/line/text";

const LINE_API = "https://api.line.me/v2/bot";

function sanitizeOutgoingMessages(messages: unknown[]): unknown[] {
  return messages.map((msg) => {
    if (
      msg &&
      typeof msg === "object" &&
      "type" in msg &&
      (msg as { type?: string }).type === "text" &&
      "text" in msg &&
      typeof (msg as { text?: unknown }).text === "string"
    ) {
      return {
        ...(msg as Record<string, unknown>),
        text: sanitizeLineText((msg as { text: string }).text),
      };
    }
    return msg;
  });
}

export async function getLineProfile(
  userId: string,
): Promise<{ displayName: string } | null> {
  const env = getLineEnv();
  const res = await fetch(`${LINE_API}/profile/${encodeURIComponent(userId)}`, {
    headers: {
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
  });
  if (!res.ok) return null;

  const data = (await res.json()) as { displayName?: unknown };
  const displayName =
    typeof data.displayName === "string" ? data.displayName.trim() : "";
  return displayName ? { displayName } : null;
}


export async function startLoadingAnimation(
  userId: string,
  loadingSeconds = 20,
): Promise<void> {
  const env = getLineEnv();
  const seconds = Math.min(60, Math.max(5, Math.round(loadingSeconds)));
  const res = await fetch(`${LINE_API}/chat/loading/start`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({ chatId: userId, loadingSeconds: seconds }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE loading animation failed: ${res.status} ${text}`);
  }
}

export async function replyMessage(
  replyToken: string,
  messages: unknown[],
): Promise<void> {
  const env = getLineEnv();
  const res = await fetch(`${LINE_API}/message/reply`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      replyToken,
      messages: sanitizeOutgoingMessages(messages),
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`LINE reply failed: ${res.status} ${text}`);
  }
}

export async function replyText(
  replyToken: string,
  text: string,
): Promise<void> {
  await replyMessage(replyToken, [
    { type: "text", text: sanitizeLineText(text) },
  ]);
}

export async function pushText(userId: string, text: string): Promise<void> {
  const env = getLineEnv();
  const res = await fetch(`${LINE_API}/message/push`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text: sanitizeLineText(text) }],
    }),
  });
  if (!res.ok) {
    const textBody = await res.text();
    throw new Error(`LINE push failed: ${res.status} ${textBody}`);
  }
}

export async function downloadContent(messageId: string): Promise<Buffer> {
  const env = getLineEnv();
  const res = await fetch(
    `https://api-data.line.me/v2/bot/message/${messageId}/content`,
    {
      headers: {
        Authorization: `Bearer ${env.LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    },
  );
  if (!res.ok) {
    throw new Error(`LINE content download failed: ${res.status}`);
  }
  const ab = await res.arrayBuffer();
  return Buffer.from(ab);
}
