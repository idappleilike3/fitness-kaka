import {
  onboardingQuickReplyForStep,
} from "@/lib/line/messages";
import type { MemberRow } from "@/repositories/members";
import { setOnboardingStep } from "@/repositories/members";
import {
  completeProfileIfReady,
  getProfile,
  patchProfile,
} from "@/repositories/profiles";

const SEX_MAP: Record<string, string> = {
  男: "male",
  男性: "male",
  male: "male",
  女: "female",
  女性: "female",
  female: "female",
};

const ACTIVITY_MAP: Record<string, string> = {
  久坐: "sedentary",
  輕度: "light",
  中度: "moderate",
  高強度: "high",
  sedentary: "sedentary",
  light: "light",
  moderate: "moderate",
  high: "high",
};

const HEALTH_MAP: Record<string, string> = {
  沒有: "none",
  无: "none",
  無: "none",
  none: "none",
  懷孕: "pregnant",
  哺乳: "pregnant",
  "懷孕／哺乳中": "pregnant",
  pregnant: "pregnant",
  飲食失調: "eating_disorder",
  飲食失調困擾: "eating_disorder",
  eating_disorder: "eating_disorder",
  慢性病: "medical",
  特殊疾病: "medical",
  "慢性病／特殊疾病": "medical",
  medical: "medical",
};

const EATING_MAP: Record<string, string> = {
  自己煮: "mostly_home",
  大多自己煮: "mostly_home",
  mostly_home: "mostly_home",
  各半: "mixed",
  自煮外食各半: "mixed",
  mixed: "mixed",
  外食: "mostly_out",
  大多外食: "mostly_out",
  mostly_out: "mostly_out",
};

const GOAL_MAP: Record<string, string> = {
  "1": "cut",
  "①": "cut",
  "2": "cut",
  "②": "cut",
  "3": "bulk",
  "③": "bulk",
  "4": "cut",
  "④": "cut",
  "5": "cut",
  "⑤": "cut",
  減脂: "cut",
  減脂瘦身: "cut",
  控制飲食: "cut",
  增肌: "bulk",
  增肌塑形: "bulk",
  改善健康: "maintain",
  維持: "maintain",
  維持體重: "maintain",
  cut: "cut",
  diet: "cut",
  bulk: "bulk",
  health: "maintain",
  maintain: "maintain",
};

const STEPS = [
  "goal",
  "sex",
  "age",
  "health",
  "height",
  "weight",
  "target_weight",
  "activity",
  "freq",
  "eating",
] as const;

export type OnboardingStep = (typeof STEPS)[number];

export type OnboardingQuickReply = ReturnType<
  typeof onboardingQuickReplyForStep
>;

export type OnboardingResult = {
  reply: string;
  stillOnboarding: boolean;
  quickReply?: OnboardingQuickReply;
};

type OnboardingProfile = {
  sex: string | null;
  age: number | null;
  height_cm: number | null;
  weight_kg: number | null;
  target_weight_kg: number | null;
  activity_level: string | null;
  workout_frequency: number | null;
  goal_type: string | null;
  health_context?: string | null;
  eating_pattern?: string | null;
};

export function firstMissingOnboardingStep(
  profile: OnboardingProfile | null | undefined,
): OnboardingStep | null {
  if (!profile?.goal_type) return "goal";
  if (!profile.sex) return "sex";
  if (profile.age === null) return "age";
  if (!profile.health_context) return "health";
  if (profile.height_cm === null) return "height";
  if (profile.weight_kg === null) return "weight";
  if (profile.target_weight_kg === null) return "target_weight";
  if (!profile.activity_level) return "activity";
  if (profile.workout_frequency === null) return "freq";
  if (!profile.eating_pattern) return "eating";
  return null;
}

/** Recovers members whose profile completed but onboarding_step was left stale. */
export function isCompletedOnboardingProfile(
  profile: OnboardingProfile | null | undefined,
): boolean {
  return firstMissingOnboardingStep(profile) === null;
}

/**
 * Existing paid members retain the historical escape hatch. Free newcomers
 * continue until the complete persisted profile and personalized targets exist.
 */
export function shouldBypassOnboarding(
  profile: OnboardingProfile | null | undefined,
  currentPlanId: string,
): boolean {
  if (currentPlanId !== "free") return true;
  return firstMissingOnboardingStep(profile) === null;
}

