/** Max voice meal audio length in seconds (business rule). */
export const MAX_AUDIO_SECONDS = 60;

/**
 * LINE audio messages provide duration in milliseconds.
 * Returns true only when duration is known and exceeds the limit —
 * so Whisper is never called for over-limit clips.
 * Missing / invalid duration does not reject (LINE usually sends duration).
 */
export function isAudioTooLong(
  durationMs: number | null | undefined,
  maxSeconds: number = MAX_AUDIO_SECONDS,
): boolean {
  if (durationMs == null || !Number.isFinite(durationMs) || durationMs <= 0) {
    return false;
  }
  return durationMs > maxSeconds * 1000;
}
