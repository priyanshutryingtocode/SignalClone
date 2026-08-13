# Signal Clone

A Signal-inspired real-time messaging application built with **Next.js**, **React**, **TypeScript**, **Tailwind CSS**, **FastAPI**, **SQLAlchemy**, **SQLite**, **JWT authentication**, and **WebSockets**.

> This is a demo project inspired by Signal's messaging experience.

## Features

### Authentication
- User registration with phone number, username, display name, password, and mocked OTP
- JWT-based login
- Persistent login using `localStorage`
- Logout and session cleanup
- Protected chat routes

### Messaging
- Real-time one-to-one messaging
- Group conversations
- Message timestamps
- Sending/sent/read states
- Read receipts
- Typing indicators
- Online/offline presence
- WebSocket reconnect handling
- Messages persisted in SQLite

### Conversations
- Recent-conversation sorting
- Last-message previews
- Unread message counts
- Create direct conversations
- Create groups
- Group member management
- Group admin controls

### UI
- Signal-inspired dark interface
- Two-pane desktop messaging layout
- Message bubbles
- Conversation sidebar
- Modals
- Toast notifications
- Settings placeholders
- Landing page and authentication flow

## Architecture

```text
┌──────────────────────┐
│       Next.js        │
│      Frontend        │
│                      │
│  React + TypeScript  │
│      Tailwind CSS    │
└──────────┬───────────┘
           │
           │ HTTPS / REST
           │
           ▼
┌──────────────────────┐
│       FastAPI        │
│       Backend        │
│                      │
│ JWT Authentication   │
│ REST API             │
│ WebSocket Server     │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│        SQLite        │
│   Persistent data    │
└──────────────────────┘
```

### Frontend

Located in `frontend/`.

Important files:

```text
frontend/
├── app/
│   ├── login/
│   ├── register/
│   ├── chat/
│   └── settings/
├── components/
└── lib/
    ├── api.ts
    ├── store.ts
    ├── types.ts
    └── ws.ts
```

- `lib/api.ts` — REST API wrapper and JWT injection
- `lib/ws.ts` — WebSocket client with reconnect support
- `lib/store.ts` — Zustand application state
- `components/` — messaging UI and dialogs
- `app/chat/layout.tsx` — authenticated chat shell

### Backend

Located in `backend/`.

```text
backend/
├── app/
│   ├── core/
│   ├── db/
│   ├── models/
│   ├── routers/
│   ├── schemas/
│   ├── main.py
│   └── seed.py
├── requirements.txt
└── signal_clone.db
```

## Local Development

### 1. Clone

```bash
git clone https://github.com/YOUR_USERNAME/YOUR_REPOSITORY.git
cd SignalClone
```

### 2. Start the backend

```bash
cd backend

python -m venv venv
```

Windows:

```bash
venv\Scripts\activate
```

macOS/Linux:

```bash
source venv/bin/activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start FastAPI:

```bash
uvicorn app.main:app --reload --port 8000
```

Backend:

```text
http://localhost:8000
```

Swagger documentation:

```text
http://localhost:8000/docs
```

### 3. Start the frontend

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

Frontend:

```text
http://localhost:3000
```

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

## Demo Users

The backend includes a seed script.

```bash
cd backend
python -m app.seed
```

The seed creates demo users and conversations.

Default demo password:

```text
password123
```

The mocked registration OTP is:

```text
123456
```

## Production Deployment

The application has two parts:

1. **Next.js frontend → Vercel**
2. **FastAPI + WebSocket backend → a WebSocket-capable web service such as Render**

Vercel is an excellent fit for the Next.js frontend, while the FastAPI backend needs a persistent server capable of accepting WebSocket connections. Render Web Services support inbound WebSockets and FastAPI/Uvicorn deployments.

### Deploy the backend first

Create a **Web Service** on Render and point it at the repository.

Set:

```text
Root Directory:
backend
```

Build command:

```bash
pip install -r requirements.txt
```

Start command:

```bash
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set these environment variables:

```env
SECRET_KEY=<generate-a-long-random-secret>
FRONTEND_URL=https://YOUR-VERCEL-DOMAIN.vercel.app
```