function nextStep(step: string | null): string | null {
  if (!step) return null;
  const i = STEPS.indexOf(step as (typeof STEPS)[number]);
  if (i < 0 || i >= STEPS.length - 1) return null;
  return STEPS[i + 1];
}

/** Fullwidth digits → ASCII; strip common units / spaces. */
export function normalizeNumericInput(raw: string): string {
  return raw
    .trim()
    .replace(/[\uFF10-\uFF19]/g, (ch) =>
      String.fromCharCode(ch.charCodeAt(0) - 0xff10 + 0x30),
    )
    .replace(/[\s　,，]/g, "")
    .replace(/(歲|公分|cm|公斤|kg|次|回)/gi, "");
}

export function parseLooseNumber(raw: string): number | null {
  const s = normalizeNumericInput(raw);
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export function promptFor(step: string): string {
  switch (step) {
    case "sex":
      return "請點選性別（或輸入：男／女）";
    case "age":
      return "請輸入年齡（數字，例如 28）";
    case "health":
      return "為了給你安全的建議，請選擇目前是否有特殊狀況：沒有／懷孕或哺乳中／飲食失調困擾／慢性病或特殊疾病";
    case "height":
      return "請輸入身高公分（例如 170）";
    case "weight":
      return "請輸入目前體重公斤（例如 65）";
    case "target_weight":
      return "請輸入目標體重公斤（例如 60）";
    case "activity":
      return "請點選平日活動量（或輸入：久坐／輕度／中度／高強度）";
    case "freq":
      return "請點選每週健身次數（或輸入 0～7）";
    case "eating":
      return "你平常的飲食型態是哪一種？請選擇：大多自己煮／自煮外食各半／大多外食";
    case "goal":
      return "你現在最想改善什麼？請點選一個最接近你的目標";
    default:
      return "請繼續完成建檔";
  }
}

function withPrompt(step: string, extra = ""): OnboardingResult {
  return {
    reply: promptFor(step) + extra,
    stillOnboarding: true,
    quickReply: onboardingQuickReplyForStep(step),
  };
}

function resolveChoice(
  map: Record<string, string>,
  raw: string,
): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  return (
    map[trimmed] ??
    map[trimmed.toLowerCase()] ??
    map[normalizeNumericInput(trimmed)]
  );
}

/** Accept postback value (`male`) or button label / typed phrase (`男`). */
function resolveSex(raw: string): string | undefined {
  return resolveChoice(SEX_MAP, raw);
}

function resolveActivity(raw: string): string | undefined {
  return resolveChoice(ACTIVITY_MAP, raw);
}

function resolveGoal(raw: string): string | undefined {
  const direct = resolveChoice(GOAL_MAP, raw);
  if (direct) return direct;
  const text = raw.trim();
  if (/增肌|提高蛋白質|增加肌肉/u.test(text)) return "bulk";
  if (/瘦|減脂|减脂|改善飲食|外食|一天.*吃多少|目標體重/u.test(text)) return "cut";
  if (/維持|健康/u.test(text)) return "maintain";
  return undefined;
}

function resolveHealth(raw: string): string | undefined {
  return resolveChoice(HEALTH_MAP, raw);
}

function resolveEating(raw: string): string | undefined {
  return resolveChoice(EATING_MAP, raw);
}

function resolveFreq(raw: string): number | undefined {
  const direct = parseLooseNumber(raw);
  if (direct !== null && Number.isInteger(direct) && direct >= 0 && direct <= 7) {
    return direct;
  }
  // Button label like "3次"
  const m = normalizeNumericInput(raw).match(/^(\d+)$/);
  if (!m) return undefined;
  const n = Number(m[1]);
  if (!Number.isInteger(n) || n < 0 || n > 7) return undefined;
  return n;
}

/**
 * Handle onboarding from free text or postback payload value.
 * For postback `onboarding:sex:male`, pass stepHint="sex" and text="male"
 * (or the full data — see parseOnboardingPostback).
 */
