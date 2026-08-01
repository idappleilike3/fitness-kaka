import { getTaipeiDate } from "@/lib/quota/daily";
import { getAdminDb } from "@/lib/supabase/admin";
import type { MealAnalysisJson, MealSource } from "@/types";

export async function createPending(params: {
  memberId: string;
  source: MealSource;
  analysis: MealAnalysisJson;
  inputText?: string;
  imageHash?: string;
}): Promise<string> {
  const db = getAdminDb();
  const expires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await db
    .from("pending_meal_analyses")
    .insert({
      member_id: params.memberId,
      source: params.source,
      status: "pending",
      input_text: params.inputText ?? null,
      image_hash: params.imageHash ?? null,
      result_json: params.analysis,
      total_kcal: Math.round(params.analysis.total_kcal),
      protein_g: params.analysis.protein_g,
      carb_g: params.analysis.carb_g,
      fat_g: params.analysis.fat_g,
      expires_at: expires,
    })
    .select("id")
    .single();
  if (error || !data) throw new Error(error?.message ?? "pending insert failed");
  return data.id as string;
}

export async function getPending(pendingId: string, memberId: string) {
  const db = getAdminDb();
  const { data } = await db
    .from("pending_meal_analyses")
    .select("*")
    .eq("id", pendingId)
    .eq("member_id", memberId)
    .maybeSingle();
  return data;
}

export async function getLatestPending(memberId: string) {
  const db = getAdminDb();
  const now = new Date().toISOString();
  const { data, error } = await db
    .from("pending_meal_analyses")
    .select("*")
    .eq("member_id", memberId)
    .eq("status", "pending")
    .gt("expires_at", now)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return data;
}

export async function updatePendingAnalysis(params: {
  pendingId: string;
  memberId: string;
  analysis: MealAnalysisJson;
  inputText: string;
}): Promise<void> {
  const db = getAdminDb();
  const { error } = await db
    .from("pending_meal_analyses")
    .update({
      input_text: params.inputText,
      result_json: params.analysis,
      total_kcal: Math.round(params.analysis.total_kcal),
      protein_g: params.analysis.protein_g,
      carb_g: params.analysis.carb_g,
      fat_g: params.analysis.fat_g,
    })
    .eq("id", params.pendingId)
    .eq("member_id", params.memberId)
    .eq("status", "pending");
  if (error) throw new Error(error.message);
}

export async function confirmPending(
  pendingId: string,
  memberId: string,
): Promise<{ mealId: string; recordedOn: string }> {
  const db = getAdminDb();
  const pending = await getPending(pendingId, memberId);
  if (!pending || pending.status !== "pending") {
    throw new Error("pending not found");
  }

  const recordedOn = getTaipeiDate();
  const analysis = pending.result_json as MealAnalysisJson;

  const { data: meal, error } = await db
    .from("meal_records")
    .insert({
      member_id: memberId,
      pending_id: pendingId,
      meal_type: "other",
      recorded_on: recordedOn,
      total_kcal: Math.round(analysis.total_kcal),
      protein_g: analysis.protein_g,
      carb_g: analysis.carb_g,
      fat_g: analysis.fat_g,
    })
    .select("id")
    .single();
  if (error || !meal) throw new Error(error?.message ?? "meal insert failed");

  const items = analysis.items.map((it, idx) => ({
    meal_record_id: meal.id,
    name: it.name,
    portion_text: it.portion_text,
    kcal: Math.round(it.kcal),
    protein_g: it.protein_g,
    carb_g: it.carb_g,
    fat_g: it.fat_g,
    sort_order: idx,
  }));
  if (items.length) await db.from("meal_items").insert(items);

  const { data: summary } = await db
    .from("daily_nutrition_summary")
    .select("*")
    .eq("member_id", memberId)
    .eq("summary_date", recordedOn)
    .maybeSingle();

  if (summary) {
    await db
      .from("daily_nutrition_summary")
      .update({
        total_kcal: summary.total_kcal + Math.round(analysis.total_kcal),
        protein_g: Number(summary.protein_g) + analysis.protein_g,
        carb_g: Number(summary.carb_g) + analysis.carb_g,
        fat_g: Number(summary.fat_g) + analysis.fat_g,
      })
      .eq("id", summary.id);
  } else {
    await db.from("daily_nutrition_summary").insert({
      member_id: memberId,
      summary_date: recordedOn,
      total_kcal: Math.round(analysis.total_kcal),
      protein_g: analysis.protein_g,
      carb_g: analysis.carb_g,
      fat_g: analysis.fat_g,
    });
  }

  await db
    .from("pending_meal_analyses")
    .update({ status: "confirmed" })
    .eq("id", pendingId);

  return { mealId: meal.id as string, recordedOn };
}

export async function discardPending(
  pendingId: string,
  memberId: string,
): Promise<void> {
  const db = getAdminDb();
  await db
    .from("pending_meal_analyses")
    .update({ status: "discarded" })
    .eq("id", pendingId)
    .eq("member_id", memberId);
}

export async function getTodaySummary(memberId: string) {
  const db = getAdminDb();
  const date = getTaipeiDate();
  const { data } = await db
    .from("daily_nutrition_summary")
    .select("*")
    .eq("member_id", memberId)
    .eq("summary_date", date)
    .maybeSingle();
  return (
    data ?? {
      total_kcal: 0,
      protein_g: 0,
      carb_g: 0,
      fat_g: 0,
    }
  );
}
