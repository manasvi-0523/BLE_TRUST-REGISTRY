# Logo Integration Guide

## 📋 Overview

This guide explains how to add the BLE Trust Registry logo (the Bluetooth security icon with chains and horns) to your project.

## 📁 Required Directory Structure

Create the following directories:

```
BLE_TRUST-REGISTRY/
├── assets/          # For README logo
│   └── logo.png
└── static/          # For dashboard favicon and logo
    ├── logo.png
    └── favicon.png
```

## 🎨 Step 1: Prepare Your Logo Files

You have the logo image. Now you need to create two versions:

### Main Logo (logo.png)
- **Size**: 800x800px (or maintain aspect ratio)
- **Format**: PNG with transparent background
- **Purpose**: Display in README and dashboard header

### Favicon (favicon.png)
- **Size**: 32x32px or 64x64px
- **Format**: PNG or ICO
- **Purpose**: Browser tab icon

## 📂 Step 2: Create Directories and Add Files

### Option A: Manual Setup

1. **Create directories:**
   ```bash
   mkdir assets
   mkdir static
   ```

2. **Save your logo:**
   - Save the large version (800x800px) as:
     - `assets/logo.png` (for README)
     - `static/logo.png` (for dashboard)
   
   - Create a small version (32x32px) and save as:
     - `static/favicon.png`

### Option B: Using Image Conversion Tools

If you only have the large image, you can resize it:

**Using Python (PIL):**
```python
from PIL import Image

# Load the original logo
img = Image.open('your_logo.png')

# Create favicon (32x32)
favicon = img.resize((32, 32), Image.Resampling.LANCZOS)
favicon.save('static/favicon.png')

# Optionally resize main logo to standard size
logo = img.resize((800, 800), Image.Resampling.LANCZOS)
logo.save('assets/logo.png')
logo.save('static/logo.png')
```

**Using ImageMagick (command line):**
```bash
# Create favicon
magick convert your_logo.png -resize 32x32 static/favicon.png

# Resize main logo
magick convert your_logo.png -resize 800x800 assets/logo.png
magick convert your_logo.png -resize 800x800 static/logo.png
```

**Using Online Tools:**
- Visit: https://www.iloveimg.com/resize-image
- Upload your logo
- Resize to 800x800px (main) and 32x32px (favicon)
- Download and place in correct folders

## ✅ Step 3: Verify Integration

### Check README
1. Open `README.md`
2. Look for the logo reference at the top:
   ```html
   <img src="assets/logo.png" alt="BLE Trust Registry Logo" width="300"/>
   ```
3. View on GitHub to see if it displays correctly

### Check Dashboard
1. Start the dashboard:
   ```bash
   python dashboard.py
   ```
2. Open http://127.0.0.1:5000
3. You should see:
   - Logo in the header
   - Favicon in the browser tab

## 🔧 Troubleshooting

### Logo not showing in README
- **Issue**: Path incorrect or file missing
- **Fix**: Ensure `assets/logo.png` exists and the path in README is correct

### Favicon not showing in dashboard
- **Issue**: Flask not serving static files or file missing
- **Fix**: 
  1. Ensure `static/favicon.png` exists
  2. Check if `dashboard.py` has Flask configured correctly
  3. Clear browser cache (Ctrl+F5)

### Logo too large/small
- **README**: Adjust the `width` attribute in the `<img>` tag
- **Dashboard**: Adjust `max-width` in the inline style

## 🎯 Current Status

✅ README updated with logo placeholder  
✅ Dashboard HTML updated with logo and favicon references  
⏳ **PENDING**: You need to save the logo files to:
- `assets/logo.png`
- `static/logo.png`
- `static/favicon.png`

## 📝 Quick Checklist

- [ ] Create `assets/` directory
- [ ] Create `static/` directory
- [ ] Save large logo as `assets/logo.png`
- [ ] Save large logo as `static/logo.png`
- [ ] Save small favicon as `static/favicon.png`
- [ ] Test README on GitHub
- [ ] Test dashboard at http://127.0.0.1:5000
- [ ] Commit the logo files

## 🚀 Final Commit

Once you've added the files, commit them:

```bash
git add assets/ static/ README.md templates/index.html
git commit -m "Add project logo and branding assets"
git push
```

---

**Need help?** The logo integration structure is ready. Just add the image files to the directories mentioned above!
