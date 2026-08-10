import {
  downloadContent,
  getLineProfile,
  replyMessage,
  replyText,
} from "@/lib/line/client";
import {
  audioTooLongMessage,
  consultationStartMessage,
  goalsSummaryMessage,
  helpMessage,
  mealLogTipMessage,
  upgradePlansMessage,
  videoNotSupportedMessage,
} from "@/lib/line/messages";
import {
  classifyConsultationNeed,
  classifyTextIntent,
  isEmojiOnlyMessage,
  isGreetingText,
  isNonMealMessageType,
  isPendingMealCorrection,
} from "@/lib/line/intent";
import {
  pickNonRepeatingReply,
  rememberBotReply,
  wouldRepeatSameReply,
} from "@/lib/line/reply-memory";
import { isAudioTooLong, MAX_AUDIO_SECONDS } from "@/lib/audio/duration";
import {
  buildAdminStatusReply,
  isAdminStatusCommand,
} from "@/lib/admin-status";
import { getAppOnlyEnv } from "@/lib/env";
import { getAdminDb } from "@/lib/supabase/admin";
import { resolveCurrentPlan } from "@/lib/subscriptions/current-plan";
import {
  adminHintCodeFor,
  classifyUnavailable,
  featureUnavailableUserMessage,
} from "@/lib/service-unavailable";
import { ensureEventOnce, logSystem } from "@/repositories/logs";
import {
  setOnboardingStep,
  upsertMemberByLineUserId,
  type MemberRow,
} from "@/repositories/members";
import { getLatestPending } from "@/repositories/meals";
import { getProfile } from "@/repositories/profiles";
import {
  getChallengeStatus,
  startChallenge,
  type ChallengeStatus,
} from "@/repositories/challenges";
import { handleCoachChat } from "@/services/coach-chat";
import { answerDailyStatus } from "@/services/daily-status";
import {
  handleImageMeal,
  handleMealPostback,
  handleTextMeal,
  handleVoiceMeal,
} from "@/services/meal-flow";
import {
  continueOnboardingPrompt,
  handleOnboarding,
  isCompletedOnboardingProfile,
  parseOnboardingPostback,
  shouldBypassOnboarding,
  startOnboardingPrompt,
  type OnboardingResult,
} from "@/services/onboarding";

type LineEvent = {
  type: string;
  replyToken?: string;
  webhookEventId?: string;
  source?: { userId?: string; type?: string };
  message?: {
    id?: string;
    type?: string;
    text?: string;
    /** LINE audio duration in milliseconds */
    duration?: number;
    contentProvider?: { type?: string };
  };
  postback?: { data?: string };
};

function memberCenterUrl(lineUserId: string): string | undefined {
  try {
    const env = getAppOnlyEnv();
    return `${env.PUBLIC_BASE_URL}/liff?lineUserId=${encodeURIComponent(lineUserId)}`;
  } catch {
    return undefined;
  }
}

function challengeStatusMessage(status: ChallengeStatus): string {
  if (status.day === 0) {
    return "還沒有進行中的 30 天挑戰，輸入「我要參加三十天減脂挑戰」或「開始挑戰」就能從今天 Day 1 開始";
  }
  return [
    `30 天挑戰 Day ${status.day}`,
    `今日任務：${status.missionTitle ?? "確認一餐"}`,
    status.missionCompleted
      ? "狀態：已完成"
      : `狀態：待完成\n${status.missionDescription ?? "確認今天的一筆飲食紀錄"}`,
    `連續紀錄：${status.streakDays} 天`,
  ].join("\n");
}

function isChallengeSchemaMissing(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return /member_challenges|mission_progress|user_levels|does not exist|schema cache|42P01/i.test(
    msg,
  );
}