The backend should then be available at something like:

```text
https://your-backend.onrender.com
```

Verify:

```text
https://your-backend.onrender.com/health
```

Expected response:

```json
{"status":"ok"}
```

### Deploy the frontend to Vercel

Import the GitHub repository into Vercel.

Set the **Root Directory** to:

```text
frontend
```

Vercel should detect Next.js automatically.

Add this environment variable:

```env
NEXT_PUBLIC_API_BASE=https://your-backend.onrender.com
```

Deploy.

After deployment, update the backend's:

```env
FRONTEND_URL=https://your-real-vercel-domain.vercel.app
```

Then redeploy the backend.

### WebSocket production URL

The frontend automatically converts:

```text
https://your-backend.onrender.com
```

to:

```text
wss://your-backend.onrender.com
```

for WebSocket connections.

Do not use `ws://` for a production HTTPS deployment.

## Environment Variables

### Frontend

```env
NEXT_PUBLIC_API_BASE=http://localhost:8000
```

For production:

```env
NEXT_PUBLIC_API_BASE=https://your-backend.onrender.com
```

### Backend

```env
SECRET_KEY=replace-with-a-random-secret
FRONTEND_URL=http://localhost:3000
DATABASE_URL=sqlite:///./signal_clone.db
MOCK_OTP=123456
```

Never commit real production secrets.

## Database Schema

The application uses **SQLite** with **SQLAlchemy ORM** for persistent storage.

The database consists of six core tables:

```text
┌──────────────────────┐
│        users         │
├──────────────────────┤
│ id (PK)              │
│ phone_number (UNIQUE)│
│ username (UNIQUE)    │
│ display_name         │
│ avatar_url           │
│ password_hash        │
│ public_key           │
│ created_at           │
│ last_seen_at         │
│ is_online            │
└──────────┬───────────┘
           │
           │
     ┌─────┴─────────────────────┐
     │                           │
     ▼                           ▼
┌──────────────────┐     ┌────────────────────────┐
│    contacts      │     │ conversation_participants│
├──────────────────┤     ├────────────────────────┤
│ id (PK)          │     │ id (PK)                │
│ owner_id (FK)    │     │ conversation_id (FK)   │
│ contact_user_id  │     │ user_id (FK)            │
│ nickname         │     │ role                    │
│ created_at       │     │ joined_at               │
└──────────────────┘     │ last_read_message_id   │
                         │ is_muted                │
                         └───────────┬────────────┘
                                     │
                                     ▼
                          ┌────────────────────┐
                          │   conversations    │
                          ├────────────────────┤
                          │ id (PK)            │
                          │ type               │
                          │ name               │
                          │ avatar_url         │
                          │ created_by (FK)    │
                          │ created_at         │
                          └─────────┬──────────┘
                                    │
                                    ▼
                          ┌────────────────────┐
                          │      messages      │
                          ├────────────────────┤
                          │ id (PK)            │
                          │ conversation_id FK │
                          │ sender_id (FK)     │
                          │ content_ciphertext │
                          │ content_type       │
                          │ reply_to_message_id│
                          │ created_at         │
                          │ edited_at          │
                          │ deleted_at         │
                          └─────────┬──────────┘
                                    │
                                    ▼
                          ┌────────────────────┐
                          │   message_status   │
                          ├────────────────────┤
                          │ id (PK)            │
                          │ message_id (FK)    │
                          │ user_id (FK)       │
                          │ status             │
                          │ updated_at         │
                          └────────────────────┘
```


## API Overview

```text
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

POST   /conversations/{id}/participants
DELETE /conversations/{id}/participants/{user_id}

GET    /conversations/{id}/messages
POST   /conversations/{id}/messages
POST   /messages/{id}/read

WS     /ws?token=<jwt>
```

## Tech Stack

**Frontend**

- Next.js 16
- React
- TypeScript
- Tailwind CSS
- Zustand

**Backend**

- FastAPI
- Uvicorn
- SQLAlchemy
- Pydantic
- SQLite
- JWT
- WebSockets
- Passlib / bcrypt

## License

This project is intended as a demo.

