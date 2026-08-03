import Link from "next/link";
import type { ReactNode } from "react";
import { resolveSupportEmail } from "@/lib/support-email";

function buildFaqs(supportEmail: string): { question: string; answer: ReactNode }[] {
  return [
    {
      question: "卡卡怎麼開始使用？",
      answer:
        "加入 LINE 官方帳號後，會收到歡迎訊息。接著可直接傳餐點照片或打字描述吃了什麼；想正式挑戰可回「我要參加三十天減脂挑戰」。輸入「怎麼用」可看完整說明。",
    },
    {
      question: "怎麼紀錄飲食？",
      answer:
        "三種方式：① 傳食物照片；② 打字告訴卡卡吃了什麼（例如「雞胸 150g＋白飯半碗」）；③ 付費方案可用語音（最長 60 秒）。",
    },
    {
      question: "為什麼要先確認才存檔？",
      answer:
        "AI 推估後會先給你預覽，這筆尚未寫入今日摘要。請點「確認紀錄」才會計入；也可選「不儲存」或「重新辨識」。",
    },
    {
      question: "為什麼顯示 0 熱量／今日已攝取是 0？",
      answer:
        "預覽畫面的「今日已攝取」只計算「已確認」的餐點。若剛辨識完但還沒按「確認紀錄」，總量仍可能是 0。確認後才會累加。",
    },
    {
      question: "辨識錯了怎麼改？",
      answer:
        "在尚未確認前，可直接回覆更正（例如「是鹹酥雞不是炸豆腐」「改成素食」），或點「重新辨識」。已確認的餐點若需修正，請透過 LINE 留言或寄信客服協助。",
    },
    {
      question: "免費、Plus、Pro 額度差在哪？",
      answer:
        "免費：照片＋文字餐點分析合計每天 5 次，聊天不扣，語音 0。卡卡 Plus：圖 10／文 30／語 5（每天）。卡卡 Pro 教練：圖 25／文 60／語 15（每天）。月繳與年繳額度相同。",
    },
    {
      question: "方案怎麼收費？月繳和年繳？",
      answer:
        "卡卡 Plus：月繳 NT$399／30 天，或年繳 NT$3590（一天不到 10 元）。卡卡 Pro 教練：月繳 NT$799／30 天，或年繳 NT$7190（一天不到 20 元）。皆一次付清、無自動扣款；在 LINE 回「升級」或到會員中心付款。",
    },
    {
      question: "怎麼參加 30 天減脂挑戰？",
      answer:
        "在 LINE 輸入「我要參加三十天減脂挑戰」或「開始挑戰」即可從今天 Day 1 開始。之後可問「今日任務」看進度；確認一餐後會累積挑戰紀錄。",
    },
    {
      question: "歡迎訊息裡的關鍵句有哪些？",
      answer:
        "「怎麼用」看說明；「升級」看方案；「今天還能吃多少」看剩餘；「我要參加三十天減脂挑戰」開始挑戰。也可點底部圖文選單。",
    },
    {
      question: "AI 分析結果準確嗎？",
      answer:
        "卡卡會依照片或文字估算熱量與營養，結果僅供生活管理參考，實際份量與食材仍可能造成差異，非醫療診斷。",
    },
    {
      question: "健身卡卡使用哪一個 AI 平台？",
      answer: (
        <>
          本服務透過 OpenAI API 協助理解餐點照片、飲食文字與語音內容，並產生營養推估及教練式建議；使用者確認後才會寫入個人紀錄。完整資料範圍與處理流程請見
          <Link href="/ai-platform" style={{ color: "var(--cyan)", fontWeight: 700 }}>
            AI 串接平台說明
          </Link>
          。
        </>
      ),
    },
    {
      question: "我的資料誰看得到？隱私怎麼保護？",
      answer: (
        <>
          餐點與身體資料只用於你的個人服務與紀錄，不會公開給其他使用者。詳見
          <Link href="/privacy" style={{ color: "var(--cyan)", fontWeight: 700 }}>
            隱私權政策
          </Link>
          。
        </>
      ),
    },
    {
      question: "付費後可以退款嗎？",
      answer: (
        <>
          可以。付款後 7 日內、且尚未使用付費進階額度，或遇重複扣款／系統錯誤時可申請。詳細條件與申請方式請見
          <Link href="/refund" style={{ color: "var(--cyan)", fontWeight: 700 }}>
            退款政策
          </Link>
          ；或寄信至
          <a href={`mailto:${supportEmail}`} style={{ color: "var(--cyan)", fontWeight: 700 }}>
            {supportEmail}
          </a>
          。
        </>
      ),
    },
    {
      question: "要怎麼聯絡客服？",
      answer: (
        <>
          請寄信至
          <a href={`mailto:${supportEmail}`} style={{ color: "var(--cyan)", fontWeight: 700 }}>
            {supportEmail}
          </a>
          ，或透過 LINE 官方帳號：
          <a
            href="https://lin.ee/5rxQDpa"
            rel="noopener noreferrer"
            target="_blank"
            style={{ color: "var(--cyan)", fontWeight: 700 }}
          >
            健身卡卡
          </a>
          留言。
        </>
      ),
    },
  ];
}

export default function FaqPage() {
  const supportEmail = resolveSupportEmail();
  const faqs = buildFaqs(supportEmail);

  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "clamp(2rem, 8vw, 5rem) clamp(1.25rem, 5vw, 2.5rem)",
        background: "var(--void)",
        color: "var(--text)",
      }}
    >
      <div style={{ width: "min(100%, 48rem)", margin: "0 auto" }}>
        <p style={{ color: "var(--cyan)", letterSpacing: "0.14em", fontSize: "0.8rem" }}>
          KAKA HELP
        </p>
        <h1 style={{ fontSize: "clamp(2rem, 6vw, 3rem)", margin: "0 0 0.75rem" }}>
          常見問題
        </h1>
        <p style={{ color: "var(--text-mute)", lineHeight: 1.7, margin: "0 0 2rem" }}>
          先從一餐開始；卡卡會陪你把每天的下一步變清楚。也可在 LINE 輸入「怎麼用」。
        </p>
        <div style={{ display: "grid", gap: "0.75rem" }}>
          {faqs.map((faq) => (
            <details
              key={faq.question}
              style={{
                padding: "1rem 1.15rem",
                border: "1px solid rgba(0, 240, 255, 0.2)",
                borderRadius: "12px",
                background: "rgba(16, 17, 31, 0.82)",
              }}
            >
              <summary style={{ cursor: "pointer", fontWeight: 700 }}>{faq.question}</summary>
              <p style={{ color: "var(--text-mute)", lineHeight: 1.7, margin: "0.8rem 0 0" }}>
                {faq.answer}
              </p>
            </details>
          ))}
        </div>
        <Link
          href="/"
          style={{ display: "inline-block", marginTop: "2rem", color: "var(--cyan)", fontWeight: 700 }}
        >
          回到首頁
        </Link>
      </div>
    </main>
  );
}
