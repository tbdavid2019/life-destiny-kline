# Changelog

All notable changes to this project will be documented in this file.

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
