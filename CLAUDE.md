# 函數歌牌：給 Claude 的工作規則

## 工作方式
- 先提出修改方案，等我同意後才動手改程式。
- 對象是程度較弱的學生，大多用手機；介面文字要簡單白話。

## 每次更新必做
1. version.js：調高 APP_VERSION，在 CHANGELOG 最上面加一筆（老師看得懂的白話）。
2. index.html：所有 ?v= 改成同一個新版本號（防止瀏覽器快取）。
3. 不要修改 config.js（Firebase 設定）。
4. 有動到資料結構或權限時，一併檢查 database.rules.json。

## 測試
- 網址加 ?mock=1 是本機測試模式，同一瀏覽器多分頁可模擬多人。
- 改完要實際跑一次相關流程再交付。

## 檔案
index.html / style.css / levels.js（關卡、出題、牌面）/ app.js（流程）/
net.js（Firebase 或本機）/ version.js / guide.html / README.md
