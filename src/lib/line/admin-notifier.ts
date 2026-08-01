import { pushText } from "@/lib/line/client";

function adminLineUserIds(): string[] {
  return (process.env.ADMIN_LINE_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export async function notifyAdmins(text: string): Promise<{
  configured: number;
  sent: number;
  failed: number;
}> {
  const ids = adminLineUserIds();
  let sent = 0;
  let failed = 0;
  for (const id of ids) {
    try {
      await pushText(id, text);
      sent += 1;
    } catch {
      failed += 1;
    }
  }
  return { configured: ids.length, sent, failed };
}
