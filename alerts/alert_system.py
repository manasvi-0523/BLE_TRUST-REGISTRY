import time
import csv
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import ALERTS_PATH, ALERT_CRITICALITY_HIGH, ALERT_CRITICALITY_MEDIUM

def trigger_alert(mac, device_name, score, device_features=None, write_to_log=True):
    """
    Triggers a visual (and programmatic console) alert when an anomaly is detected.
    
    Args:
        mac: MAC address of the anomalous device
        device_name: Name of the device
        score: Anomaly score from the model (more negative = more anomalous)
        device_features: Dictionary of device behavioral features for explanation
        write_to_log: If True, write alert to CSV log file
    """
    # Determine criticality level
    if score < ALERT_CRITICALITY_HIGH:
        criticality = "HIGH"
    elif score < ALERT_CRITICALITY_MEDIUM:
        criticality = "MEDIUM"
    else:
        criticality = "LOW"
    
    # Generate explanation for why alert was triggered
    explanation = _generate_alert_explanation(device_features, score, criticality)
    
    print("\n" + "="*50)
    print("! SECURITY ALERT: ANOMALOUS DEVICE DETECTED !".center(50))
    print("="*50)
    print(f"Time          : {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Device Name   : {device_name}")
    print(f"MAC Address   : {mac}")
    print(f"Anomaly Score : {score:.3f}")
    print(f"Criticality   : {criticality}")
    print(f"Reason        : {explanation}")
    print("="*50)
    print("ACTION: Device blocked from Blockchain Identity Registry.\n")
    
    # Write to persistent alert log
    if write_to_log:
        _write_alert_to_log(mac, device_name, score, criticality, explanation)
    
    return criticality

def _generate_alert_explanation(features, score, criticality):
    """
    Generate human-readable explanation for why the alert was triggered.
    
    Args:
        features: Dictionary with device behavioral features
        score: Anomaly score
        criticality: Criticality level
        
    Returns:
        str: Explanation text
    """
    if not features:
        return "Device behavior significantly deviates from learned baseline"
    
    reasons = []
    
    # Analyze RSSI (signal strength)
    if 'mean_rssi' in features:
        rssi = features['mean_rssi']
        if rssi < -90:
            reasons.append("extremely weak signal (possible distance spoofing)")
        elif rssi > -30:
            reasons.append("unusually strong signal (possible proximity attack)")
    
    # Analyze interval patterns
    if 'mean_interval_ms' in features:
        interval = features['mean_interval_ms']
        if interval < 50:
            reasons.append("rapid packet flooding detected")
        elif interval > 2000:
            reasons.append("abnormal slow transmission pattern")
        elif 'interval_std' in features and features['interval_std'] > 500:
            reasons.append("highly erratic transmission timing")
    
    # Analyze packet count
    if 'packet_count' in features:
        count = features['packet_count']
        if count > 100:
            reasons.append(f"excessive packet volume ({count} packets)")
        elif count < 3:
            reasons.append("insufficient data for reliable fingerprint")
    
    # Analyze service count
    if 'services_count' in features:
        services = features['services_count']
        if services == 0:
            reasons.append("no advertised services (stealth mode)")
        elif services > 10:
            reasons.append(f"unusually high service count ({services})")
    
    # Build explanation
    if reasons:
        return "; ".join(reasons[:2])  # Limit to 2 most relevant reasons
    elif criticality == "HIGH":
        return "Multiple behavioral anomalies detected"
    elif criticality == "MEDIUM":
        return "Behavioral pattern differs from baseline"
    else:
        return "Minor deviation from expected behavior"

def _write_alert_to_log(mac, device_name, score, criticality, explanation=""):
    """
    Write alert information to a CSV log file for historical tracking.
    
    Args:
        mac: MAC address
        device_name: Device name
        score: Anomaly score
        criticality: Criticality level (LOW/MEDIUM/HIGH)
        explanation: Reason for the alert
    """
    try:
        alerts_file = str(ALERTS_PATH)
        os.makedirs(os.path.dirname(alerts_file), exist_ok=True)
        
        # Check if file exists to determine if we need headers
        file_exists = os.path.exists(alerts_file)
        
        with open(alerts_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['timestamp', 'mac_address', 'device_name', 'anomaly_score', 'criticality', 'reason'])
            
            writer.writerow([
                time.strftime('%Y-%m-%d %H:%M:%S'),
                mac,
                device_name,
                f"{score:.3f}",
                criticality,
                explanation
            ])
    except Exception as e:
        print(f"[Alert] Warning: Failed to write to alert log: {e}")

def get_alert_history(limit=None):
    """
    Retrieve alert history from the log file.
    
    Args:
        limit: Maximum number of recent alerts to return (None for all)
        
    Returns:
        list: List of alert dictionaries, or empty list if no alerts
    """
    alerts_file = str(ALERTS_PATH)
    
    if not os.path.exists(alerts_file):
        return []
    
    try:
        import pandas as pd
        df = pd.read_csv(alerts_file)
        
        if limit:
            df = df.tail(limit)
        
        return df.to_dict('records')
    except Exception as e:
        print(f"[Alert] Error reading alert history: {e}")
        return []

if __name__ == "__main__":
    # Test Alert
    print("Testing alert system...\n")
    trigger_alert("00:11:22:33:44:55", "Spoofed_JioSTB", -0.452)
    trigger_alert("AA:BB:CC:DD:EE:FF", "Unknown_Device", -0.156)
    trigger_alert("11:22:33:44:55:66", "Suspicious_Phone", -0.089)
    
    print("\n--- Alert History ---")
    history = get_alert_history()
    for alert in history:
        print(alert)
