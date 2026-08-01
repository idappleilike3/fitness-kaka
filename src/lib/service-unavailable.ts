/**
 * Soft user-facing copy when a backend integration is missing.
 * Never leak env var names / Vercel / admin setup steps to end users.
 * Admin 暗號：logs、health?hint=、LINE「卡卡狀態」／OPEN-SETUP
 */

export const ADMIN_HINT_OPENAI = "OPEN-SETUP";
export const ADMIN_HINT_SUPABASE = "DB-SETUP";
export const ADMIN_HINT_NEWEBPAY = "PAY-SETUP";
export const ADMIN_HINT_GENERIC = "SYS-SETUP";

/** LINE／UI：真人聊天語氣，結尾不加句號 */
export const USER_MSG_OPENAI =
  "飲食分析服務還沒設定好喔 請稍後再試或聯絡客服";
export const USER_MSG_SUPABASE =
  "會員資料服務還沒設定好喔 請稍後再試或聯絡客服";
export const USER_MSG_NEWEBPAY =
  "付款服務還沒設定好喔 請稍後再試或聯絡客服";
export const USER_MSG_ENV =
  "系統設定還沒完成喔 請稍後再試或聯絡客服";
export const USER_MSG_BUSY = "系統有點忙碌 請稍後再試";

/** 僅管理員／客服可見 */
export function adminHintMessage(code: string): string {
  switch (code) {
    case ADMIN_HINT_OPENAI:
      return `暗號 ${ADMIN_HINT_OPENAI}｜飲食分析引擎還沒接上 請到部署平台環境變數補 OPENAI_API_KEY 後重新部署`;
    case ADMIN_HINT_SUPABASE:
      return `暗號 ${ADMIN_HINT_SUPABASE}｜會員資料庫還沒接上 請到部署平台補 SUPABASE_URL／SERVICE_ROLE_KEY`;
    case ADMIN_HINT_NEWEBPAY:
      return `暗號 ${ADMIN_HINT_NEWEBPAY}｜金流還沒接上 請到部署平台補 NEWEBPAY_* 金鑰`;
    default:
      return `暗號 ${ADMIN_HINT_GENERIC}｜系統環境變數未齊 請對照 ENVIRONMENT_VARIABLES 補齊後重新部署`;
  }
}

export type UnavailableKind =
  | "openai"
  | "supabase"
  | "newebpay"
  | "env"
  | "busy";

export function classifyUnavailable(err: unknown): UnavailableKind {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("OpenAI") || msg.includes("OPENAI_API_KEY")) {
    return "openai";
  }
  if (
    msg.includes("Supabase") ||
    msg.includes("PGRST") ||
    msg.includes("schema cache") ||
    msg.includes("foreign key") ||
    msg.includes("Could not find the table") ||
    msg.includes("column") ||
    msg.includes("relation") ||
    msg.includes("Invalid API key") ||
    msg.includes("JWT")
  ) {
    return "supabase";
  }
  if (msg.includes("NewebPay") || msg.includes("newebpay")) {
    return "newebpay";
  }
  if (msg.includes("environment variables")) {
    return "env";
  }
  return "busy";
}

export function adminHintCodeFor(kind: UnavailableKind): string | undefined {
  switch (kind) {
    case "openai":
      return ADMIN_HINT_OPENAI;
    case "supabase":
      return ADMIN_HINT_SUPABASE;
    case "newebpay":
      return ADMIN_HINT_NEWEBPAY;
    case "env":
      return ADMIN_HINT_GENERIC;
    default:
      return undefined;
  }
}

export function featureUnavailableUserMessage(err: unknown): string {
  switch (classifyUnavailable(err)) {
    case "openai":
      return USER_MSG_OPENAI;
    case "supabase":
      return USER_MSG_SUPABASE;
    case "newebpay":
      return USER_MSG_NEWEBPAY;
    case "env":
      return USER_MSG_ENV;
    default:
      return USER_MSG_BUSY;
  }
}

/** @deprecated alias */
export const featureUnavailableMessage = featureUnavailableUserMessage;

export function isAdminHintCodePhrase(text: string): boolean {
  const t = text.trim();
  if (!t) return false;
  const upper = t.toUpperCase();
  if (
    upper === ADMIN_HINT_OPENAI ||
    upper === ADMIN_HINT_SUPABASE ||
    upper === ADMIN_HINT_NEWEBPAY ||
    upper === ADMIN_HINT_GENERIC
  ) {
    return true;
  }
  if (t.startsWith("暗號 ")) {
    return true;
  }
  return false;
}

export function resolveAdminHintFromPhrase(text: string): string {
  const t = text.trim();
  const upper = t.toUpperCase().replace(/^暗號\s+/u, "");
  if (upper === ADMIN_HINT_OPENAI) return adminHintMessage(ADMIN_HINT_OPENAI);
  if (upper === ADMIN_HINT_SUPABASE) return adminHintMessage(ADMIN_HINT_SUPABASE);
  if (upper === ADMIN_HINT_NEWEBPAY) return adminHintMessage(ADMIN_HINT_NEWEBPAY);
  if (upper === ADMIN_HINT_GENERIC) return adminHintMessage(ADMIN_HINT_GENERIC);
  return adminHintMessage(ADMIN_HINT_GENERIC);
}

/** Health：?hint=OPEN-SETUP 或 ?code=OPEN-SETUP */
export function parseHealthAdminHint(
  hintOrCode: string | null,
): string | undefined {
  if (!hintOrCode) return undefined;
  const code = hintOrCode.trim().toUpperCase();
  const known = [
    ADMIN_HINT_OPENAI,
    ADMIN_HINT_SUPABASE,
    ADMIN_HINT_NEWEBPAY,
    ADMIN_HINT_GENERIC,
  ];
  if (!known.includes(code)) return undefined;
  return adminHintMessage(code);
}
