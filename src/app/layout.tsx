import type { Metadata } from "next";
import "./globals.css";
import "./v10-responsive-overrides.css";

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
      <body>{children}</body>
    </html>
  );
}
