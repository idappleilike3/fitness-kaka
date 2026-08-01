import asset0 from "@/generated-images/asset-0";
import asset1 from "@/generated-images/asset-1";
import asset2 from "@/generated-images/asset-2";
import asset3 from "@/generated-images/asset-3";
import asset4 from "@/generated-images/asset-4";
import asset5 from "@/generated-images/asset-5";
import asset6 from "@/generated-images/asset-6";
import asset7 from "@/generated-images/asset-7";
import asset8 from "@/generated-images/asset-8";
import asset9 from "@/generated-images/asset-9";
import asset10 from "@/generated-images/asset-10";
import asset11 from "@/generated-images/asset-11";
import asset12 from "@/generated-images/asset-12";
import asset13 from "@/generated-images/asset-13";
import asset14 from "@/generated-images/asset-14";
import asset15 from "@/generated-images/asset-15";
import asset16 from "@/generated-images/asset-16";
import asset17 from "@/generated-images/asset-17";
import asset18 from "@/generated-images/asset-18";
import asset19 from "@/generated-images/asset-19";
import asset20 from "@/generated-images/asset-20";
import asset21 from "@/generated-images/asset-21";
import asset22 from "@/generated-images/asset-22";
import asset23 from "@/generated-images/asset-23";
import asset24 from "@/generated-images/asset-24";
import asset25 from "@/generated-images/asset-25";
import asset26 from "@/generated-images/asset-26";
import asset27 from "@/generated-images/asset-27";

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

const ASSETS: Record<string, string> = {
  "coach-portrait.png": asset0,
  "hero-kaka-challenge.png": asset1,
  "hero-kaka-original.png": asset2,
  "hero-kaka-premium-meal-v2.png": asset3,
  "menu-day-1.png": asset4,
  "menu-day-2.png": asset5,
  "menu-day-3.png": asset6,
  "menu-day-4.png": asset7,
  "menu-day-5.png": asset8,
  "menu-day-6.png": asset9,
  "menu-day-7.png": asset10,
  "stories/day-1.png": asset11,
  "stories/day-14.png": asset12,
  "stories/day-21.png": asset13,
  "stories/day-3.png": asset14,
  "stories/day-30.png": asset15,
  "stories/day-7.png": asset16,
  "stories/move-gym.png": asset17,
  "stories/move-home.png": asset18,
  "stories/move-walk.png": asset19,
  "stories/plateau-adjust.png": asset20,
  "stories/plateau-progress.png": asset21,
  "stories/plateau-review.png": asset22,
  "stories/plateau-worry.png": asset23,
  "story-coach-support.png": asset24,
  "story-photo-analysis.png": asset25,
  "story-real-life.png": asset26,
  "story-roadmap.png": asset27,
};

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ path: string[] }> },
) {
  const { path } = await context.params;
  const data = ASSETS[path.join("/")];
  if (!data) return new NextResponse("Not Found", { status: 404 });
  return new NextResponse(Buffer.from(data, "base64"), {
    headers: {
      "Content-Type": "image/webp",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}