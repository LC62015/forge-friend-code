## Changes

**1. `src/routes/index.tsx`** — Remove the "Gemini ▾" button in the header (the `<button>` with `Sparkles` + "Gemini" + `ChevronDown` at the top right of the main area). Drop the now-unused `Sparkles` and `ChevronDown` imports from `lucide-react`.

**2. `luaforge.html`** — Verify the standalone file works end-to-end after the earlier Gemini/model button removal:
- Ensure no leftover references to `modelBtn` / `updateModelLabel` remain that would throw at load.
- Confirm the Settings modal still lets the user set API base URL, key, and model, and that send/stream still works against an OpenAI-compatible endpoint.
- Fix any dangling handlers or selectors so opening the file in a browser and configuring an API key produces a working chat.

No other files touched. No backend, styling, or attachment logic changes.