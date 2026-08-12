from fastapi import WebSocket


class ConnectionManager:
    """Keeps one live WebSocket per user_id and fans events out to
    whichever participants of a conversation are currently connected."""

    def __init__(self) -> None:
        self.active: dict[str, WebSocket] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active[user_id] = ws

    def disconnect(self, user_id: str) -> None:
        self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, event: dict) -> None:
        ws = self.active.get(user_id)
        if ws is not None:
            await ws.send_json(event)

    async def broadcast_to_users(self, user_ids: list[str], event: dict) -> None:
        for uid in user_ids:
            await self.send_to_user(uid, event)

    def is_online(self, user_id: str) -> bool:
        return user_id in self.active


manager = ConnectionManager()
