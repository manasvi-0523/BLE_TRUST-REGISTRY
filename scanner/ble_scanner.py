import asyncio
from bleak import BleakScanner
import time
import csv
import os
import sys
import json
import threading
from collections import deque
from queue import Empty, Queue

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import BLE_DATA_PATH, MAX_LIVE_SCAN_EVENTS, SCAN_EVENTS_PATH

class SignatureScanner:
    def __init__(self):
        # Track devices to compute intervals and behavioral data
        self.devices_data = {}
        self.recent_events = deque(maxlen=MAX_LIVE_SCAN_EVENTS)
        self.write_queue = Queue()
        self.stop_writer = threading.Event()
        
        # Setup dataset directory and CSV logger using centralized config
        self.csv_file = str(BLE_DATA_PATH)
        os.makedirs(os.path.dirname(self.csv_file), exist_ok=True)
        
        # Load trusted device aliases (optional device registry)
        self.alias_file = os.path.join(os.path.dirname(self.csv_file), "device_aliases.json")
        self.device_aliases = self._load_device_aliases()
        
        # Use context manager pattern for file handling (fixed resource leak)
        self.f = None
        self.writer = None
        self._initialize_csv()
        self.writer_thread = threading.Thread(target=self._writer_loop, daemon=True)
        self.writer_thread.start()
    
    def _load_device_aliases(self):
        """
        Load trusted device aliases from JSON file.
        This allows naming devices that don't advertise readable names.
        """
        if not os.path.exists(self.alias_file):
            return {}
        
        try:
            with open(self.alias_file, "r", encoding="utf-8") as file:
                aliases = json.load(file)
                if aliases:
                    print(f"[Scanner] Loaded {len(aliases)} device aliases from registry")
                return aliases
        except Exception as e:
            print(f"[Scanner] Could not load device aliases: {e}")
            return {}
    
    def _initialize_csv(self):
        """Initialize CSV file with headers if needed."""
        file_exists = os.path.exists(self.csv_file)
        self.f = open(self.csv_file, 'a', newline='', encoding='utf-8')
        self.writer = csv.writer(self.f)
        if not file_exists or os.path.getsize(self.csv_file) == 0:
            self.writer.writerow(['timestamp', 'mac_address', 'rssi', 'interval_ms', 'services_count', 'name'])
    
    def __del__(self):
        """Ensure file handle is properly closed."""
        self.close()

    def close(self):
        """Flush queued scan events and close file handles."""
        if getattr(self, "stop_writer", None):
            self.stop_writer.set()
        if getattr(self, "writer_thread", None) and self.writer_thread.is_alive():
            self.writer_thread.join(timeout=2)
        if self.f and not self.f.closed:
            self.f.flush()
            self.f.close()

    def _writer_loop(self):
        """
        Persist scan events off the BLE callback path.

        Disk writes and flushes can stall high-frequency callbacks, so the
        scanner only queues rows while this worker batches persistence.
        """
        pending_rows = 0
        live_events_file = str(SCAN_EVENTS_PATH)
        os.makedirs(os.path.dirname(live_events_file), exist_ok=True)

        with open(live_events_file, "a", encoding="utf-8") as live_events:
            while not self.stop_writer.is_set() or not self.write_queue.empty():
                try:
                    row, event = self.write_queue.get(timeout=0.2)
                except Empty:
                    if pending_rows:
                        self.f.flush()
                        live_events.flush()
                        pending_rows = 0
                    continue

                self.writer.writerow(row)
                live_events.write(json.dumps(event, separators=(",", ":")) + "\n")
                pending_rows += 1

                if pending_rows >= 25:
                    self.f.flush()
                    live_events.flush()
                    pending_rows = 0

                self.write_queue.task_done()
    
    def detection_callback(self, device, advertisement_data):
        timestamp = time.time()
        mac_address = device.address
        rssi = advertisement_data.rssi
        
        # Multi-level name resolution with caching
        # BLE devices often omit names for privacy. Preserve the last known name when possible.
        previous_name = self.devices_data.get(mac_address, {}).get("name")
        alias_name = self.device_aliases.get(mac_address)
        
        name = (
            alias_name  # 1. Trusted device registry (if configured)
            or getattr(advertisement_data, "local_name", None)  # 2. Advertisement local_name
            or device.name  # 3. Bleak device name
            or previous_name  # 4. Previously cached name
            or "UNKNOWN"  # 5. Finally, mark as unknown
        )
        
        services = advertisement_data.service_uuids
        services_count = len(services) if services else 0
        
        # Calculate REAL advertisement interval (time since last seen)
        # This fixes the bug where tx_power was incorrectly used as interval
        interval_ms = 0.0
        if mac_address in self.devices_data:
            last_timestamp = self.devices_data[mac_address]["last_seen"]
            interval_ms = round((timestamp - last_timestamp) * 1000, 2)
            
        self.devices_data[mac_address] = {
            "name": name,
            "mac_address": mac_address,
            "rssi": rssi,
            "services_count": services_count,
            "last_seen": timestamp
        }

        event = {
            "timestamp": timestamp,
            "mac_address": mac_address,
            "rssi": rssi,
            "interval_ms": interval_ms,
            "services_count": services_count,
            "name": name
        }
        self.recent_events.append(event)
        
        # Print device information
        print(f"[{time.strftime('%H:%M:%S')}] MAC: {mac_address} | RSSI: {rssi:4} dBm | Interval: {interval_ms:7} ms | Services: {services_count} | Name: {name}")

        # Export rows asynchronously so BLE callbacks stay responsive.
        self.write_queue.put((
            [timestamp, mac_address, rssi, interval_ms, services_count, name],
            event
        ))

    async def run(self, scan_time=15):
        print(f"Starting BLE Scanner for {scan_time} seconds (Behavioral Capture)...")
        scanner = BleakScanner(detection_callback=self.detection_callback)
        try:
            await scanner.start()
            await asyncio.sleep(scan_time)
        finally:
            await scanner.stop()
            self.write_queue.join()
            self.close()
        print("\n--- Scanning complete. Summary ---")
        print(f"Total Unique Devices Captured: {len(self.devices_data)}")

if __name__ == "__main__":
    scanner = SignatureScanner()
    try:
        asyncio.run(scanner.run(scan_time=15))
    except KeyboardInterrupt:
        print("\nScanner stopped manually.")
