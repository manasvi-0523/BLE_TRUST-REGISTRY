import time
import csv
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import ALERTS_PATH, RISK_SCORE_HIGH, RISK_SCORE_MEDIUM

# Import hybrid scoring
from ai_model.rule_based_detector import calculate_final_risk

def trigger_alert(mac, device_name, anomaly_score, device_features=None, write_to_log=True):
    """
    Triggers a visual alert using HYBRID SCORING (Rules + AI).
    
    Args:
        mac: MAC address of the anomalous device
        device_name: Name of the device
        anomaly_score: AI model anomaly score (more negative = more anomalous)
        device_features: Dictionary/Series of device behavioral features
        write_to_log: If True, write alert to CSV log file
        
    Returns:
        tuple: (criticality, final_score, reasons_list)
    """
    # Use hybrid scoring system
    if device_features is not None:
        criticality, final_score, reasons, rule_score, ai_contrib = calculate_final_risk(
            device_features, anomaly_score
        )
    else:
        # Fallback if no features provided (shouldn't happen)
        criticality = "MEDIUM"
        final_score = 50
        reasons = ["Device behavior deviates from baseline"]
        rule_score = 0
        ai_contrib = 50
    
    # Format reasons as single string
    explanation = "; ".join(reasons)
    
    print("\n" + "="*60)
    print("! SECURITY ALERT: ANOMALOUS DEVICE DETECTED !".center(60))
    print("="*60)
    print(f"Time          : {time.strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Device Name   : {device_name}")
    print(f"MAC Address   : {mac}")
    print(f"Risk Level    : {criticality}")
    print(f"Risk Score    : {final_score}/100 (Rule: {rule_score}, AI: {ai_contrib})")
    print(f"AI Score      : {anomaly_score:.3f}")
    print(f"\nReasons:")
    for reason in reasons:
        print(f"  - {reason}")
    print("="*60)
    print("ACTION: Device blocked from Blockchain Identity Registry.\n")
    
    # Write to persistent alert log
    if write_to_log:
        _write_alert_to_log(mac, device_name, anomaly_score, criticality, final_score, 
                           rule_score, ai_contrib, explanation)
    
    return criticality, final_score, reasons

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

def _write_alert_to_log(mac, device_name, anomaly_score, criticality, final_score, 
                       rule_score, ai_contrib, explanation=""):
    """
    Write alert information to a CSV log file with hybrid scoring details.
    """
    try:
        alerts_file = str(ALERTS_PATH)
        os.makedirs(os.path.dirname(alerts_file), exist_ok=True)
        
        file_exists = os.path.exists(alerts_file)
        
        with open(alerts_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            if not file_exists:
                writer.writerow(['timestamp', 'mac_address', 'device_name', 'criticality', 
                               'risk_score', 'rule_score', 'ai_score', 'anomaly_score', 'reason'])
            
            writer.writerow([
                time.strftime('%Y-%m-%d %H:%M:%S'),
                mac,
                device_name,
                criticality,
                final_score,
                rule_score,
                ai_contrib,
                f"{anomaly_score:.3f}",
                explanation
            ])
    except Exception as e:
        print(f"[Alert] Warning: Failed to write to alert log: {e}")
