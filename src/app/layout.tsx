import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "健身卡卡教練｜BODY OPTIMIZATION SYSTEM",
  description:
    "拍下每一餐，啟動你的減脂進化任務。LINE 專屬 AI 減脂教練，免費就能開始。",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-Hant">
      <body>
        {children}
        <Link
          href="/member-login"
          aria-label="會員登入"
          style={{
            position: "fixed",
            right: 18,
            bottom: 18,
            zIndex: 9999,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 48,
            padding: "0 18px",
            borderRadius: 999,
            background: "#06c755",
            color: "#fff",
            textDecoration: "none",
            fontWeight: 900,
            boxShadow: "0 12px 30px rgba(0,0,0,.28)",
          }}
        >
          會員登入
        </Link>
      </body>
    </html>
  );
}
