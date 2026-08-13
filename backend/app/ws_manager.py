from fastapi import WebSocket


class ConnectionManager:
    """
    Manages multiple WebSocket connections per user.

    This is important because the same account can be open in:
      - multiple browser tabs
      - multiple browser windows
      - multiple devices

    Each user therefore owns a set of active WebSockets rather than
    a single WebSocket.
    """

    def __init__(self) -> None:
        self.active: dict[str, set[WebSocket]] = {}

    async def connect(self, user_id: str, ws: WebSocket) -> None:
        await ws.accept()

        if user_id not in self.active:
            self.active[user_id] = set()

        self.active[user_id].add(ws)

    def disconnect(self, user_id: str, ws: WebSocket | None = None) -> None:
        sockets = self.active.get(user_id)

        if not sockets:
            return

        if ws is not None:
            sockets.discard(ws)

        if not sockets:
            self.active.pop(user_id, None)

    async def send_to_user(self, user_id: str, event: dict) -> None:
        sockets = self.active.get(user_id)

        if not sockets:
            return

        dead_sockets: list[WebSocket] = []

        for ws in list(sockets):
            try:
                await ws.send_json(event)
            except Exception:
                dead_sockets.append(ws)

        for ws in dead_sockets:
            sockets.discard(ws)

        if not sockets:
            self.active.pop(user_id, None)

    async def broadcast_to_users(
        self,
        user_ids: list[str],
        event: dict,
        exclude_user_ids: set[str] | None = None,
    ) -> None:
        excluded = exclude_user_ids or set()

        for user_id in set(user_ids):
            if user_id in excluded:
                continue

            await self.send_to_user(user_id, event)

    def is_online(self, user_id: str) -> bool:
        sockets = self.active.get(user_id)
        return bool(sockets)


manager = ConnectionManager()