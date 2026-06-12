from datetime import datetime, timezone
from typing import Literal

from pydantic import BaseModel, Field, field_validator


ScanSource = Literal["realtime-scanner", "controlled-kali-test", "demo-backup"]


class BLEScanEvent(BaseModel):
    deviceName: str = Field(default="Unknown Device")
    address: str
    rssi: float
    timestamp: datetime
    serviceUuidCount: int = Field(ge=0)
    manufacturerDataLength: int = Field(ge=0)
    advertisementFrequency: float = Field(ge=0)
    payloadLengthApprox: int = Field(ge=0)
    source: ScanSource

    @field_validator("address")
    @classmethod
    def address_not_empty(cls, value: str) -> str:
        cleaned = value.strip()
        if not cleaned:
            raise ValueError("address must not be empty")
        return cleaned

    @field_validator("timestamp", mode="before")
    @classmethod
    def timestamp_must_be_dynamic_iso(cls, value):
        if value is None or value == "":
            return datetime.now(timezone.utc)
        return value


class ScannerStatus(BaseModel):
    running: bool = False
    connectedClients: int = 0
    adapterStatus: str = "unknown"
    lastScanTime: datetime | None = None
