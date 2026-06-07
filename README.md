# BLE Trust Registry

A research prototype for passive Bluetooth Low Energy anomaly detection. It watches how nearby BLE devices advertise themselves over time, builds a behavioral fingerprint for each one, and flags anything that deviates from what it's learned to expect. Suspicious events get logged to a tamper-evident local ledger and surfaced through a browser dashboard.

Built as an academic project at DBIT Bengaluru to explore whether behavioral analysis of BLE traffic can work as a lightweight, zero-infrastructure anomaly detection layer - no packet decryption, no deep protocol inspection.

---

## The Problem

BLE devices advertise continuously and passively. MAC addresses, signal strength, service UUIDs, timing patterns - all broadcast freely, with no authentication. In any dense space (campus, office, hospital), it's genuinely hard to tell whether a device belongs there or not.

Most BLE security research goes the cryptographic route. This project takes a different angle: instead of looking at *what* a device is saying, it asks *how* it's behaving - and whether that matches what was seen before.

---

## What It Does

- **Two-phase operation** - explicit `baseline` mode to learn normal behavior, then `monitor` mode to catch deviations. Model never trains and tests on the same data in the same run.
- **Behavioral fingerprinting** - per-device features: mean RSSI, advertisement interval (mean + std), packet count, service UUID count
- **Isolation Forest detection** - contamination rate adjusts dynamically based on dataset size to reduce false positives on small scans
- **Three-tier alerts** - LOW / MEDIUM / HIGH based on anomaly score thresholds, logged persistently to CSV
- **Local blockchain ledger** - SHA-256 linked blocks store verified fingerprints; chain integrity is verified on every load
- **Duplicate suppression** - re-adding a device is skipped if its behavior hasn't meaningfully changed (within 10% tolerance)
- **Attack simulator** - injects synthetic anomalous devices (spoofing, flooding, rogue AP, erratic patterns) directly into the dataset so you can test detection without a real attacker
- **Flask dashboard** - live view of devices, alerts, blockchain state, and scan controls in the browser

---

## Architecture

```
                  ┌──────────────────────────────────┐
                  │           main.py                │
                  │   (baseline / monitor mode)      │
                  └──────────┬───────────────────────┘
                             │
           ┌─────────────────▼──────────────────────┐
           │         scanner/ble_scanner.py          │
           │   bleak async BLE scan -> ble_data.csv  │
           └─────────────────┬──────────────────────┘
                             │
           ┌─────────────────▼──────────────────────┐
           │    feature_engine/feature_extract.py   │
           │  per-device aggregation: RSSI, interval│
           │  std, packet count, services count     │
           └──────────┬──────────────────────────────┘
                      │
         ┌────────────▼────────────┐
         │  ai_model/              │
         │  anomaly_detector.py    │
         │  Isolation Forest       │
         │  train() / detect()     │
         └────────────┬────────────┘
                      │
      ┌───────────────┴──────────────────┐
      │                                  │
┌─────▼──────────────┐     ┌─────────────▼──────────┐
│  alerts/           │     │  blockchain/            │
│  alert_system.py   │     │  blockchain.py          │
│  LOW/MEDIUM/HIGH   │     │  SHA-256 linked ledger  │
│  -> alerts.csv     │     │  -> chain.json          │
└────────────────────┘     └─────────────────────────┘
                      │
           ┌──────────▼──────────┐
           │    dashboard.py     │
           │    Flask + HTML     │
           │  http://127.0.0.1:5000 │
           └─────────────────────┘
```

---

## Folder Structure

```
BLE_TRUST-REGISTRY/
├── main.py                      # Entry point - baseline and monitor modes
├── dashboard.py                 # Flask web dashboard
├── attack_simulator.py          # Synthetic attack injection for testing
├── comprehensive_attack_test.py
├── config.py                    # Centralized path and parameter config
├── requirements.txt
│
├── scanner/
│   └── ble_scanner.py           # BleakScanner wrapper, CSV logger
│
├── feature_engine/
│   └── feature_extract.py       # Aggregates raw CSV into per-device features
│
├── ai_model/
│   └── anomaly_detector.py      # Isolation Forest train/detect/load/save
│
├── blockchain/
│   └── blockchain.py            # Block, SimpleBlockchain, integrity verification
│
├── alerts/
│   └── alert_system.py          # Alert triggering and CSV log writer
│
├── templates/
│   └── index.html               # Dashboard frontend
│
└── dataset/
    └── .gitkeep
```

---

## Installation

Python 3.9+. Tested on Windows 10/11 (Classic BT scanning uses the Windows PnP API - BLE scanning via bleak is cross-platform but full functionality is Windows-only).

```bash
git clone https://github.com/manasvi-0523/BLE_mirror.git
cd BLE_mirror

python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

pip install -r requirements.txt
```

No extra config needed. All tuneable parameters (scan duration, cycle counts, contamination rate, alert thresholds) are in `config.py`.

---

## Usage

### Baseline Mode

Run this first, in an environment where the devices present are ones you trust.

```bash
python main.py --mode baseline
# default: 2 scan cycles x 15 seconds each

python main.py --mode baseline --cycles 3
```

