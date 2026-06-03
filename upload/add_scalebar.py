#!/usr/bin/env python3
"""
Add scale bars to TEM TIFF images.

Reads TIFF files named like {magnification}_{index}.tiff (e.g. 53kx_1.tiff),
adds a scale bar with label, and saves as JPG.

Usage:
    # Process current directory:
    add_scalebar.py

    # Process a specific directory:
    add_scalebar.py /path/to/tiffs/

    # Custom pixel size and bar length:
    add_scalebar.py --pixel 0.48 --bar 200 --label "200 nm" /path/to/tiffs/

Configuration is embedded in the script's CONFIG dict. Edit it to match your
microscope/collection settings.
"""

import os
import sys
import argparse
from PIL import Image, ImageDraw, ImageFont

# ============================================================
# CONFIG — edit this section for your microscope settings
# ============================================================
# Key = magnification prefix (must match start of filename)
# pixel_nm = pixel size at the output image resolution (nm/pixel)
# bar_nm   = desired scale bar length in nm
# label    = text to display on the scale bar
CONFIG = {
    "53kx":  {"pixel_nm": 0.48, "bar_nm": 200, "label": "200 nm"},
    "81kx":  {"pixel_nm": 0.31, "bar_nm": 100, "label": "100 nm"},
    "105kx": {"pixel_nm": 0.24, "bar_nm": 100, "label": "100 nm"},
}

# Visual settings
BAR_HEIGHT = 24             # bar thickness in pixels
BAR_MARGIN = 40             # distance from left/bottom edge
FONT_SIZE = 48              # label font size
FONT_STROKE = 3             # text outline width
OUTPUT_QUALITY = 95         # JPEG quality (1-100)
OUTPUT_DIR = "jpg_output"   # subdirectory for output files

# Font search paths (order of preference)
FONT_PATHS = [
    "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
    "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf",
    "/usr/share/fonts/truetype/freefont/FreeSansBold.ttf",
]
# ============================================================


def find_font(size=FONT_SIZE):
    """Find a TrueType font, falling back to default."""
    for fp in FONT_PATHS:
        if os.path.exists(fp):
            return ImageFont.truetype(fp, size)
    print("Warning: no TrueType font found, using default", file=sys.stderr)
    return ImageFont.load_default()


def add_scalebar(img, pixel_nm, bar_nm, label, font):
    """Draw a white scale bar with black outline and text label above it."""
    w, h = img.size
    bar_px = int(bar_nm / pixel_nm)

    # Bar position (bottom-left)
    x0 = BAR_MARGIN
    x1 = x0 + bar_px
    y0 = h - BAR_MARGIN - BAR_HEIGHT
    y1 = y0 + BAR_HEIGHT

    draw = ImageDraw.Draw(img)

    # Text above the bar (centered)
    tx = x0 + bar_px // 2
    draw.text(
        (tx, y0 - 8), label,
        fill="white", font=font,
        anchor="mb",                      # middle-bottom anchor
        stroke_width=FONT_STROKE,
        stroke_fill="black",
    )

    # Black outline
    draw.rectangle([x0 - 2, y0 - 2, x1 + 2, y1 + 2], fill="black")
    # White bar
    draw.rectangle([x0, y0, x1, y1], fill="white")


def process_directory(input_dir, custom_pixel=None, custom_bar=None, custom_label=None):
    """Process all TIFFs in a directory, matching magnification prefixes."""
    input_dir = os.path.abspath(input_dir)
    outdir = os.path.join(input_dir, OUTPUT_DIR)
    os.makedirs(outdir, exist_ok=True)

    font = find_font()

    tiffs = sorted(
        f for f in os.listdir(input_dir)
        if f.lower().endswith(('.tiff', '.tif'))
    )

    if not tiffs:
        print(f"No TIFF files found in {input_dir}")
        return

    processed = 0
    for fname in tiffs:
        path = os.path.join(input_dir, fname)

        # Match magnification from filename
        cfg = None
        for mag_prefix, mag_cfg in CONFIG.items():
            if fname.startswith(mag_prefix):
                cfg = mag_cfg
                break

        if cfg is None and custom_pixel is not None:
            # Use custom parameters for all files
            cfg = {
                "pixel_nm": custom_pixel,
                "bar_nm": custom_bar or 100,
                "label": custom_label or f"{custom_bar or 100} nm",
            }

        if cfg is None:
            print(f"  Skipping {fname} — unknown magnification (no prefix match)")
            continue

        bar_px = int(cfg["bar_nm"] / cfg["pixel_nm"])

        try:
            img = Image.open(path).convert("RGB")
        except Exception as e:
            print(f"  Error opening {fname}: {e}")
            continue

        add_scalebar(img, cfg["pixel_nm"], cfg["bar_nm"], cfg["label"], font)

        outname = os.path.splitext(fname)[0] + ".jpg"
        outpath = os.path.join(outdir, outname)
        img.save(outpath, quality=OUTPUT_QUALITY)
        processed += 1
        print(f"  {fname} → {outname}  (bar={bar_px}px, {cfg['label']})")

    print(f"\nDone: {processed} images → {outdir}")
    return outdir


def main():
    parser = argparse.ArgumentParser(
        description="Add scale bars to TEM TIFF images",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s                             # process current directory
  %(prog)s /path/to/tiffs/             # process specific directory
  %(prog)s --pixel 0.5 --bar 100 /path/  # custom pixel size & bar
        """,
    )
    parser.add_argument(
        "directory", nargs="?", default=".",
        help="Directory containing TIFF files (default: current directory)",
    )
    parser.add_argument(
        "--pixel", type=float,
        help="Override pixel size in nm/pixel for all files",
    )
    parser.add_argument(
        "--bar", type=float,
        help="Override scale bar length in nm (default: 100)",
    )
    parser.add_argument(
        "--label", type=str,
        help="Override scale bar label text",
    )
    args = parser.parse_args()

    process_directory(
        args.directory,
        custom_pixel=args.pixel,
        custom_bar=args.bar,
        custom_label=args.label,
    )


if __name__ == "__main__":
    main()
