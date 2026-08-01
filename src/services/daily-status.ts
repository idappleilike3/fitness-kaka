import { looksLikeDailyQuestion as looksLikeDailyQuestionIntent } from "@/lib/line/intent";
import { DISCLAIMER } from "@/lib/line/messages";
import { getTodaySummary } from "@/repositories/meals";
import { getProfile } from "@/repositories/profiles";

export async function answerDailyStatus(
  memberId: string,
  question: string,
): Promise<string> {
  const profile = await getProfile(memberId);
  const today = await getTodaySummary(memberId);
  const calorieTarget = profile?.calorie_target ?? 0;
  const proteinTarget = profile?.protein_g_target ?? 0;
  const eaten = Number(today.total_kcal) || 0;
  const protein = Number(today.protein_g) || 0;
  const remaining = Math.max(0, calorieTarget - eaten);
  const proteinLeft = Math.max(0, proteinTarget - Math.round(protein));
  const q = question.trim();

  if (eaten === 0 && protein === 0) {
    return "今天還沒有已確認的飲食紀錄";
  }

  let core: string;
  if (!profile?.calorie_target || !profile?.protein_g_target) {
    core = `今天已攝取 ${eaten} kcal；尚未設定每日目標，完成建檔後可查看還能吃多少`;
  } else if (/蛋白/.test(q)) {
    core =
      proteinLeft <= 0
        ? `今天蛋白質已達標（${Math.round(protein)}／${proteinTarget}g）`
        : `今天蛋白質還差約 ${proteinLeft}g（已攝取 ${Math.round(protein)}／${proteinTarget}g）`;
  } else if (/超標/.test(q)) {
    core =
      eaten > calorieTarget && calorieTarget > 0
        ? `今天熱量已超過目標約 ${eaten - calorieTarget} kcal`
        : `目前尚未超標，還可吃約 ${remaining} kcal`;
  } else if (/麥當勞|速食|宵夜/.test(q)) {
    core =
      remaining >= 500
        ? `依今天剩餘約 ${remaining} kcal，若選較清爽選項並控制份量，還有空間；仍以你的目標為準`
        : `今天剩餘約 ${remaining} kcal，速食容易超標，建議選高蛋白、少炸的選項或改天再吃`;
  } else if (/晚餐|建議吃/.test(q)) {
    core = `晚餐建議留約 ${remaining} kcal、蛋白質約 ${proteinLeft}g：可選雞胸／魚／豆腐配青菜與適量澱粉`;
  } else {
    core = `今天已攝取 ${eaten} kcal，還能吃約 ${remaining} kcal；蛋白質還差約 ${proteinLeft}g`;
  }

  return `${core}\n\n${DISCLAIMER}`;
}

/** @deprecated Prefer classifyTextIntent / looksLikeDailyQuestion from intent.ts */
export function looksLikeDailyQuestion(text: string): boolean {
  return looksLikeDailyQuestionIntent(text);
}
