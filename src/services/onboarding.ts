import {
  onboardingQuickReplyForStep,
} from "@/lib/line/messages";
import type { MemberRow } from "@/repositories/members";
import { setOnboardingStep } from "@/repositories/members";
import {
  completeProfileIfReady,
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

const GOAL_MAP: Record<string, string> = {
  減脂: "cut",
  增肌: "bulk",
  維持: "maintain",
  維持體重: "maintain",
  cut: "cut",
  bulk: "bulk",
  maintain: "maintain",
};

const STEPS = [
  "sex",
  "age",
  "height",
  "weight",
  "target_weight",
  "activity",
  "freq",
  "goal",
] as const;

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
};

/** Recovers members whose profile completed but onboarding_step was left stale. */
export function isCompletedOnboardingProfile(
  profile: OnboardingProfile | null | undefined,
): boolean {
  return Boolean(
    profile &&
      profile.sex &&
      profile.age !== null &&
      profile.height_cm !== null &&
      profile.weight_kg !== null &&
      profile.target_weight_kg !== null &&
      profile.activity_level &&
      profile.workout_frequency !== null &&
      profile.goal_type,
  );
}

/**
 * Do not gate meal logging for members who can already receive a TDEE estimate
 * or who hold an active paid plan. Target weight, workout frequency, and goal
 * improve coaching but must not trap an existing member in onboarding.
 */
export function shouldBypassOnboarding(
  profile: OnboardingProfile | null | undefined,
  currentPlanId: string,
): boolean {
  if (currentPlanId !== "free") return true;
  return Boolean(
    profile &&
      profile.sex &&
      profile.age !== null &&
      profile.height_cm !== null &&
      profile.weight_kg !== null &&
      profile.activity_level,
  );
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
    case "goal":
      return "請點選目標（或輸入：減脂／增肌／維持）";
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
  return resolveChoice(GOAL_MAP, raw);
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
  const step = stepHint ?? member.onboarding_step ?? "sex";
  const raw = text.trim();

  try {
    if (step === "sex") {
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
    } else if (step === "goal") {
      const goal = resolveGoal(raw);
      if (!goal) return withPrompt("goal");
      await patchProfile(member.id, { goal_type: goal });
      const done = await completeProfileIfReady(member.id);
      await setOnboardingStep(member.id, null);
      return {
        reply: done.summary ?? "建檔完成",
        stillOnboarding: false,
      };
    } else {
      return withPrompt("sex");
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
  return withPrompt("sex");
}

export function continueOnboardingPrompt(step: string | null): OnboardingResult {
  return withPrompt(step ?? "sex");
}
