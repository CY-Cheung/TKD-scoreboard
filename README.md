# Taekwondo Scoreboard System (跆拳道計分系統)

本專案為一個專為跆拳道賽事設計嘅 Cloud-based (雲端) 計分及賽事管理系統。系統旨在取代傳統且昂貴嘅專用計分硬件。大會只需準備一部連接大屏幕嘅電腦，而 Corner Judges (邊線裁判) 則可直接使用個人 Smartphone (智能手機) 掃描 QR Code 連線計分。所有賽事數據與比分均會實時同步，大幅降低舉辦賽事嘅硬件門檻與技術成本。

## 1. Features (主要功能)

本系統具備多項為跆拳道賽事量身訂造嘅核心功能，兼具靈活性及專業性：

* **免安裝控制器 (No-App Controller)**：Corner Judges (邊線裁判) 無須下載任何應用程式，經掃描大屏幕上嘅 QR Code 即可於 Mobile Browser (手機瀏覽器) 存取計分介面。
* **智能文件解析 (Smart Document Parsing)**：支援直接上傳官方賽程表 PDF 或 Excel 檔案，系統會自動提取比賽編號及選手名單。
* **互動式對戰圖表 (Interactive Binary Tree)**：系統會將抽籤結果轉化為動態嘅 Binary Tree (二元樹狀圖)，清晰顯示各級別嘅晉級情況 (Advancement Status)，並支援縮放及拖曳。
* **自動晉級系統 (Auto-Advancement)**：與計分板實時連動，當比賽完結並分出勝負後，勝方選手會自動於對戰圖表中晉級，晉級路線會實時亮起。
* **多場地管理 (Multi-Court Management)**：支援同時設定及管理多達 12 個 Court (場地)，管理員可隨時切換並載入不同賽事。
* **分散式座位鎖定 (Distributed Seat Locking)**：透過 Firebase 嚴格控制每個場地最多 3 位裁判連線，自動分配 `J1`、`J2` 及 `J3` 席位，並支援斷線自動釋出座位。
* **原子操作投票機制 (Atomic Transactions for Voting)**：支援多位裁判模式。確保必須有 2 位或以上裁判於 1000 毫秒 (1秒) 內提交相同分數，該得分才會生效，徹底解決 Race Condition (競爭危害) 問題。
* **觸覺回饋 (Haptic Feedback)**：裁判於手機按下計分按鈕時會觸發即時震動回饋，提升盲按時嘅準確度與手感。

## 2. Contributing (參與貢獻)

我們歡迎任何形式嘅貢獻！喺提交 Pull Request (拉取請求) 前，請確保你嘅程式碼符合本專案嘅編碼規範。如有任何問題或功能建議，歡迎開啟 Issue (議題) 進行討論。

## 3. License (授權條款)

本專案採用 [MIT License](LICENSE) 進行開源授權。
