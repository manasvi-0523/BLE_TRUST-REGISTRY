"""
Device Labeling Helper
Provides intelligent labels for BLE devices when names are unknown
"""

def get_device_label(name, risk_level=None, reasons=None):
    """
    Get an intelligent device label based on name and risk assessment.
    
    Args:
        name: Advertised BLE device name
        risk_level: Risk assessment (HIGH/MEDIUM/LOW)
        reasons: List of reasons for risk assessment
        
    Returns:
        dict: {
            'display_label': Friendly label to show user,
            'advertised_name': Original BLE name,
            'explanation': Why this label was chosen
        }
    """
    cleaned_name = str(name).strip().upper()
    
    # If we have a real name, use it
    if cleaned_name and cleaned_name not in ["UNKNOWN", "UNKNOWN DEVICE", "NONE", "NAN", ""]:
        return {
            'display_label': name,
            'advertised_name': name,
            'explanation': 'Device advertises readable name'
        }
    
    # Device doesn't advertise a name - provide context-aware label
    if risk_level == "HIGH":
        return {
            'display_label': 'Possible Rogue BLE Device',
            'advertised_name': 'UNKNOWN',
            'explanation': 'No readable name + suspicious behavioral patterns detected'
        }
    
    if risk_level == "MEDIUM":
        return {
            'display_label': 'Unverified BLE Device',
            'advertised_name': 'UNKNOWN',
            'explanation': 'No readable name + moderate behavioral anomalies'
        }
    
    # Low risk or no risk assessment
    return {
        'display_label': 'Unnamed BLE Device',
        'advertised_name': 'UNKNOWN',
        'explanation': 'Device does not broadcast a readable name (common for privacy)'
    }


def format_device_for_display(device_data, risk_info=None):
    """
    Format device information for dashboard/console display.
    
    Args:
        device_data: Dictionary with device info (name, mac, rssi, etc.)
        risk_info: Optional dictionary with risk assessment
        
    Returns:
        dict: Formatted device information for display
    """
    name = device_data.get('name', 'UNKNOWN')
    risk_level = risk_info.get('criticality', 'LOW') if risk_info else None
    reasons = risk_info.get('reasons', []) if risk_info else None
    
    label_info = get_device_label(name, risk_level, reasons)
    
    return {
        'display_label': label_info['display_label'],
        'advertised_name': label_info['advertised_name'],
        'mac_address': device_data.get('mac_address', 'N/A'),
        'rssi': device_data.get('mean_rssi', device_data.get('rssi', 'N/A')),
        'risk_level': risk_level or 'UNKNOWN',
        'explanation': label_info['explanation'],
        'packet_count': device_data.get('packet_count', 'N/A'),
        'services': device_data.get('services_count', 'N/A')
    }


if __name__ == "__main__":
    # Test cases
    print("="*70)
    print("DEVICE LABELING - TEST CASES")
    print("="*70)
    
    test_cases = [
        {
            "name": "Normal device with name",
            "device_name": "Samsung Galaxy S21",
            "risk": "LOW"
        },
        {
            "name": "UNKNOWN device with normal behavior",
            "device_name": "UNKNOWN",
            "risk": "LOW"
        },
        {
            "name": "UNKNOWN device with suspicious behavior",
            "device_name": "UNKNOWN",
            "risk": "HIGH"
        },
        {
            "name": "UNKNOWN device with moderate anomalies",
            "device_name": "UNKNOWN",
            "risk": "MEDIUM"
        }
    ]
    
    for test in test_cases:
        print(f"\nTest: {test['name']}")
        print("-" * 70)
        label_info = get_device_label(test['device_name'], test['risk'])
        print(f"Advertised Name : {label_info['advertised_name']}")
        print(f"Display Label   : {label_info['display_label']}")
        print(f"Explanation     : {label_info['explanation']}")
