# Signal Clone — Backend (FastAPI)

## Run it

```bash
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

SQLite file `signal_clone.db` is created automatically on first run (tables via
`Base.metadata.create_all` — fine for this scope; swap for Alembic migrations
if you have time left).

Mock OTP for registration: **123456** (see `app/core/config.py`, `MOCK_OTP`).

## What's implemented

- **Auth**: register (phone + username + mock OTP), login (JWT), `/auth/me`.
- **Contacts**: search users, add/list/remove contacts.
- **Conversations**: create direct or group, list sorted by last activity
  with last-message preview + unread count, add/remove group members
  (admin-only), self-leave.
- **Messages**: send/fetch (paginated via `before` cursor), mark-as-read.
  Content is stored as an opaque string — "encryption" is mocked, per the
  assignment brief (no real Signal Protocol/X3DH).
- **Real-time** (`/ws?token=...`, one socket per user):
  - `message.new` — pushed to all participants on send
  - `message.read` — read-receipt broadcast
  - `typing.start` / `typing.stop`
  - `presence.update` — online/offline, driven by socket connect/disconnect
  - `group.member_added` / `group.member_removed`

## Known simplifications (call these out in your write-up)

- Message status (`sent`/`delivered`/`read`) is tracked per-recipient for DMs;
  for groups the same table works but the frontend should roll it up (e.g.
  "delivered" once all have it, "read by N").
- No push notifications — WS must be connected to receive live events;
  REST fetch is the fallback/backfill path on reconnect.
- No file/image attachments (text only) — noted as a v2 item.
- Single SQLite file — fine for a demo, not for concurrent-write production use.

## Key endpoints

```
POST   /auth/register
POST   /auth/login
GET    /auth/me

GET    /users/search?q=...

GET    /contacts
POST   /contacts
DELETE /contacts/{id}

GET    /conversations
POST   /conversations
GET    /conversations/{id}
POST   /conversations/{id}/participants?user_id=...
DELETE /conversations/{id}/participants/{user_id}

GET    /conversations/{id}/messages?before=...&limit=50
POST   /conversations/{id}/messages
POST   /messages/{id}/read

WS     /ws?token=<jwt>
```
