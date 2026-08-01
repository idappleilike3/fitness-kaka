/** In-memory last-reply guard (best-effort on warm serverless instances). */

type LastReply = {
  text: string;
  at: number;
  kind?: string;
};

const lastByMember = new Map<string, LastReply>();

const DEFAULT_WINDOW_MS = 90_000;

export function rememberBotReply(
  memberId: string,
  text: string,
  kind?: string,
): void {
  lastByMember.set(memberId, { text, at: Date.now(), kind });
}

export function getLastBotReply(memberId: string): LastReply | undefined {
  return lastByMember.get(memberId);
}

/**
 * True when the exact same canned reply would fire again within the window.
 */
export function wouldRepeatSameReply(
  memberId: string,
  text: string,
  windowMs = DEFAULT_WINDOW_MS,
): boolean {
  const prev = lastByMember.get(memberId);
  if (!prev) return false;
  if (Date.now() - prev.at > windowMs) return false;
  return prev.text === text;
}

/**
 * Pick a variant that differs from the last reply when possible.
 */
export function pickNonRepeatingReply(
  memberId: string,
  variants: string[],
  windowMs = DEFAULT_WINDOW_MS,
): string {
  const list = variants.filter((v) => v.trim().length > 0);
  if (list.length === 0) return "";
  const prev = lastByMember.get(memberId);
  if (!prev || Date.now() - prev.at > windowMs) return list[0]!;
  const alt = list.find((v) => v !== prev.text);
  return alt ?? list[0]!;
}

/** Test helper */
export function clearReplyMemory(): void {
  lastByMember.clear();
}
