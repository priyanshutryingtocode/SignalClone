from datetime import datetime, timezone

from fastapi import APIRouter, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select

from app import models
from app.core.deps import get_user_from_token
from app.db.session import SessionLocal
from app.ws_manager import manager

router = APIRouter(tags=["ws"])


def _conversation_peer_ids(db, user_id: str) -> list[str]:
    my_conv_ids = select(
        models.ConversationParticipant.conversation_id
    ).where(
        models.ConversationParticipant.user_id == user_id
    )

    rows = (
        db.query(models.ConversationParticipant.user_id)
        .filter(
            models.ConversationParticipant.conversation_id.in_(my_conv_ids)
        )
        .distinct()
        .all()
    )

    return [row[0] for row in rows if row[0] != user_id]


@router.websocket("/ws")
async def websocket_endpoint(
    websocket: WebSocket,
    token: str = Query(...),
):
    db = SessionLocal()
    user = get_user_from_token(token, db)

    if user is None:
        await websocket.close(code=4401)
        db.close()
        return

    was_online = manager.is_online(user.id)
    await manager.connect(user.id, websocket)
    peers = _conversation_peer_ids(db, user.id)

    if not was_online:
        user.is_online = True
        user.last_seen_at = datetime.now(timezone.utc)
        db.commit()

        await manager.broadcast_to_users(
            peers,
            {
                "type": "presence.update",
                "payload": {
                    "user_id": user.id,
                    "is_online": True,
                    "last_seen_at": user.last_seen_at.isoformat(),
                },
            },
        )

    try:
        while True:
            data = await websocket.receive_json()
            event_type = data.get("type")

            if event_type not in {"typing.start", "typing.stop"}:
                continue

            payload = data.get("payload") or {}
            conversation_id = payload.get("conversation_id")
            if not conversation_id:
                continue

            # Do not allow a user to emit typing events for a conversation
            # they are not a member of.
            is_member = (
                db.query(models.ConversationParticipant.id)
                .filter(
                    models.ConversationParticipant.conversation_id == conversation_id,
                    models.ConversationParticipant.user_id == user.id,
                )
                .first()
            )
            if not is_member:
                continue

            member_rows = (
                db.query(models.ConversationParticipant.user_id)
                .filter(
                    models.ConversationParticipant.conversation_id == conversation_id
                )
                .all()
            )
            recipient_ids = [row[0] for row in member_rows if row[0] != user.id]

            await manager.broadcast_to_users(
                recipient_ids,
                {
                    "type": event_type,
                    "payload": {
                        "conversation_id": conversation_id,
                        "user_id": user.id,
                    },
                },
            )

    except WebSocketDisconnect:
        pass
    finally:
        manager.disconnect(user.id, websocket)

        # Only the final tab/device going away makes the user offline.
        if not manager.is_online(user.id):
            user.is_online = False
            user.last_seen_at = datetime.now(timezone.utc)
            db.commit()

            await manager.broadcast_to_users(
                peers,
                {
                    "type": "presence.update",
                    "payload": {
                        "user_id": user.id,
                        "is_online": False,
                        "last_seen_at": user.last_seen_at.isoformat(),
                    },
                },
            )

        db.close()
