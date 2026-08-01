import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getAdminDb } from "@/lib/supabase/admin";
import { hasTrustedOrigin } from "@/lib/admin/auth";
import { pushMessages } from "@/lib/line/client";
import { menuDeliveryFlex } from "@/lib/line/menu-flex";
import type { GeneratedMenu } from "@/lib/menu/generator";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  if (!hasAdminSession(req)) return NextResponse.json({ error: "请先解锁管理员功能" }, { status: 401 });
  const { data, error } = await getAdminDb()
    .from("menu_orders")
    .select("id, member_id, status, questionnaire, generated_menu, revision_count, generated_at, delivered_at, created_at, members(display_name,line_user_id)")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) return NextResponse.json({ error: `读取菜单订单失败：${error.message}` }, { status: 500 });
  return NextResponse.json({ orders: data ?? [] });
}

export async function POST(req: NextRequest) {
  if (!hasAdminSession(req)) return NextResponse.json({ error: "请先解锁管理员功能" }, { status: 401 });
  if (!hasTrustedOrigin(req)) return NextResponse.json({ error: "不允许此来源的请求" }, { status: 403 });
  const body = await req.json().catch(() => null) as { orderId?: string; status?: string; action?: string; generatedMenu?: GeneratedMenu; confirm?: boolean } | null;
  if (!body?.orderId) return NextResponse.json({ error: "缺少菜单订单" }, { status: 400 });
  if (body.action === "save_menu") {
    if (!body.generatedMenu?.days?.length) return NextResponse.json({ error: "菜单内容不完整" }, { status: 400 });
    const { error } = await getAdminDb().from("menu_orders").update({ generated_menu: body.generatedMenu, status: "ready", updated_at: new Date().toISOString() }).eq("id", body.orderId);
    if (error) return NextResponse.json({ error: `保存菜单失败：${error.message}` }, { status: 500 });
    await getAdminDb().from("admin_action_logs").insert({ action_type: "menu_edited", target_type: "menu_order", target_id: body.orderId, details: { days: body.generatedMenu.days.length } });
    return NextResponse.json({ success: true, preview: menuDeliveryFlex(body.generatedMenu, `${process.env.PUBLIC_BASE_URL ?? "https://fitness-kaka.vercel.app"}/menu-plan`) });
  }
  if (body.action === "preview") {
    const { data } = await getAdminDb().from("menu_orders").select("generated_menu").eq("id", body.orderId).maybeSingle();
    if (!data?.generated_menu) return NextResponse.json({ error: "菜单尚未生成" }, { status: 409 });
    return NextResponse.json({ success: true, preview: menuDeliveryFlex(data.generated_menu as GeneratedMenu, `${process.env.PUBLIC_BASE_URL ?? "https://fitness-kaka.vercel.app"}/menu-plan`) });
  }
  if (body.action === "send") {
    if (body.confirm !== true) return NextResponse.json({ error: "请先预览并确认发送" }, { status: 409 });
    const { data, error: readError } = await getAdminDb().from("menu_orders").select("generated_menu, members(line_user_id)").eq("id", body.orderId).maybeSingle();
    const member = Array.isArray(data?.members) ? data?.members[0] : data?.members;
    if (readError || !data?.generated_menu || !member?.line_user_id) return NextResponse.json({ error: "菜单或会员 LINE 资料不完整" }, { status: 409 });
    const url = `${process.env.PUBLIC_BASE_URL ?? "https://fitness-kaka.vercel.app"}/menu-plan?lineUserId=${encodeURIComponent(member.line_user_id)}`;
    await pushMessages(member.line_user_id, [menuDeliveryFlex(data.generated_menu as GeneratedMenu, url)]);
    const now = new Date().toISOString();
    await getAdminDb().from("menu_orders").update({ status: "completed", delivered_at: now, updated_at: now }).eq("id", body.orderId);
    await getAdminDb().from("admin_action_logs").insert({ action_type: "menu_sent", target_type: "menu_order", target_id: body.orderId, details: { channel: "line" } });
    return NextResponse.json({ success: true, message: "菜单已发送给会员" });
  }
  const allowed = ["awaiting_profile", "questionnaire", "generating", "ready", "revision_requested", "completed", "refunded"];
  if (!body?.orderId || !body.status || !allowed.includes(body.status)) return NextResponse.json({ error: "订单状态不正确" }, { status: 400 });
  const patch: Record<string, unknown> = { status: body.status, updated_at: new Date().toISOString() };
  if (body.status === "completed") patch.delivered_at = new Date().toISOString();
  const { error } = await getAdminDb().from("menu_orders").update(patch).eq("id", body.orderId);
  if (error) return NextResponse.json({ error: `更新订单失败：${error.message}` }, { status: 500 });
  return NextResponse.json({ success: true });
}
