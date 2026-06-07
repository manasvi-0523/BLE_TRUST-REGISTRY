#!/usr/bin/env python3
"""
Logo Preparation Script for BLE Trust Registry

This script helps you prepare and place logo files in the correct directories.
It can resize your logo image to the required dimensions.

Usage:
    python prepare_logo.py path/to/your/logo.png
"""

import sys
import os
from pathlib import Path

def prepare_logo(source_path):
    """
    Prepare logo files from a source image.
    
    Args:
        source_path: Path to the original logo image
    """
    try:
        from PIL import Image
    except ImportError:
        print("❌ Error: Pillow (PIL) is required but not installed.")
        print("   Install it with: pip install Pillow")
        return False
    
    # Verify source file exists
    source = Path(source_path)
    if not source.exists():
        print(f"❌ Error: Source file not found: {source_path}")
        return False
    
    # Create directories
    assets_dir = Path("assets")
    static_dir = Path("static")
    
    assets_dir.mkdir(exist_ok=True)
    static_dir.mkdir(exist_ok=True)
    
    print("📁 Created directories:")
    print(f"   ✓ {assets_dir.absolute()}")
    print(f"   ✓ {static_dir.absolute()}")
    
    # Load the original image
    try:
        img = Image.open(source)
        print(f"\n📸 Loaded image: {source.name}")
        print(f"   Original size: {img.size[0]}x{img.size[1]}px")
        
        # Convert to RGBA if needed (for transparency support)
        if img.mode != 'RGBA':
            img = img.convert('RGBA')
        
    except Exception as e:
        print(f"❌ Error loading image: {e}")
        return False
    
    # Create main logo (800x800)
    print("\n🎨 Creating logo files...")
    
    try:
        # Calculate new size maintaining aspect ratio
        width, height = img.size
        if width > height:
            new_width = 800
            new_height = int((800 / width) * height)
        else:
            new_height = 800
            new_width = int((800 / height) * width)
        
        logo = img.resize((new_width, new_height), Image.Resampling.LANCZOS)
        
        # Save to both locations
        logo.save(assets_dir / "logo.png")
        print(f"   ✓ Saved {assets_dir / 'logo.png'} ({new_width}x{new_height}px)")
        
        logo.save(static_dir / "logo.png")
        print(f"   ✓ Saved {static_dir / 'logo.png'} ({new_width}x{new_height}px)")
        
    except Exception as e:
        print(f"   ❌ Error creating logo: {e}")
        return False
    
    # Create favicon (32x32)
    try:
        favicon = img.resize((32, 32), Image.Resampling.LANCZOS)
        favicon.save(static_dir / "favicon.png")
        print(f"   ✓ Saved {static_dir / 'favicon.png'} (32x32px)")
        
    except Exception as e:
        print(f"   ❌ Error creating favicon: {e}")
        return False
    
    print("\n✅ Logo preparation complete!")
    print("\n📋 Next steps:")
    print("   1. Verify the files look correct")
    print("   2. Run: python dashboard.py")
    print("   3. Open http://127.0.0.1:5000 to see the logo")
    print("   4. Commit the files:")
    print("      git add assets/ static/")
    print('      git commit -m "Add project logo and branding assets"')
    print("      git push")
    
    return True


def main():
    """Main entry point."""
    print("=" * 70)
    print("BLE Trust Registry - Logo Preparation Tool")
    print("=" * 70)
    
    if len(sys.argv) != 2:
        print("\n❌ Usage: python prepare_logo.py path/to/your/logo.png")
        print("\nExample:")
        print("   python prepare_logo.py ~/Downloads/ble_security_logo.png")
        print("   python prepare_logo.py C:\\Users\\YourName\\Desktop\\logo.png")
        return 1
    
    source_path = sys.argv[1]
    success = prepare_logo(source_path)
    
    return 0 if success else 1


if __name__ == "__main__":
    sys.exit(main())
