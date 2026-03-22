## 1. Core Logic and Refactoring

- [x] 1.1 Implement a Bazi calculation utility using `lunar-javascript` that converts a Date object to pillars and major cycles.
- [x] 1.2 Implement a robust JSON extraction utility in `geminiService.ts` that uses regex to find the outermost `{}`.
- [x] 1.3 Update the `BAZI_SYSTEM_INSTRUCTION` in `constants.ts` to be even more explicit about returning only raw JSON.
- [x] 1.4 Enhance error handling in `geminiService.ts` to provide specific context when parsing or API calls fail.

## 2. Integrate BaziForm into Main Flow

- [x] 2.1 Update `BaziForm.tsx` with a date and time picker that triggers automated Bazi calculation.
- [x] 2.2 Update `App.tsx` to include `BaziForm` as an alternative to `ImportDataMode`.
- [x] 2.3 Implement the `onSubmit` handler in `App.tsx` to call `geminiService.generateLifeAnalysis` and manage loading/error states.
- [x] 2.4 Ensure the transition from input form to result view is smooth and preserves name/metadata.

## 3. Enhance Manual Import Mode

- [x] 3.1 Update `ImportDataMode.tsx` to use the new robust JSON extraction utility.
- [x] 3.2 Improve the step-by-step UI to clarify where to paste the JSON and what to expect.
- [x] 3.3 Add a "Preview" or "Format" button to help users see if their pasted text contains valid JSON before submitting.

## 4. UI/UX Polishing

- [x] 4.1 Update `BaziForm.tsx` to pre-fill common defaults (like the demo key or common base URLs).
- [x] 4.2 Ensure responsive design for the new form elements.
- [x] 4.3 Add loading indicators and "success" feedback where appropriate.
- [x] 4.4 Added 888 Branding and Traditional Chinese localization.
- [x] 4.5 Implemented environment variable support for Vercel configuration.
