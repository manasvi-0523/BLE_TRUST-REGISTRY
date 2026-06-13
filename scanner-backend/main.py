import asyncio
import logging
import os
from datetime import datetime, timezone

from dotenv import load_dotenv
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from models import BLEScanEvent, ScannerStatus
from scanner import BLEScannerService

load_dotenv()

logger = logging.getLogger("ble-trust-registry")
logging.basicConfig(level=logging.INFO)

FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app = FastAPI(title="BLE Trust Registry Scanner Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", FRONTEND_ORIGIN],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConnectionManager:
    def __init__(self):
        self.clients: set[WebSocket] = set()

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.clients.add(websocket)

    def disconnect(self, websocket: WebSocket):
        self.clients.discard(websocket)

    async def broadcast(self, event: BLEScanEvent):
        if not self.clients:
            return
        payload = event.model_dump(mode="json")
        stale: list[WebSocket] = []
        for client in list(self.clients):
            try:
                await client.send_json(payload)
            except Exception:
                stale.append(client)
        for client in stale:
            self.disconnect(client)


manager = ConnectionManager()
event_queue: asyncio.Queue[BLEScanEvent] = asyncio.Queue(maxsize=1000)


async def enqueue_event(event: BLEScanEvent):
    try:
        event_queue.put_nowait(event)
    except asyncio.QueueFull:
        try:
            event_queue.get_nowait()
            event_queue.task_done()
        except asyncio.QueueEmpty:
            pass
        try:
            event_queue.put_nowait(event)
            logger.warning("Dropped oldest scan event because broadcast queue was full.")
        except asyncio.QueueFull:
            logger.warning("Dropping scan event because broadcast queue is full: %s", event.address)


scanner = BLEScannerService(on_event=enqueue_event)


@app.on_event("startup")
async def start_broadcaster():
    async def worker():
        while True:
            event = await event_queue.get()
            await manager.broadcast(event)
            event_queue.task_done()

    asyncio.create_task(worker())


@app.get("/status", response_model=ScannerStatus)
async def status():
    return ScannerStatus(
        running=scanner.running,
        connectedClients=len(manager.clients),
        adapterStatus=scanner.adapter_status,
        lastScanTime=scanner.last_scan_time,
        broadcastQueueSize=event_queue.qsize(),
    )


@app.post("/start-monitoring")
async def start_monitoring():
    await scanner.start()
    return {"success": True, "running": scanner.running}


@app.post("/stop-monitoring")
async def stop_monitoring():
    await scanner.stop()
    return {"success": True, "running": scanner.running}


@app.post("/scan-event")
async def scan_event(event: BLEScanEvent):
    validated = event.model_copy(
        update={"timestamp": event.timestamp or datetime.now(timezone.utc)}
    )
    await enqueue_event(validated)
    return {"success": True, "event": validated.model_dump(mode="json")}


@app.websocket("/ws/scan-events")
async def scan_events(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
