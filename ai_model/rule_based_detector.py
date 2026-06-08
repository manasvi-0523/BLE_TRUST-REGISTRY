"""
Rule-Based Detection Layer
Catches obvious suspicious behavior before AI analysis
"""

def rule_based_detection(features):
    """
    Analyze device features using rule-based heuristics.
    
    Args:
        features: Dictionary or pandas Series with device behavioral features
        
    Returns:
        tuple: (rule_score, reasons_list)
    """
    reasons = []
    rule_score = 0
    
    # Extract features safely
    packet_count = features.get("packet_count", 0) if hasattr(features, 'get') else getattr(features, 'packet_count', 0)
    mean_interval = features.get("mean_interval", 9999) if hasattr(features, 'get') else getattr(features, 'mean_interval', 9999)
    mean_rssi = features.get("mean_rssi", -70) if hasattr(features, 'get') else getattr(features, 'mean_rssi', -70)
    services_count = features.get("services_count", 0) if hasattr(features, 'get') else getattr(features, 'services_count', 0)
    name = str(features.get("name", "UNKNOWN") if hasattr(features, 'get') else getattr(features, 'name', "UNKNOWN")).upper()
    
    # Rule 1: Very high packet count (flooding behavior)
    if packet_count > 120:
        rule_score += 40
        reasons.append(f"Very high packet count ({packet_count} packets)")
    elif packet_count > 80:
        rule_score += 20
        reasons.append(f"High packet count ({packet_count} packets)")
    
    # Rule 2: Abnormally low interval (rapid advertising)
    if mean_interval < 50:
        rule_score += 40
        reasons.append(f"Abnormally low advertisement interval ({mean_interval:.1f}ms)")
    elif mean_interval < 100:
        rule_score += 20
        reasons.append(f"Low advertisement interval ({mean_interval:.1f}ms)")
    
    # Rule 3: Unusually strong RSSI (proximity attack)
    if mean_rssi > -30:
        rule_score += 20
        reasons.append(f"Unusually strong RSSI signal ({mean_rssi:.1f} dBm)")
    
    # Rule 4: Unusually weak or unstable RSSI
    if mean_rssi < -95:
        rule_score += 15
        reasons.append(f"Unusually weak RSSI signal ({mean_rssi:.1f} dBm)")
    
    # Rule 5: No advertised services (stealth mode - but common for privacy)
    if services_count == 0:
        rule_score += 10
        reasons.append("No advertised BLE services")
    
    # Rule 6: Excessive services (suspicious)
    if services_count > 8:
        rule_score += 15
        reasons.append(f"Unusually high service count ({services_count} services)")
    
    # Rule 7: Unknown name (minor indicator only when combined with other factors)
    if name == "UNKNOWN":
        rule_score += 5
        reasons.append("Device name not advertised")
    
    # Rule 8: Suspicious attack keywords in name (STRONG indicator)
    suspicious_keywords = ["ATTACK", "SPOOF", "FAKE", "ROGUE", "FLOOD", "MALICIOUS"]
    if any(keyword in name for keyword in suspicious_keywords):
        rule_score += 50
        reasons.append(f"Suspicious identifier detected in name")
    
    return rule_score, reasons


def calculate_final_risk(features, anomaly_score):
    """
    Combine rule-based and AI-based scoring for final risk assessment.
    
    Args:
        features: Device behavioral features
        anomaly_score: AI model anomaly score (negative = more anomalous)
        
    Returns:
        tuple: (criticality, final_score, reasons, rule_score, ai_contribution)
    """
    # Get rule-based score
    rule_score, reasons = rule_based_detection(features)
    
    # Calculate AI contribution
    ai_contribution = 0
    
    if anomaly_score < -0.25:
        ai_contribution = 40
        reasons.append(f"AI model detected strong behavioral anomaly (score: {anomaly_score:.3f})")
    elif anomaly_score < -0.10:
        ai_contribution = 25
        reasons.append(f"AI model detected moderate behavioral anomaly (score: {anomaly_score:.3f})")
    elif anomaly_score < 0:
        ai_contribution = 10
        reasons.append(f"AI model detected weak behavioral deviation (score: {anomaly_score:.3f})")
    
    # Combine scores
    final_score = rule_score + ai_contribution
    
    # Determine criticality
    if final_score >= 70:
        criticality = "HIGH"
    elif final_score >= 40:
        criticality = "MEDIUM"
    else:
        criticality = "LOW"
    
    return criticality, final_score, reasons, rule_score, ai_contribution


if __name__ == "__main__":
    # Test cases
    print("="*60)
    print("RULE-BASED DETECTION - TEST CASES")
    print("="*60)
    
    test_cases = [
        {
            "name": "Normal Device",
            "features": {
                "packet_count": 50,
                "mean_interval": 500,
                "mean_rssi": -60,
                "services_count": 2,
                "name": "Normal_Phone"
            },
            "anomaly_score": 0.05
        },
        {
            "name": "Flooding Attack",
            "features": {
                "packet_count": 200,
                "mean_interval": 15,
                "mean_rssi": -35,
                "services_count": 0,
                "name": "BLE_FLOOD_ATTACK"
            },
            "anomaly_score": -0.35
        },
        {
            "name": "Unknown Device (Normal)",
            "features": {
                "packet_count": 30,
                "mean_interval": 800,
                "mean_rssi": -70,
                "services_count": 1,
                "name": "UNKNOWN"
            },
            "anomaly_score": 0.02
        },
        {
            "name": "Suspicious Unknown",
            "features": {
                "packet_count": 90,
                "mean_interval": 45,
                "mean_rssi": -75,
                "services_count": 0,
                "name": "UNKNOWN"
            },
            "anomaly_score": -0.15
        }
    ]
    
    for test in test_cases:
        print(f"\nTest: {test['name']}")
        print("-" * 40)
        criticality, final_score, reasons, rule_score, ai_contrib = calculate_final_risk(
            test['features'], test['anomaly_score']
        )
        print(f"Criticality: {criticality}")
        print(f"Final Score: {final_score} (Rule: {rule_score}, AI: {ai_contrib})")
        print(f"Reasons:")
        for reason in reasons:
            print(f"  - {reason}")