async function enrollOrStatusChallenge(memberId: string): Promise<string> {
  try {
    const before = await getChallengeStatus(memberId);
    const alreadyIn = before.day > 0;
    const status = await startChallenge(memberId);
    if (alreadyIn) {
      return `你已在 30 天挑戰中\n${challengeStatusMessage(status)}\n\n想看進度可輸入「今日任務」`;
    }
    return [
      "已幫你加入 30 天健身減脂挑戰",
      challengeStatusMessage(status),
      "",
      "Day 1 這樣開始：",
      "1. 傳一餐照片或打字告訴我吃了什麼",
      "2. 確認紀錄後就算完成今日任務",
      "之後每天輸入「今日任務」就能查看進度",
    ].join("\n");
  } catch (err) {
    if (isChallengeSchemaMissing(err)) {
      return "30 天挑戰資料庫尚未就緒，請管理員先執行 supabase/migrations/002_30_day_challenge.sql 後再試一次";
    }
    throw err;
  }
}

async function getCurrentPlanForMember(memberId: string) {
  const { data, error } = await getAdminDb()
    .from("subscriptions")
    .select("plan_id, status, expires_at")
    .eq("member_id", memberId);
  if (error) throw new Error(`讀取會員方案失敗: ${error.message}`);
  return resolveCurrentPlan(data ?? []);
}

/**
 * Clear stale onboarding when profile is complete, enough for TDEE, or paid.
 * Prevents 鬼打牆 re-asking height/weight after unlock / 跳過 / paid.
 */
async function unlockStaleOnboarding(member: MemberRow): Promise<MemberRow> {
  if (!member.onboarding_step) return member;

  const profile = await getProfile(member.id);
  const completedProfile = isCompletedOnboardingProfile(profile);
  const enoughForTdee = shouldBypassOnboarding(profile, "free");
  const currentPlan =
    completedProfile || enoughForTdee
      ? null
      : await getCurrentPlanForMember(member.id);
  const paidOrReady =
    completedProfile ||
    enoughForTdee ||
    shouldBypassOnboarding(profile, currentPlan?.planId ?? "free");

  if (!paidOrReady) return member;

  await setOnboardingStep(member.id, null);
  return { ...member, onboarding_step: null };
}

async function replyOnboarding(
  replyToken: string,
  result: OnboardingResult,
): Promise<void> {
  if (result.quickReply) {
    await replyMessage(replyToken, [
      {
        type: "text",
        text: result.reply,
        quickReply: result.quickReply,
      },
    ]);
    return;
  }
  await replyText(replyToken, result.reply);
}

const SOFT_ACK_VARIANTS = [
  "收到～有餐點要記再傳照片或打字跟我說",
  "嗯嗯，我在～想改尚未確認的餐點可以直接說「是A不是B」",
  "哈哈好～要記飲食或更正餐點隨時跟我說",
];

/**
 * Sticker / emoji: short warm ack, never repeat the same canned line.
 */
async function replySoftAck(
  replyToken: string,
  memberId: string,
): Promise<void> {
  const text = pickNonRepeatingReply(memberId, SOFT_ACK_VARIANTS);
  if (wouldRepeatSameReply(memberId, text)) {
    // Same warm line within window — stay quiet instead of 鬼打牆
    rememberBotReply(memberId, text, "soft_ack_skip");
    return;
  }
  rememberBotReply(memberId, text, "soft_ack");
  await replyText(replyToken, text);
}

async function replyMemberText(
  replyToken: string,
  memberId: string,
  text: string,
  kind = "text",
): Promise<void> {
  if (wouldRepeatSameReply(memberId, text)) {
    const alt = pickNonRepeatingReply(memberId, [
      "我在～上一則一樣的提示先略過，直接傳餐點或說「是A不是B」更正即可",
      "收到，我這邊先不重複同一段說明囉",
      ...SOFT_ACK_VARIANTS,
    ]);
    if (alt === text || wouldRepeatSameReply(memberId, alt)) {
      rememberBotReply(memberId, text, `${kind}_skip`);
      return;
    }
    rememberBotReply(memberId, alt, kind);
    await replyText(replyToken, alt);
    return;
  }
  rememberBotReply(memberId, text, kind);
  await replyText(replyToken, text);
}

