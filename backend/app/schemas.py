from datetime import datetime
from pydantic import BaseModel, ConfigDict


# ---------- Auth ----------
class RegisterRequest(BaseModel):
    phone_number: str
    username: str
    password: str
    display_name: str
    otp: str  # must equal settings.MOCK_OTP
    avatar_url: str | None = None


class LoginRequest(BaseModel):
    identifier: str  # phone_number or username
    password: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: "UserOut"


# ---------- User ----------
class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    phone_number: str
    username: str
    display_name: str
    avatar_url: str | None
    is_online: bool
    last_seen_at: datetime


# ---------- Contacts ----------
class ContactCreate(BaseModel):
    contact_user_id: str
    nickname: str | None = None


class ContactOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: str
    nickname: str | None
    user: UserOut


# ---------- Conversations ----------
class ConversationCreate(BaseModel):
    type: str  # "direct" | "group"
    participant_ids: list[str]
    name: str | None = None  # required for group


class ParticipantOut(BaseModel):
    user: UserOut
    role: str


class ConversationOut(BaseModel):
    id: str
    type: str
    name: str | None
    avatar_url: str | None
    participants: list[ParticipantOut]
    last_message: "MessageOut | None" = None
    unread_count: int = 0


# ---------- Messages ----------
class MessageCreate(BaseModel):
    content: str
    reply_to_message_id: str | None = None


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    sender_id: str
    content: str
    content_type: str
    reply_to_message_id: str | None
    created_at: datetime
    edited_at: datetime | None
    status: str  # aggregate/derived status for the current viewer's context
