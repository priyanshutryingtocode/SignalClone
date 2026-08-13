from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.db.session import get_db
from app.core.deps import get_current_user
from app.ws_manager import manager
from app import models, schemas


router = APIRouter(tags=["messages"])


def _participant_ids(
    db: Session,
    conversation_id: str,
) -> list[str]:
    rows = (
        db.query(models.ConversationParticipant.user_id)
        .filter(
            models.ConversationParticipant.conversation_id
            == conversation_id
        )
        .all()
    )

    return [row[0] for row in rows]


def _require_member(
    db: Session,
    conversation_id: str,
    user_id: str,
) -> None:
    member = (
        db.query(models.ConversationParticipant)
        .filter(
            models.ConversationParticipant.conversation_id
            == conversation_id,
            models.ConversationParticipant.user_id == user_id,
        )
        .first()
    )

    if not member:
        raise HTTPException(
            status_code=403,
            detail="Not a member of this conversation",
        )


def _message_to_out(
    db: Session,
    msg: models.Message,
    viewer_id: str,
) -> schemas.MessageOut:

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
        status=(
            status_row.status.value
            if status_row
            else "sent"
        ),
    )


@router.get(
    "/conversations/{conversation_id}/messages",
    response_model=list[schemas.MessageOut],
)
def get_messages(
    conversation_id: str,
    before: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(
        db,
        conversation_id,
        current_user.id,
    )

    query = (
        db.query(models.Message)
        .filter(
            models.Message.conversation_id == conversation_id,
            models.Message.deleted_at.is_(None),
        )
    )

    if before:
        query = query.filter(
            models.Message.created_at < before
        )

    messages = (
        query
        .order_by(asc(models.Message.created_at))
        .limit(limit)
        .all()
    )

    return [
        _message_to_out(
            db,
            message,
            current_user.id,
        )
        for message in messages
    ]


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
    _require_member(
        db,
        conversation_id,
        current_user.id,
    )

    message = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content_ciphertext=payload.content,
        reply_to_message_id=payload.reply_to_message_id,
    )

    db.add(message)
    db.flush()

    participant_ids = _participant_ids(
        db,
        conversation_id,
    )

    online_recipient_ids: list[str] = []

    for user_id in participant_ids:
        if user_id == current_user.id:
            continue

        if manager.is_online(user_id):
            status = models.MessageStatusEnum.delivered
            online_recipient_ids.append(user_id)
        else:
            status = models.MessageStatusEnum.sent

        db.add(
            models.MessageStatus(
                message_id=message.id,
                user_id=user_id,
                status=status,
            )
        )

    db.commit()
    db.refresh(message)

    # Response goes directly to the sender through HTTP.
    # Therefore DO NOT send message.new back to the sender.
    out = _message_to_out(
        db,
        message,
        current_user.id,
    )

    message_event = {
        "type": "message.new",
        "payload": out.model_dump(mode="json"),
    }

    # Send only to recipients.
    await manager.broadcast_to_users(
        participant_ids,
        message_event,
        exclude_user_ids={current_user.id},
    )

    # Inform the sender that the message reached online recipients.
    #
    # For a direct conversation this produces the expected:
    #
    # sending -> sent -> delivered
    #
    # Group chats use the same event but the frontend treats the
    # status as a general delivery update.
    if online_recipient_ids:
        await manager.send_to_user(
            current_user.id,
            {
                "type": "message.delivered",
                "payload": {
                    "message_id": message.id,
                    "conversation_id": conversation_id,
                    "user_ids": online_recipient_ids,
                },
            },
        )

    return out


@router.post("/messages/{message_id}/read")
async def mark_read(
    message_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    message = db.get(
        models.Message,
        message_id,
    )

    if not message:
        raise HTTPException(
            status_code=404,
            detail="Message not found",
        )

    _require_member(
        db,
        message.conversation_id,
        current_user.id,
    )

    # A user should never mark their own message as read.
    if message.sender_id == current_user.id:
        return {"ok": True}

    status_row = (
        db.query(models.MessageStatus)
        .filter(
            models.MessageStatus.message_id == message_id,
            models.MessageStatus.user_id == current_user.id,
        )
        .first()
    )

    if status_row:
        status_row.status = models.MessageStatusEnum.read
    else:
        db.add(
            models.MessageStatus(
                message_id=message_id,
                user_id=current_user.id,
                status=models.MessageStatusEnum.read,
            )
        )

    participant = (
        db.query(models.ConversationParticipant)
        .filter(
            models.ConversationParticipant.conversation_id
            == message.conversation_id,
            models.ConversationParticipant.user_id
            == current_user.id,
        )
        .first()
    )

    if participant:
        participant.last_read_message_id = message_id

    db.commit()

    # Tell the sender that this message has been read.
    await manager.send_to_user(
        message.sender_id,
        {
            "type": "message.read",
            "payload": {
                "message_id": message_id,
                "user_id": current_user.id,
                "conversation_id": message.conversation_id,
            },
        },
    )

    return {"ok": True}