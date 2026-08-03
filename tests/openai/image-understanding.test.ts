import { describe, expect, it } from "vitest";
import {
  imageKindSchema,
  imageUnderstandingSchema,
} from "@/lib/openai/image-understanding";

describe("image understanding schema", () => {
  it("supports every agreed image category", () => {
    for (const kind of [
      "food",
      "person",
      "exercise",
      "pet",
      "scenery",
      "life",
      "product",
      "screenshot",
      "unknown",
    ]) {
      expect(imageKindSchema.parse(kind)).toBe(kind);
    }
  });

  it("requires nutrition only for food images", () => {
    expect(() =>
      imageUnderstandingSchema.parse({ kind: "food", reply: "看起來很好吃。" }),
    ).toThrow(/meal nutrition/);

    expect(
      imageUnderstandingSchema.parse({ kind: "pet", reply: "牠的表情好可愛。" }),
    ).toEqual({ kind: "pet", reply: "牠的表情好可愛。" });
  });

  it("rejects meal nutrition attached to non-food images", () => {
    expect(() =>
      imageUnderstandingSchema.parse({
        kind: "person",
        reply: "這張照片的氣氛很自然。",
        meal: {
          items: [{ name: "未知", portion_text: "1 份", kcal: 0, protein_g: 0, carb_g: 0, fat_g: 0 }],
          total_kcal: 0,
          protein_g: 0,
          carb_g: 0,
          fat_g: 0,
          confidence: "low",
        },
      }),
    ).toThrow(/must not include meal nutrition/);
  });
});
