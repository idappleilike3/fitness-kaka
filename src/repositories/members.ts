import { getAdminDb } from "@/lib/supabase/admin";

export type MemberRow = {
  id: string;
  line_user_id: string;
  display_name: string | null;
  status: string;
  onboarding_step: string | null;
};

export async function upsertMemberByLineUserId(
  lineUserId: string,
  displayName?: string | null,
): Promise<MemberRow> {
  const db = getAdminDb();
  const { data: existing } = await db
    .from("members")
    .select("id, line_user_id, display_name, status, onboarding_step")
    .eq("line_user_id", lineUserId)
    .maybeSingle();

  if (existing) {
    await ensureMemberBootstrap(db, existing.id);
    if (displayName && displayName !== existing.display_name) {
      const { data } = await db
        .from("members")
        .update({ display_name: displayName })
        .eq("id", existing.id)
        .select("id, line_user_id, display_name, status, onboarding_step")
        .single();
      return data as MemberRow;
    }
    return existing as MemberRow;
  }

  const { data, error } = await db
    .from("members")
    .insert({
      line_user_id: lineUserId,
      display_name: displayName ?? null,
      onboarding_step: "sex",
    })
    .select("id, line_user_id, display_name, status, onboarding_step")
    .single();

  if (error || !data) {
    throw new Error(
      `Supabase member insert failed: ${error?.message ?? "unknown"}`,
    );
  }

  await ensureMemberBootstrap(db, data.id);
  return data as MemberRow;
}

async function ensureMemberBootstrap(
  db: ReturnType<typeof getAdminDb>,
  memberId: string,
): Promise<void> {
  const { data: sub } = await db
    .from("subscriptions")
    .select("id")
    .eq("member_id", memberId)
    .eq("plan_id", "free")
    .maybeSingle();
  if (!sub) {
    const { error: subErr } = await db.from("subscriptions").insert({
      member_id: memberId,
      plan_id: "free",
      status: "active",
      expires_at: null,
    });
    if (subErr && subErr.code !== "23505") {
      throw new Error(
        `Supabase free subscription insert failed (plans.id=free missing?): ${subErr.message}`,
      );
    }
  }

  const { data: profile } = await db
    .from("member_profiles")
    .select("id")
    .eq("member_id", memberId)
    .maybeSingle();
  if (!profile) {
    const { error: profileErr } = await db
      .from("member_profiles")
      .insert({ member_id: memberId });
    if (profileErr && profileErr.code !== "23505") {
      throw new Error(
        `Supabase member_profiles insert failed: ${profileErr.message}`,
      );
    }
  }
}

export async function setOnboardingStep(
  memberId: string,
  step: string | null,
): Promise<void> {
  const db = getAdminDb();
  await db.from("members").update({ onboarding_step: step }).eq("id", memberId);
}
