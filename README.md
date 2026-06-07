# BLE Trust Registry

A research prototype for Bluetooth Low Energy device monitoring. It scans for nearby BLE devices, builds behavioral fingerprints from raw advertisement data, and uses an Isolation Forest model to flag devices that deviate from a learned baseline. Suspicious events are logged to a local tamper-evident ledger and surfaced through a Flask dashboard.

This was built as an academic project to explore whether passive behavioral analysis of BLE traffic can serve as a lightweight, infrastructure-free anomaly detection layer. It is not a production security tool.

---

## Problem Statement

BLE devices advertise continuously and passively — broadcasting MAC addresses, RSSI values, service UUIDs, and timing patterns without any authentication. In dense environments (offices, hospitals, university campuses), it's difficult to distinguish a legitimate device that belongs in the space from one that doesn't: a spoofed peripheral, a rogue scanner, or a device exhibiting unusual transmission patterns.

Most BLE security research focuses on protocol-level cryptographic hardening. This project takes a different approach: instead of inspecting packet contents, it asks whether a device's *behavioral signature* — how it advertises over time — matches what was previously seen as normal.

---

## Key Features

- **Two-phase operation** — explicit baseline mode (learn) and monitor mode (detect), so the model is never trained and tested on the same data in the same run
- **Behavioral fingerprinting** — per-device features: mean RSSI, advertisement interval (mean + std), packet count, and service UUID count
- **Isolation Forest anomaly detection** — dynamically adjusts contamination rate based on dataset size to reduce false positives on small scans
- **Three-tier alert criticality** — LOW / MEDIUM / HIGH based on anomaly score thresholds, all written to a persistent CSV log
- **Local blockchain ledger** — SHA-256 linked blocks store verified device fingerprints; chain integrity is verified on every load
- **Duplicate suppression** — the ledger skips re-adding a device if its behavior hasn't meaningfully changed (within 10% tolerance)
- **Attack simulator** — injects synthetic anomalous devices (spoofing, flooding, rogue AP, erratic behavior) directly into the dataset for testing without needing a real attacker
- **Flask web dashboard** — live view of detected devices, alert history, blockchain state, and scan controls via browser

---

## System Architecture

```
                  ┌──────────────────────────────────┐
                  │           main.py                │
                  │   (baseline / monitor mode)      │
                  └──────────┬───────────────────────┘
                             │
           ┌─────────────────▼──────────────────────┐
           │         scanner/ble_scanner.py          │
           │   bleak async BLE scan → ble_data.csv  │
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
│  → alerts.csv      │     │  → chain.json           │
└────────────────────┘     └─────────────────────────┘
                      │
           ┌──────────▼──────────┐
           │    dashboard.py     │
           │    Flask + HTML     │
           │    http://127.0.0.1:5000 │
           └─────────────────────┘
```

All paths are resolved relative to the project root via `config.py`. There are no hardcoded absolute paths.

---

## Folder Structure

```
BLE_TRUST-REGISTRY/
├── main.py                     # Entry point — baseline and monitor modes
├── dashboard.py                # Flask web dashboard
├── attack_simulator.py         # Synthetic attack injection for testing
├── comprehensive_attack_test.py
├── config.py                   # Centralized path and parameter config
├── requirements.txt
│
├── scanner/
│   └── ble_scanner.py          # BleakScanner wrapper, CSV logger
│
├── feature_engine/
│   └── feature_extract.py      # Aggregates raw CSV into per-device features
│
├── ai_model/
│   └── anomaly_detector.py     # Isolation Forest train/detect/load/save
│
├── blockchain/
│   └── blockchain.py           # Block, SimpleBlockchain, integrity verification
│
├── alerts/
│   └── alert_system.py         # Alert triggering and CSV log writer
│
├── templates/
│   └── index.html              # Dashboard frontend
│
└── dataset/
    └── .gitkeep                # Directory placeholder (data files are gitignored)
```

---

## Installation

**Requirements:** Python 3.9+, Windows 10/11 (Classic Bluetooth scanning uses the Windows PnP API; BLE scanning via `bleak` works cross-platform but the full feature set is tested on Windows).

```bash
# Clone the repository
git clone https://github.com/manasvi-0523/BLE_mirror.git
cd BLE_mirror

# Create and activate a virtual environment
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # Linux/Mac

# Install dependencies
pip install -r requirements.txt
```

No additional configuration is required for basic use. The `config.py` file contains all tuneable parameters (scan duration, cycle counts, contamination rate, alert thresholds).

---

## Usage

### CLI — Baseline Mode

Scans for BLE devices and trains an Isolation Forest model on their behavioral fingerprints. Run this first, in an environment where the devices present are ones you consider trusted.

```bash
python main.py --mode baseline
# Default: 2 scan cycles × 15 seconds each

python main.py --mode baseline --cycles 3
# Custom: 3 cycles
```

What happens:
- Old dataset is cleared so baseline isn't contaminated by previous sessions
- Each device's RSSI, interval, packet count, and service count are recorded
- After all cycles complete, the model is trained and saved to `ai_model/isolation_forest.pkl`
- Verified devices are written to the blockchain ledger

### CLI — Monitor Mode

Loads the trained model and flags devices whose behavior deviates from baseline.

```bash
python main.py --mode monitor
# Default: 5 scan cycles

python main.py --mode monitor --cycles 10
```

