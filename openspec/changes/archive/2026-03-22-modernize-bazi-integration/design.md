## Context

The current `LifeKLine` application requires users to manually copy a birth data prompt, paste it into an external LLM, and paste the JSON response back. This process is tedious and error-prone. The existing `BaziForm.tsx` and `geminiService.ts` suggest an intention for direct API integration, but they are not fully integrated into the main `App.tsx` flow. Furthermore, the JSON parsing logic is too strict, failing whenever an LLM includes markdown formatting or conversational filler.

## Goals / Non-Goals

**Goals:**
- **Seamless Integration**: Merge the `BaziForm` into the main application to allow one-click generation of the life analysis.
- **Automated Astrology**: Use `lunar-javascript` to automatically calculate four pillars and major cycles from a simple date/time picker.
- **Hybrid Support**: Maintain support for manual pasting but with significantly improved reliability.
- **Robust Parsing**: Implement a parsing utility that reliably extracts valid JSON from varied LLM responses.
- **Better Validation**: Provide clear, user-friendly error messages when the LLM output is truly unusable.

**Non-Goals:**
- **Server-side Storage**: We will not implement a backend for storing API keys or user data; everything remains in the client-side state.
- **Advanced Astrology Logic**: We are improving the integration, not the astrological accuracy of the underlying LLM's logic (though better prompts will help).

## Decisions

- **Bazi Library**: Use `lunar-javascript` for all astronomical and calendar conversions to ensure accuracy.
- **State Management**: API credentials (API Key, Base URL, Model) will be managed in the `App` component state and passed to `BaziForm`.
- **Regex Extraction**: Use a standard regex to find the first '{' and last '}' in the LLM response to isolate the JSON object, even if wrapped in markdown code blocks.
- **Prompt Refinement**: Update `BAZI_SYSTEM_INSTRUCTION` and the user prompt to explicitly request clean JSON and emphasize the schema requirements.
- **UI Flow**: `App.tsx` will toggle between an empty state (showing either `BaziForm` or `ImportDataMode`) and the results view.

## Risks / Trade-offs

- **API Usage Costs**: Direct integration makes it easier for users to spend their own API credits. We will warn users about potential token usage.
- **API Key Security**: Users must provide their own keys. We will advise them to use keys with restricted permissions if possible.
- **LLM Non-Determinism**: Even with better prompts, LLMs can still fail. Robust parsing is the primary mitigation.
