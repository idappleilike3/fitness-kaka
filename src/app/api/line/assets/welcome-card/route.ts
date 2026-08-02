import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const W = 1200;
const H = 1500;

function overlaySvg() {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="shade" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#3F176F" stop-opacity=".12"/><stop offset="1" stop-color="#6D31B9" stop-opacity=".78"/></linearGradient>
      <linearGradient id="panel" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF6FF" stop-opacity=".96"/><stop offset="1" stop-color="#F2E3FF" stop-opacity=".96"/></linearGradient>
    </defs>
    <rect width="1200" height="1500" fill="#EEE4FF"/>
    <rect width="1200" height="1500" fill="url(#shade)"/>
    <rect x="430" y="115" width="700" height="720" rx="44" fill="url(#panel)"/>
    <text x="780" y="230" text-anchor="middle" font-size="64" font-weight="800" fill="#251536">拍下每一餐</text>
    <text x="780" y="350" text-anchor="middle" font-size="108" font-weight="900" fill="#6B3BC1">卡卡陪你</text>
    <text x="780" y="445" text-anchor="middle" font-size="64" font-weight="900" fill="#251536">完成 <tspan fill="#F34F88" font-size="92">30</tspan> 天減脂挑戰</text>
    <rect x="515" y="505" width="530" height="72" rx="36" fill="#7141CA"/>
    <text x="780" y="554" text-anchor="middle" font-size="34" font-weight="700" fill="#fff">AI 智能分析 × 營養計算 × 教練陪伴</text>
    <g font-size="40" font-weight="700" fill="#35243E">
      <circle cx="525" cy="650" r="24" fill="#F45F98"/><text x="525" y="664" text-anchor="middle" fill="#fff">✓</text><text x="570" y="665">拍照上傳，快速分析熱量與營養</text>
      <circle cx="525" cy="725" r="24" fill="#F45F98"/><text x="525" y="739" text-anchor="middle" fill="#fff">✓</text><text x="570" y="740">量化管理，掌握每天飲食進度</text>
      <circle cx="525" cy="800" r="24" fill="#F45F98"/><text x="525" y="814" text-anchor="middle" fill="#fff">✓</text><text x="570" y="815">卡卡陪伴，建立可持續的好習慣</text>
    </g>
    <rect x="50" y="1070" width="1100" height="280" rx="42" fill="#FFF8FF" stroke="#D7BBF3" stroke-width="4"/>
    <g font-weight="800">
      <text x="230" y="1180" text-anchor="middle" font-size="52" fill="#EC4C88">免費開始</text>
      <text x="600" y="1180" text-anchor="middle" font-size="52" fill="#7141CA">看方案</text>
      <text x="970" y="1180" text-anchor="middle" font-size="52" fill="#E96623">如何使用</text>
    </g>
    <g font-size="34" font-weight="600" fill="#392A41">
      <text x="230" y="1245" text-anchor="middle">拍照記錄飲食</text><text x="230" y="1290" text-anchor="middle">AI 分析熱量</text>
      <text x="600" y="1245" text-anchor="middle">選擇適合你的</text><text x="600" y="1290" text-anchor="middle">減脂方案</text>
      <text x="970" y="1245" text-anchor="middle">新手教學</text><text x="970" y="1290" text-anchor="middle">快速上手</text>
    </g>
    <rect x="0" y="1370" width="1200" height="130" fill="#6B3BC1"/>
    <text x="600" y="1454" text-anchor="middle" font-size="50" font-weight="800" fill="#fff">♥ 卡卡陪你 30 天，遇見更好的自己</text>
  </svg>`;
}

export async function GET() {
  const coachPath = path.join(process.cwd(), "public", "images", "coach-portrait.png");
  let coach: Buffer | null = null;
  try {
    coach = await readFile(coachPath);
  } catch {
    coach = null;
  }

  const base = sharp({ create: { width: W, height: H, channels: 4, background: "#EEE4FF" } });
  const composites: sharp.OverlayOptions[] = [];
  if (coach) {
    const resized = await sharp(coach).resize(520, 980, { fit: "cover", position: "top" }).toBuffer();
    composites.push({ input: resized, left: 0, top: 90 });
  }
  composites.push({ input: Buffer.from(overlaySvg()), left: 0, top: 0 });

  const image = await base.composite(composites).jpeg({ quality: 88, mozjpeg: true }).toBuffer();
  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
