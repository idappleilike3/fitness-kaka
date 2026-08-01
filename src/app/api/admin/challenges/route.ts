import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession, hasTrustedOrigin } from "@/lib/admin/auth";
import { getAdminDb } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "请先解锁管理员功能" }, { status: 401 });
  const db = getAdminDb();
  const [{ data: batches, error: batchError }, { data: members, error: memberError }] = await Promise.all([
    db.from("challenge_batches").select("*").order("starts_on", { ascending: false }).limit(100),
    db.from("member_challenges").select("id,member_id,batch_id,status,started_on,ends_on,needs_admin_care,admin_note,members(display_name,line_user_id)").order("started_on", { ascending: false }).limit(500),
  ]);
  if (batchError || memberError) return NextResponse.json({ error: `读取 30 天挑战失败：${batchError?.message ?? memberError?.message}` }, { status: 500 });
  return NextResponse.json({ batches: batches ?? [], enrollments: members ?? [], careList: (members ?? []).filter((item) => item.needs_admin_care) });
}

export async function POST(request: NextRequest) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "请先解锁管理员功能" }, { status: 401 });
  if (!hasTrustedOrigin(request)) return NextResponse.json({ error: "不允许此来源的请求" }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const db = getAdminDb();
  if (body?.action === "create_batch") {
    const name = String(body.name ?? "").trim();
    const startsOn = String(body.startsOn ?? "");
    const endsOn = String(body.endsOn ?? "");
    if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(startsOn) || !/^\d{4}-\d{2}-\d{2}$/.test(endsOn) || endsOn < startsOn) return NextResponse.json({ error: "请填写正确的批次名称与日期" }, { status: 400 });
    const { error } = await db.from("challenge_batches").insert({ name, starts_on: startsOn, ends_on: endsOn, status: "active" });
    if (error) return NextResponse.json({ error: `建立批次失败：${error.message}` }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  if (body?.action === "care") {
    const id = String(body.enrollmentId ?? "");
    const { error } = await db.from("member_challenges").update({ needs_admin_care: Boolean(body.needsCare), admin_note: String(body.note ?? "").slice(0, 1000) }).eq("id", id);
    if (error) return NextResponse.json({ error: `更新关怀名单失败：${error.message}` }, { status: 500 });
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "不支持的操作" }, { status: 400 });
}
