import { getAdminDb } from "@/lib/supabase/admin";
import type { GeneratedMenu, MenuQuestionnaire } from "@/lib/menu/generator";

export type MenuOrderRow = {
  id: string;
  member_id: string;
  status: string;
  questionnaire: MenuQuestionnaire | Record<string, never>;
  generated_menu: GeneratedMenu | null;
  revision_count: number;
  generated_at: string | null;
  delivered_at: string | null;
  created_at: string;
  updated_at: string;
};

export async function getLatestMenuOrder(memberId: string): Promise<MenuOrderRow | null> {
  const { data, error } = await getAdminDb()
    .from("menu_orders")
    .select("*")
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`讀取菜單訂單失敗: ${error.message}`);
  return (data as MenuOrderRow | null) ?? null;
}

export async function saveQuestionnaireAndMenu(
  orderId: string,
  questionnaire: MenuQuestionnaire,
  menu: GeneratedMenu,
): Promise<void> {
  const now = new Date().toISOString();
  const { error } = await getAdminDb()
    .from("menu_orders")
    .update({
      questionnaire,
      generated_menu: menu,
      status: "ready",
      generated_at: now,
      updated_at: now,
    })
    .eq("id", orderId);
  if (error) throw new Error(`儲存菜單失敗: ${error.message}`);
}

export async function regenerateMenuOrder(order: MenuOrderRow, menu: GeneratedMenu): Promise<void> {
  if (order.revision_count >= 1) throw new Error("免費重新生成次數已使用");
  const now = new Date().toISOString();
  const { error } = await getAdminDb()
    .from("menu_orders")
    .update({
      generated_menu: menu,
      revision_count: order.revision_count + 1,
      status: "ready",
      generated_at: now,
      updated_at: now,
    })
    .eq("id", order.id);
  if (error) throw new Error(`重新生成菜單失敗: ${error.message}`);
}