async function handleMenuPostback(
  replyToken: string,
  member: MemberRow,
  lineUserId: string,
  data: string,
): Promise<void> {
  const key = data.trim();
  switch (key) {
    case "menu:today": {
      if (member.onboarding_step) {
        const cont = continueOnboardingPrompt(member.onboarding_step);
        await replyOnboarding(replyToken, {
          ...cont,
          reply: `請先完成建檔，才能查看今日狀態\n${cont.reply}`,
        });
        return;
      }
      const ans = await answerDailyStatus(member.id, "今日還能吃多少");
      await replyText(replyToken, ans);
      return;
    }
    case "menu:meal": {
      await replyText(replyToken, mealLogTipMessage());
      return;
    }
    case "menu:upgrade": {
      const currentPlan = await getCurrentPlanForMember(member.id);
      await replyText(
        replyToken,
        upgradePlansMessage(memberCenterUrl(lineUserId), currentPlan),
      );
      return;
    }
    case "menu:goals": {
      if (member.onboarding_step) {
        const cont = continueOnboardingPrompt(member.onboarding_step);
        await replyOnboarding(replyToken, {
          ...cont,
          reply: `建檔完成後即可查看目標\n${cont.reply}`,
        });
        return;
      }
      const profile = await getProfile(member.id);
      if (!profile?.calorie_target) {
        await replyText(
          replyToken,
          "尚未找到目標資料。請到會員中心確認，或重新完成建檔",
        );
        return;
      }
      await replyText(replyToken, goalsSummaryMessage(profile));
      return;
    }
    case "menu:help":
    default: {
      await replyText(replyToken, helpMessage());
    }
  }
}

async function handleChallengePostback(
  replyToken: string,
  memberId: string,
  data: string,
): Promise<void> {
  if (data === "challenge:start") {
    await replyText(replyToken, await enrollOrStatusChallenge(memberId));
    return;
  }
  await replyText(replyToken, challengeStatusMessage(await getChallengeStatus(memberId)));
}

