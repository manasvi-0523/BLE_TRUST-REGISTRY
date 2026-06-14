# Workflow

This document explains how a BLE advertisement becomes a trust decision on the dashboard.

## Live Event Flow

```mermaid
sequenceDiagram
    participant Device as BLE Device
    participant Scanner as Async Scanner
    participant Backend as FastAPI Backend
    participant Socket as WebSocket
    participant Buffer as Frontend Buffer
    participant Engine as Anomaly Engine
    participant UI as Dashboard
    participant Ledger as Ledger

    Device->>Scanner: Broadcast advertisement
    Scanner->>Scanner: Resolve name and extract features
    Scanner->>Backend: Build validated scan event
    Backend->>Socket: Broadcast event
    Socket->>Buffer: Receive event
    Buffer->>UI: Flush latest batch
    UI->>Engine: Score device behavior
    Engine-->>UI: Return trust status and evidence
    UI->>UI: Update affected row and diagnosis panel
    Engine->>Ledger: Log High or Critical event
```

## Baseline Training

```mermaid
flowchart TD
    A["Select Live Device"] --> B["Start Baseline Training"]
    B --> C["Collect Observations"]
    C --> D["Compute RSSI And Frequency Ranges"]
    D --> E["Capture Service And Estimated Size Profile"]
    E --> F["Save Trusted Baseline"]
    F --> G["Use Baseline In Future Risk Decisions"]
```

## Potential Trust Violation Path

```mermaid
flowchart TD
    A["Saved Device Baseline"] --> B["Live Behavior Changes"]
    B --> C["RSSI, Frequency, Estimated Size, UUID, Timing, or Fingerprint Drift"]
    C --> D["Risk Score Crosses High or Critical"]
    D --> E["Solid Alert Banner Updates Immediately"]
    D --> F["Table Row Changes Status"]
    D --> G["Diagnosis Panel Shows Evidence"]
    D --> H["Hash-chain Ledger Receives Incident"]
```

## Important Behavior

- Unknown devices do not become suspicious just because they are unknown.
- Trusted devices need a saved baseline.
- High and Critical alerts are not delayed by animation.
- Ledger creation is separate from the scanner loop.
- Device table rows use stable BLE addresses as keys.
- Recent history is capped so long monitoring sessions stay responsive.

