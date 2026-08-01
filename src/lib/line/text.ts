/** LINE 對話文案：句尾不加句號（中英文）。 */
export function stripTrailingSentenceEnd(text: string): string {
  return text.replace(/[。.]\s*$/u, "").trimEnd();
}

export function sanitizeLineText(text: string): string {
  const trimmed = text.replace(/\s+$/u, "");
  return stripTrailingSentenceEnd(trimmed);
}
