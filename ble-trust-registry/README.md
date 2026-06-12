# BLE Trust Registry - Real-Time Trust Violation Detection System

## Problem Statement

BLE monitoring tools often show anonymous nearby devices without enough identity context or diagnosis evidence. This project is a defensive monitoring system that improves BLE name display, registers trusted baselines, classifies live behavior carefully, and avoids treating normal unknown devices as malicious.

## Objective

Build a serious real-time BLE security monitoring product that can scan nearby BLE devices, train trusted baselines, classify devices accurately, detect controlled trust violations, and store high-risk incidents in a tamper-evident local hash-chain ledger.

## Architecture

```text
scanner-backend/
  Bleak scanner -> name resolution -> feature extraction -> Pydantic validation -> FastAPI REST/WebSocket

frontend/
  WebSocket -> 500 ms buffer flush -> merge by address -> anomaly engine -> dense dashboard -> hash-chain ledger
```

## Backend Setup

```powershell
cd ble-trust-registry\scanner-backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

The scanner never auto-starts. Use the dashboard `Start Real-Time Monitoring` control or call:

```powershell
curl.exe -X POST http://127.0.0.1:8000/start-monitoring
```

## Frontend Setup

```powershell
cd ble-trust-registry\frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## Real-Time Monitoring Flow

1. Start the FastAPI backend.
2. Start the Next.js frontend.
3. Open the dashboard.
4. Click `Start Real-Time Monitoring`.
5. BLE events stream through `/ws/scan-events`.
6. The frontend buffers events in a ref and flushes them to React state every 500 ms.
7. Device rows are merged by address so the table stays stable and readable.

## Device Name Resolution Flow

The backend does not rely only on `device.name`. It resolves display names using:

- Advertised local name
- Cached name by address
- OUI manufacturer lookup through `netaddr`
- Service UUID type guess
- Address suffix fallback

Manufacturer and service guesses are display aids only. Trust requires a registered baseline and matching behavior.

## Baseline Training Flow

Select a live device, click `Train Baseline`, observe samples for 60 seconds, then save the baseline. The saved baseline includes RSSI range, average RSSI, advertisement frequency range, service UUID count, payload range, and registration timestamp.

## Anomaly Detection Logic

The anomaly engine uses:

- Warmup gate for new devices
- Per-device rolling history
- Z-score deviation
- Temporal burst detection
- Inter-arrival irregularity
- Fingerprint consistency
- Identity collision checks
- Baseline-aware comparison when a baseline exists

Normal unknown devices are not suspicious by default.

## Unknown-Device Safe Logic

```text
Unknown + fewer than 5 observations -> Observing / Low
Unknown + warmed up + normal behavior -> Unregistered / Needs Baseline / Low
Known trusted + baseline match -> Trusted / Normal / Low
Known trusted + strong deviation -> Anomaly Detected or Trust Violation
```

No red alert or ledger entry is created for normal unknown devices.

## WebSocket Latency Strategy

The backend broadcasts one validated BLE event immediately as one WebSocket message. The frontend avoids re-rendering on every message by buffering incoming events and flushing every 500 ms.

## UI Design Principles

The UI uses a dense Elastic SIEM/Grafana-style layout:

- Solid alert banner
- Solid readable live BLE table
- Subtle glassmorphism only for secondary side panels
- Functional colors only
- Monospace addresses and hashes
- No radar visuals, decorative charts, pulse animations, or cyberpunk effects

Use restrained glassmorphism only for secondary dashboard panels: subtle transparent dark cards, thin slate borders, low blur, and high text contrast. Do not apply glassmorphism to the live BLE table or alert banner because those require maximum readability. The UI should feel like Elastic SIEM/Grafana with subtle glass panels, not a futuristic neon dashboard.

## Hash-chain Ledger Logic

High and Critical incidents are appended to a local ledger. Each hash is built with field separators:

```text
timestamp|deviceName|address|riskScore|riskLevel|prediction|trustStatus|reason|previousHash
```

The frontend uses synchronous `js-sha256`.

## Ethical Scope

This project does not perform unauthorized BLE exploitation, real data theft, credential capture, malicious BLE payloads, device compromise, or offensive automation. Controlled testing must use owned/test devices only.

## Controlled Test Flow

Controlled test events can be sent to:

```text
POST /scan-event
```

Invalid payloads return `422` and do not crash the backend.

## Future Enhancements

- Isolation Forest trained on baseline data
- Browser notifications
- Mobile companion app
- Cloud log sync
- Full blockchain registry
- Exportable incident reports
- Multiple BLE adapters
- Optional analytics tab
