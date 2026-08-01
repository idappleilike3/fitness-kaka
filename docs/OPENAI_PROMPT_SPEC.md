# OPENAI_PROMPT_SPEC.md — OpenAI 串接與 Prompt

**版本：** 0.1（2026-07-23）  
**產品：** 健身卡卡教練

---

## 1. 帳號與金鑰

- 使用**同一組** `OPENAI_API_KEY`（環境變數）
- Phase 1：`gpt-4o-mini`（Vision + Chat）
- Phase 2：加 `whisper-1`（或官方現行語音轉文字模型）
- 禁止把 Key 寫進程式碼或前端

---

## 2. 用途對照

| purpose（api_usage_logs） | 模型 | 扣使用者額度 |
|---------------------------|------|--------------|
| `vision_meal` | gpt-4o-mini | 圖片 |
| `text_meal` | gpt-4o-mini | 文字 |
| `voice_transcribe` | whisper | 語音（轉成功才進入 meal；與 chat 合計扣語音 1） |
| `voice_meal` | gpt-4o-mini | （可與上合併記一筆語音流程） |
| `daily_qa` | gpt-4o-mini | 不扣飲食額度（需 rate limit） |
| `intent` | gpt-4o-mini（可選） | 不扣 |

語音流程成本 = Whisper + Chat，但**使用者只扣語音額度 1 次**。

---

## 3. 飲食分析輸出（強制 JSON Schema 概念）

模型必須回傳可 parse 的 JSON，例如：

```json
{
  "items": [
    {
      "name": "雞胸肉",
      "portion_text": "約 150 克",
      "kcal": 165,
      "protein_g": 31,
      "carb_g": 0,
      "fat_g": 3.6
    }
  ],
  "total_kcal": 165,
  "protein_g": 31,
  "carb_g": 0,
  "fat_g": 3.6,
  "confidence": "medium",
  "notes": "份量為目測推估"
}
```

校驗失敗 → 請使用者改傳或重試，**不寫入 meal_records**。

---

## 4. System Prompt 要點（飲食分析）

必須包含：

1. 你是「健身卡卡教練」的飲食紀錄助理，不是醫生／營養師  
2. 只做熱量與三大營養素**推估**，非診斷  
3. 台灣常見外食／超商食物優先  
4. 看不清就降低 confidence，並在 notes 說明  
5. 禁止鼓勵極端節食、催吐、未成年不安全熱量  
6. 輸出僅 JSON（或 structured output）

User 側附上：圖片或文字描述；可附「使用者時區為台北」。

---

## 5. 每日 QA Prompt 要點

輸入必須含：

- 會員當日已攝取與目標（來自 DB，不可虛構）  
- 剩餘熱量／蛋白質  

規則：

- 不可忽略當日數據只給籠統建議  
- 結尾加免責一句  
- 回覆短、鼓勵、不囉嗦（品牌個性）

---

## 6. 圖片限制

- 最大檔案大小：建議 ≤ 5MB（超過請壓縮或拒絕）  
- 僅 image/*  
- 可先縮圖再送 Vision 以省 token  
- `image_hash` 短時窗防重複計費  

---

## 7. 語音限制（Phase 2）

- 最長 60 秒  
- 超過直接拒絕，不呼叫 Whisper  
- 轉寫語言：`zh`  

---

## 8. 成本控制

- 預設 mini，不預設上旗艦模型  
- 記錄 tokens 與 est_cost  
- 溫度偏低（如 0.2）減少胡編  
