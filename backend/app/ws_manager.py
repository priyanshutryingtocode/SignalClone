from fastapi import WebSocket


class ConnectionManager:
    """Manage all live WebSocket connections for each user."""

    def __init__(self) -> None:
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()
        self.active.setdefault(user_id, set()).add(ws)

    def disconnect(self, user_id: str, ws: WebSocket) -> None:
        connections = self.active.get(user_id)
        if not connections:
            return

        connections.discard(ws)
        if not connections:
            self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, event: dict) -> None:
        connections = self.active.get(user_id)
        if not connections:
            return

        dead: list[WebSocket] = []
        for ws in tuple(connections):
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)

        for ws in dead:
            connections.discard(ws)

        if not connections:
            self.active.pop(user_id, None)

    async def broadcast_to_users(self, user_ids: list[str], event: dict) -> None:
        for user_id in set(user_ids):
            await self.send_to_user(user_id, event)

    def is_online(self, user_id: str) -> bool:
        return bool(self.active.get(user_id))


manager = ConnectionManager()
