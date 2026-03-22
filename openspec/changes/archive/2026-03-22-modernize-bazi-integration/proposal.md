## Why

The current user experience is fragmented and burdensome. Users must manually copy a generated prompt, switch to an LLM interface (like ChatGPT or Claude), and then paste the resulting JSON back into the application. This "prompt generator" approach is prone to errors, as LLM outputs can vary in format and alignment with the required schema. Additionally, users have reported that pasted JSON often fails to display correctly, likely due to fragile parsing logic.

## What Changes

1. **Integrated LLM Support**: Replace the manual prompt-copy-paste workflow with a direct API integration using `BaziForm`. This allows users to provide an API key and base URL once and have the application handle the LLM call automatically.
2. **Automated Bazi Calculation**: Eliminate the need for users to manually calculate their four pillars (Year, Month, Day, Hour) and major cycles (Da Yun). The application will automatically derive these from the birth date and time using the `lunar-javascript` library.
3. **Robust JSON Parsing**: Implement a more resilient parsing mechanism that can extract JSON from markdown code blocks, handle malformed or extra text, and provide better error messages when validation fails.
3. **Schema Alignment**: Refine the system prompt and data mapping to ensure LLM outputs strictly adhere to the `LifeDestinyResult` type, preventing display issues related to missing or incorrectly formatted fields.
4. **Improved UI/UX**: Update `App.tsx` and `ImportDataMode.tsx` to offer a seamless transition between automatic and manual data import, with better feedback during the generation process.

## Capabilities

### New Capabilities
- `auto-bazi-analysis`: Direct integration with LLM APIs (Gemini/OpenAI) to generate life analysis without manual copy-paste.
- `automated-bazi-calculation`: Automatic derivation of Bazi pillars and major cycles using `lunar-javascript`.
- `resilient-json-import`: A robust parsing engine for manual JSON imports that handles common LLM output formats.

### Modified Capabilities
- `bazi-data-ingestion`: Updating the core data import flow to support both automatic and manual paths with unified validation.

## Impact

- `App.tsx`: Main logic update to coordinate between different import modes.
- `ImportDataMode.tsx`: Refactoring to use the new robust parsing logic.
- `geminiService.ts`: Enhancements to error handling and prompt clarity.
- `BaziForm.tsx`: Integration as a primary input method.
