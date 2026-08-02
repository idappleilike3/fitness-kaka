import { NextResponse } from "next/server";
import sharp from "sharp";

export const runtime = "nodejs";

const W = 2500;
const H = 1686;

function svg() {
  const cells = [
    { x: 0, y: 0, bg: "#F8F2FF", accent: "#7247D8", n: "1", icon: "📸", title: "拍照記錄", sub1: "拍下每一餐", sub2: "AI 智能分析熱量" },
    { x: 834, y: 0, bg: "#FFF0F5", accent: "#EC4C88", n: "2", icon: "🔥", title: "今日還能吃多少", sub1: "即時計算熱量", sub2: "掌握飲食額度" },
    { x: 1667, y: 0, bg: "#F7F0FF", accent: "#6740C8", n: "3", icon: "👤", title: "會員中心", sub1: "查看個人資料", sub2: "與專屬數據" },
    { x: 0, y: 843, bg: "#F7EEFF", accent: "#6740C8", n: "4", icon: "📅", title: "30 天挑戰", sub1: "查看挑戰進度", sub2: "與每日任務" },
    { x: 834, y: 843, bg: "#EEF7FF", accent: "#155AB9", n: "5", icon: "📊", title: "我的紀錄", sub1: "查看飲食紀錄", sub2: "與分析報告" },
    { x: 1667, y: 843, bg: "#FFF6EE", accent: "#E95B24", n: "6", icon: "🎧", title: "方案／客服", sub1: "查看方案與價格", sub2: "聯繫卡卡團隊" },
  ];

  const card = (c: (typeof cells)[number], i: number) => {
    const w = i % 3 === 1 ? 833 : i % 3 === 2 ? 833 : 834;
    return `<g transform="translate(${c.x} ${c.y})">
      <rect x="16" y="16" width="${w - 32}" height="811" rx="38" fill="${c.bg}" stroke="#DCCCF6" stroke-width="4"/>
      <circle cx="75" cy="72" r="48" fill="#7449D5"/>
      <text x="75" y="91" text-anchor="middle" font-size="54" font-weight="800" fill="#fff">${c.n}</text>
      <text x="${w / 2}" y="280" text-anchor="middle" font-size="150">${c.icon}</text>
      <text x="${w / 2}" y="430" text-anchor="middle" font-size="70" font-weight="800" fill="${c.accent}">${c.title}</text>
      <text x="${w / 2}" y="530" text-anchor="middle" font-size="42" font-weight="600" fill="#2C2436">${c.sub1}</text>
      <text x="${w / 2}" y="588" text-anchor="middle" font-size="42" font-weight="600" fill="#2C2436">${c.sub2}</text>
      <rect x="${w / 2 - 72}" y="665" width="144" height="92" rx="46" fill="#7647D9"/>
      <text x="${w / 2}" y="730" text-anchor="middle" font-size="62" font-weight="700" fill="#fff">→</text>
    </g>`;
  };

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#FFF8FF"/><stop offset="1" stop-color="#F4ECFF"/></linearGradient>
    </defs>
    <rect width="2500" height="1686" fill="url(#bg)"/>
    ${cells.map(card).join("")}
    <rect x="0" y="1530" width="2500" height="156" fill="#6B3BC1"/>
    <text x="1250" y="1600" text-anchor="middle" font-size="70" font-weight="800" fill="#fff">卡卡教練陪你每一天</text>
    <text x="1250" y="1660" text-anchor="middle" font-size="40" font-weight="600" fill="#F2E8FF">簡單記錄・精準分析・有效減脂</text>
  </svg>`;
}

export async function GET() {
  const image = await sharp(Buffer.from(svg()))
    .jpeg({ quality: 88, mozjpeg: true, chromaSubsampling: "4:2:0" })
    .toBuffer();

  return new NextResponse(new Uint8Array(image), {
    headers: {
      "Content-Type": "image/jpeg",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
