import { getEnvConfigStatus } from "@/lib/env";
import {
  ADMIN_HINT_NEWEBPAY,
  ADMIN_HINT_OPENAI,
  ADMIN_HINT_SUPABASE,
  adminHintMessage,
  isAdminHintCodePhrase,
  resolveAdminHintFromPhrase,
} from "@/lib/service-unavailable";
import { getAdminDb } from "@/lib/supabase/admin";

/** LINE 暗號：預設「卡卡狀態」，可用環境變數覆寫。 */
export function getAdminStatusCode(): string {
  const fromEnv = process.env.ADMIN_STATUS_CODE?.trim();
  return fromEnv && fromEnv.length > 0 ? fromEnv : "卡卡狀態";
}

export function isAdminStatusCommand(text: string): boolean {
  const t = text.trim();
  return t === getAdminStatusCode() || isAdminHintCodePhrase(t);
}

function flag(ok: boolean): string {
  return ok ? "ok" : "off";
}

async function probeDbReachable(): Promise<boolean> {
  try {
    const db = getAdminDb();
    const { error } = await db
      .from("plans")
      .select("id")
      .eq("id", "free")
      .maybeSingle();
    return !error;
  } catch {
    return false;
  }
}

/**
 * Compact status + 暗號 codes for anything off.
 * Specific codes (OPEN-SETUP 等) return the detailed admin hint only.
 */
export async function buildAdminStatusReply(text?: string): Promise<string> {
  const raw = (text ?? "").trim();
  if (isAdminHintCodePhrase(raw)) {
    return resolveAdminHintFromPhrase(raw);
  }

  const config = getEnvConfigStatus();
  const db = config.supabase ? await probeDbReachable() : false;
  const lines = [
    "卡卡狀態",
    `line ${flag(config.line)}`,
    `openai ${flag(config.openai)}${config.openai ? "" : ` → ${ADMIN_HINT_OPENAI}`}`,
    `supabase ${flag(config.supabase)}${config.supabase ? "" : ` → ${ADMIN_HINT_SUPABASE}`}`,
    `newebpay ${flag(config.newebpay)}${config.newebpay ? "" : ` → ${ADMIN_HINT_NEWEBPAY}`}`,
    `db ${flag(db)}`,
  ];
  if (!config.openai) {
    lines.push(adminHintMessage(ADMIN_HINT_OPENAI));
  } else if (!config.supabase) {
    lines.push(adminHintMessage(ADMIN_HINT_SUPABASE));
  } else if (!config.newebpay) {
    lines.push(adminHintMessage(ADMIN_HINT_NEWEBPAY));
  }
  return lines.join("\n");
}
