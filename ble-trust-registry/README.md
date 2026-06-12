# BLE Trust Registry

## Problem Statement

BLE devices are easy to observe but hard to trust during live monitoring. A nearby device may appear normal, copy a familiar name, change advertisement behavior, or emit abnormal payload patterns. This project provides a defensive dashboard for spotting those trust violations during controlled demonstrations and real local scanning.

## Objective

Build a professional, real-time BLE security dashboard that learns trusted device behavior, compares live scan events against trusted baselines, detects anomalies, raises trust violation alerts, and records high-risk incidents in a tamper-evident local hash-chain ledger.

## Architecture

Backend:

```text
BLE Adapter -> Python Bleak Scanner -> Feature Extraction -> FastAPI -> WebSocket / REST
```

Frontend:

```text
Next.js Dashboard -> Trusted Registry -> Baseline Comparison -> Deterministic Anomaly Engine -> Alert Bar -> Hash-chain Ledger
```

The backend handles scanner control, feature extraction, validation, CORS, REST endpoints, and WebSocket broadcasting. The frontend owns registry state, baseline verification, anomaly scoring, alerting, local persistence, charts, and hash-chain logging.

## Features

- Manual real-time monitoring start/stop.
- Backend connection status and reconnecting WebSocket client.
- Validated controlled input through `POST /scan-event`.
- Live BLE monitor table with trust status, risk score, prediction, and reason.
- Trusted device registry persisted to `localStorage`.
- Baseline training workflow with 60-second progress.
- Authenticity check that safely handles missing baselines.
- Deterministic AI-assisted anomaly scoring.
- Persistent trust violation alert bar with Framer Motion transitions.
- Local hash-chain security ledger using synchronous `js-sha256`.
- Risk charts, RSSI chart, frequency chart, distribution chart, and lightweight threat radar.
- Demo Backup Mode with an in-memory pre-seeded trusted baseline.

## Tech Stack

- Next.js
- TypeScript
- Tailwind CSS
- shadcn-style local UI primitives
- Framer Motion
- Recharts
- js-sha256
- FastAPI
- Pydantic v2
- Bleak
- WebSockets

## How Real-Time Monitoring Works

The backend does not start scanning on boot. The user clicks `Start Real-Time Monitoring`, which calls `POST /start-monitoring`. The backend starts `BleakScanner`, extracts BLE features, validates events with Pydantic, and broadcasts scan events over `/ws/scan-events`. The frontend WebSocket client reconnects every 3 seconds if disconnected and avoids duplicate event handlers by using a single lifecycle manager.

## How Baseline Training Works

The user starts monitoring, selects a detected device, and clicks `Train Baseline`. The dashboard collects that device behavior for 60 seconds, tracks samples, calculates RSSI/frequency/payload ranges, and lets the user save the reviewed baseline as trusted.

## How Anomaly Detection Works

Version 1 uses deterministic scoring so it is explainable during a demo. It is structured for a future Isolation Forest model but does not depend on a random pretrained BLE attack model.

Score mapping:

```text
0-30: Low -> Normal
31-60: Medium -> Suspicious
61-80: High -> Anomaly Detected
81-100: Critical -> Trust Violation
```

Feature weights:

- Unknown device with no baseline: +35
- Same device name but different address: +30
- Advertisement frequency far outside baseline: +25
- Known address but changed behavior strongly: +25
- Service UUID count mismatch: +15
- Payload length outside trusted range: +15
- RSSI outside trusted range: +10
- Manufacturer data length abnormality: +10
- Repeated abnormal behavior: +10

The final score is clamped once after all feature scores are summed.

## How Hash-chain Logging Works

High-risk and critical events are appended to a local ledger. Each entry stores device details, risk labels, trust status, reason, previous hash, and current hash.

Hash input:

```text
[
  timestamp,
  deviceName,
  address,
  riskScore,
  riskLevel,
  prediction,
  trustStatus,
  reason,
  previousHash
].join("|")
```

The frontend uses synchronous `js-sha256`, not Web Crypto, so append-and-verify stays simple and deterministic.

## How localStorage Persistence Works

The frontend stores JSON arrays under:

```text
ble_trusted_devices
ble_baselines
ble_ledger_entries
```

Storage parsing is defensive. If corrupted JSON is found, the UI does not crash; the bad key is reset to an empty array and a warning is shown.

## Ethical Scope

This project does not perform unauthorized BLE exploitation or real data theft. The Kali-side activity is represented only as controlled spoofing/anomaly generation using owned or test devices. The dashboard focuses on defensive detection, alerting, authenticity verification, and tamper-evident logging.

## How To Run Frontend

```bash
cd ble-trust-registry/frontend
npm install
npm run dev
```

Open:

```text
http://localhost:3000
```

## How To Run Scanner Backend

```bash
cd ble-trust-registry/scanner-backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

## How To Test Controlled Input

```bash
curl -X POST http://127.0.0.1:8000/scan-event ^
  -H "Content-Type: application/json" ^
  -d "{\"deviceName\":\"AirPods 280 ANC\",\"address\":\"FA:KE:AA:11:22:33\",\"rssi\":-31,\"advertisementFrequency\":48.0,\"serviceUuidCount\":7,\"manufacturerDataLength\":40,\"payloadLengthApprox\":80,\"timestamp\":\"2026-06-12T10:00:00Z\",\"source\":\"controlled-kali-test\"}"
```

Generate timestamps dynamically in real test scripts.

## Future Enhancements

- Isolation Forest trained on real baseline data
- Stronger BLE fingerprinting
- Browser push notifications
- Mobile companion alert app
- Cloud log sync
- Full blockchain smart contract registry
- Exportable PDF incident reports
- Support for multiple BLE adapters
- Better device identity resolution
- Extended controlled Kali test integration
