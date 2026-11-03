# Changelog

All notable changes to this project will be documented in this file.

## [1.3.0] - 2026-11-03

### ✨ 前端流年詳批全覽 (StreamYearsViewer)
- 新增 `components/StreamYearsViewer.tsx` 元件，打破原先 `hidden print:block` 限制，直接在網頁端完整呈現 1-100 歲百年流年詳批。
- **年代階段切換**：全部 (1-100歲)、童限少年 (1-20歲)、青年立業 (21-40歲)、壯年鼎盛 (41-60歲)、花甲得道 (61-80歲)、晚年福壽 (81-100歲)。
- **動態大運篩選**：自動從命盤資料中提取所有大運階段（如辛酉大運、庚申大運等）進行專屬過濾。
- **走勢吉兇篩選**：支援運勢上漲（吉 ▲）與運勢回調（兇 ▼）快速快篩。
- **即時關鍵字搜尋**：支援年份 (如 2025)、流年干支 (如 乙巳)、大運名稱或批斷內容中之關鍵詞（如 貴人、創業、暴富、破財、考學、婚配）。
- **雙模式自由切換**：
  - 「卡片詳批視圖」：每歲包含年齡、年份干支、大運標籤、K線四值 (Open/Close/High/Low)、吉兇徽章、評分進度條與詳細批斷。
  - 「清爽全覽表格視圖」：高密度緊湊表格，適合快速掃描一生走勢。
- **人生巔峰榮譽標記**：最高評分年份享有醒目金黃色榮譽飾邊、獎盃徽章（🏆 人生巔峰年份）與頂部榮譽公告欄。
- **專業列印保證**：列印報告或保存 PDF 時自動切換為完整 1-100 歲無省略表格輸出。

### ♿ WCAG AA/AAA 視覺可讀性與無障礙全面提升 (Impeccable Design Standards)
- 遵循 `impeccable` 規範，全面審查並消除全站低對比配色：
  - 一般文字對比度全面提升至 >= 4.5:1 (AA) 或 >= 7:1 (AAA)（全面轉向 `text-slate-700` / `text-slate-800` / `text-slate-900` / `text-slate-950`）。
  - 吉（綠色）與 兇（紅色）標籤文字改採深色高對比配色（`bg-emerald-100 text-emerald-950 border-emerald-300`, `bg-rose-100 text-rose-950 border-rose-300`）。
  - 評分條（ScoreBar）黃色區間全面改用高可讀性之琥珀金 `bg-amber-600`，解決白底黃字對比度缺陷。
  - 全站互動元素（按鈕、表單輸入框、下拉選單、分頁按鈕）全面加上清晰無障礙的 `focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:outline-none`。
  - 優化圖表 X/Y 軸標籤與刻度文字顏色（改用 `#334155` 與 `#1e293b`），大幅提高在白底上的可讀性。

### 💾 URL Hash 壓縮分享與數據持久化 (重新整理不遺失)
- **本地持久化儲存**：生成或手動導入命盤時，自動儲存至 `localStorage`（`lifekline_saved_result`、`lifekline_user_name`），重新整理頁面不再被清空。
- **URL Hash 點對點壓縮分享 (Copy Share Link)**：
  - 實作 `services/shareUtils.ts`，利用原生 Web API `CompressionStream` (Gzip + Base64url) 將完整命盤與分析數據壓縮為 URL Hash（`#data=gz:...`）。
  - 不依賴任何雲端資料庫即可生成點對點長效分享連結，任何人打開分享網址即可自動還原並完整展示命盤與流年。
- **清晰的操作導航按鈕**：
  - 提供顯式的「← 返回修改 (保留結果)」按鈕，使用者可在表單微調出生日期/時間或模型，並可隨時點擊「查看命盤結果」返回現有分析。
  - 提供「🗑️ 清空命盤 (Clear)」按鈕，徹底清除 `localStorage` 與 URL Hash，恢復純淨初始狀態。

### 🚀 自動化 CI/CD Pipeline 與 GitHub Pages 部署
- 新增 `.github/workflows/ci-cd.yml` 自動化工作流程：
  - **CI 質量門禁 (Quality Gates)**：在每次 push 與 PR 時自動執行 Node 22 環境依賴安裝 (`npm ci`)、TypeScript 嚴格型別檢查 (`npx tsc --noEmit`)、生產構建 (`npm run build`) 與安全稽核 (`npm audit --audit-level=high`)。
  - **CD 自動部署 (GitHub Pages)**：主分支推播成功後自動將 `dist/` 產物部署至 GitHub Pages (`https://tbdavid2019.github.io/life-destiny-kline/`)。

## [1.2.0] - 2026-11-03

