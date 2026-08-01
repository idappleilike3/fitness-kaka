import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession, hasTrustedOrigin } from "@/lib/admin/auth";
import { getAdminDb } from "@/lib/supabase/admin";
import { pushText } from "@/lib/line/client";
import { logConversationEvent } from "@/repositories/sales-crm";

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  const db = getAdminDb();
  const { data: followups, error } = await db
    .from("member_followups")
    .select("*, members(display_name,line_user_id)")
    .order("opportunity_score", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  const memberIds = (followups ?? []).map((item) => item.member_id);
  const [{ data: profiles }, { data: events }] = await Promise.all([
    memberIds.length ? db.from("member_sales_profiles").select("*").in("member_id", memberIds) : Promise.resolve({ data: [] }),
    memberIds.length ? db.from("member_conversation_events").select("member_id,direction,content,event_type,created_at").in("member_id", memberIds).order("created_at", { ascending: false }).limit(200) : Promise.resolve({ data: [] }),
  ]);
  const profileByMember = Object.fromEntries((profiles ?? []).map((p) => [p.member_id, p]));
  const eventsByMember: Record<string, unknown[]> = {};
  for (const event of events ?? []) (eventsByMember[event.member_id] ??= []).push(event);
  return NextResponse.json({ opportunities: (followups ?? []).map((f) => ({ ...f, salesProfile: profileByMember[f.member_id] ?? null, recentEvents: (eventsByMember[f.member_id] ?? []).slice(0, 8) })) });
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "未授权" }, { status: 401 });
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "不允许此来源的请求" }, { status: 403 });
  const body = await request.json();
  const db = getAdminDb();
  const { data: followup, error: readError } = await db
    .from("member_followups")
    .select("*, members(line_user_id,display_name)")
    .eq("id", body.followupId)
    .maybeSingle();
  if (readError || !followup) return NextResponse.json({ error: readError?.message ?? "找不到跟进记录" }, { status: 404 });

  const action = String(body.action ?? body.status ?? "");
  if (action === "send_suggested") {
    const message = String(body.message ?? followup.suggested_message ?? "").trim();
    if (!message) return NextResponse.json({ error: "没有可发送的建议讯息" }, { status: 400 });
    const lineUserId = followup.members?.line_user_id;
    if (!lineUserId) return NextResponse.json({ error: "会员没有有效 LINE UID" }, { status: 400 });
    await pushText(lineUserId, message);
    await logConversationEvent({ memberId: followup.member_id, direction: "admin", content: message, eventType: "sales_followup" });
    const { error } = await db.from("member_followups").update({
      status: "done",
      last_contact_at: new Date().toISOString(),
      due_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", body.followupId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: "已发送温和跟进讯息" });
  }

  if (action === "snoozed" || action === "snooze") {
    const days = Math.max(1, Math.min(30, Number(body.days ?? 3)));
    const { error } = await db.from("member_followups").update({
      status: "snoozed",
      due_at: new Date(Date.now() + days * 86_400_000).toISOString(),
      updated_at: new Date().toISOString(),
    }).eq("id", body.followupId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true, message: `已延后 ${days} 天跟进` });
  }

  if (action === "done") {
    const { error } = await db.from("member_followups").update({
      status: "done",
      last_contact_at: new Date().toISOString(),
      due_at: null,
      updated_at: new Date().toISOString(),
    }).eq("id", body.followupId);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
}
