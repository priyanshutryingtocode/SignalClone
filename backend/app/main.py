import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.db.base import Base
from app.db.session import engine
from app import models
from app.routers import (
    auth,
    users,
    contacts,
    conversations,
    messages,
    ws,
)


Base.metadata.create_all(
    bind=engine
)


app = FastAPI(
    title="Signal Clone API"
)


FRONTEND_URL = os.getenv(
    "FRONTEND_URL",
    "http://localhost:3000"
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        FRONTEND_URL,
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth.router)
app.include_router(users.router)
app.include_router(contacts.router)
app.include_router(conversations.router)
app.include_router(messages.router)
app.include_router(ws.router)


@app.get("/health")
def health():
    return {"status": "ok"}