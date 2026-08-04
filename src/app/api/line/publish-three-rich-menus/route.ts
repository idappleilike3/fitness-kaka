import { NextResponse } from "next/server";
import sharp from "sharp";
import { getLineEnv } from "@/lib/env";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const LINE_API = "https://api.line.me/v2/bot";
const BASE = process.env.PUBLIC_BASE_URL?.trim() || "https://fitness-kaka.vercel.app";
const LIFF = "https://liff.line.me/2010804832-oPIqeXjJ";

const definitions = [
  {
    key: "visitor",
    name: "健身卡卡｜訪客版",
    image: `${BASE}/images/line-imge/%E5%9C%96%E6%96%87%E8%A8%AA%E5%AE%A2%E7%B6%81%E7%89%88.png`,
    actions: [
      `${BASE}/member-login`,
      `${BASE}/#how`,
      `${BASE}/#features`,
      `${BASE}/#plans`,
      "https://lin.ee/5rxQDpa",
      `${BASE}/faq`,
    ],
  },
  {
    key: "trial",
    name: "健身卡卡｜7 天體驗版",
    image: `${BASE}/images/line-imge/%E5%9C%96%E6%96%877%E5%A4%A9%E9%AB%94%E9%A9%97.png`,
    actions: [
      `${LIFF}?view=photo`,
      `${LIFF}?view=today`,
      `${LIFF}?view=challenge`,
      `${BASE}/#how`,
      `${LIFF}?view=trial`,
      `${BASE}/#plans`,
    ],
  },
  {
    key: "member",
    name: "健身卡卡｜正式會員版",
    image: `${BASE}/images/line-imge/kaka-rich-menu-paid.jpg`,
    actions: [
      `${LIFF}?view=photo`,
      `${LIFF}?view=today`,
      LIFF,
      `${LIFF}?view=challenge`,
      `${LIFF}?view=records`,
      `${BASE}/#plans`,
    ],
  },
] as const;

function menuBody(name: string, actions: readonly string[]) {
  const widths = [834, 833, 833];
  const xs = [0, 834, 1667];
  return {
    size: { width: 2500, height: 1686 },
    selected: true,
    name,
    chatBarText: "卡卡教練選單",
    areas: actions.map((uri, index) => ({
      bounds: {
        x: xs[index % 3],
        y: index < 3 ? 0 : 843,
        width: widths[index % 3],
        height: 843,
      },
      action: { type: "uri", uri },
    })),
  };
}

async function lineRequest(path: string, init: RequestInit) {
  const { LINE_CHANNEL_ACCESS_TOKEN } = getLineEnv();
  const response = await fetch(`${LINE_API}${path}`, {
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

async function publish(definition: (typeof definitions)[number]) {
  const create = await lineRequest("/richmenu", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(menuBody(definition.name, definition.actions)),
  });
  const { richMenuId } = (await create.json()) as { richMenuId: string };

  const source = await fetch(definition.image, { cache: "no-store" });
  if (!source.ok) throw new Error(`image fetch failed: ${source.status} ${definition.image}`);
  const image = await sharp(Buffer.from(await source.arrayBuffer()))
    .resize(2500, 1686, { fit: "fill" })
    .jpeg({ quality: 82, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();

  await lineRequest(`/richmenu/${encodeURIComponent(richMenuId)}/content`, {
    method: "POST",
    headers: { "Content-Type": "image/jpeg" },
    body: new Uint8Array(image),
  });

  return { key: definition.key, richMenuId, bytes: image.byteLength, actions: definition.actions };
}

export async function GET(request: Request) {
  const expected = process.env.CRON_SECRET?.trim();
  const supplied = new URL(request.url).searchParams.get("key")?.trim();
  if (!expected || supplied !== expected) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    const results = [];
    for (const definition of definitions) results.push(await publish(definition));

    const visitor = results.find((item) => item.key === "visitor");
    if (visitor) {
      await lineRequest(`/user/all/richmenu/${encodeURIComponent(visitor.richMenuId)}`, { method: "POST" });
    }

    return NextResponse.json({ ok: true, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
