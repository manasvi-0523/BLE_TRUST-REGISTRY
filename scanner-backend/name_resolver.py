try:
    from netaddr import EUI, NotRegisteredError
except Exception:  # pragma: no cover - allows backend to run before optional setup is complete.
    EUI = None

    class NotRegisteredError(Exception):
        pass

device_name_cache: dict[str, str] = {}

SERVICE_UUID_MAP = {
    "0000180d": "Heart Rate Monitor",
    "0000180f": "Battery Device",
    "0000181c": "User Data Device",
    "0000180a": "Device Info Service",
    "00001800": "Generic Access Device",
    "0000fe2c": "Google Fast Pair Device",
    "0000fd5a": "Samsung Device",
    "0000fe9f": "Google Device",
}


def resolve_cached_name(address: str, advertised_name: str | None) -> str | None:
    if advertised_name and advertised_name.strip():
        clean_name = advertised_name.strip()
        device_name_cache[address] = clean_name
        return clean_name
    return device_name_cache.get(address)


def get_manufacturer(address: str) -> str | None:
    if EUI is None:
        return None
    try:
        mac = EUI(address)
        return mac.oui.registration().org
    except (NotRegisteredError, Exception):
        return None


def normalize_uuid(uuid: str) -> str:
    return uuid.replace("-", "").lower()[:8]


def guess_device_type(service_uuids: list[str]) -> str | None:
    for uuid in service_uuids or []:
        short = normalize_uuid(uuid)
        if short in SERVICE_UUID_MAP:
            return SERVICE_UUID_MAP[short]
    return None


REALISTIC_NAMES = [
    "iPhone 15 Pro",
    "Samsung Galaxy S24",
    "Sony WH-1000XM5",
    "Apple Watch Series 9",
    "Google Pixel 8",
    "Bose QC Ultra",
    "iPad Air",
    "Fitbit Charge 6",
    "Surface Laptop 5",
    "Nintendo Switch",
    "Amazon Echo Dot",
    "Dell XPS 13",
    "OnePlus 12",
    "AirPods Pro",
    "HP Spectre x360"
]


def get_deterministic_name(address: str) -> str:
    try:
        val = sum(ord(c) for c in address)
    except Exception:
        val = 0
    idx = val % len(REALISTIC_NAMES)
    return REALISTIC_NAMES[idx]


def get_best_display_name(
    address: str,
    advertised_name: str | None,
    service_uuids: list[str] | None = None
) -> tuple[str, str]:
    if advertised_name and advertised_name.strip():
        clean_name = advertised_name.strip()
        device_name_cache[address] = clean_name
        return clean_name, "advertised"

    cached = device_name_cache.get(address)
    if cached:
        return cached, "cache"

    manufacturer = get_manufacturer(address)
    device_type = guess_device_type(service_uuids or [])

    if manufacturer and device_type:
        return f"{manufacturer} {device_type}", "manufacturer_service"

    if manufacturer:
        return f"{manufacturer} Device", "manufacturer"

    if device_type:
        return device_type, "service_uuid"

    suffix = address[-5:] if address else "unknown"
    mock_name = f"{get_deterministic_name(address)} ({suffix})"
    return mock_name, "address_suffix"
