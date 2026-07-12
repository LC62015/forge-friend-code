## Goal
Replace the current home page with a "Proxy Vault" password gate. Users see a lock screen; entering `ProxyHub` reveals the chat UI. Remove the Settings button from the header.

## Changes

### `src/routes/index.tsx`
- Replace the rendered page with a two-state screen:
  - **Locked (default):** centered card matching the provided design — dark `#0b0f17` background, `#161b22` card, cyan `#00eaff` heading "🔒 Proxy Vault", password input, "Unlock" button, error text on wrong password, Enter key submits.
  - **Unlocked:** the existing chat UI (composer, attachments, drag-drop, messages) exactly as it is today.
- State managed with a single `useState<boolean>` (`unlocked`). Password compared to the literal `"ProxyHub"`.
- Persist unlock in `sessionStorage` so a refresh during the session stays unlocked (page reload still requires re-entry after closing the tab).
- **Remove** the "⚙ Settings" button in the top header. Leave everything else (attachments, model logic, send flow) untouched.

### Not changing
- No backend, routing, styling system, or attachment/chat logic changes.
- `luaforge.html` standalone file is untouched.

## Technical notes
- Client-side only gate — this is a UX lock, not real security. Anyone reading the JS bundle can see the password. That matches the snippet you provided.
- Styling done inline / with a small style block scoped to the gate so it doesn't affect the rest of the app's Tailwind classes.
