import asyncio
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Awaitable, Callable

from models import BLEScanEvent

try:
    from bleak import BleakScanner
except Exception:  # pragma: no cover - bleak may be unavailable on CI/dev machines.
    BleakScanner = None


EventCallback = Callable[[BLEScanEvent], Awaitable[None]]


class BLEScannerService:
    def __init__(self, on_event: EventCallback):
        self.on_event = on_event
        self.running = False
        self.adapter_status = "unknown"
        self.last_scan_time: datetime | None = None
        self._scanner = None
        self._loop: asyncio.AbstractEventLoop | None = None
        self._sightings: dict[str, deque[datetime]] = defaultdict(lambda: deque(maxlen=500))

    async def start(self):
        if self.running:
            return
        if BleakScanner is None:
            self.adapter_status = "bleak-unavailable"
            raise RuntimeError("Bleak is not available. Install scanner-backend requirements first.")

        self._loop = asyncio.get_running_loop()
        self._scanner = BleakScanner(detection_callback=self._on_detection)
        await self._scanner.start()
        self.running = True
        self.adapter_status = "scanning"

    async def stop(self):
        if self._scanner is not None:
            await self._scanner.stop()
        self._scanner = None
        self.running = False
        if self.adapter_status == "scanning":
            self.adapter_status = "stopped"

    def _on_detection(self, device, advertisement_data):
        if self._loop is None:
            return
        self._loop.create_task(self._handle_detection(device, advertisement_data))

    async def _handle_detection(self, device, advertisement_data):
        now = datetime.now(timezone.utc)
        address = getattr(device, "address", "") or "UNKNOWN"
        service_uuids = getattr(advertisement_data, "service_uuids", None) or []
        manufacturer_data = getattr(advertisement_data, "manufacturer_data", None) or {}
        manufacturer_length = sum(len(bytes(value)) for value in manufacturer_data.values())
        payload_length = manufacturer_length + sum(len(str(uuid)) for uuid in service_uuids)

        event = BLEScanEvent(
            deviceName=(
                getattr(advertisement_data, "local_name", None)
                or getattr(device, "name", None)
                or "Unknown Device"
            ),
            address=address,
            rssi=float(getattr(advertisement_data, "rssi", 0.0)),
            timestamp=now,
            serviceUuidCount=len(service_uuids),
            manufacturerDataLength=manufacturer_length,
            advertisementFrequency=self._frequency_for(address, now),
            payloadLengthApprox=payload_length,
            source="realtime-scanner",
        )
        self.last_scan_time = now
        await self.on_event(event)

    def _frequency_for(self, address: str, now: datetime) -> float:
        window = self._sightings[address]
        window.append(now)
        cutoff = now.timestamp() - 10
        while window and window[0].timestamp() < cutoff:
            window.popleft()
        return round(len(window) / 10, 1)
