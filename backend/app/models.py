import uuid
import enum
from datetime import datetime, timezone

from sqlalchemy import (
    String, Boolean, DateTime, ForeignKey, Enum, Text, UniqueConstraint
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


def gen_uuid() -> str:
    return str(uuid.uuid4())


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class ConversationType(str, enum.Enum):
    direct = "direct"
    group = "group"


class ParticipantRole(str, enum.Enum):
    member = "member"
    admin = "admin"


class ContentType(str, enum.Enum):
    text = "text"
    system = "system"


class MessageStatusEnum(str, enum.Enum):
    sent = "sent"
    delivered = "delivered"
    read = "read"


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    phone_number: Mapped[str] = mapped_column(String, unique=True, index=True)
    username: Mapped[str] = mapped_column(String, unique=True, index=True)
    display_name: Mapped[str] = mapped_column(String)
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    password_hash: Mapped[str] = mapped_column(String)
    public_key: Mapped[str] = mapped_column(String, default=gen_uuid)  # mocked identity key
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    is_online: Mapped[bool] = mapped_column(Boolean, default=False)


class Contact(Base):
    __tablename__ = "contacts"
    __table_args__ = (UniqueConstraint("owner_id", "contact_user_id", name="uq_owner_contact"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    owner_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    contact_user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    nickname: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)


class Conversation(Base):
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    type: Mapped[ConversationType] = mapped_column(Enum(ConversationType))
    name: Mapped[str | None] = mapped_column(String, nullable=True)  # group only
    avatar_url: Mapped[str | None] = mapped_column(String, nullable=True)
    created_by: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    participants: Mapped[list["ConversationParticipant"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )
    messages: Mapped[list["Message"]] = relationship(
        back_populates="conversation", cascade="all, delete-orphan"
    )


class ConversationParticipant(Base):
    __tablename__ = "conversation_participants"
    __table_args__ = (UniqueConstraint("conversation_id", "user_id", name="uq_conv_user"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    conversation_id: Mapped[str] = mapped_column(String, ForeignKey("conversations.id"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    role: Mapped[ParticipantRole] = mapped_column(Enum(ParticipantRole), default=ParticipantRole.member)
    joined_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)
    last_read_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    is_muted: Mapped[bool] = mapped_column(Boolean, default=False)

    conversation: Mapped["Conversation"] = relationship(back_populates="participants")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    conversation_id: Mapped[str] = mapped_column(String, ForeignKey("conversations.id"))
    sender_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    content_ciphertext: Mapped[str] = mapped_column(Text)  # mock-"encrypted" blob
    content_type: Mapped[ContentType] = mapped_column(Enum(ContentType), default=ContentType.text)
    reply_to_message_id: Mapped[str | None] = mapped_column(String, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow, index=True)
    edited_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)
    deleted_at: Mapped[datetime | None] = mapped_column(DateTime, nullable=True)

    conversation: Mapped["Conversation"] = relationship(back_populates="messages")
    statuses: Mapped[list["MessageStatus"]] = relationship(
        back_populates="message", cascade="all, delete-orphan"
    )


class MessageStatus(Base):
    __tablename__ = "message_status"
    __table_args__ = (UniqueConstraint("message_id", "user_id", name="uq_message_user"),)

    id: Mapped[str] = mapped_column(String, primary_key=True, default=gen_uuid)
    message_id: Mapped[str] = mapped_column(String, ForeignKey("messages.id"))
    user_id: Mapped[str] = mapped_column(String, ForeignKey("users.id"))
    status: Mapped[MessageStatusEnum] = mapped_column(Enum(MessageStatusEnum), default=MessageStatusEnum.sent)
    updated_at: Mapped[datetime] = mapped_column(DateTime, default=utcnow)

    message: Mapped["Message"] = relationship(back_populates="statuses")