async function routeUnlockedText(
  replyToken: string,
  member: MemberRow,
  lineUserId: string,
  text: string,
): Promise<void> {
  const trimmed = text.trim();

  if (isEmojiOnlyMessage(trimmed)) {
    await replySoftAck(replyToken, member.id);
    return;
  }

  if (/^(?:開始建檔|重新建檔|建檔)$/u.test(trimmed)) {
    await setOnboardingStep(member.id, "goal");
    await replyOnboarding(replyToken, startOnboardingPrompt());
    return;
  }

  const isConsultationChoice =
    /^[①②③④⑤⑥1-6](?:[。.!！]?\s*)$/u.test(trimmed) ||
    /^(?:我想瘦\s*\d*(?:公斤|kg)?|我想(?:減脂|减脂)|我想改善飲食習慣|我想增肌(?:、?提高蛋白質)?|我不知道自己?一天該?吃多少|我(?:每天|常常)都?外食(?:，?不知道怎麼選)?)[。.!！]?$/u.test(trimmed);
  if (isConsultationChoice) {
    const need = classifyConsultationNeed(trimmed);
    const nextReply = {
      weight_loss: "好，我們先把減脂目標訂清楚。你目前幾公斤、希望到幾公斤？也可以直接告訴我想減幾公斤。",
      habits: "可以。你最想先改善哪一個飲食習慣？例如宵夜、含糖飲料、三餐不固定、份量太多，或其他困擾。",
      muscle: "好，我先了解你的增肌狀況。你目前一週運動幾天？平常有沒有特別補充蛋白質？",
      calorie_target: "可以，我幫你計算每天適合吃多少。請告訴我身高、體重、年齡、性別，以及平常一週運動幾天。",
      eating_out: "沒問題。你最常吃哪一類外食？例如便當、自助餐、早餐店、超商、麵飯或速食。",
      other: "可以，直接告訴我你現在最想改善什麼，或把遇到的飲食、減脂問題說給我聽。",
    }[need];
    await replyMemberText(replyToken, member.id, nextReply, `consultation_${need}`);
    return;
  }

  // Always resolve pending when correction-like — 「是A不是B」 has no meal keywords
  let hasPendingMeal = false;
  if (isPendingMealCorrection(trimmed)) {
    const pending = await getLatestPending(member.id);
    hasPendingMeal = Boolean(pending);
  }

  const intent = classifyTextIntent(trimmed, { hasPendingMeal });

  switch (intent) {
    case "daily_status": {
      const ans = await answerDailyStatus(member.id, trimmed);
      await replyMemberText(replyToken, member.id, ans, "daily_status");
      return;
    }
    case "challenge_start": {
      await replyMemberText(
        replyToken,
        member.id,
        await enrollOrStatusChallenge(member.id),
        "challenge",
      );
      return;
    }
    case "challenge_status": {
      await replyMemberText(
        replyToken,
        member.id,
        challengeStatusMessage(await getChallengeStatus(member.id)),
        "challenge",
      );
      return;
    }
    case "upgrade": {
      const currentPlan = await getCurrentPlanForMember(member.id);
      await replyMemberText(
        replyToken,
        member.id,
        upgradePlansMessage(memberCenterUrl(lineUserId), currentPlan),
        "upgrade",
      );
      return;
    }
    case "help": {
      await replyMemberText(replyToken, member.id, helpMessage(), "help");
      return;
    }
    case "greeting": {
      await replyMemberText(
        replyToken,
        member.id,
        "我在～想記飲食時，直接傳餐點照片或告訴我吃了什麼；需要完整說明再輸入「怎麼用」",
        "greeting",
      );
      return;
    }
    case "pending_correction":
    case "meal": {
      await handleTextMeal(replyToken, member.id, trimmed);
      return;
    }
    case "chitchat":
    default: {
      const coach = await handleCoachChat(
        member.id,
        trimmed,
        member.display_name,
      );
      await replyMemberText(replyToken, member.id, coach.reply, "coach");
    }
  }
}

