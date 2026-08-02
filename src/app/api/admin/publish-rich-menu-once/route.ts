import { NextRequest, NextResponse } from "next/server";
import sharp from "sharp";
import { getLineEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const ONE_TIME_KEY = "kaka-v10-20260802-9f7e4c2a61d8";
const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";
const MENU_NAME = "健身卡卡_default_v10";
const LIFF_URL = "https://liff.line.me/2010804832-oPIqeXjJ";
const IMAGE_URL = "https://raw.githubusercontent.com/idappleilike3/fitness-kaka/main/assets/line/rich-menu-2x3.webp";

const W = 2500;
const H = 1686;
const CELL_W = 833;
const MID_W = 834;
const CELL_H = 843;

function bounds(col: number, row: number) {
  const x = col === 0 ? 0 : col === 1 ? CELL_W : CELL_W + MID_W;
  return {
    x,
    y: row * CELL_H,
    width: col === 1 ? MID_W : CELL_W,
    height: CELL_H,
  };
}

function menuBody() {
  return {
    size: { width: W, height: H },
    selected: true,
    name: MENU_NAME,
    chatBarText: "教練選單",
    areas: [
      {
        bounds: bounds(0, 0),
        action: { type: "postback", data: "menu:today", displayText: "今日還能吃多少" },
      },
      {
        bounds: bounds(1, 0),
        action: { type: "postback", data: "menu:meal", displayText: "記飲食" },
      },
      {
        bounds: bounds(2, 0),
        action: { type: "uri", uri: LIFF_URL },
      },
      {
        bounds: bounds(0, 1),
        action: { type: "postback", data: "menu:upgrade", displayText: "升級方案" },
      },
      {
        bounds: bounds(1, 1),
        action: { type: "postback", data: "menu:goals", displayText: "我的目標" },
      },
      {
        bounds: bounds(2, 1),
        action: { type: "postback", data: "menu:help", displayText: "幫助" },
      },
    ],
  };
}

async function lineFetch(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init.headers ?? {}),
    },
  });
  const text = await response.text();
  if (!response.ok) {
    throw new Error(`LINE API ${response.status}: ${text.slice(0, 500)}`);
  }
  return text ? JSON.parse(text) : null;
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("key") !== ONE_TIME_KEY) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const { LINE_CHANNEL_ACCESS_TOKEN: token } = getLineEnv();
    const current = await lineFetch(token, `${API}/richmenu/list`);
    for (const menu of current?.richmenus ?? []) {
      if (menu.name === MENU_NAME || menu.name === "健身卡卡_default_v1") {
        await lineFetch(token, `${API}/richmenu/${menu.richMenuId}`, { method: "DELETE" });
      }
    }

    const created = await lineFetch(token, `${API}/richmenu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuBody()),
    });
    const richMenuId = created.richMenuId as string;

    const source = await fetch(IMAGE_URL, { cache: "no-store" });
    if (!source.ok) throw new Error(`image fetch failed: ${source.status}`);
    const webp = Buffer.from(await source.arrayBuffer());
    const png = await sharp(webp).resize(W, H, { fit: "fill" }).png().toBuffer();

    await lineFetch(token, `${DATA_API}/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: { "Content-Type": "image/png" },
      body: png,
    });
    await lineFetch(token, `${API}/user/all/richmenu/${richMenuId}`, { method: "POST" });

    return NextResponse.json({ ok: true, richMenuId, menuName: MENU_NAME, liff: LIFF_URL });
  } catch (error) {
    console.error("[publish-rich-menu-once]", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "publish failed" },
      { status: 500 },
    );
  }
}
