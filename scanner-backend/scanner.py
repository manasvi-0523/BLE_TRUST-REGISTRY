import asyncio
from collections import defaultdict, deque
from datetime import datetime, timezone
from typing import Awaitable, Callable

from models import BLEScanEvent
from name_resolver import get_best_display_name, get_manufacturer, guess_device_type

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
        self._first_seen: dict[str, datetime] = {}
        self._last_seen: dict[str, datetime] = {}

    async def discover_devices(self, timeout: float = 10.0):
        if BleakScanner is None:
            return []
        try:
            return await BleakScanner.discover(timeout=timeout, scanning_mode="active")
        except Exception:
            return await BleakScanner.discover(timeout=timeout)

    async def start(self):
        if self.running:
            return
        if BleakScanner is None:
            self.adapter_status = "bleak-unavailable"
            raise RuntimeError("Bleak is not available. Install scanner-backend requirements first.")

        self._loop = asyncio.get_running_loop()
        self._scanner = self._create_scanner()
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

    def _create_scanner(self):
        try:
            return BleakScanner(detection_callback=self._on_detection, scanning_mode="active")
        except TypeError:
            return BleakScanner(detection_callback=self._on_detection)
        except Exception:
            return BleakScanner(detection_callback=self._on_detection)

    async def _handle_detection(self, device, advertisement_data):
        now = datetime.now(timezone.utc)
        address = getattr(device, "address", "") or "UNKNOWN"
        first_seen = self._first_seen.setdefault(address, now)
        self._last_seen[address] = now
        service_uuids = getattr(advertisement_data, "service_uuids", None) or []
        advertised_name = (
            getattr(advertisement_data, "local_name", None)
            or getattr(device, "name", None)
        )
        display_name, name_source = get_best_display_name(address, advertised_name, service_uuids)
        manufacturer_name = get_manufacturer(address)
        device_type_guess = guess_device_type(service_uuids)
        manufacturer_data = getattr(advertisement_data, "manufacturer_data", None) or {}
        manufacturer_length = sum(len(bytes(value)) for value in manufacturer_data.values())
        payload_length = manufacturer_length + sum(len(str(uuid)) for uuid in service_uuids)
        tx_power = getattr(advertisement_data, "tx_power", None)
        platform_data = getattr(advertisement_data, "platform_data", None) or ()
        advertisement_type = self._advertisement_type(platform_data)
        raw_advertisement_length = self._raw_advertisement_length(advertisement_data, manufacturer_length, service_uuids)

        event = BLEScanEvent(
            rawName=advertised_name,
            displayName=display_name,
            nameSource=name_source,
            manufacturerName=manufacturer_name,
            deviceTypeGuess=device_type_guess,
            deviceName=display_name,
            address=address,
            rssi=float(getattr(advertisement_data, "rssi", 0.0)),
            timestamp=now,
            serviceUuidCount=len(service_uuids),
            serviceUuids=service_uuids,
            manufacturerDataLength=manufacturer_length,
            advertisementFrequency=self._frequency_for(address, now),
            payloadLengthApprox=payload_length,
            txPower=float(tx_power) if tx_power is not None else None,
            advertisementType=advertisement_type,
            rawAdvertisementDataLength=raw_advertisement_length,
            firstSeenAt=first_seen,
            lastSeenAt=now,
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

    def _advertisement_type(self, platform_data) -> str:
        for value in platform_data:
            name = value.__class__.__name__.lower()
            if "advertisement" in name or "adv" in name:
                return str(value)
        return "unknown"

    def _raw_advertisement_length(self, advertisement_data, manufacturer_length: int, service_uuids: list[str]) -> int:
        service_data = getattr(advertisement_data, "service_data", None) or {}
        service_data_length = sum(len(bytes(value)) for value in service_data.values())
        local_name = getattr(advertisement_data, "local_name", None) or ""
        return manufacturer_length + service_data_length + len(local_name.encode("utf-8")) + sum(len(str(uuid)) for uuid in service_uuids)