### 🛡️ Dependabot Security Vulnerability Fixes
- Upgraded `vite` to `^6.4.5` and `@vitejs/plugin-react` to `^4.7.0` (patched dependencies: `esbuild >= 0.25.0`, `postcss-selector-parser >= 6.1.5`, `source-map-js >= 1.2.2`).
- Fixed Dependabot alerts GHSA-67mh-4wv8-2f99, GHSA-rj75-hqrm-r3gf, GHSA-68fv-2mgg-jv7q, and related Vite security advisories.
- Verified with `npm audit`: 0 vulnerabilities remaining.

### 🚀 BYOK (Bring Your Own Key) Multi-Provider Expansion & Dynamic Model Fetching
- **Expanded Provider Support**:
  - **Google Gemini**: Gemini 2.5 Flash / Pro via AI Studio
  - **Groq**: Ultra-fast LPU inference (Llama 3.3 70B, DeepSeek R1 Distill, etc.)
  - **ChatGPT (OpenAI)**: GPT-4o, o3-mini, o1, GPT-4.5 with reasoning model parameter support
  - **Claude (Anthropic)**: Claude 3.7 Sonnet, Claude 3.5 Sonnet via native Messages API
  - **xAI (Grok)**: Grok 2, Grok 3 via xAI official endpoints
  - **OpenRouter**: Aggregated multi-model routing with context window display
  - **AWS Bedrock**: Foundation Models & Converse API via client-side Web Crypto AWS SigV4 request signing
  - **Custom (OpenAI-Compatible)**: Self-hosted Ollama, vLLM, DeepSeek, LocalAI, OneAPI, LiteLLM
- **Dynamic Model List (`get model list`)**:
  - Eliminated hardcoded model defaults; models are fetched dynamically from each provider's models API once credentials are provided.
  - Added dedicated "獲取模型列表 (Get Models)" button with loading spinner, success badges, and clear error diagnoses.
  - Dynamic model selection dropdown with one-click fallback to manual model ID specification.
  - Automatic credential and provider persistence in `localStorage`.


## [1.1.0] - 2026-09-03

### 🛡️ Security Audit & Hardening (Cloudflare Security Audit Skill)

Conducted a comprehensive multi-phase security audit using `cloudflare/security-audit-skill` and addressed all identified vulnerabilities and architectural risks.

#### Fixed & Remediated
- **Stored DOM / HTML Injection in Offline HTML Report (`App.tsx`)**:
  - Implemented `escapeHtml` utility to encode `&`, `<`, `>`, `"`, `'` across all dynamic data points (`userName`, `item.reason`, `item.ganZhi`, `item.daYun`, `item.age`, `item.score`) in `handleSaveHtml`.
  - Sanitized the generated export filename to prevent path traversal and special character injection in the `download` attribute.
- **Insecure Build-Time API Key Baking (`vite.config.ts`, `components/BaziForm.tsx`, `README.md`)**:
  - Removed `process.env.API_KEY` define injection from `vite.config.ts` to prevent private provider keys from being bundled into publicly accessible static JavaScript chunks.
  - Removed `isConfigHidden` logic in `components/BaziForm.tsx` to maintain a consistent Bring-Your-Own-Key (BYOK) model.
  - Updated `README.md` documentation to clearly articulate the BYOK architecture and warn against baking private keys into client-side static builds.
- **API Base URL Transport Security Validation (`services/geminiService.ts`)**:
  - Enforced HTTPS protocol validation on user-specified `apiBaseUrl` (allowing `http://localhost` / `http://127.0.0.1` for local development), preventing API credentials from being sent over unencrypted plaintext HTTP networks.
- **Input Bounds & Numeric Type Validation on JSON Import (`components/ImportDataMode.tsx`)**:
  - Added strict structure, array bound limits (maximum 200 items), and finite number checks (`open`, `close`, `high`, `low`, `score`) on user-imported JSON datasets to prevent application crashes and call-stack exceptions.
- **Redundant External Import Map Removal (`index.html`)**:
  - Removed unused `esm.sh` CDN import map and nonexistent `index.css` reference, reducing supply chain exposure and relying exclusively on local Vite-bundled dependencies.
- **Dependency Vulnerability Fixes (`package-lock.json`)**:
  - Resolved transitive vulnerabilities across build dependencies via `npm audit fix`.

#### Added
- Installed `cloudflare/security-audit-skill` into the global environment (`~/.agents/skills/security-audit`, `~/.gemini/skills/security-audit`, and `~/.gemini/antigravity-cli/skills/security-audit`) for machine-wide security review capabilities.
- Audit run artifacts generated in `~/security-audit-skill/life-destiny-kline/run-1/` (`architecture.md`, `REPORT.md`, `FINDINGS-DETAIL.md`, `findings.json`).
