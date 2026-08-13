from fastapi import WebSocket


class ConnectionManager:
    """
    Keeps all live WebSocket connections per user_id.

    A user can have multiple connections at the same time,
    such as multiple browser tabs or windows.
    """

    def __init__(self) -> None:
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(
        self,
        user_id: str,
        ws: WebSocket,
    ) -> None:
        await ws.accept()

        if user_id not in self.active:
            self.active[user_id] = set()

        self.active[user_id].add(ws)

    def disconnect(
        self,
        user_id: str,
        ws: WebSocket,
    ) -> None:
        connections = self.active.get(user_id)

        if not connections:
            return

        connections.discard(ws)

        if not connections:
            self.active.pop(user_id, None)

    async def send_to_user(
        self,
        user_id: str,
        event: dict,
    ) -> None:
        connections = self.active.get(user_id)

        if not connections:
            return

        disconnected: list[WebSocket] = []

        for ws in connections:
            try:
                await ws.send_json(event)
            except Exception:
                disconnected.append(ws)

        for ws in disconnected:
            connections.discard(ws)

        if not connections:
            self.active.pop(user_id, None)

    async def broadcast_to_users(
        self,
        user_ids: list[str],
        event: dict,
    ) -> None:
        for uid in user_ids:
            await self.send_to_user(uid, event)

    def is_online(
        self,
        user_id: str,
    ) -> bool:
        return bool(self.active.get(user_id))


manager = ConnectionManager()