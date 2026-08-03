import { describe, expect, it } from "vitest";
import { GET } from "@/app/images/[...path]/route";

describe("generated v10 image route", () => {
  it("serves the roadmap image at the webp URL used by the homepage", async () => {
    const response = await GET(
      null as never,
      { params: Promise.resolve({ path: ["story-roadmap.webp"] }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("image/webp");
    expect((await response.arrayBuffer()).byteLength).toBeGreaterThan(10_000);
  });
});
