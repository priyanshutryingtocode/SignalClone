from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import desc

from app.db.session import get_db
from app.core.deps import get_current_user
from app.ws_manager import manager
from app import models, schemas

router = APIRouter(prefix="/conversations", tags=["conversations"])


def _participant_ids(db: Session, conversation_id: str) -> list[str]:
    rows = db.query(models.ConversationParticipant.user_id).filter(
        models.ConversationParticipant.conversation_id == conversation_id
    ).all()
    return [r[0] for r in rows]


def _to_conversation_out(db: Session, conv: models.Conversation, viewer_id: str) -> schemas.ConversationOut:
    participants_out = []
    for p in conv.participants:
        user = db.get(models.User, p.user_id)
        participants_out.append(schemas.ParticipantOut(user=schemas.UserOut.model_validate(user), role=p.role.value))

    last_msg = (
        db.query(models.Message)
        .filter(models.Message.conversation_id == conv.id, models.Message.deleted_at.is_(None))
        .order_by(desc(models.Message.created_at))
        .first()
    )
    last_msg_out = None
    if last_msg:
        status_row = db.query(models.MessageStatus).filter(
            models.MessageStatus.message_id == last_msg.id,
            models.MessageStatus.user_id == viewer_id,
        ).first()
        last_msg_out = schemas.MessageOut(
            id=last_msg.id,
            conversation_id=last_msg.conversation_id,
            sender_id=last_msg.sender_id,
            content=last_msg.content_ciphertext,
            content_type=last_msg.content_type.value,
            reply_to_message_id=last_msg.reply_to_message_id,
            created_at=last_msg.created_at,
            edited_at=last_msg.edited_at,
            status=status_row.status.value if status_row else "sent",
        )

    my_participant = next((p for p in conv.participants if p.user_id == viewer_id), None)
    unread_count = 0
    if my_participant:
        q = db.query(models.Message).filter(
            models.Message.conversation_id == conv.id,
            models.Message.sender_id != viewer_id,
            models.Message.deleted_at.is_(None),
        )
        if my_participant.last_read_message_id:
            last_read = db.get(models.Message, my_participant.last_read_message_id)
            if last_read:
                q = q.filter(models.Message.created_at > last_read.created_at)
        unread_count = q.count()

    return schemas.ConversationOut(
        id=conv.id,
        type=conv.type.value,
        name=conv.name,
        avatar_url=conv.avatar_url,
        participants=participants_out,
        last_message=last_msg_out,
        unread_count=unread_count,
    )


@router.get("", response_model=list[schemas.ConversationOut])
def list_conversations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    my_rows = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.user_id == current_user.id
    ).all()
    conv_ids = [r.conversation_id for r in my_rows]
    convs = db.query(models.Conversation).filter(models.Conversation.id.in_(conv_ids)).all()

    outs = [_to_conversation_out(db, c, current_user.id) for c in convs]
    outs.sort(
        key=lambda o: o.last_message.created_at if o.last_message else "0",
        reverse=True,
    )
    return outs


@router.post("", response_model=schemas.ConversationOut)
def create_conversation(
    payload: schemas.ConversationCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    if payload.type not in ("direct", "group"):
        raise HTTPException(status_code=400, detail="type must be 'direct' or 'group'")

    participant_ids = set(payload.participant_ids)
    participant_ids.add(current_user.id)

    if payload.type == "direct":
        if len(participant_ids) != 2:
            raise HTTPException(status_code=400, detail="Direct conversation requires exactly 2 participants")
        other_id = next(iter(participant_ids - {current_user.id}))
        # avoid duplicate DMs between the same pair
        existing_convs = (
            db.query(models.Conversation)
            .filter(models.Conversation.type == models.ConversationType.direct)
            .all()
        )
        for c in existing_convs:
            ids = set(_participant_ids(db, c.id))
            if ids == participant_ids:
                return _to_conversation_out(db, c, current_user.id)
    else:
        if not payload.name:
            raise HTTPException(status_code=400, detail="Group requires a name")

    conv = models.Conversation(
        type=models.ConversationType(payload.type),
        name=payload.name if payload.type == "group" else None,
        created_by=current_user.id,
    )
    db.add(conv)
    db.flush()

    for uid in participant_ids:
        role = models.ParticipantRole.admin if (uid == current_user.id and payload.type == "group") else models.ParticipantRole.member
        db.add(models.ConversationParticipant(conversation_id=conv.id, user_id=uid, role=role))

    db.commit()
    db.refresh(conv)
    return _to_conversation_out(db, conv, current_user.id)


@router.get("/{conversation_id}", response_model=schemas.ConversationOut)
def get_conversation(
    conversation_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.get(models.Conversation, conversation_id)
    if not conv or current_user.id not in _participant_ids(db, conversation_id):
        raise HTTPException(status_code=404, detail="Conversation not found")
    return _to_conversation_out(db, conv, current_user.id)


@router.post("/{conversation_id}/participants")
async def add_participant(
    conversation_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.get(models.Conversation, conversation_id)
    if not conv or conv.type != models.ConversationType.group:
        raise HTTPException(status_code=404, detail="Group not found")

    me = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == conversation_id,
        models.ConversationParticipant.user_id == current_user.id,
    ).first()
    if not me or me.role != models.ParticipantRole.admin:
        raise HTTPException(status_code=403, detail="Only admins can add members")

    target = db.get(models.User, user_id)
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    exists = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == conversation_id,
        models.ConversationParticipant.user_id == user_id,
    ).first()
    if exists:
        raise HTTPException(status_code=400, detail="Already a member")

    db.add(models.ConversationParticipant(conversation_id=conversation_id, user_id=user_id))
    db.commit()

    sys_msg = models.Message(
        conversation_id=conversation_id,
        sender_id=current_user.id,
        content_ciphertext=f"{target.display_name} was added to the group",
        content_type=models.ContentType.system,
    )
    db.add(sys_msg)
    db.commit()

    event = {"type": "group.member_added", "payload": {"conversation_id": conversation_id, "user_id": user_id}}
    await manager.broadcast_to_users(_participant_ids(db, conversation_id), event)
    return {"ok": True}


@router.delete("/{conversation_id}/participants/{user_id}")
async def remove_participant(
    conversation_id: str,
    user_id: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    conv = db.get(models.Conversation, conversation_id)
    if not conv or conv.type != models.ConversationType.group:
        raise HTTPException(status_code=404, detail="Group not found")

    me = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == conversation_id,
        models.ConversationParticipant.user_id == current_user.id,
    ).first()
    is_self_leave = user_id == current_user.id
    if not is_self_leave and (not me or me.role != models.ParticipantRole.admin):
        raise HTTPException(status_code=403, detail="Only admins can remove members")

    target_row = db.query(models.ConversationParticipant).filter(
        models.ConversationParticipant.conversation_id == conversation_id,
        models.ConversationParticipant.user_id == user_id,
    ).first()
    if not target_row:
        raise HTTPException(status_code=404, detail="Member not found")

    remaining_before = _participant_ids(db, conversation_id)
    db.delete(target_row)
    db.commit()

    event = {"type": "group.member_removed", "payload": {"conversation_id": conversation_id, "user_id": user_id}}
    await manager.broadcast_to_users(remaining_before, event)
    return {"ok": True}
