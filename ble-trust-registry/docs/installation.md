# Installation Guide

This guide starts from a fresh clone and brings up the live BLE Trust Registry stack.

## Requirements

- Windows 10 or Windows 11
- Python 3.11 or newer
- Node.js 20 or newer
- A BLE capable adapter
- PowerShell or Command Prompt

## Clone

```powershell
git clone https://github.com/manasvi-0523/BLE_TRUST-REGISTRY.git
cd BLE_TRUST-REGISTRY\ble-trust-registry
```

## Backend Setup

```powershell
cd scanner-backend
python -m venv .venv
.\.venv\Scripts\activate
pip install -r requirements.txt
```

Run backend:

```powershell
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Backend health check:

```text
http://127.0.0.1:8000/status
```

## Frontend Setup

Open a second terminal:

```powershell
cd BLE_TRUST-REGISTRY\ble-trust-registry\frontend
npm.cmd install
npm.cmd run dev
```

Open:

```text
http://localhost:3000
```

## One Command Start

After dependencies are installed:

```powershell
cd BLE_TRUST-REGISTRY\ble-trust-registry
.\scripts\start-dev.cmd
```

## Runtime Order

1. Start the backend.
2. Start the frontend.
3. Open the dashboard.
4. Click `Start Real-Time Monitoring`.
5. Watch the live BLE table update.
6. Select a device to inspect diagnosis evidence.
7. Train a baseline only for devices you own or are allowed to monitor.

## Useful URLs

```text
Dashboard:      http://localhost:3000
Backend status: http://127.0.0.1:8000/status
WebSocket:      ws://127.0.0.1:8000/ws/scan-events
```
