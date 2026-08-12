import { pushText } from "@/lib/line/client";
import { nextFollowupState, normalizeMealSlots, type MealSlot } from "@/lib/followups/rules";
import { getAdminDb } from "@/lib/supabase/admin";
import { resolveCurrentPlan } from "@/lib/subscriptions/current-plan";

const SLOT_MINUTES: Record<MealSlot, number> = {
  breakfast: 8 * 60,
  lunch: 12 * 60,
  dinner: 18 * 60 + 30,
};

const SLOT_TEXT: Record<MealSlot, string> = {
  breakfast: "早安～早餐吃了什麼？拍照傳給我，我幫你看看今天怎麼開始最剛好 ☀️",
  lunch: "午餐時間到～今天吃什麼？拍照或打字傳給我，我幫你記錄熱量和蛋白質 🍱",
  dinner: "晚餐別亂投降 😆 把餐點傳給我，我幫你看看今天剩餘熱量怎麼分配 🌙",
};

function taipeiParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Taipei", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  return { date: `${get("year")}-${get("month")}-${get("day")}`, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export async function resumeMealFollowups(memberId: string): Promise<void> {
  const db = getAdminDb();
  const { data } = await db.from("line_followup_settings").select("unanswered_count, paused").eq("member_id", memberId).maybeSingle();
  if (!data) return;
  const state = nextFollowupState({ misses: data.unanswered_count, paused: data.paused }, "member_message");
  await db.from("line_followup_settings").update({ unanswered_count: state.misses, paused: state.paused, last_member_message_at: new Date().toISOString() }).eq("member_id", memberId);
}

export async function configureMealFollowups(memberId: string, selected: MealSlot[]): Promise<string> {
  const current = await (async () => {
    const { data } = await getAdminDb().from("subscriptions").select("plan_id,status,expires_at").eq("member_id", memberId);
    return resolveCurrentPlan(data ?? []);
  })();
  if (current.planId === "free") return "餐次主動提醒是付費會員功能；免費會員不會被每日推播催促。輸入「方案」可以查看 Plus／Pro。";
  const slots = selected.length ? normalizeMealSlots(selected, current.planId) : [];
  await getAdminDb().from("line_followup_settings").upsert({ member_id: memberId, meal_slots: slots, paused: slots.length === 0, unanswered_count: 0 });
  if (!slots.length) return "已關閉餐次主動提醒；你的飲食紀錄會保留。之後輸入「提醒早餐」即可重新開啟。";
  const labels = slots.map((slot) => ({ breakfast: "早餐 08:00", lunch: "午餐 12:00", dinner: "晚餐 18:30" })[slot]);
  return `已設定：${labels.join("、")}。連續 3 次未回覆會自動暫停，你再次傳訊息後會恢復。`;
}

export async function runMealFollowups(now = new Date()) {
  const db = getAdminDb();
  const local = taipeiParts(now);
  const dueSlots = (Object.keys(SLOT_MINUTES) as MealSlot[]).filter((slot) => Math.abs(local.minutes - SLOT_MINUTES[slot]) < 30);
  if (!dueSlots.length) return { sent: 0, skipped: 0, failed: 0 };

  const { data: members, error } = await db.from("members").select("id,line_user_id,status").eq("status", "active");
  if (error) throw error;
  let sent = 0, skipped = 0, failed = 0;
  for (const member of members ?? []) {
    const [{ data: subscriptions }, { data: setting }] = await Promise.all([
      db.from("subscriptions").select("plan_id,status,expires_at").eq("member_id", member.id),
      db.from("line_followup_settings").select("meal_slots,paused,unanswered_count").eq("member_id", member.id).maybeSingle(),
    ]);
    const current = resolveCurrentPlan(subscriptions ?? [], now);
    if (current.planId === "free") { skipped++; continue; }
    const slots = normalizeMealSlots((setting?.meal_slots ?? []) as MealSlot[], current.planId);
    const paused = setting?.paused ?? false;
    if (paused) { skipped++; continue; }
    await db.from("line_followup_settings").upsert({ member_id: member.id, meal_slots: slots, paused: false, unanswered_count: setting?.unanswered_count ?? 0 });
    for (const slot of dueSlots.filter((item) => slots.includes(item))) {
      const { data: delivery } = await db.from("line_followup_deliveries").select("id").eq("member_id", member.id).eq("meal_slot", slot).eq("local_date", local.date).maybeSingle();
      if (delivery) { skipped++; continue; }
      try {
        await pushText(member.line_user_id, SLOT_TEXT[slot]);
        const state = nextFollowupState({ misses: setting?.unanswered_count ?? 0, paused: false }, "push");
        await Promise.all([
          db.from("line_followup_deliveries").insert({ member_id: member.id, meal_slot: slot, local_date: local.date, status: "sent" }),
          db.from("line_followup_settings").update({ unanswered_count: state.misses, paused: state.paused }).eq("member_id", member.id),
        ]);
        sent++;
      } catch (cause) {
        failed++;
        await db.from("line_followup_deliveries").insert({ member_id: member.id, meal_slot: slot, local_date: local.date, status: "failed", error_message: String(cause).slice(0, 500) });
      }
    }
  }
  return { sent, skipped, failed };
}
