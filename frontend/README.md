# Signal Clone — Frontend (Next.js)

## Run it

Make sure the backend is running first (see `backend/README.md`), then:

```bash
npm install
npm run dev
```

Opens on http://localhost:3000. By default it talks to the backend at
`http://localhost:8000` — override with a `.env.local`:

```
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## What's implemented

- **Auth**: register (phone + username + display name, mocked OTP `123456`),
  login, session persisted via token in `localStorage`, logout.
- **Sidebar**: conversation list sorted by last activity, unread badges,
  last-message preview, search, "New chat" (search users → add contact →
  start DM) and "New group" (name + multi-select members) modals.
- **1:1 & group messaging**: real-time send/receive over the WS connection,
  optimistic send state (clock → single check → double check → blue double
  check for read), timestamps, date separators, group sender name labels.
- **Typing indicators**: debounced `typing.start`/`typing.stop` over WS,
  shown under the conversation header.
- **Presence**: online dot on DM avatars, driven by `presence.update` events.
- **Group admin controls**: view members modal, admin-only add/remove.
- **Settings**: profile tab is live (reads your account); Privacy,
  Notifications, and Appearance are placeholder UI ("Coming soon") per the
  assignment's "settings placeholders" requirement — no backend logic wired.
- **Toasts**: lightweight toast provider for contact-add/group-create/error
  feedback.

## Structure

```
app/
  login/, register/        — auth pages
  chat/layout.tsx           — auth guard + sidebar shell
  chat/page.tsx              — empty state
  chat/[conversationId]/     — active conversation view
  settings/                  — settings placeholder page
lib/
  api.ts     — fetch wrapper (injects JWT)
  ws.ts      — WebSocket client singleton with reconnect/backoff
  store.ts   — Zustand store; single source of truth, wires REST + WS
  types.ts   — shared types mirroring backend schemas
components/  — Sidebar, MessageList/Bubble/Input, modals, Avatar, Toast
```

## Known simplifications ("basic for now")

- No message pagination UI yet (backend supports `before` cursor; frontend
  loads the latest page only).
- No file/image attachments — text only.
- No edit/delete-for-everyone UI (backend fields exist, unused here).
- Contact list itself isn't a separate screen yet — contacts are implicitly
  created when you start a DM via "New chat."
- No responsive/mobile layout pass — desktop two-pane only.

These are reasonable v2 items to mention in your write-up rather than gaps
to hide.
