import { NextRequest, NextResponse } from "next/server";

import { parseMenuQuestionnaire } from "@/lib/menu/generator";
import { generatePersonalizedMenu } from "@/lib/menu/ai-generator";
import { getAdminDb } from "@/lib/supabase/admin";
import { getLatestMenuOrder, regenerateMenuOrder, saveQuestionnaireAndMenu } from "@/repositories/menu-orders";
import { getProfile } from "@/repositories/profiles";

export const runtime = "nodejs";

async function memberByLineUserId(lineUserId: string) {
  const { data, error } = await getAdminDb()
    .from("members")
    .select("id, display_name, line_user_id")
    .eq("line_user_id", lineUserId)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) throw new Error(`讀取會員失敗: ${error.message}`);
  return data;
}

export async function GET(req: NextRequest) {
  const lineUserId = req.nextUrl.searchParams.get("lineUserId")?.trim();
  if (!lineUserId) return NextResponse.json({ error: "缺少 LINE 使用者資料" }, { status: 400 });
  const member = await memberByLineUserId(lineUserId);
  if (!member) return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
  const [profile, order] = await Promise.all([getProfile(member.id), getLatestMenuOrder(member.id)]);
  return NextResponse.json({
    member: { displayName: member.display_name ?? "會員" },
    profileReady: Boolean(profile?.profile_completed_at),
    order,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null) as Record<string, unknown> | null;
  const lineUserId = typeof body?.lineUserId === "string" ? body.lineUserId.trim() : "";
  const action = typeof body?.action === "string" ? body.action : "generate";
  if (!lineUserId) return NextResponse.json({ error: "缺少 LINE 使用者資料" }, { status: 400 });
  const member = await memberByLineUserId(lineUserId);
  if (!member) return NextResponse.json({ error: "找不到會員資料" }, { status: 404 });
  const [profile, order] = await Promise.all([getProfile(member.id), getLatestMenuOrder(member.id)]);
  if (!profile?.profile_completed_at) {
    return NextResponse.json({ error: "請先完成 BMI／BMR／TDEE 身體建檔" }, { status: 409 });
  }
  if (!order || ["refunded", "completed"].includes(order.status)) {
    return NextResponse.json({ error: "目前沒有可使用的 299 菜單訂單" }, { status: 403 });
  }
  const questionnaire = action === "regenerate"
    ? parseMenuQuestionnaire(order.questionnaire)
    : parseMenuQuestionnaire(body?.questionnaire);
  if (!questionnaire) return NextResponse.json({ error: "請完整填寫飲食問卷" }, { status: 400 });
  const { menu, warning } = await generatePersonalizedMenu(profile, questionnaire);
  if (warning) {
    await getAdminDb().from("system_error_events").insert({
      source: "menu_openai_generation",
      severity: "medium",
      error_message: `AI 菜单生成失败，已自动使用安全菜单：${warning}`,
      metadata: { member_id: member.id, order_id: order.id },
    }).then(() => undefined, () => undefined);
  }
  if (action === "regenerate") await regenerateMenuOrder(order, menu);
  else await saveQuestionnaireAndMenu(order.id, questionnaire, menu);
  return NextResponse.json({ order: await getLatestMenuOrder(member.id), usedFallback: Boolean(warning) });
}
