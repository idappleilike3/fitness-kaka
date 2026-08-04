import { getLineEnv } from "@/lib/env";

const LINE_API = "https://api.line.me/v2/bot";

export type RichMenuTier = "free" | "plus" | "pro";

export function resolveRichMenuTier(planId: string | null | undefined): RichMenuTier {
  if (planId === "plan_399" || planId === "plan_3590") return "plus";
  if (planId === "plan_799" || planId === "plan_7190") return "pro";
  return "free";
}

function richMenuIdForTier(tier: RichMenuTier): string | null {
  const env = process.env;
  const id =
    tier === "pro"
      ? env.LINE_RICH_MENU_PRO_ID
      : tier === "plus"
        ? env.LINE_RICH_MENU_PLUS_ID
        : env.LINE_RICH_MENU_FREE_ID;

  return id?.trim() || null;
}

export async function syncMemberRichMenu(
  lineUserId: string,
  planId: string | null | undefined,
): Promise<{ synced: boolean; tier: RichMenuTier; reason?: string }> {
  const tier = resolveRichMenuTier(planId);
  const richMenuId = richMenuIdForTier(tier);
  if (!richMenuId) {
    return { synced: false, tier, reason: `LINE_RICH_MENU_${tier.toUpperCase()}_ID 未設定` };
  }

  const { LINE_CHANNEL_ACCESS_TOKEN } = getLineEnv();
  const response = await fetch(
    `${LINE_API}/user/${encodeURIComponent(lineUserId)}/richmenu/${encodeURIComponent(richMenuId)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      },
    },
  );

  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE rich menu sync failed: ${response.status} ${detail}`);
  }

  return { synced: true, tier };
}
