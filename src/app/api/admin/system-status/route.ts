import { NextRequest, NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getEnvConfigStatus, peekNewebpayMode } from "@/lib/env";
import { getAdminDb } from "@/lib/supabase/admin";

export async function GET(request: NextRequest) {
  if (!hasAdminSession(request)) return NextResponse.json({ error: "请先解锁管理员功能" }, { status: 401 });
  const config = getEnvConfigStatus();
  let database = { ok: false, reason: "Supabase 尚未设定" };
  let recentErrors: unknown[] = [];
  if (config.supabase) {
    try {
      const db = getAdminDb();
      const [{ error }, { data }] = await Promise.all([
        db.from("members").select("id", { head: true, count: "exact" }),
        db.from("system_error_events").select("source,severity,error_message,created_at,resolved_at").is("resolved_at", null).order("created_at", { ascending: false }).limit(20),
      ]);
      database = { ok: !error, reason: error ? `数据库连接失败：${error.message}` : "数据库连接正常" };
      recentErrors = data ?? [];
    } catch (error) { database = { ok: false, reason: `数据库检查失败：${error instanceof Error ? error.message : String(error)}` }; }
  }
  return NextResponse.json({
    services: {
      openai: { ok: config.openai, reason: config.openai ? "OpenAI 金钥已设定" : "缺少 OpenAI 环境变量" },
      line: { ok: config.line, reason: config.line ? "LINE 环境变量已设定" : "缺少 LINE 环境变量" },
      database,
      payment: { ok: config.newebpay, reason: config.newebpay ? `蓝新金流已设定（${peekNewebpayMode()}）` : "缺少蓝新金流环境变量" },
      cron: { ok: Boolean(process.env.CRON_SECRET), reason: process.env.CRON_SECRET ? "排程密钥已设定" : "缺少 CRON_SECRET" },
      adminLine: { ok: Boolean(process.env.ADMIN_LINE_USER_IDS?.trim()), reason: process.env.ADMIN_LINE_USER_IDS?.trim() ? "管理员 LINE 通知已设定" : "缺少 ADMIN_LINE_USER_IDS" },
    },
    recentErrors,
  });
}
