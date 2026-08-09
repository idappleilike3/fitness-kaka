import { NextResponse } from "next/server";
import sharp from "sharp";
import { getLineEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINE_API = "https://api.line.me/v2/bot";
const LINE_DATA_API = "https://api-data.line.me/v2/bot";
const BASE = process.env.PUBLIC_BASE_URL?.trim() || "https://fitness-kaka.vercel.app";
const ONE_TIME_KEY = "guided-visitor-menu-20260809";

async function request(base: string, path: string, init: RequestInit) {
  const { LINE_CHANNEL_ACCESS_TOKEN } = getLineEnv();
  const response = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${LINE_CHANNEL_ACCESS_TOKEN}`,
      ...(init.headers || {}),
    },
  });
  if (!response.ok) {
    throw new Error(`${path} failed: ${response.status} ${await response.text()}`);
  }
  return response;
}

function menuBody() {
  const widths = [834, 833, 833];
  const xs = [0, 834, 1667];
  const actions = [
    { type: "postback", data: "trial:ask", displayText: "我想免費開始" },
    { type: "postback", data: "guide:how", displayText: "我想先看如何開始" },
    { type: "uri", uri: `${BASE}/#features` },
    { type: "uri", uri: `${BASE}/#plans` },
    { type: "postback", data: "guide:how", displayText: "我已加入 LINE，下一步呢？" },
    { type: "uri", uri: `${BASE}/faq` },
  ];

  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name: "健身卡卡｜訪客引導版",
    chatBarText: "卡卡教練選單",
    areas: actions.map((action, index) => ({
      bounds: {
        x: xs[index % 3],
        y: index < 3 ? 0 : 843,
        width: widths[index % 3],
        height: 843,
      },
      action,
    })),
  };
}

export async function GET(request: Request) {
  const supplied = new URL(request.url).searchParams.get("key")?.trim();
  if (supplied !== ONE_TIME_KEY) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const create = await request(LINE_API, "/richmenu", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(menuBody()),
    });
    const { richMenuId } = (await create.json()) as { richMenuId: string };

    const imageUrl = `${BASE}/images/line-imge/%E5%9C%96%E6%96%87%E8%A8%AA%E5%AE%A2%E7%B6%81%E7%89%88.png`;
    const source = await fetch(imageUrl, { cache: "no-store" });
    if (!source.ok) throw new Error(`image fetch failed: ${source.status}`);
    const image = await sharp(Buffer.from(await source.arrayBuffer()))
      .resize(2500, 1686, { fit: "fill" })
      .jpeg({ quality: 84, mozjpeg: true, chromaSubsampling: "4:2:0" })
      .toBuffer();

    await request(LINE_DATA_API, `/richmenu/${encodeURIComponent(richMenuId)}/content`, {
      method: "POST",
      headers: { "Content-Type": "image/jpeg" },
      body: new Uint8Array(image),
    });

    await request(LINE_API, `/user/all/richmenu/${encodeURIComponent(richMenuId)}`, {
      method: "POST",
    });

    return NextResponse.json({ ok: true, richMenuId, bytes: image.byteLength });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
