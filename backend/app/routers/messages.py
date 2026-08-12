from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import asc

from app.db.session import get_db
from app.core.deps import get_current_user
from app.ws_manager import manager
from app import models, schemas

router = APIRouter(tags=["messages"])


def _participant_ids(db: Session, conversation_id: str) -> list[str]:
    rows = db.query(models.ConversationParticipant.user_id).filter(
        models.ConversationParticipant.conversation_id == conversation_id
    ).all()
    return [r[0] for r in rows]


def _require_member(db: Session, conversation_id: str, user_id: str) -> None:
    member = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == conversation_id,
        models.ConversationParticipant.user_id == user_id,
    ).first()
    if not member:
        raise HTTPException(status_code=403, detail="Not a member of this conversation")


def _message_to_out(db: Session, msg: models.Message, viewer_id: str) -> schemas.MessageOut:
    status_row = db.query(models.MessageStatus).filter(
        models.MessageStatus.message_id == msg.id,
        models.MessageStatus.user_id == viewer_id,
    ).first()
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


@router.get("/conversations/{conversation_id}/messages", response_model=list[schemas.MessageOut])
def get_messages(
    conversation_id: str,
    before: datetime | None = Query(default=None),
    limit: int = Query(default=50, le=200),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, conversation_id, current_user.id)

    q = db.query(models.Message).filter(
        models.Message.conversation_id == conversation_id,
        models.Message.deleted_at.is_(None),
    )
    if before:
        q = q.filter(models.Message.created_at < before)
    msgs = q.order_by(asc(models.Message.created_at)).limit(limit).all()
    return [_message_to_out(db, m, current_user.id) for m in msgs]


@router.post("/conversations/{conversation_id}/messages", response_model=schemas.MessageOut)
async def send_message(
    conversation_id: str,
    payload: schemas.MessageCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    _require_member(db, conversation_id, current_user.id)

    msg = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content_ciphertext=payload.content,  # "encryption" mocked: stored as-is
        reply_to_message_id=payload.reply_to_message_id,
    )
    db.add(msg)
    db.flush()

    participant_ids = _participant_ids(db, conversation_id)
    for uid in participant_ids:
        if uid == current_user.id:
            continue
        status = models.MessageStatusEnum.delivered if manager.is_online(uid) else models.MessageStatusEnum.sent
        db.add(models.MessageStatus(message_id=msg.id, user_id=uid, status=status))

    db.commit()
    db.refresh(msg)

    out = _message_to_out(db, msg, current_user.id)
    event = {"type": "message.new", "payload": out.model_dump(mode="json")}
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

    status_row = db.query(models.MessageStatus).filter(
        models.MessageStatus.message_id == message_id,
        models.MessageStatus.user_id == current_user.id,
    ).first()
    if status_row:
        status_row.status = models.MessageStatusEnum.read
    else:
        db.add(models.MessageStatus(
            message_id=message_id, user_id=current_user.id, status=models.MessageStatusEnum.read
        ))

    participant = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == msg.conversation_id,
        models.ConversationParticipant.user_id == current_user.id,
    ).first()
    if participant:
        participant.last_read_message_id = message_id

    db.commit()

    event = {
        "type": "message.read",
        "payload": {"message_id": message_id, "user_id": current_user.id, "conversation_id": msg.conversation_id},
    }
    await manager.broadcast_to_users(_participant_ids(db, msg.conversation_id), event)
    return {"ok": True}
