# Troubleshooting

## Frontend Opens But Backend Shows Disconnected

Start the backend:

```powershell
cd BLE_TRUST-REGISTRY\scanner-backend
python -m uvicorn main:app --host 127.0.0.1 --port 8000
```

Check:

```text
http://127.0.0.1:8000/status
```

## Port 3000 Is Already In Use

Stop the old frontend terminal, or run Next.js on another port:

```powershell
npm.cmd run dev -- --port 3001
```

## Port 8000 Is Already In Use

Find the process:

```powershell
Get-NetTCPConnection -LocalPort 8000
```

Then stop the process from Task Manager or run the backend on another port and update frontend environment variables.

## BLE Scanner Does Not Find Devices

Check these items:

- Bluetooth is enabled.
- The device has a BLE adapter.
- The backend terminal is still running.
- The dashboard monitoring button was clicked.
- Nearby devices are advertising.
- OS Bluetooth permissions allow scanning.

## Runtime Error After Old Local Storage

Open browser developer tools and clear local storage for:

```text
http://localhost:3000
```

Then reload the dashboard. The frontend also normalizes older event shapes to avoid crashes from missing optional fields.

## Backend Rejects Controlled Anomaly Test Event

`POST /scan-event` uses Pydantic validation. Missing required fields or invalid types return `422`.

Minimum required shape:

```json
{
  "displayName": "Test Device",
  "nameSource": "advertised",
  "deviceName": "Test Device",
  "address": "AA:BB:CC:DD:EE:FF",
  "rssi": -55,
  "timestamp": "2026-06-12T00:00:00Z",
  "serviceUuidCount": 1,
  "serviceUuids": ["180f"],
  "manufacturerDataLength": 4,
  "advertisementFrequency": 3.2,
  "estimatedAdvertisementSize": 22,
  "source": "controlled-anomaly-test"
}
```

