/** User-facing support inbox (refund, privacy, footer, etc.). */
export const DEFAULT_SUPPORT_EMAIL = "gymcoachkaka@gmail.com";

export function resolveSupportEmail(): string {
  return process.env.SUPPORT_EMAIL?.trim() || DEFAULT_SUPPORT_EMAIL;
}
