from datetime import datetime, timezone
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query
from sqlalchemy.orm import Session

from app.db.session import SessionLocal
from app.core.deps import get_user_from_token
from app.ws_manager import manager
from app import models

router = APIRouter(tags=["ws"])


def _conversation_peer_ids(db: Session, user_id: str) -> list[str]:
    """All users who share at least one conversation with this user —
    used to decide who should hear this user's presence changes."""
    my_conv_ids = db.query(models.ConversationParticipant.conversation_id).filter(
        models.ConversationParticipant.user_id == user_id
    ).subquery()
    rows = db.query(models.ConversationParticipant.user_id).filter(
        models.ConversationParticipant.conversation_id.in_(my_conv_ids)
    ).distinct().all()
    return [r[0] for r in rows if r[0] != user_id]


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: str = Query(...)):
    db = SessionLocal()
    user = get_user_from_token(token, db)
    if user is None:
        await websocket.close(code=4401)
        db.close()
        return

    await manager.connect(user.id, websocket)
    user.is_online = True
    user.last_seen_at = datetime.now(timezone.utc)
    db.commit()

    peers = _conversation_peer_ids(db, user.id)
    presence_event = {
        "type": "presence.update",
        "payload": {"user_id": user.id, "is_online": True, "last_seen_at": user.last_seen_at.isoformat()},
    }
    await manager.broadcast_to_users(peers, presence_event)

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type in ("typing.start", "typing.stop"):
                conversation_id = data.get("payload", {}).get("conversation_id")
                if conversation_id:
                    members = db.query(models.ConversationParticipant.user_id).filter(
                        models.ConversationParticipant.conversation_id == conversation_id
                    ).all()
                    member_ids = [m[0] for m in members if m[0] != user.id]
                    await manager.broadcast_to_users(member_ids, {
                        "type": event_type,
                        "payload": {"conversation_id": conversation_id, "user_id": user.id},
                    })
    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user.id)
        user.is_online = False
        user.last_seen_at = datetime.now(timezone.utc)
        db.commit()
        offline_event = {
            "type": "presence.update",
            "payload": {"user_id": user.id, "is_online": False, "last_seen_at": user.last_seen_at.isoformat()},
        }
        await manager.broadcast_to_users(peers, offline_event)
        db.close()
