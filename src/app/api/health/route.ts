import { NextRequest, NextResponse } from "next/server";
import { getEnvConfigStatus, peekNewebpayMode } from "@/lib/env";
import { parseHealthAdminHint } from "@/lib/service-unavailable";
import { getAdminDb } from "@/lib/supabase/admin";

export const runtime = "nodejs";

type DbHealth = {
  reachable: boolean;
  plansFree: boolean;
  membersTable: boolean;
  subscriptionsTable: boolean;
  memberProfilesTable: boolean;
  lineEventsTable: boolean;
  detail?: string;
};

function nonEmpty(value: string | undefined): boolean {
  return typeof value === "string" && value.trim().length > 0;
}

async function probeTable(
  db: ReturnType<typeof getAdminDb>,
  table: string,
): Promise<{ ok: boolean; detail?: string }> {
  const { error } = await db.from(table).select("id").limit(1);
  if (error) return { ok: false, detail: error.message };
  return { ok: true };
}

async function probeSupabase(): Promise<DbHealth | null> {
  // Probe whenever both vars are present — even if URL format is wrong —
  // so health.detail surfaces the real Zod / PostgREST error.
  if (
    !nonEmpty(process.env.SUPABASE_URL) ||
    !nonEmpty(process.env.SUPABASE_SERVICE_ROLE_KEY)
  ) {
    return null;
  }
  try {
    const db = getAdminDb();
    const { data: freePlan, error: planErr } = await db
      .from("plans")
      .select("id")
      .eq("id", "free")
      .maybeSingle();
    if (planErr) {
      return {
        reachable: false,
        plansFree: false,
        membersTable: false,
        subscriptionsTable: false,
        memberProfilesTable: false,
        lineEventsTable: false,
        detail: planErr.message,
      };
    }
    const members = await probeTable(db, "members");
    const subscriptions = await probeTable(db, "subscriptions");
    const profiles = await probeTable(db, "member_profiles");
    const lineEvents = await probeTable(db, "line_events");
    const details = [
      members.detail,
      subscriptions.detail,
      profiles.detail,
      lineEvents.detail,
    ].filter(Boolean);
    return {
      reachable: true,
      plansFree: Boolean(freePlan?.id === "free"),
      membersTable: members.ok,
      subscriptionsTable: subscriptions.ok,
      memberProfilesTable: profiles.ok,
      lineEventsTable: lineEvents.ok,
      detail: details[0],
    };
  } catch (err) {
    return {
      reachable: false,
      plansFree: false,
      membersTable: false,
      subscriptionsTable: false,
      memberProfilesTable: false,
      lineEventsTable: false,
      detail: err instanceof Error ? err.message : String(err),
    };
  }
}

export async function GET(req: NextRequest) {
  const config = getEnvConfigStatus();
  const db = await probeSupabase();
  const hintParam =
    req.nextUrl.searchParams.get("hint") ??
    req.nextUrl.searchParams.get("code");
  const adminHint = parseHealthAdminHint(hintParam);
  return NextResponse.json({
    ok: true,
    product: "健身卡卡教練",
    newebpayMode: peekNewebpayMode(),
    config: {
      line: config.line,
      openai: config.openai,
      supabase: config.supabase,
      newebpay: config.newebpay,
    },
    db,
    ...(adminHint ? { adminHint } : {}),
  });
}