What happens:
- Model is loaded from disk (fails with a clear message if baseline hasn't been run)
- Each detected device is scored; anomalies trigger an alert with LOW/MEDIUM/HIGH criticality
- Normal devices are added to the blockchain if not already present
- A summary table is printed at the end of all cycles

### Web Dashboard

```bash
python dashboard.py
```

Opens automatically at `http://127.0.0.1:5000`. The dashboard shows detected devices, alert history, blockchain ledger state, and provides buttons to start baseline/monitor scans from the browser. Note that scans launched from the dashboard spawn a separate console process — check that window for detailed output.

### Attack Simulator

For testing the detection pipeline without a real attacker device:

```bash
python attack_simulator.py
# Interactive menu — choose an attack type, packet count, and duration

python attack_simulator.py spoofing 20 10
# CLI mode — inject spoofing attack, 20 packets over 10 seconds
```

Available attack types: `spoofing`, `flooding`, `scanner`, `erratic`, `rogue_ap`.

Injected packets are written directly to `dataset/ble_data.csv`. Run `--mode monitor` afterward to see whether the model flags them.

---

## Baseline and Monitor Workflow

```
Step 1: Run in a clean, known environment
        python main.py --mode baseline

Step 2: Verify the model trained successfully
        (look for: "[AI] Model successfully trained & saved")

Step 3: Optionally inject a simulated attack
        python attack_simulator.py

Step 4: Run monitor mode
        python main.py --mode monitor

Step 5: Review alerts
        cat alerts/alerts.csv

Step 6: Check blockchain integrity
        (printed at end of monitor run, also visible in dashboard)
```

Re-running `--mode baseline` clears the old dataset and starts a fresh chain. Do this intentionally — not by accident — as it resets the trust registry.

---

## Security and Privacy Notes

**What gets generated locally and should not be committed:**

| File | Why |
|---|---|
| `dataset/ble_data.csv` | Contains MAC addresses and signal data of real devices in your environment |
| `blockchain/chain.json` | Runtime ledger — environment-specific, not portable |
| `alerts/alerts.csv` | Alert log — may contain device identifiers |
| `ai_model/isolation_forest.pkl` | Fitted model — trained on your specific devices, not generalizable |
| `ai_model/scaler.pkl` | Same — fitted to your environment's data distribution |
| `.env` | Reserved for future credential configuration |

All of the above are covered by `.gitignore`. Do not override or force-add them.

**The blockchain ledger** is local and not distributed. Its purpose is tamper-evidence: if `chain.json` is modified externally, the integrity check on load will catch it and reset to a fresh chain. It does not provide cryptographic guarantees equivalent to a distributed ledger.

**MAC address randomization:** Many modern devices (Android 10+, iOS 14+, Windows 10+) randomize their MAC addresses periodically. This system tracks devices by MAC, so randomized addresses will appear as new devices on each connection and will not be reliably linked to a physical device across sessions. This is a fundamental limitation of passive BLE monitoring.

---

## Limitations

- **MAC randomization breaks continuity.** Devices that rotate addresses cannot be consistently tracked. This affects the majority of modern phones and tablets.
- **Small environment problem.** Isolation Forest with fewer than ~10 devices produces unreliable results regardless of the contamination setting. The minimum device guard (`MIN_DEVICES_FOR_MODEL = 3`) will warn but still proceed.
- **No real-time scanning.** The pipeline runs in discrete cycles. Threats that appear and disappear within a single 15-second scan window may be missed entirely.
- **Behavioral features are shallow.** RSSI, interval, and service count can be spoofed trivially by an informed attacker. This system detects unsophisticated behavioral anomalies, not targeted evasion.
- **Windows-only for full functionality.** Classic Bluetooth scanning via the Windows PnP API is silently skipped on Linux and macOS. BLE scanning works cross-platform but is not tested outside Windows.
- **The dashboard spawns subprocesses.** Scans started from the browser open a separate console window. There is no real-time log streaming to the dashboard during a scan.
- **This is a prototype.** It is suitable for academic evaluation and research demonstration. It is not hardened for deployment in a real security context.

---

## Future Improvements

- **Device trust scoring** — replace the binary NORMAL/ANOMALY label with a persistent 0–100 score per device that accumulates across sessions, decaying for devices not seen recently
- **Context manager for scanner file handles** — the current `__del__` cleanup is unreliable; proper `__enter__`/`__exit__` implementation would prevent handle leaks in long-running sessions
- **Dashboard blockchain verification** — the current `/api/blockchain` route only checks `previous_hash` linkage; it should also recompute each block's hash to catch content-level tampering
- **Email/webhook alerts** — opt-in notification when HIGH criticality anomalies are detected, using environment variables for credentials rather than hardcoded config
- **Persistent model reuse** — currently the model retrains from scratch if re-run; adding a `--retrain` flag and defaulting to loading the existing model when available would preserve accumulated baseline knowledge
- **Merkle tree verification** — a stronger integrity structure for the ledger than a linear SHA-256 chain
- **Cross-platform Classic BT support** — replace the Windows PnP approach with a platform-agnostic fallback

---

## Contributors

**Team NEXUS ONLINE — Don Bosco Institute of Technology, Bengaluru**  
Cybersecurity and Blockchain Division, Idea Lab  
Faculty Supervisor: Dr. Sheeba

---

## Disclaimer

This tool is intended for use on networks and devices you own or have explicit permission to monitor. Passive BLE scanning in some jurisdictions may be subject to local regulations regarding radio monitoring and data collection. The authors take no responsibility for misuse.
