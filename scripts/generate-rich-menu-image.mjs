/**
 * Generate LINE Rich Menu image (2500×1686, 2×3 cells).
 * Teal athletic style for 健身卡卡教練.
 *
 * Usage: node scripts/generate-rich-menu-image.mjs
 */
import { createCanvas } from "@napi-rs/canvas";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "..", "assets", "line", "rich-menu-2x3.webp");

const W = 2500;
const H = 1686;
const COLS = 3;
const ROWS = 2;
const CELL_W = Math.floor(W / COLS); // 833
const MID_W = W - CELL_W * 2; // 834
const CELL_H = Math.floor(H / ROWS); // 843

const CELLS = [
  { label: "今日狀態", sub: "還能吃多少", icon: "◉" },
  { label: "記飲食", sub: "拍照／打字", icon: "◇" },
  { label: "會員中心", sub: "總覽與額度", icon: "▣" },
  { label: "升級方案", sub: "解鎖更多次", icon: "▲" },
  { label: "我的目標", sub: "熱量／蛋白質", icon: "◎" },
  { label: "幫助", sub: "使用說明", icon: "?" },
];

function cellBounds(i) {
  const col = i % COLS;
  const row = Math.floor(i / COLS);
  const x = col === 0 ? 0 : col === 1 ? CELL_W : CELL_W + MID_W;
  const y = row * CELL_H;
  const w = col === 1 ? MID_W : CELL_W;
  const h = CELL_H;
  return { x, y, w, h };
}

function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

async function main() {
  const canvas = createCanvas(W, H);
  const ctx = canvas.getContext("2d");

  // Background gradient — deep teal athletic (not purple)
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, "#0A3D3A");
  bg.addColorStop(0.45, "#0F5C56");
  bg.addColorStop(1, "#147A6E");
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Subtle diagonal stripes for texture
  ctx.save();
  ctx.globalAlpha = 0.06;
  ctx.strokeStyle = "#E8FFF8";
  ctx.lineWidth = 3;
  for (let i = -H; i < W + H; i += 48) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i + H, H);
    ctx.stroke();
  }
  ctx.restore();

  // Soft vignette corners
  const vig = ctx.createRadialGradient(
    W / 2,
    H / 2,
    Math.min(W, H) * 0.2,
    W / 2,
    H / 2,
    Math.max(W, H) * 0.7,
  );
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,20,18,0.35)");
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, W, H);

  const pad = 28;
  const fontStack =
    '"Microsoft JhengHei", "微軟正黑體", "Noto Sans TC", "PingFang TC", sans-serif';

  for (let i = 0; i < CELLS.length; i++) {
    const { x, y, w, h } = cellBounds(i);
    const cell = CELLS[i];

    // Cell panel
    ctx.save();
    roundRect(ctx, x + pad, y + pad, w - pad * 2, h - pad * 2, 36);
    const panel = ctx.createLinearGradient(x, y, x, y + h);
    panel.addColorStop(0, "rgba(232, 255, 248, 0.14)");
    panel.addColorStop(1, "rgba(10, 40, 38, 0.28)");
    ctx.fillStyle = panel;
    ctx.fill();
    ctx.strokeStyle = "rgba(167, 243, 220, 0.45)";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.restore();

    const cx = x + w / 2;
    const cy = y + h / 2;

    // Accent bar under title area
    ctx.fillStyle = "#2DD4BF";
    ctx.fillRect(cx - 48, cy + 78, 96, 6);

    // Icon glyph
    ctx.fillStyle = "#5EEAD4";
    ctx.font = `700 72px ${fontStack}`;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(cell.icon, cx, cy - 110);

    // Main label
    ctx.fillStyle = "#F0FDFA";
    ctx.font = `700 78px ${fontStack}`;
    ctx.fillText(cell.label, cx, cy - 10);

    // Subtitle
    ctx.fillStyle = "rgba(204, 251, 241, 0.85)";
    ctx.font = `500 40px ${fontStack}`;
    ctx.fillText(cell.sub, cx, cy + 52);
  }

  // Grid dividers (thin, readable)
  ctx.strokeStyle = "rgba(167, 243, 220, 0.35)";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(CELL_W, pad);
  ctx.lineTo(CELL_W, H - pad);
  ctx.moveTo(CELL_W + MID_W, pad);
  ctx.lineTo(CELL_W + MID_W, H - pad);
  ctx.moveTo(pad, CELL_H);
  ctx.lineTo(W - pad, CELL_H);
  ctx.stroke();

  // Brand strip top-left whisper (small, not competing with cell labels)
  ctx.fillStyle = "rgba(204, 251, 241, 0.55)";
  ctx.font = `600 28px ${fontStack}`;
  ctx.textAlign = "left";
  ctx.textBaseline = "top";
  ctx.fillText("健身卡卡教練", pad + 16, 10);

  const png = canvas.toBuffer("image/png");
  await mkdir(path.dirname(OUT), { recursive: true });
  await writeFile(OUT, png);
  console.log(`Wrote ${OUT} (${png.length} bytes, ${W}×${H})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
