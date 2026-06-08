"""
BLE Attack Device Simulator
Simulates anomalous BLE behavior to test the anomaly detection system
"""
import csv
import time
import random
import os
from config import BLE_DATA_PATH

class AttackSimulator:
    """Simulates various attack patterns"""
    
    ATTACK_SCENARIOS = {
        'spoofing': {
            'name': 'Spoofed_JioSTB_Attacker',
            'mac': 'AA:BB:CC:DD:EE:FF',
            'description': 'Device pretending to be your TV',
            'rssi_pattern': lambda: random.randint(-55, -45),
            'interval_pattern': lambda: random.uniform(80, 250),  # Abnormal timing
            'services': 2,
            'packet_count': (40, 100)  # Range for realistic attack
        },
        'flooding': {
            'name': 'BLE_FLOOD_ATTACK',
            'mac': '11:22:33:44:55:66',
            'description': 'Rapid packet flooding attack',
            'rssi_pattern': lambda: random.randint(-45, -20),  # Very strong signal
            'interval_pattern': lambda: random.uniform(5, 25),  # VERY fast (5-25ms) 
            'services': 0,
            'packet_count': (150, 300)  # High packet volume
        },
        'scanner': {
            'name': 'Malicious_Scanner',
            'mac': 'DE:AD:BE:EF:CA:FE',
            'description': 'Reconnaissance scanner device',
            'rssi_pattern': lambda: random.randint(-70, -50),
            'interval_pattern': lambda: random.uniform(2000, 5000),  # Very slow
            'services': 5,
            'packet_count': (30, 60)
        },
        'erratic': {
            'name': 'Unstable_ROGUE_Device',
            'mac': 'BA:D1:DE:A0:00:00',
            'description': 'Device with highly erratic behavior',
            'rssi_pattern': lambda: random.randint(-90, -20),  # Wildly varying
            'interval_pattern': lambda: random.choice([5, 50, 500, 5000]),  # Extremely inconsistent
            'services': 10,
            'packet_count': (60, 120)
        },
        'rogue_unknown': {
            'name': 'UNKNOWN',  # Simulates unknown device with suspicious behavior
            'mac': 'FA:KE:AP:01:02:03',
            'description': 'Unknown device with no services and abnormal timing',
            'rssi_pattern': lambda: random.randint(-75, -40),
            'interval_pattern': lambda: random.uniform(30, 100),
            'services': 0,  # No services
            'packet_count': (60, 120)
        }
    }
    
    def __init__(self):
        self.csv_file = str(BLE_DATA_PATH)
        os.makedirs(os.path.dirname(self.csv_file), exist_ok=True)
    
    def inject_attack(self, attack_type='spoofing', packet_count=20, duration=10):
        """
        Inject attack packets into the dataset
        
        Args:
            attack_type: Type of attack ('spoofing', 'flooding', 'scanner', 'erratic', 'rogue_ap')
            packet_count: Number of packets to inject
            duration: Time period over which to spread packets (seconds)
        """
        if attack_type not in self.ATTACK_SCENARIOS:
            print(f"❌ Unknown attack type: {attack_type}")
            print(f"Available: {', '.join(self.ATTACK_SCENARIOS.keys())}")
            return False
        
        attack = self.ATTACK_SCENARIOS[attack_type]
        
        print("\n" + "="*60)
        print(f"🚨 INJECTING ATTACK: {attack['name']}")
        print("="*60)
        print(f"Description: {attack['description']}")
        print(f"MAC Address: {attack['mac']}")
        print(f"Packets: {packet_count} over {duration} seconds")
        print("="*60 + "\n")
        
        # Check if file exists and has header
        file_exists = os.path.exists(self.csv_file) and os.path.getsize(self.csv_file) > 0
        
        start_time = time.time()
        interval_between_packets = duration / packet_count
        
        with open(self.csv_file, 'a', newline='', encoding='utf-8') as f:
            writer = csv.writer(f)
            
            # Write header if new file
            if not file_exists:
                writer.writerow(['timestamp', 'mac_address', 'rssi', 'interval_ms', 'services_count', 'name'])
            
            last_timestamp = start_time
            
            for i in range(packet_count):
                # Generate interval from attack pattern instead of uniform distribution
                if i == 0:
                    interval_ms = 0.0
                    current_time = start_time
                else:
                    # Use the attack's interval pattern
                    generated_interval_ms = attack['interval_pattern']()
                    current_time = last_timestamp + (generated_interval_ms / 1000.0)
                    interval_ms = generated_interval_ms
                
                # Generate attack behavior
                rssi = attack['rssi_pattern']()
                
                # Write packet
                writer.writerow([
                    current_time,
                    attack['mac'],
                    rssi,
                    interval_ms,
                    attack['services'],
                    attack['name']
                ])
                
                last_timestamp = current_time
                
                # Progress indicator
                if (i + 1) % 5 == 0:
                    print(f"  📡 Injected {i + 1}/{packet_count} packets...")
            
            f.flush()
        
        print(f"\n✅ Attack injection complete!")
        print(f"💾 Packets written to: {self.csv_file}")
        print(f"\n🔍 Run 'python main.py --mode monitor' to detect this attack!\n")
        
        return True
    
    def inject_multiple_attacks(self):
        """Inject multiple attack types for comprehensive testing"""
        print("\n" + "="*60)
        print("🚨 COMPREHENSIVE ATTACK SIMULATION")
        print("="*60)
        print("Injecting multiple attack vectors...\n")
        
        attacks = [
            ('spoofing', 15, 8),
            ('flooding', 30, 5),
            ('scanner', 10, 12)
        ]
        
        for attack_type, packets, duration in attacks:
            self.inject_attack(attack_type, packets, duration)
            time.sleep(1)
        
        print("\n" + "="*60)
        print("✅ ALL ATTACKS INJECTED")
        print("="*60)
        print(f"\nTotal attack vectors: {len(attacks)}")
        print(f"Run monitor mode to see anomaly detection in action!\n")

