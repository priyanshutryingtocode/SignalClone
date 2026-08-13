from datetime import datetime, timezone

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc
from sqlalchemy.orm import Session

from app import models, schemas
from app.core.deps import get_current_user
from app.db.session import get_db
from app.ws_manager import manager

router = APIRouter(tags=["messages"])


def _participant_ids(db: Session, conversation_id: str) -> list[str]:
    rows = (
        db.query(models.ConversationParticipant.user_id)
        .filter(models.ConversationParticipant.conversation_id == conversation_id)
        .all()
    )
    return [row[0] for row in rows]


def _require_member(db: Session, conversation_id: str, user_id: str) -> None:
    member = (
        db.query(models.ConversationParticipant.id)
        .filter(
            models.ConversationParticipant.conversation_id == conversation_id,
            models.ConversationParticipant.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")


def _message_to_out(db: Session, msg: models.Message, viewer_id: str) -> schemas.MessageOut:
    status_row = (
        db.query(models.MessageStatus)
        .filter(
            models.MessageStatus.message_id == msg.id,
            models.MessageStatus.user_id == viewer_id,
        )
        .first()
    )

    return schemas.MessageOut(
        id=msg.id,
        conversation_id=msg.conversation_id,
        sender_id=msg.sender_id,
        content=msg.content_ciphertext,
        content_type=msg.content_type.value,
        reply_to_message_id=msg.reply_to_message_id,
        created_at=msg.created_at,
        edited_at=msg.edited_at,
        status=status_row.status.value if status_row else "sent",
    )


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[schemas.MessageOut],
)
def get_messages(
    conversation_id: str,
    before: datetime | None = Query(default=None),
    limit: int = Query(default=50, ge=1, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, conversation_id, current_user.id)

    query = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id,
        models.Message.deleted_at.is_(None),
    )

    if before:
        query = query.filter(models.Message.created_at < before)

    # Fetch the newest page, then return it chronologically.
    messages = (
        query.order_by(desc(models.Message.created_at))
        .limit(limit)
        .all()
    )
    messages.reverse()

    return [_message_to_out(db, message, current_user.id) for message in messages]


@router.post(
    "/conversations/{conversation_id}/messages",
    response_model=schemas.MessageOut,
)
async def send_message(
    conversation_id: str,
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, conversation_id, current_user.id)

    content = payload.content.strip()
    if not content:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    msg = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content_ciphertext=content,
        reply_to_message_id=payload.reply_to_message_id,
    )
    db.add(msg)
    db.flush()

    participant_ids = _participant_ids(db, conversation_id)

    for user_id in participant_ids:
        if user_id == current_user.id:
            continue

        status = (
            models.MessageStatusEnum.delivered
            if manager.is_online(user_id)
            else models.MessageStatusEnum.sent
        )
        db.add(
            models.MessageStatus(
                message_id=msg.id,
                user_id=user_id,
                status=status,
            )
        )

    db.commit()
    db.refresh(msg)

    out = _message_to_out(db, msg, current_user.id)
    event = {
        "type": "message.new",
        "payload": out.model_dump(mode="json"),
    }

    # Broadcast to every participant, including the sender.
    # The initiating tab reconciles the WebSocket copy with the HTTP response,
    # while other tabs for the same account receive the message in real time.
    await manager.broadcast_to_users(participant_ids, event)

    return out


@router.post("/messages/{message_id}/read")
async def mark_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    msg = db.get(models.Message, message_id)
    if not msg:
        raise HTTPException(status_code=404, detail="Message not found")

    _require_member(db, msg.conversation_id, current_user.id)

    # Mark every message from before this message as read for this viewer.
    unread_messages = (
        db.query(models.Message)
        .filter(
            models.Message.conversation_id == msg.conversation_id,
            models.Message.sender_id != current_user.id,
            models.Message.deleted_at.is_(None),
            models.Message.created_at <= msg.created_at,
        )
        .all()
    )

    read_ids: list[str] = []
    for target in unread_messages:
        status_row = (
            db.query(models.MessageStatus)
            .filter(
                models.MessageStatus.message_id == target.id,
                models.MessageStatus.user_id == current_user.id,
            )
            .first()
        )

        if status_row:
            if status_row.status != models.MessageStatusEnum.read:
                status_row.status = models.MessageStatusEnum.read
                status_row.updated_at = datetime.now(timezone.utc)
        else:
            db.add(
                models.MessageStatus(
                    message_id=target.id,
                    user_id=current_user.id,
                    status=models.MessageStatusEnum.read,
                )
            )
        read_ids.append(target.id)

    participant = (
        db.query(models.ConversationParticipant)
        .filter(
            models.ConversationParticipant.conversation_id == msg.conversation_id,
            models.ConversationParticipant.user_id == current_user.id,
        )
        .first()
    )
    if participant:
        participant.last_read_message_id = message_id

    db.commit()

    # Notify other participants for every newly-read message.
    recipient_ids = [uid for uid in _participant_ids(db, msg.conversation_id) if uid != current_user.id]
    for read_id in read_ids:
        await manager.broadcast_to_users(
            recipient_ids,
            {
                "type": "message.read",
                "payload": {
                    "message_id": read_id,
                    "user_id": current_user.id,
                    "conversation_id": msg.conversation_id,
                },
            },
        )

    return {"ok": True, "message_ids": read_ids}
