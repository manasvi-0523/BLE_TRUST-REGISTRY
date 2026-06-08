import pandas as pd
import numpy as np
import os
import sys

# Add parent directory to path for imports
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from config import BLE_DATA_PATH

def first_valid_name(series):
    """
    Extract the first valid (non-UNKNOWN) name from a series of name values.
    
    BLE devices may not advertise names in every packet. This function
    searches through all captured names to find the first valid one.
    
    Args:
        series: Pandas series of device name values
        
    Returns:
        str: First valid name found, or "UNKNOWN" if none found
    """
    for name in series:
        if pd.notna(name):
            cleaned = str(name).strip()
            # Skip obvious placeholder values
            if cleaned and cleaned.upper() not in ["UNKNOWN", "UNKNOWN DEVICE", "NONE", "NAN", ""]:
                return cleaned
    return "UNKNOWN"

def extract_features(csv_path=None):
    """
    Extract behavioral fingerprints from raw BLE scan data.
    
    Args:
        csv_path: Path to the CSV file containing raw BLE data (uses config default if None)
        
    Returns:
        DataFrame with aggregated features per device, or None if data unavailable
    """
    if csv_path is None:
        csv_path = str(BLE_DATA_PATH)
        
    if not os.path.exists(csv_path):
        print(f"Dataset not found at {csv_path}. Please run BLE scanner first.")
        return None
        
    # Read CSV with optimized data types
    try:
        df = pd.read_csv(csv_path, dtype={
            'timestamp': float,
            'mac_address': str,
            'rssi': int,
            'interval_ms': float,
            'services_count': int,
            'name': str
        })
    except Exception as e:
        print(f"Error reading dataset: {e}")
        return None
        
    if df.empty:
        print("Dataset is empty.")
        return None
        
    print(f"Loaded {len(df)} raw data points.")
    
    # Handle possible NaN in interval (first detection packet)
    df['interval_ms'] = df['interval_ms'].fillna(0)
    
    # Vectorized feature aggregation (much faster than loop)
    features_df = df.groupby('mac_address', as_index=False).agg({
        'rssi': 'mean',
        'interval_ms': ['mean', 'std'],
        'timestamp': 'count',  # packet count (count any column)
        'services_count': 'max',
        'name': first_valid_name  # Use custom function to get first valid name
    })
    
    # Flatten and rename columns for clarity
    features_df.columns = [
        'mac_address',
        'mean_rssi',
        'mean_interval',
        'std_interval',
        'packet_count',
        'services_count',
        'name'
    ]
    
    # Fill NaN std values (single packet devices) with 0
    features_df['std_interval'] = features_df['std_interval'].fillna(0)
    
    # Round numerical values for cleaner output
    features_df['mean_rssi'] = features_df['mean_rssi'].round(2)
    features_df['mean_interval'] = features_df['mean_interval'].round(2)
    features_df['std_interval'] = features_df['std_interval'].round(2)
    
    print(f"Extracted behavioral features for {len(features_df)} unique devices.")
    return features_df

if __name__ == "__main__":
    # Test feature extraction
    features_df = extract_features()
    if features_df is not None:
        print("\n--- Device Behavioral Fingerprints ---")
        # Display the formatted features
        print(features_df.to_string(index=False))
