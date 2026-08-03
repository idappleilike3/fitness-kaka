import { describe, expect, it } from "vitest";
import { calculateTilt } from "@/app/PointerEffects";

describe("pointer 3D effects", () => {
  it("keeps the card neutral at its center", () => {
    expect(calculateTilt({ clientX: 150, clientY: 100 }, { left: 50, top: 50, width: 200, height: 100 })).toEqual({ rotateX: 0, rotateY: 0 });
  });

  it("caps card rotation at six degrees", () => {
    expect(calculateTilt({ clientX: 999, clientY: -999 }, { left: 0, top: 0, width: 200, height: 100 })).toEqual({ rotateX: 6, rotateY: 6 });
    expect(calculateTilt({ clientX: -999, clientY: 999 }, { left: 0, top: 0, width: 200, height: 100 })).toEqual({ rotateX: -6, rotateY: -6 });
  });

  it("returns a safe neutral transform for zero-sized elements", () => {
    expect(calculateTilt({ clientX: 10, clientY: 10 }, { left: 0, top: 0, width: 0, height: 0 })).toEqual({ rotateX: 0, rotateY: 0 });
  });
});
