import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getAdminDb } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!hasAdminSession(req)) return NextResponse.json({ error: "请先解锁管理员功能" }, { status: 401 });
  const { data, error } = await getAdminDb()
    .from("care_alerts")
    .select("id, member_id, alert_type, severity, reason, evidence, member_reply, admin_recommendation, status, notified_at, created_at, members(display_name,line_user_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: `读取关怀通知失败：${error.message}` }, { status: 500 });
  return NextResponse.json({ alerts: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!hasAdminSession(req)) return NextResponse.json({ error: "请先解锁管理员功能" }, { status: 401 });
  const body = await req.json().catch(() => null) as { alertId?: string; status?: string } | null;
  const allowed = ["pending", "in_progress", "resolved", "dismissed"];
  if (!body?.alertId || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: "关怀状态不正确" }, { status: 400 });
  const patch: Record<string, unknown> = { status: body.status };
  if (["resolved", "dismissed"].includes(body.status)) patch.resolved_at = new Date().toISOString();
  const { error } = await getAdminDb().from("care_alerts").update(patch).eq("id", body.alertId);
  if (error) return NextResponse.json({ error: `更新关怀通知失败：${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true });
}
