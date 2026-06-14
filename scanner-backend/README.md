# Scanner Backend

FastAPI backend for the BLE Trust Registry monitoring build.

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

## Controlled Anomaly Test Input

```bash
curl -X POST http://127.0.0.1:8000/scan-event ^
  -H "Content-Type: application/json" ^
  -d "{\"rawName\":\"AirPods 280 ANC\",\"displayName\":\"AirPods 280 ANC\",\"nameSource\":\"advertised\",\"manufacturerName\":null,\"deviceTypeGuess\":null,\"deviceName\":\"AirPods 280 ANC\",\"address\":\"FA:KE:AA:11:22:33\",\"rssi\":-31,\"advertisementFrequency\":48.0,\"serviceUuidCount\":7,\"serviceUuids\":[],\"manufacturerDataLength\":40,\"estimatedAdvertisementSize\":80,\"timestamp\":\"2026-06-12T10:00:00Z\",\"source\":\"controlled-anomaly-test\"}"
```

