# Architecture

BLE Trust Registry is split into two focused systems: a scanner backend that observes and validates BLE events, and a frontend console that renders the live behavioral trust state without blocking the user interface.

## System Map

```mermaid
flowchart TB
    subgraph Radio["Local BLE Space"]
        A["BLE Advertisements"]
    end

    subgraph Backend["scanner-backend"]
        B["Bleak Scanner"]
        C["Name Resolver"]
        D["Rolling Frequency Windows"]
        E["Pydantic Models"]
        F["FastAPI Routes"]
        G["WebSocket Broadcaster"]
    end

    subgraph Frontend["frontend"]
        H["Single WebSocket Client"]
        I["Event Buffer"]
        J["Device Map By Address"]
        K["Runtime Analysis"]
        L["Anomaly Engine"]
        M["Dashboard UI"]
        N["Hash-chain Ledger"]
    end

    A --> B
    B --> C
    C --> D
    D --> E
    E --> F
    E --> G
    G --> H
    H --> I
    I --> J
    J --> K
    K --> L
    L --> M
    L --> N
```

## Backend Responsibilities

- Run BLE scanning asynchronously.
- Resolve practical display names for devices.
- Extract RSSI, advertisement frequency, service UUID count, manufacturer data length, and estimated advertisement size.
- Validate scan events before broadcasting.
- Broadcast scan events without blocking the scanner loop.
- Reject malformed controlled anomaly test events with validation errors.

## Frontend Responsibilities

- Own one WebSocket lifecycle manager.
- Avoid duplicate event listeners after reconnect.
- Normalize incoming scan events.
- Batch scan events before React state updates.
- Keep only recent useful event history.
- Merge live devices by BLE address.
- Score devices using baseline and runtime evidence.
- Render High and Critical alerts immediately.
- Append High and Critical events to the hash-chain ledger.

## Performance Shape

The dashboard does not re-render the entire application for each BLE advertisement. Incoming events are pushed into a ref buffer, then flushed to React state on a short interval. This keeps the table stable, the diagnosis panel readable, and the alert banner responsive.

```mermaid
flowchart LR
    A["WebSocket Event"] --> B["Ref Buffer"]
    B --> C["Timed Batch Flush"]
    C --> D["Merge Latest Device State"]
    D --> E["Memoized Risk Rows"]
    E --> F["Focused UI Updates"]
```

