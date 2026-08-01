import { getTaipeiDate } from "@/lib/quota/daily";
import { getAdminDb } from "@/lib/supabase/admin";

export type ChallengeStatus = {
  day: number;
  missionTitle: string | null;
  missionDescription: string | null;
  missionCompleted: boolean;
  streakDays: number;
};

async function getActiveChallenge(memberId: string) {
  const { data, error } = await getAdminDb()
    .from("member_challenges")
    .select("id, started_on, ends_on")
    .eq("member_id", memberId)
    .eq("status", "active")
    .maybeSingle();
  if (error) throw new Error(`讀取挑戰失敗: ${error.message}`);
  return data;
}

export async function startChallenge(memberId: string): Promise<ChallengeStatus> {
  const today = getTaipeiDate();
  let challenge = await getActiveChallenge(memberId);
  if (!challenge) {
    const { error } = await getAdminDb().from("member_challenges").insert({
      member_id: memberId,
      started_on: today,
      ends_on: addDays(today, 29),
    });
    if (error && error.code !== "23505") {
      throw new Error(`建立挑戰失敗: ${error.message}`);
    }
    challenge = await getActiveChallenge(memberId);
  }
  if (!challenge) throw new Error("建立挑戰後找不到挑戰資料");
  return getChallengeStatus(memberId, challenge);
}

export async function getChallengeStatus(
  memberId: string,
  challenge?: Awaited<ReturnType<typeof getActiveChallenge>>,
): Promise<ChallengeStatus> {
  const activeChallenge = challenge ?? (await getActiveChallenge(memberId));
  if (!activeChallenge) {
    return {
      day: 0,
      missionTitle: null,
      missionDescription: null,
      missionCompleted: false,
      streakDays: 0,
    };
  }

  const today = getTaipeiDate();
  const day = clampDay(daysBetween(activeChallenge.started_on, today) + 1);
  const db = getAdminDb();
  const [{ data: progress, error: progressError }, { data: level, error: levelError }] =
    await Promise.all([
      db
        .from("mission_progress")
        .select("status, missions(title, description)")
        .eq("member_id", memberId)
        .eq("assigned_on", today)
        .maybeSingle(),
      db
        .from("user_levels")
        .select("current_streak_days")
        .eq("member_id", memberId)
        .maybeSingle(),
    ]);
  if (progressError) throw new Error(`讀取任務進度失敗: ${progressError.message}`);
  if (levelError) throw new Error(`讀取連續天數失敗: ${levelError.message}`);

  const mission = progress?.missions as
    | { title?: string; description?: string }
    | { title?: string; description?: string }[]
    | null
    | undefined;
  const missionData = Array.isArray(mission) ? mission[0] : mission;
  return {
    day,
    missionTitle: missionData?.title ?? "確認一餐",
    missionDescription: missionData?.description ?? "確認今天的一筆飲食紀錄",
    missionCompleted: progress?.status === "completed",
    streakDays: Number(level?.current_streak_days) || 0,
  };
}

export async function recordConfirmedMealChallenge(
  memberId: string,
  mealId: string,
  recordedOn: string,
): Promise<{ missionCompleted: boolean; streakDays: number } | null> {
  const { data, error } = await getAdminDb()
    .rpc("record_challenge_meal", {
      p_member_id: memberId,
      p_meal_id: mealId,
      p_recorded_on: recordedOn,
    })
    .maybeSingle();
  if (error) throw new Error(`更新挑戰進度失敗: ${error.message}`);
  if (!data || typeof data !== "object") return null;
  const row = data as {
    mission_completed?: boolean;
    current_streak_days?: number | string | null;
  };
  return {
    missionCompleted: Boolean(row.mission_completed),
    streakDays: Number(row.current_streak_days) || 0,
  };
}

function daysBetween(from: string, to: string): number {
  return Math.floor(
    (Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) /
      86_400_000,
  );
}

function addDays(date: string, days: number): string {
  const value = new Date(`${date}T00:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function clampDay(day: number): number {
  return Math.min(30, Math.max(1, day));
}
