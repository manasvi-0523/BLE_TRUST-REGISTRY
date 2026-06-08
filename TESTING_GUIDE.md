# BLE Trust Registry - Testing Guide

## ✅ What Was Fixed

The system now uses **HYBRID DETECTION** combining:
1. **Rule-Based Detection** - Catches obvious attacks (flooding, suspicious names, etc.)
2. **AI-Based Detection** - Identifies behavioral anomalies using Isolation Forest

### Key Improvements:
- ✅ UNKNOWN devices no longer automatically flagged as HIGH risk
- ✅ Attack simulator generates strong abnormal behavior  
- ✅ Flooding attacks now correctly detected as HIGH criticality
- ✅ Risk scoring combines rules + AI (not just AI)
- ✅ Dashboard shows detailed explanation for each alert

---

## 🧪 Quick Validation Test

Run this first to verify the detection system works:

```bash
python scripts\validate_detection.py
```

**Expected output**: ✅ ALL TESTS PASSED (6/6)

---

## 📋 Full System Test

### Step 1: Clear Everything

```bash
python dashboard.py
```
- Click "Clear All Data" button in dashboard
- This ensures clean baseline training

### Step 2: Establish Clean Baseline

```bash
python main.py --mode baseline --cycles 2
```

**What this does**:
- Scans for BLE devices for ~30 seconds (2 cycles × 15 seconds)
- Trains Isolation Forest on NORMAL behavior
- Saves model to `ai_model/isolation_forest.pkl`
- Registers trusted devices in blockchain

**Expected output**:
```
[SUCCESS] Baseline established and model trained!
[SUCCESS] X trusted devices learned.
```

### Step 3: Inject Attack

```bash
python attack_simulator.py flooding 200 15
```

**Available attacks**:
- `flooding` - High packet count, rapid intervals (5-25ms)
- `spoofing` - Suspicious device name, abnormal behavior
- `erratic` - Wildly inconsistent timing
- `rogue_unknown` - UNKNOWN name + no services + fast intervals
- `scanner` - Very slow intervals (reconnaissance)

**Expected output**:
```
🚨 INJECTING ATTACK: BLE_FLOOD_ATTACK
✅ Attack injection complete!
💾 Packets written to dataset/ble_data.csv
```

### Step 4: Run Detection

```bash
python main.py --mode monitor --cycles 2
```

**Expected output**:
```
! SECURITY ALERT: ANOMALOUS DEVICE DETECTED !
Device Name   : BLE_FLOOD_ATTACK
MAC Address   : 11:22:33:44:55:66
Risk Level    : HIGH
Risk Score    : 180/100 (Rule: 140, AI: 40)

Reasons:
  - Very high packet count (200 packets)
  - Abnormally low advertisement interval (15.0ms)
  - Suspicious identifier detected in name
  - AI model detected strong behavioral anomaly
```

### Step 5: View Dashboard

```bash
python dashboard.py
```

Open http://127.0.0.1:5000

**Check**:
- ✅ Device appears in "Security Alerts" section
- ✅ Alert has RED background (HIGH criticality)
- ✅ Reason explanation shows behavioral details
- ✅ Risk score breakdown displayed

---

## 🎯 Expected Detection Results

| Device Type | Behavior | Expected Risk | Actual Score |
|------------|----------|---------------|--------------|
| Normal Known Device | 50 packets, 500ms interval | **LOW** | 0-10 |
| Normal UNKNOWN | 30 packets, 800ms interval | **LOW** | 5-15 |
| Flooding Attack | 200 packets, 15ms interval | **HIGH** | 140-180 |
| Spoofing Attack | Attack name, abnormal timing | **MEDIUM/HIGH** | 60-90 |
| Rogue UNKNOWN | UNKNOWN + 90 packets + 45ms | **HIGH** | 75-100 |

---

## 🐛 Troubleshooting

### Problem: All devices show LOW risk

**Cause**: Attack was included in baseline training  
**Solution**:
1. Clear all data
2. Run baseline WITHOUT attacks
3. Then inject attack
4. Run monitor mode

### Problem: Attack not detected

**Check**:
```bash
# View the injected attack data
python -c "import pandas as pd; print(pd.read_csv('dataset/ble_data.csv').tail(20))"
```

The attack MAC should be there with abnormal behavior.

### Problem: Real devices flagged as attacks

**This is normal!** Real unknown BLE devices may have unusual behavior.

**To verify** it's not a false positive:
- Check packet count (should be reasonable, not 200+)
- Check interval (should be normal, not <50ms)
- Check if name contains attack keywords

---

## 📊 Understanding Risk Scores

### Rule-Based Scoring:
- **+40**: Very high packet count (>120)
- **+40**: Very low interval (<50ms)
- **+50**: Attack keywords in name
- **+20**: Strong RSSI (>-30 dBm)
- **+15**: High service count (>8)
- **+10**: No services
- **+5**: UNKNOWN name

### AI Contribution:
- **+40**: Strong anomaly (score < -0.25)
- **+25**: Moderate anomaly (score < -0.10)
- **+10**: Weak anomaly (score < 0)

### Final Risk:
- **HIGH**: Combined score >= 70
- **MEDIUM**: Combined score >= 40
- **LOW**: Combined score < 40

---

## 🔬 Advanced Testing

### Test Multiple Attacks:

```bash
# Inject all attack types
python attack_simulator.py
# Select option 5 (Inject ALL attacks)

# Then detect
python main.py --mode monitor --cycles 3
```

### Test Edge Cases:

```python
# Create custom test
from ai_model.rule_based_detector import calculate_final_risk

features = {
    "packet_count": 150,  # High
    "mean_interval": 30,   # Very low
    "mean_rssi": -40,      # Normal
    "services_count": 0,   # None
    "name": "UNKNOWN"
}

criticality, score, reasons, rule, ai = calculate_final_risk(features, -0.20)
print(f"Risk: {criticality}, Score: {score}")
print("Reasons:", reasons)
```

---

## ✅ Success Criteria

Your system is working correctly when:

1. ✅ Validation script passes all 6 tests
2. ✅ Normal devices get LOW risk (0-20 score)
3. ✅ Normal UNKNOWN gets LOW risk (5-15 score)
4. ✅ Flooding attack gets HIGH risk (140+ score)
5. ✅ Attack name appears in dashboard alert
6. ✅ Alert shows detailed reason explanation
7. ✅ Risk score breakdown visible (Rule + AI)

---

## 🚀 Quick Test Commands

```bash
# Full test sequence
python scripts\validate_detection.py
python dashboard.py  # Clear all data
python main.py --mode baseline --cycles 2
python attack_simulator.py flooding 200 15
python main.py --mode monitor --cycles 2
python dashboard.py  # View results

# Alternative attacks to test
python attack_simulator.py spoofing 80 12
python attack_simulator.py rogue_unknown 100 10
python attack_simulator.py erratic 70 15
```

---

## 📝 What to Present

When demonstrating:

1. Show validation test passing
2. Explain hybrid detection approach
3. Run baseline on clean data
4. Inject flooding attack
5. Show HIGH risk detection with explanations
6. Show dashboard with red alert
7. Explain why UNKNOWN alone isn't HIGH risk
8. Show normal UNKNOWN device for comparison

This demonstrates a working, realistic BLE anomaly detection system!
