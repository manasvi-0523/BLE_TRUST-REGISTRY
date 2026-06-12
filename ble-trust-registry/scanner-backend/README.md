# Scanner Backend

FastAPI backend for the BLE Trust Registry v4 demo-safe build.

## Run

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

The scanner does not start automatically. Start it from the frontend or call:

```bash
curl -X POST http://127.0.0.1:8000/start-monitoring
```

## Controlled Test Input

```bash
curl -X POST http://127.0.0.1:8000/scan-event ^
  -H "Content-Type: application/json" ^
  -d "{\"deviceName\":\"AirPods 280 ANC\",\"address\":\"FA:KE:AA:11:22:33\",\"rssi\":-31,\"advertisementFrequency\":48.0,\"serviceUuidCount\":7,\"manufacturerDataLength\":40,\"payloadLengthApprox\":80,\"timestamp\":\"2026-06-12T10:00:00Z\",\"source\":\"controlled-kali-test\"}"
```
