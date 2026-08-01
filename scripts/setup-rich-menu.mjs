/**
 * Create / replace default LINE Rich Menu for 健身卡卡教練.
 *
 * Requires: LINE_CHANNEL_ACCESS_TOKEN in env (or .env.local / .env.vercel)
 *
 * Idempotent: deletes existing rich menus named "健身卡卡_default_v1"
 * before creating a new one, then sets it as the default for all users.
 *
 * Usage:
 *   node --env-file=.env.local scripts/setup-rich-menu.mjs
 *   # or after: vercel env pull .env.vercel --yes
 *   node --env-file=.env.vercel scripts/setup-rich-menu.mjs
 *
 * Options:
 *   --dry-run     Print plan only (no API writes)
 *   --keep-old    Do not delete other rich menus with the same name
 *   --image PATH  Override image path
 */
import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, "..");
const DEFAULT_IMAGE = path.join(ROOT, "assets", "line", "rich-menu-2x3.webp");
const MENU_NAME = "健身卡卡_default_v1";
const LIFF_URL = "https://fitness-kaka.vercel.app/liff";

const API = "https://api.line.me/v2/bot";
const DATA_API = "https://api-data.line.me/v2/bot";

const W = 2500;
const H = 1686;
const COLS = 3;
const CELL_W = Math.floor(W / COLS); // 833
const MID_W = W - CELL_W * 2; // 834
const CELL_H = Math.floor(H / 2); // 843

function bounds(col, row) {
  const x = col === 0 ? 0 : col === 1 ? CELL_W : CELL_W + MID_W;
  const y = row * CELL_H;
  const width = col === 1 ? MID_W : CELL_W;
  return { x, y, width, height: CELL_H };
}

/** 2×3 layout matching assets/line/rich-menu-2x3.webp */
function buildRichMenuBody() {
  return {
    size: { width: W, height: H },
    selected: true,
    name: MENU_NAME,
    chatBarText: "教練選單",
    areas: [
      {
        bounds: bounds(0, 0),
        action: {
          type: "postback",
          data: "menu:today",
          displayText: "今日還能吃多少",
        },
      },
      {
        bounds: bounds(1, 0),
        action: {
          type: "postback",
          data: "menu:meal",
          displayText: "記飲食",
        },
      },
      {
        bounds: bounds(2, 0),
        action: { type: "uri", uri: LIFF_URL },
      },
      {
        bounds: bounds(0, 1),
        action: {
          type: "postback",
          data: "menu:upgrade",
          displayText: "升級方案",
        },
      },
      {
        bounds: bounds(1, 1),
        action: {
          type: "postback",
          data: "menu:goals",
          displayText: "我的目標",
        },
      },
      {
        bounds: bounds(2, 1),
        action: {
          type: "postback",
          data: "menu:help",
          displayText: "幫助",
        },
      },
    ],
  };
}

function parseArgs(argv) {
  const opts = { dryRun: false, keepOld: false, image: DEFAULT_IMAGE };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") opts.dryRun = true;
    else if (a === "--keep-old") opts.keepOld = true;
    else if (a === "--image") opts.image = argv[++i];
  }
  return opts;
}

function tokenPresent(token) {
  return typeof token === "string" && token.trim().length > 10;
}

async function lineFetch(token, url, init = {}) {
  const headers = {
    Authorization: `Bearer ${token}`,
    ...(init.headers || {}),
  };
  const res = await fetch(url, { ...init, headers });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    json = null;
  }
  if (!res.ok) {
    const detail = text.slice(0, 400);
    throw new Error(`LINE API ${res.status} ${url}: ${detail}`);
  }
  return json;
}

async function listRichMenus(token) {
  const data = await lineFetch(token, `${API}/richmenu/list`);
  return data?.richmenus ?? [];
}

async function deleteRichMenu(token, id) {
  await lineFetch(token, `${API}/richmenu/${id}`, { method: "DELETE" });
}

async function createRichMenu(token, body) {
  const data = await lineFetch(token, `${API}/richmenu`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return data.richMenuId;
}

async function uploadImage(token, richMenuId, pngBuf) {
  await lineFetch(token, `${DATA_API}/richmenu/${richMenuId}/content`, {
    method: "POST",
    headers: { "Content-Type": "image/png" },
    body: pngBuf,
  });
}

async function setDefault(token, richMenuId) {
  await lineFetch(token, `${API}/user/all/richmenu/${richMenuId}`, {
    method: "POST",
  });
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

  if (!tokenPresent(token)) {
    console.error(
      "Missing LINE_CHANNEL_ACCESS_TOKEN. Pull from Vercel or set in .env.local, then re-run.",
    );
    console.error("  vercel env pull .env.vercel --yes --environment=production");
    console.error("  node --env-file=.env.vercel scripts/setup-rich-menu.mjs");
    process.exit(1);
  }

  const png = await readFile(opts.image);
  if (png.length < 1000) {
    throw new Error(`Image too small or missing: ${opts.image}`);
  }

  const body = buildRichMenuBody();
  console.log(`Rich menu name: ${MENU_NAME}`);
  console.log(`Image: ${opts.image} (${png.length} bytes)`);
  console.log(`Areas: ${body.areas.length} (2×3)`);
  console.log(`LIFF URI: ${LIFF_URL}`);

  if (opts.dryRun) {
    console.log("Dry run — no API calls.");
    return;
  }

  const existing = await listRichMenus(token);
  console.log(`Existing rich menus: ${existing.length}`);

  if (!opts.keepOld) {
    const sameName = existing.filter((m) => m.name === MENU_NAME);
    for (const m of sameName) {
      console.log(`Deleting previous ${MENU_NAME}: ${m.richMenuId}`);
      await deleteRichMenu(token, m.richMenuId);
    }
  }

  const richMenuId = await createRichMenu(token, body);
  console.log(`Created richMenuId: ${richMenuId}`);

  await uploadImage(token, richMenuId, png);
  console.log("Uploaded PNG content.");

  await setDefault(token, richMenuId);
  console.log("Set as default rich menu for all users.");
  console.log("Done. Open the OA chat in LINE to verify (may need chat refresh).");
}

main().catch((err) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
