import { NextRequest, NextResponse } from "next/server";

import { hasAdminSession, hasTrustedOrigin } from "@/lib/admin/auth";
import { getAdminDb } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!hasAdminSession(req)) {
    return NextResponse.json({ error: "請先解鎖管理員功能" }, { status: 401 });
  }
  if (!hasTrustedOrigin(req)) {
    return NextResponse.json({ error: "不允許此來源的請求" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    memberId?: unknown;
  } | null;
  const memberId =
    typeof body?.memberId === "string" ? body.memberId.trim() : "";
  if (!memberId) {
    return NextResponse.json({ error: "會員無效" }, { status: 400 });
  }

  const db = getAdminDb();
  const { data: member, error: memberError } = await db
    .from("members")
    .select("id, display_name")
    .eq("id", memberId)
    .is("deleted_at", null)
    .maybeSingle();
  if (memberError || !member) {
    return NextResponse.json({ error: "找不到會員" }, { status: 404 });
  }

  const { error: updateError } = await db
    .from("members")
    .update({ onboarding_step: null })
    .eq("id", member.id);
  if (updateError) {
    return NextResponse.json({ error: "清除建檔狀態失敗" }, { status: 500 });
  }

  return NextResponse.json({
    memberId: member.id,
    displayName: member.display_name ?? "未設定名稱",
    onboardingStep: null,
  });
}