export async function handleOnboarding(
  member: MemberRow,
  text: string,
  stepHint?: string,
): Promise<OnboardingResult> {
  const step = stepHint ?? member.onboarding_step ?? "goal";
  const raw = text.trim();

  try {
    if (step === "goal") {
      if (/^(6|⑥|其他|other)$/iu.test(raw)) {
        return {
          reply: "可以，直接告訴卡卡你最想改善的問題，例如體重、飲食、外食或增肌困擾",
          stillOnboarding: true,
        };
      }
      const goal = resolveGoal(raw);
      if (!goal) return withPrompt("goal");
      await patchProfile(member.id, { goal_type: goal });
    } else if (step === "sex") {
      const sex = resolveSex(raw);
      if (!sex) return withPrompt("sex");
      await patchProfile(member.id, { sex });
    } else if (step === "age") {
      const age = parseLooseNumber(raw);
      if (age === null || !Number.isInteger(age) || age < 12 || age > 100) {
        return {
          reply: "年齡請輸入 12～100 的整數",
          stillOnboarding: true,
        };
      }
      let note = "";
      if (age < 18) {
        note =
          "\n\n提醒：未成年請與家長／專業人員討論飲食與運動計畫";
      }
      await patchProfile(member.id, { age });
      const nxt = nextStep(step);
      await setOnboardingStep(member.id, nxt);
      return withPrompt(nxt!, note);
    } else if (step === "health") {
      const health = resolveHealth(raw);
      if (!health) return withPrompt("health");
      await patchProfile(member.id, { health_context: health });
    } else if (step === "height") {
      const height = parseLooseNumber(raw);
      if (height === null || !(height >= 100 && height <= 250)) {
        return {
          reply: "身高請輸入 100～250 公分",
          stillOnboarding: true,
        };
      }
      await patchProfile(member.id, { height_cm: height });
    } else if (step === "weight") {
      const weight = parseLooseNumber(raw);
      if (weight === null || !(weight >= 30 && weight <= 300)) {
        return {
          reply: "體重請輸入合理數字（公斤）",
          stillOnboarding: true,
        };
      }
      await patchProfile(member.id, { weight_kg: weight });
    } else if (step === "target_weight") {
      const weight = parseLooseNumber(raw);
      if (weight === null || !(weight >= 30 && weight <= 300)) {
        return {
          reply: "目標體重請輸入合理數字（公斤）",
          stillOnboarding: true,
        };
      }
      await patchProfile(member.id, { target_weight_kg: weight });
    } else if (step === "activity") {
      const activity = resolveActivity(raw);
      if (!activity) return withPrompt("activity");
      await patchProfile(member.id, { activity_level: activity });
    } else if (step === "freq") {
      const freq = resolveFreq(raw);
      if (freq === undefined) {
        return withPrompt("freq");
      }
      await patchProfile(member.id, { workout_frequency: freq });
    } else if (step === "eating") {
      const eating = resolveEating(raw);
      if (!eating) return withPrompt("eating");
      await patchProfile(member.id, { eating_pattern: eating });
      const done = await completeProfileIfReady(member.id);
      if (!done.done) {
        const profile = await getProfile(member.id);
        const missing = firstMissingOnboardingStep(profile);
        if (missing) {
          await setOnboardingStep(member.id, missing);
          return withPrompt(missing);
        }
        return {
          reply: "個人目標尚未完整保存，請再試一次",
          stillOnboarding: true,
          quickReply: onboardingQuickReplyForStep("eating"),
        };
      }
      await setOnboardingStep(member.id, null);
      return {
        reply: done.summary ?? "建檔完成",
        stillOnboarding: false,
      };
    } else {
      return withPrompt("goal");
    }
  } catch {
    return {
      reply: "建檔資料儲存失敗，請再試一次",
      stillOnboarding: true,
      quickReply: onboardingQuickReplyForStep(step),
    };
  }

  const nxt = nextStep(step);
  await setOnboardingStep(member.id, nxt);
  if (!nxt) {
    const done = await completeProfileIfReady(member.id);
    return {
      reply: done.summary ?? "建檔完成",
      stillOnboarding: false,
    };
  }
  return withPrompt(nxt);
}

/** Parse `onboarding:<step>:<value>` postback data. */
export function parseOnboardingPostback(
  data: string,
): { step: string; value: string } | null {
  if (!data.startsWith("onboarding:")) return null;
  const parts = data.split(":");
  if (parts.length < 3) return null;
  const step = parts[1];
  const value = parts.slice(2).join(":");
  if (!step || !value) return null;
  return { step, value };
}

export function startOnboardingPrompt(): OnboardingResult {
  return withPrompt("goal");
}

export function continueOnboardingPrompt(step: string | null): OnboardingResult {
  return withPrompt(step ?? "goal");
}
