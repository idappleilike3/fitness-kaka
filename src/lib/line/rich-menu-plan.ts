import { getLineEnv } from "@/lib/env";

const LINE_API = "https://api.line.me/v2/bot";

export type RichMenuTier = "free" | "plus" | "pro";

const PUBLISHED_RICH_MENUS: Record<RichMenuTier, string> = {
  free: "richmenu-d3f2f494a9aae57b3b57c2ef0a330273",
  plus: "richmenu-748940b0a1fdec3a7e72e07f8251d859",
  pro: "richmenu-f6be638efb85c4678221f8eb2affbb0d",
};

export function resolveRichMenuTier(planId: string | null | undefined): RichMenuTier {
  if (planId === "plan_299") return "plus";
  if (
    planId === "plan_399" ||
    planId === "plan_3590" ||
    planId === "plan_799" ||
    planId === "plan_7190"
  ) return "pro";
  return "free";
}

function richMenuIdForTier(tier: RichMenuTier): string {
  const envId =
    tier === "pro"
      ? process.env.LINE_RICH_MENU_PRO_ID
      : tier === "plus"
        ? process.env.LINE_RICH_MENU_PLUS_ID
        : process.env.LINE_RICH_MENU_FREE_ID;
  return envId?.trim() || PUBLISHED_RICH_MENUS[tier];
}

export async function syncMemberRichMenu(
  lineUserId: string,
  planId: string | null | undefined,
): Promise<{ synced: boolean; tier: RichMenuTier; reason?: string }> {
  const tier = resolveRichMenuTier(planId);
  const richMenuId = richMenuIdForTier(tier);
  const { LINE_CHANNEL_ACCESS_TOKEN } = getLineEnv();
  const response = await fetch(
    `${LINE_API}/user/${encodeURIComponent(lineUserId)}/richmenu/${encodeURIComponent(richMenuId)}`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}` },
    },
  );
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`LINE rich menu sync failed: ${response.status} ${detail}`);
  }
  return { synced: true, tier };
}