export async function routeEvent(event: LineEvent): Promise<void> {
  const userId = event.source?.userId;
  if (!userId) return;

  const replyToken = event.replyToken;
  const eventKey =
    event.webhookEventId ??
    `${userId}:${event.type}:${replyToken ?? ""}:${event.message?.id ?? event.postback?.data ?? ""}`;

  // Admin status 暗號 — before DB upsert so it still works when Supabase is down
  if (
    replyToken &&
    event.type === "message" &&
    event.message?.type === "text" &&
    event.message.text &&
    isAdminStatusCommand(event.message.text)
  ) {
    try {
      await replyText(
        replyToken,
        await buildAdminStatusReply(event.message.text),
      );
    } catch (err) {
      console.error("[line-router] admin-status", err);
      try {
        await replyText(
          replyToken,
          "卡卡狀態\nline ?\nopenai ?\nsupabase ?\nnewebpay ?\ndb ?",
        );
      } catch {
        /* ignore */
      }
    }
    return;
  }

  try {
    const first = await ensureEventOnce(eventKey, event.type);
    if (!first) return;

    // LINE webhook payloads omit the display name. Refresh it on every
    // follow/message event so admin search works for new and older members.
    const lineProfile = await getLineProfile(userId).catch(() => null);
    let member = await upsertMemberByLineUserId(
      userId,
      lineProfile?.displayName,
    );
    member = await unlockStaleOnboarding(member);
    if (!replyToken) return;

    if (event.type === "follow") {
      // Never re-ask completed / unlocked onboarding on re-follow
      if (!member.onboarding_step) {
        await replyText(replyToken, consultationStartMessage());
        return;
      }
      await replyMessage(replyToken, [
        {
          type: "text",
          text: consultationStartMessage(),
        },
      ]);
      return;
    }

    if (event.type === "postback" && event.postback?.data) {
      const data = event.postback.data;
      if (data.startsWith("menu:")) {
        await handleMenuPostback(replyToken, member, userId, data);
        return;
      }
      if (data.startsWith("meal:")) {
        await handleMealPostback(replyToken, member.id, data);
        return;
      }
      if (data.startsWith("challenge:")) {
        await handleChallengePostback(replyToken, member.id, data);
        return;
      }
      const ob = parseOnboardingPostback(data);
      if (ob) {
        // Ignore stale buttons if user already moved past that step
        const current = member.onboarding_step ?? "goal";
        if (member.onboarding_step === null) {
          await replyText(replyToken, "建檔已完成，可直接傳食物照片或打字紀錄");
          return;
        }
        if (ob.step !== current) {
          await replyOnboarding(
            replyToken,
            continueOnboardingPrompt(current),
          );
          return;
        }
        const result = await handleOnboarding(member, ob.value, ob.step);
        await replyOnboarding(replyToken, result);
        return;
      }
    }

    if (event.type === "message" && event.message) {
      const msg = event.message;
      if (msg.type === "video" || msg.type === "file") {
        await replyText(replyToken, videoNotSupportedMessage());
        return;
      }
      if (isNonMealMessageType(msg.type)) {
        await replySoftAck(replyToken, member.id);
        return;
      }
      if (msg.type === "audio" && msg.id) {
        if (member.onboarding_step) {
          const cont = continueOnboardingPrompt(member.onboarding_step);
          await replyOnboarding(replyToken, {
            ...cont,
            reply: `請先完成建檔\n${cont.reply}`,
          });
          return;
        }
        // Reject over-limit before download / Whisper
        if (isAudioTooLong(msg.duration, MAX_AUDIO_SECONDS)) {
          await replyText(replyToken, audioTooLongMessage());
          return;
        }
        const buf = await downloadContent(msg.id);
        await handleVoiceMeal(replyToken, member.id, buf, msg.duration);
        return;
      }
      if (msg.type === "image" && msg.id) {
        if (member.onboarding_step) {
          const cont = continueOnboardingPrompt(member.onboarding_step);
          await replyOnboarding(replyToken, {
            ...cont,
            reply: `請先完成建檔\n${cont.reply}`,
          });
          return;
        }
        const buf = await downloadContent(msg.id);
        await handleImageMeal(replyToken, member.id, buf, "image/jpeg", userId);
        return;
      }
      if (msg.type === "text" && msg.text) {
        if (member.onboarding_step) {
          const text = msg.text.trim();
          if (isEmojiOnlyMessage(text)) {
            await replySoftAck(replyToken, member.id);
            return;
          }
          if (text === "跳過") {
            await setOnboardingStep(member.id, null);
            await replyText(
              replyToken,
              "已先略過建檔，你可以直接傳餐點照片或告訴我吃了什麼；想補資料時再輸入「開始建檔」",
            );
            return;
          }
          if (isGreetingText(text)) {
            await replyMemberText(
              replyToken,
              member.id,
              "我在～你可以繼續填下一題，或輸入「跳過」先開始記飲食",
              "onboarding_greeting",
            );
            return;
          }
          const result = await handleOnboarding(member, msg.text);
          await replyOnboarding(replyToken, result);
          return;
        }
        await routeUnlockedText(replyToken, member, userId, msg.text);
      }
    }
  } catch (err) {
    // Must log to Vercel — system_logs may itself be missing after a fresh SQL miss.
    const kind = classifyUnavailable(err);
    const hintCode = adminHintCodeFor(kind);
    console.error(
      "[line-router]",
      event.type,
      userId,
      hintCode ? `暗號 ${hintCode}` : "",
      err,
    );
    await logSystem("error", "line-router", String(err), {
      userId,
      type: event.type,
      adminHintCode: hintCode,
    }).catch(() => undefined);
    if (replyToken) {
      try {
        await replyText(replyToken, featureUnavailableUserMessage(err));
      } catch {
        /* ignore */
      }
    }
  }
}