def show_menu():
    """Interactive menu for attack simulation"""
    simulator = AttackSimulator()
    
    print("\n" + "="*60)
    print("🔴 BLE ATTACK SIMULATOR")
    print("="*60)
    print("\nAvailable Attack Scenarios:\n")
    
    for i, (key, attack) in enumerate(AttackSimulator.ATTACK_SCENARIOS.items(), 1):
        print(f"{i}. {attack['name']}")
        print(f"   Description: {attack['description']}")
        print(f"   MAC: {attack['mac']}\n")
    
    print(f"{len(AttackSimulator.ATTACK_SCENARIOS) + 1}. Inject ALL attacks (comprehensive test)")
    print(f"{len(AttackSimulator.ATTACK_SCENARIOS) + 2}. Exit")
    print("="*60)
    
    try:
        choice = int(input("\nSelect attack scenario (1-7): "))
        
        if choice == len(AttackSimulator.ATTACK_SCENARIOS) + 2:
            print("Exiting...")
            return
        
        if choice == len(AttackSimulator.ATTACK_SCENARIOS) + 1:
            simulator.inject_multiple_attacks()
        elif 1 <= choice <= len(AttackSimulator.ATTACK_SCENARIOS):
            attack_types = list(AttackSimulator.ATTACK_SCENARIOS.keys())
            attack_type = attack_types[choice - 1]
            
            print(f"\nSelected: {AttackSimulator.ATTACK_SCENARIOS[attack_type]['name']}")
            packets = int(input("Number of packets to inject (default 20): ") or "20")
            duration = int(input("Duration in seconds (default 10): ") or "10")
            
            simulator.inject_attack(attack_type, packets, duration)
        else:
            print("❌ Invalid choice")
    
    except ValueError:
        print("❌ Invalid input")
    except KeyboardInterrupt:
        print("\n\nInterrupted by user")

if __name__ == "__main__":
    import sys
    
    if len(sys.argv) > 1:
        # Command-line mode
        simulator = AttackSimulator()
        attack_type = sys.argv[1]
        packets = int(sys.argv[2]) if len(sys.argv) > 2 else 20
        duration = int(sys.argv[3]) if len(sys.argv) > 3 else 10
        
        success = simulator.inject_attack(attack_type, packets, duration)
        sys.exit(0 if success else 1)
    else:
        # Interactive menu
        show_menu()