Clears the old dataset, records per-device RSSI/interval/packet/service features across all cycles, trains and saves the Isolation Forest model, and writes verified devices to the blockchain ledger.

### Monitor Mode

Loads the trained model and flags behavioral deviations.

```bash
python main.py --mode monitor
# default: 5 cycles

python main.py --mode monitor --cycles 10
```

Fails clearly if you haven't run baseline first. Prints an alert summary and blockchain integrity check at the end.

### Web Dashboard

```bash
python dashboard.py
```

Opens at `http://127.0.0.1:5000`. Shows detected devices, alert history, blockchain state, and lets you trigger scans from the browser. Scans launched from the dashboard spawn a separate console - check that window for output.

### Attack Simulator

```bash
python attack_simulator.py
# interactive menu

python attack_simulator.py spoofing 20 10
# inject spoofing attack, 20 packets over 10 seconds
```

Attack types: `spoofing`, `flooding`, `scanner`, `erratic`, `rogue_ap`. Packets are written directly to `dataset/ble_data.csv` - run monitor mode afterward to see if detection picks them up.

### Full Workflow

```
1. python main.py --mode baseline      # learn what's normal
2. # verify: look for "[AI] Model successfully trained & saved"
3. python attack_simulator.py          # optional: inject a test attack
4. python main.py --mode monitor       # detect anomalies
5. cat alerts/alerts.csv               # review what was flagged
```

Re-running `--mode baseline` resets everything. Do that intentionally - it clears the dataset and starts a fresh chain.

---

## What Not to Commit

These are all covered by `.gitignore` - don't force-add them:

| File | Why |
|------|-----|
| `dataset/ble_data.csv` | Contains MAC addresses and signal data of real devices in your environment |
| `blockchain/chain.json` | Environment-specific runtime ledger |
| `alerts/alerts.csv` | Alert log - may contain device identifiers |
| `ai_model/isolation_forest.pkl` | Fitted to your devices, not portable |
| `ai_model/scaler.pkl` | Fitted to your environment's data distribution |

---

## Limitations

Worth knowing before you rely on this for anything serious:

- **MAC randomization breaks tracking.** Most modern phones (Android 10+, iOS 14+, Windows 10+) rotate their MAC addresses. This system tracks by MAC, so those devices appear as new on every connection.
- **Small scans are unreliable.** Isolation Forest needs a reasonable sample. Under ~10 devices, results are noisy regardless of settings. The `MIN_DEVICES_FOR_MODEL = 3` guard will warn but still proceed.
- **No real-time scanning.** Detection runs in discrete cycles. A device that appears and disappears within a single 15-second window can be missed entirely.
- **Shallow features.** RSSI, interval, and service count are trivially spoofable by anyone who knows what they're doing. This catches unsophisticated behavioral anomalies, not targeted evasion.
- **Windows-only for full functionality.** Classic BT scanning is silently skipped on Linux/macOS.
- **Dashboard subprocesses.** No real-time log streaming - scan output goes to a separate console window.

This is a research prototype. Academic evaluation and demonstration, yes. Production security tool, no.

---

## Potential Future Work

- **Persistent trust scores** - replace binary NORMAL/ANOMALY with a 0-100 per-device score that accumulates across sessions and decays for absent devices
- **Proper scanner context manager** - `__enter__`/`__exit__` instead of the current unreliable `__del__` cleanup
- **Full blockchain verification in dashboard** - current `/api/blockchain` route only checks `previous_hash` linkage; should also recompute each block's hash to catch content-level tampering
- **Email/webhook alerts** - opt-in notification on HIGH criticality events, credentials via environment variables
- **Persistent model reuse** - `--retrain` flag instead of retraining from scratch on every baseline run
- **Merkle tree integrity** - stronger structure than a linear SHA-256 chain
- **Cross-platform Classic BT** - replace Windows PnP with a platform-agnostic fallback

---

## Team

**Team NEXUS ONLINE**
Cybersecurity and Blockchain Division, Idea Lab
Don Bosco Institute of Technology, Bengaluru
Faculty Supervisor: Dr. Sheeba

---

| Name | GitHub | Email | Role |
|------|--------|-------|------|
| Manasvi | [@manasvi-0523](https://github.com/manasvi-0523) | manasvi0523@gmail.com | AI/ML pipeline, Isolation Forest, blockchain ledger, attack simulator, architecture |
| Mithun Gowda B | [@mithun50](https://github.com/mithun50) | mithungowda.b7411@gmail.com | BLE scanner, detection callback, interval calculation, CSV logging |
| Nevil Anson D'Souza | [@nevil06](https://github.com/nevil06) | nevilansondsouza@gmail.com | Flask dashboard, API routes, frontend templates, scan controls |
| Manas Kiran Habbu | [@Manas-H13](https://github.com/Manas-H13) | manaskiranhabbu@gmail.com | Alert system, criticality thresholds, alert logging, config management |
| Naren Bhaskar | [@narenvk-29](https://github.com/narenvk-29) | narenbhaskar2007@gmail.com | Testing, attack validation, comprehensive test suite, documentation |

---

## Disclaimer

Use this only on networks and devices you own or have explicit permission to monitor. Passive BLE scanning may be subject to local regulations on radio monitoring and data collection in some jurisdictions. The authors take no responsibility for misuse.
