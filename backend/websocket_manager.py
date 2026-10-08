"""JalRakshak Garden AI — Real-Time WebSocket Connection & Event Manager."""
from __future__ import annotations

import json
import logging
from typing import Any

from fastapi import WebSocket

logger = logging.getLogger("jalrakshak.ws")


class ConnectionManager:
    """Manages active browser WebSocket connections and broadcasts real-time events."""

    def __init__(self) -> None:
        self.active_connections: list[WebSocket] = []

    async def connect(self, websocket: WebSocket) -> None:
        await websocket.accept()
        self.active_connections.append(websocket)
        logger.info("WebSocket client connected. Total clients: %d", len(self.active_connections))

    def disconnect(self, websocket: WebSocket) -> None:
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            logger.info("WebSocket client disconnected. Total clients: %d", len(self.active_connections))

    async def broadcast(self, message: dict[str, Any]) -> None:
        """Broadcast a structured JSON event to all connected dashboard clients."""
        if not self.active_connections:
            return

        payload_str = json.dumps(message)
        dead_connections: list[WebSocket] = []

        for connection in self.active_connections:
            try:
                await connection.send_text(payload_str)
            except Exception as e:
                logger.debug("Failed to send WebSocket message: %s", e)
                dead_connections.append(connection)

        for dead in dead_connections:
            self.disconnect(dead)


ws_manager = ConnectionManager()
