import { NextRequest, NextResponse } from "next/server";
import { getLineEnv } from "@/lib/env";

export const runtime = "nodejs";
export const maxDuration = 60;

const KEY = "kaka-v10-standalone-20260802-f84a31";
const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";
const IMAGE_URL = "https://fitness-kaka.vercel.app/api/line/assets/rich-menu?v=10";
const LIFF_URL = "https://liff.line.me/2010804832-oPIqeXjJ";
const MENU_NAME = "健身卡卡_v10_pastel_standalone";

const W = 2500;
const H = 1686;
const XS = [0, 834, 1667];
const WS = [834, 833, 833];

function area(col: number, row: number) {
  return { x: XS[col], y: row * 843, width: WS[col], height: 843 };
}

function body() {
  return {
    size: { width: W, height: H },
    selected: true,
    name: MENU_NAME,
    chatBarText: "卡卡教練選單",
    areas: [
      { bounds: area(0, 0), action: { type: "postback", data: "menu:meal", displayText: "拍照記錄" } },
      { bounds: area(1, 0), action: { type: "postback", data: "menu:today", displayText: "今日還能吃多少" } },
      { bounds: area(2, 0), action: { type: "uri", uri: LIFF_URL } },
      { bounds: area(0, 1), action: { type: "postback", data: "menu:challenge", displayText: "30 天挑戰" } },
      { bounds: area(1, 1), action: { type: "postback", data: "menu:records", displayText: "我的紀錄" } },
      { bounds: area(2, 1), action: { type: "postback", data: "menu:upgrade", displayText: "方案／客服" } },
    ],
  };
}

async function lineFetch(token: string, url: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { Authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`LINE API ${response.status}: ${text.slice(0, 500)}`);
  return text ? JSON.parse(text) : null;
}

export async function GET(request: NextRequest) {
  if (request.nextUrl.searchParams.get("key") !== KEY) {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  try {
    const { LINE_CHANNEL_ACCESS_TOKEN: token } = getLineEnv();

    await lineFetch(token, `${API}/user/all/richmenu`, { method: "DELETE" }).catch(() => null);

    const current = await lineFetch(token, `${API}/richmenu/list`);
    const deleted: string[] = [];
    for (const menu of current?.richmenus ?? []) {
      if (String(menu.name ?? "").startsWith("健身卡卡")) {
        await lineFetch(token, `${API}/richmenu/${menu.richMenuId}`, { method: "DELETE" });
        deleted.push(menu.richMenuId);
      }
    }

    const created = await lineFetch(token, `${API}/richmenu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body()),
    });
    const richMenuId = created.richMenuId as string;

    const source = await fetch(IMAGE_URL, { cache: "no-store" });
    if (!source.ok) throw new Error(`image fetch failed: ${source.status}`);
    const jpeg = Buffer.from(await source.arrayBuffer());
    if (jpeg.length < 10_000 || jpeg.length > 1_000_000) {
      throw new Error(`invalid rich menu image size: ${jpeg.length}`);
    }

    await lineFetch(token, `${DATA_API}/richmenu/${richMenuId}/content`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: jpeg,
    });
    await lineFetch(token, `${API}/user/all/richmenu/${richMenuId}`, { method: "POST" });

    return NextResponse.json({ ok: true, richMenuId, deleted, menuName: MENU_NAME, imageBytes: jpeg.length });
  } catch (error) {
    console.error("[publish-rich-menu-v10]", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "publish failed" }, { status: 500 });
  }
}
