"""
Comprehensive Attack Testing Script
Tests all 5 attack scenarios end-to-end
"""
import subprocess
import os
import sys
import time

# Attack types to test
ATTACKS = ['spoofing', 'flooding', 'scanner', 'erratic', 'rogue_ap']

def clean_data():
    """Remove all existing data files"""
    print("\n🧹 Cleaning previous data...")
    files_to_remove = [
        'dataset/ble_data.csv',
        'blockchain_ledger.json',
        'ai_model/isolation_forest.pkl'
    ]
    for file in files_to_remove:
        if os.path.exists(file):
            os.remove(file)
            print(f"   ✓ Removed {file}")
    print()

def run_baseline():
    """Run baseline scan"""
    print("\n" + "="*70)
    print("  STEP 1: ESTABLISHING BASELINE".center(70))
    print("="*70)
    result = subprocess.run(
        [sys.executable, 'main.py', '--mode', 'baseline', '--cycles', '1'],
        capture_output=True,
        text=True
    )
    if 'SUCCESS' in result.stdout:
        print("✅ Baseline established successfully!")
        # Extract device count
        for line in result.stdout.split('\n'):
            if 'trusted devices learned' in line.lower():
                print(f"   {line.strip()}")
    else:
        print("❌ Baseline failed!")
        print(result.stdout)
        return False
    return True

def inject_attack(attack_type):
    """Inject attack into dataset"""
    print(f"\n🚨 INJECTING ATTACK: {attack_type.upper()}")
    try:
        result = subprocess.run(
            [sys.executable, 'attack_simulator.py', attack_type, '20', '10'],
            capture_output=True,
            text=True,
            cwd=os.getcwd()
        )
        # Check if attack simulator succeeded
        if result.returncode == 0:
            print(f"   ✅ Attack '{attack_type}' injected successfully")
            return True
        else:
            print(f"   ❌ Failed to inject attack '{attack_type}' (exit code: {result.returncode})")
            if result.stderr:
                print("   ERROR:", result.stderr[:300])
            return False
    except Exception as e:
        print(f"   ❌ Exception during attack injection: {e}")
        return False

def run_monitor():
    """Run monitor scan and check for detections"""
    print("\n🔍 RUNNING MONITOR SCAN...")
    result = subprocess.run(
        [sys.executable, 'main.py', '--mode', 'monitor', '--cycles', '1'],
        capture_output=True,
        text=True
    )
    
    # Parse results
    detected = 'THREATS DETECTED' in result.stdout
    device_count = 0
    detected_devices = []
    
    for line in result.stdout.split('\n'):
        if 'Anomaly Event(s)' in line:
            try:
                device_count = int(line.split('Detected')[1].split('Anomaly')[0].strip())
            except:
                pass
        if '║  •' in line:
            detected_devices.append(line.strip())
    
    if detected:
        print(f"   ✅ DETECTION SUCCESSFUL! Found {device_count} anomalous device(s)")
        for dev in detected_devices:
            print(f"      {dev}")
        return True
    else:
        print("   ⚠️  No threats detected (might be a false negative)")
        return False

def main():
    """Run comprehensive attack testing"""
    print("\n" + "╔" + "="*68 + "╗")
    print("║" + " BLE SECURITY SYSTEM - COMPREHENSIVE ATTACK TEST ".center(68) + "║")
    print("╚" + "="*68 + "╝")
    
    results = {}
    
    for i, attack in enumerate(ATTACKS, 1):
        print("\n\n" + "█"*70)
        print(f"  TEST {i}/{len(ATTACKS)}: {attack.upper()} ATTACK".center(70))
        print("█"*70)
        
        # Step 1: Clean data
        clean_data()
        
        # Step 2: Establish baseline
        if not run_baseline():
            results[attack] = 'FAILED (Baseline)'
            continue
        
        time.sleep(2)
        
        # Step 3: Inject attack
        if not inject_attack(attack):
            results[attack] = 'FAILED (Injection)'
            continue
        
        time.sleep(1)
        
        # Step 4: Run monitor and detect
        if run_monitor():
            results[attack] = 'PASSED ✓'
        else:
            results[attack] = 'FAILED (Detection)'
        
        time.sleep(2)
    
    # Final summary
    print("\n\n" + "╔" + "="*68 + "╗")
    print("║" + " FINAL TEST RESULTS ".center(68) + "║")
    print("╠" + "="*68 + "╣")
    
    passed = sum(1 for r in results.values() if 'PASSED' in r)
    total = len(results)
    
    for attack, result in results.items():
        status_emoji = "✅" if 'PASSED' in result else "❌"
        print(f"║  {status_emoji} {attack.upper():15} : {result:40} ║")
    
    print("╠" + "="*68 + "╣")
    print(f"║  OVERALL: {passed}/{total} tests passed".ljust(68) + "║")
    print("╚" + "="*68 + "╝\n")
    
    return passed == total

if __name__ == "__main__":
    try:
        success = main()
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print("\n\n⚠️  Testing interrupted by user.")
        sys.exit(1)
    except Exception as e:
        print(f"\n\n❌ Error during testing: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
