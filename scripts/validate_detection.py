"""
Detection Validation Script
Tests the hybrid detection system with various attack scenarios
"""
import sys
import os

# Add parent directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from ai_model.rule_based_detector import calculate_final_risk

def run_validation():
    """Run validation tests on the detection system"""
    
    print("="*70)
    print("BLE TRUST REGISTRY - DETECTION VALIDATION".center(70))
    print("="*70)
    print("\nTesting Hybrid Detection System (Rules + AI)\n")
    
    test_cases = [
        {
            "name": "Normal Known Device",
            "features": {
                "packet_count": 50,
                "mean_interval": 500,
                "mean_rssi": -60,
                "services_count": 2,
                "name": "Samsung_Galaxy_S21"
            },
            "anomaly_score": 0.05,
            "expected": "LOW"
        },
        {
            "name": "Normal UNKNOWN Device",
            "features": {
                "packet_count": 30,
                "mean_interval": 800,
                "mean_rssi": -70,
                "services_count": 1,
                "name": "UNKNOWN"
            },
            "anomaly_score": 0.02,
            "expected": "LOW"
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
            "anomaly_score": -0.35,
            "expected": "HIGH"
        },
        {
            "name": "Spoofing Attack",
            "features": {
                "packet_count": 80,
                "mean_interval": 120,
                "mean_rssi": -50,
                "services_count": 2,
                "name": "Spoofed_JioSTB_Attacker"
            },
            "anomaly_score": -0.20,
            "expected": "MEDIUM or HIGH"
        },
        {
            "name": "Rogue UNKNOWN Device",
            "features": {
                "packet_count": 90,
                "mean_interval": 45,
                "mean_rssi": -75,
                "services_count": 0,
                "name": "UNKNOWN"
            },
            "anomaly_score": -0.15,
            "expected": "MEDIUM or HIGH"
        },
        {
            "name": "Suspicious High Service Count",
            "features": {
                "packet_count": 60,
                "mean_interval": 300,
                "mean_rssi": -65,
                "services_count": 12,
                "name": "Unknown_Device_X"
            },
            "anomaly_score": -0.12,
            "expected": "MEDIUM"
        }
    ]
    
    passed = 0
    failed = 0
    
    for i, test in enumerate(test_cases, 1):
        print(f"\n{'='*70}")
        print(f"Test Case {i}: {test['name']}")
        print(f"{'='*70}")
        print(f"Expected: {test['expected']}")
        print(f"\nDevice Features:")
        for key, value in test['features'].items():
            print(f"  {key:20}: {value}")
        print(f"  AI Anomaly Score   : {test['anomaly_score']:.3f}")
        
        # Run detection
        criticality, final_score, reasons, rule_score, ai_contrib = calculate_final_risk(
            test['features'], test['anomaly_score']
        )
        
        print(f"\nDetection Result:")
        print(f"  Criticality        : {criticality}")
        print(f"  Risk Score         : {final_score}/100")
        print(f"  Rule Score         : {rule_score}")
        print(f"  AI Contribution    : {ai_contrib}")
        
        print(f"\nReasons:")
        for reason in reasons:
            print(f"  - {reason}")
        
        # Check if result matches expected
        expected_list = test['expected'].split(" or ")
        if criticality in expected_list:
            status = "✅ PASS"
            passed += 1
        else:
            status = "❌ FAIL"
            failed += 1
        
        print(f"\nStatus: {status}")
    
    # Summary
    print(f"\n{'='*70}")
    print("VALIDATION SUMMARY".center(70))
    print(f"{'='*70}")
    print(f"\nTotal Tests: {len(test_cases)}")
    print(f"Passed:      {passed} ✅")
    print(f"Failed:      {failed} ❌")
    print(f"Success Rate: {(passed/len(test_cases))*100:.1f}%")
    
    if failed == 0:
        print("\n🎉 ALL TESTS PASSED! Detection system working correctly.\n")
    else:
        print("\n⚠️  Some tests failed. Review detection thresholds.\n")
    
    return failed == 0

if __name__ == "__main__":
    success = run_validation()
    sys.exit(0 if success else 1)
