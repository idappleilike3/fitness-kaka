# LINE 官方帳號設定

健身卡卡的對話由 webhook 處理。為避免使用者同時收到 OA 後台與卡卡的重複訊息，請在 LINE Official Account Manager 確認以下設定。

## 關閉會與 webhook 重複的回覆

1. 開啟 [LINE Official Account Manager](https://manager.line.biz/) 並選擇健身卡卡帳號
2. 到 **設定** → **回應設定**
3. 將 **自動回應訊息** 關閉，或移除會回覆歡迎、說明、升級、額度用完、餐點紀錄的規則
4. 將 **加入好友的歡迎訊息** 關閉，避免與 webhook 的建檔歡迎訊息重複
5. 若啟用了關鍵字回應，移除「怎麼用」「升級」「記飲食」等會與圖文選單或 webhook 衝突的關鍵字

## 保留的設定

- 使用者仍可在官方帳號聊天；Webhook 會處理加入好友、文字、照片、語音與圖文選單 postback
- 圖文選單可由 `scripts/setup-rich-menu.mjs` 建立，詳細步驟見 [RICH_MENU.md](./RICH_MENU.md)
- LINE Developers 的 webhook URL 應指向 `https://fitness-kaka.vercel.app/api/line/webhook`

調整後，加入好友並輸入「怎麼用」驗證每個動作只收到一則卡卡訊息即可。
