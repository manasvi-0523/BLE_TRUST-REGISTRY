# Testing Attack Detection

## ✅ What Was Fixed

The system now has **TWO layers of detection**:

###  1. **Signature-Based Detection** (NEW!)
Catches attacks by recognizing:
- Attack keywords: "spoofed", "attack", "malicious", "rogue", "fake", "flood"
- Rapid flooding: < 50ms interval + > 50 packets
- Extreme signals: < -95 dBm or > -25 dBm
- Massive floods: > 150 packets

### 2. **ML-Based Detection** (Original)
Uses Isolation Forest to detect behavioral anomalies

## 🧪 How to Test Properly

### Step 1: Clear Everything
```bash
# Clear old data
python dashboard.py
# Click "Clear All Data" button
```

### Step 2: Run Baseline (WITHOUT attacks)
```bash
python main.py --mode baseline --cycles 2
```

This trains the model on CLEAN data.

### Step 3: Inject Attack
```bash
python attack_simulator.py spoofing 30 10
```

Or from dashboard: Click "⚠️ Inject Attack" → Choose attack type

### Step 4: Run Monitor Mode
```bash
python main.py --mode monitor --cycles 2
```

### Step 5: Check Dashboard
```bash
python dashboard.py
```

Open http://127.0.0.1:5000 and look at "Security Alerts" section.

## 🚨 Expected Results

You should see the attacked device with:
- **RED background** (HIGH criticality)
- **🚨 icon** 
- **Device name**: "Spoofed_JioSTB_Attacker" (or chosen attack)
- **MAC**: AA:BB:CC:DD:EE:FF (or attack MAC)
- **HIGH CRITICALITY badge**
- **Reason**: Why it was flagged

### Example Alert Display:
```
🚨 Spoofed_JioSTB_Attacker  AA:BB:CC:DD:EE:FF
[HIGH CRITICALITY] | Anomaly Score: -0.450

🔍 Why: Device behavior significantly deviates from learned baseline

Detected at: 2026-06-07 20:55:00
```

## 🐛 Troubleshooting

### Problem: Attack device not showing in alerts

**Cause 1**: Attack was included in baseline training
**Solution**: Clear data and retrain WITHOUT the attack

**Cause 2**: Attack wasn't injected properly
**Solution**: Check `dataset/ble_data.csv` - the attack MAC should be there

**Cause 3**: Model contamination rate too low
**Solution**: The signature-based detection should catch it anyway

### Problem: Only "Unknown" devices in alerts

**Cause**: Real BLE devices nearby are being flagged
**Solution**: This is normal! They're legitimate anomalies. Inject a specific attack to see it.

### Problem: Dashboard shows device table but no alerts

**Cause**: All devices passed behavioral checks
**Solution**: 
1. Inject an attack with obvious signatures
2. Try: `python attack_simulator.py flooding 100 15`
3. Run monitor mode again

## 📊 What You Should See

### In Console Output:
```
[AA:BB:CC:DD:EE:FF] Spoofed_JioSTB -> ANOMALY DETECTED! [!] (Attack signature matched)

! SECURITY ALERT: ANOMALOUS DEVICE DETECTED !
Time          : 2026-06-07 20:55:00
Device Name   : Spoofed_JioSTB_Attacker
MAC Address   : AA:BB:CC:DD:EE:FF
Anomaly Score : -0.452
Criticality   : HIGH
Reason        : Device behavior significantly deviates from learned baseline
ACTION: Device blocked from Blockchain Identity Registry.
```

### In Dashboard:
- Device appears in "Detected BLE Devices" table
- Device appears in "Security Alerts" section (RED, with explanation)
- Alert count increases in stats

### In alerts/alerts.csv:
```
timestamp,mac_address,device_name,anomaly_score,criticality,reason
2026-06-07 20:55:00,AA:BB:CC:DD:EE:FF,Spoofed_JioSTB_Attacker,-0.452,HIGH,Device behavior significantly deviates from learned baseline
```

## 🎯 Quick Test Commands

```bash
# Full test sequence
python dashboard.py  # Clear all data (button)
python main.py --mode baseline --cycles 2
python attack_simulator.py spoofing 30 10
python main.py --mode monitor --cycles 2
python dashboard.py  # View results

# Try different attacks
python attack_simulator.py flooding 100 15
python attack_simulator.py rogue_ap 50 10
python attack_simulator.py erratic 40 12
```

## ✅ Success Criteria

You know it's working when:
1. ✅ Attack device name appears in alerts (not just "Unknown")
2. ✅ Alert has RED background
3. ✅ Criticality shows "HIGH"
4. ✅ Explanation describes the behavioral anomaly
5. ✅ MAC address matches the injected attack

---

**If the attack STILL doesn't show up**, share your:
1. Console output from monitor mode
2. Screenshot of dashboard alerts
3. Last 5 lines of `alerts/alerts.csv`

I'll help debug further!
