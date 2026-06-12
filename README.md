# BLE Trust Registry

BLE Trust Registry is a real-time BLE trust monitoring system. It watches the local Bluetooth Low Energy environment, learns trusted device behavior, detects identity drift, surfaces risky activity without delay, and records serious incidents in a tamper-evident hash-chain ledger.

This project is built as a serious monitoring console, not a glossy landing page and not a simulation-first toy. The core flow is live scanner to validated backend event, WebSocket stream, buffered dashboard update, risk engine decision, alert, and ledger record.

## The Idea

BLE environments are noisy. Nearby devices can appear with weak names, changing payloads, random addresses, and incomplete identity signals. A basic scanner only lists devices. BLE Trust Registry turns those observations into a trust workflow:

1. Observe live BLE advertisements.
2. Resolve the clearest possible device identity.
3. Train trusted baselines for devices you own.
4. Compare live behavior against historical expectations.
5. Show normal unknown devices without panic.
6. Escalate only when evidence supports High or Critical risk.
7. Preserve serious incidents in a local hash-chain ledger.

## System Architecture

```mermaid
flowchart TD
    A["BLE Radio Environment"] --> B["Async BLE Scanner"]
    B --> C["Name Resolver"]
    C --> D["Feature Extractor"]
    D --> E["Rolling Frequency Window"]
    E --> F["Pydantic Validation"]
    F --> G["FastAPI Control Plane"]
    F --> H["WebSocket Event Stream"]

    H --> I["Single Frontend WebSocket Manager"]
    I --> J["500 ms Event Buffer"]
    J --> K["Latest Device State By Address"]
    K --> L["Runtime History Cache"]
    L --> M["Anomaly Engine"]
    M --> N["Trust Classification"]

    N --> O["Immediate Alert Banner"]
    N --> P["Live BLE Device Table"]
    N --> Q["Selected Device Diagnosis"]
    N --> R["Hash-chain Ledger"]
```

## Live Monitoring Workflow

```mermaid
sequenceDiagram
    participant BLE as BLE Device
    participant Scanner as Scanner Backend
    participant Validator as Payload Validator
    participant WS as WebSocket Stream
    participant Buffer as Event Buffer
    participant Engine as Risk Engine
    participant UI as Dashboard
    participant Ledger as Hash Ledger

    BLE->>Scanner: Advertisement packet appears
    Scanner->>Scanner: Resolve name and extract BLE features
    Scanner->>Validator: Build structured scan payload
    Validator-->>Scanner: Accept only valid event shape
    Scanner->>WS: Broadcast event without blocking scanner
    WS->>Buffer: Queue event inside frontend lifecycle manager
    Buffer->>UI: Flush latest events in batches
    UI->>Engine: Score behavior and identity evidence
    Engine-->>UI: Return risk level, trust status, and reasons
    UI->>UI: Update affected rows, stats, and diagnosis panel
    Engine->>Ledger: Append High or Critical incidents
```

## Trust Decision Pipeline

```mermaid
flowchart LR
    A["Incoming Event"] --> B["Normalize Missing Fields"]
    B --> C["Index By BLE Address"]
    C --> D["Update Rolling History"]
    D --> E["Check Trusted Baseline"]
    D --> F["Check Timing Behavior"]
    D --> G["Check Fingerprint Stability"]
    D --> H["Check Name And Address Collisions"]

    E --> I["Risk Score"]
    F --> I
    G --> I
    H --> I

    I --> J{"Risk Level"}
    J -->|Low| K["Trusted, Observing, or Unregistered"]
    J -->|Medium| L["Suspicious"]
    J -->|High| M["Anomaly Detected"]
    J -->|Critical| N["Trust Violation"]

    M --> O["Alert Banner"]
    N --> O
    M --> P["Ledger Entry"]
    N --> P
```

## How The Pieces Work

The backend scanner observes BLE advertisements asynchronously. Each event is enriched with name resolution, signal strength, service UUID counts, payload size, manufacturer data length, and advertisement frequency. Invalid payloads are rejected before they reach the dashboard.

The frontend owns one WebSocket lifecycle manager. It does not attach duplicate listeners after reconnects. Incoming events are stored in a short buffer, then flushed in batches so the UI remains smooth while scanning. Device rows are merged by address, which prevents the table from jumping around during live monitoring.

The anomaly engine is evidence-driven. A new unknown device starts as Observing, not dangerous. After warmup, an unknown device can stay Low risk if its behavior is normal. A trusted device is only trusted after a baseline is saved. When live behavior moves outside baseline ranges or shows timing, payload, UUID, fingerprint, or identity collision problems, the risk score rises.

High and Critical events are treated differently from ordinary scan noise. They update the alert banner immediately and are written into the hash-chain ledger. The ledger links each incident to the previous hash so local tampering becomes visible when integrity is checked.

## Repository Structure

```text
BLE_TRUST-REGISTRY/
  README.md
  ble-trust-registry/
    README.md
    docs/
      architecture.md
      installation.md
      troubleshooting.md
      workflow.md
    frontend/
      app/
      components/
      lib/
      package.json
    scanner-backend/
      main.py
      models.py
      name_resolver.py
      scanner.py
      requirements.txt
    scripts/
      start-dev.cmd
      start-backend.cmd
      start-frontend.cmd
```

## Installation

Install:

- Python 3.11 or newer
- Node.js 20 or newer
- A BLE capable adapter
- PowerShell or Command Prompt

Clone and enter the app:

```powershell
git clone https://github.com/manasvi-0523/BLE_TRUST-REGISTRY.git
cd BLE_TRUST-REGISTRY\ble-trust-registry
```

Install backend dependencies:

```powershell
cd scanner-backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Install frontend dependencies:

```powershell
cd ..\frontend
npm.cmd install
```

## Run

From the application root:

```powershell
cd BLE_TRUST-REGISTRY\ble-trust-registry
.\scripts\start-dev.cmd
```

Open:

```text
http://localhost:3000
```

Backend status:

```text
http://127.0.0.1:8000/status
```

## Manual Run

Backend:

```powershell
cd BLE_TRUST-REGISTRY\ble-trust-registry\scanner-backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Frontend:

```powershell
cd BLE_TRUST-REGISTRY\ble-trust-registry\frontend
npm.cmd run dev
```

## Dashboard Behavior

- Alert banner stays solid and readable.
- Live BLE table stays solid and dense.
- Secondary panels use restrained glassmorphism only.
- WebSocket events are batched before chart or table state updates.
- Device state is indexed by address for fast lookup.
- High and Critical alerts are not delayed by animation.
- Recent scan history is capped to avoid runaway memory growth.
- Hash-chain logging does not block the scanner loop.

## Backend API

```text
GET  /status
POST /start-monitoring
POST /stop-monitoring
POST /scan-event
WS   /ws/scan-events
```

## Documentation

```text
ble-trust-registry/docs/architecture.md
ble-trust-registry/docs/workflow.md
ble-trust-registry/docs/installation.md
ble-trust-registry/docs/troubleshooting.md
```

## Ethical Scope

This project is defensive. It is meant for devices and environments you own or have permission to monitor. It does not include unauthorized BLE exploitation, credential capture, malicious payloads, device compromise, or offensive automation.
