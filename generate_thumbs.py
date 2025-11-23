#!/usr/bin/env python3
"""
Generate thumbnails for images under `image/` and save them to `web/thumbs/<album>/`.

Usage:
  python .\scripts\generate_thumbs.py

Notes:
  - Requires Pillow: `pip install Pillow`
  - Thumbnails skip if up-to-date.
"""
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / 'image'
WEB_DIR = ROOT / 'web'
THUMBS_DIR = WEB_DIR / 'thumbs'

# If root/image doesn't exist, fall back to web/image (project uses web/image)
if not IMAGE_DIR.exists():
    alt = WEB_DIR / 'image'
    if alt.exists():
        IMAGE_DIR = alt
        print('Using image directory at', IMAGE_DIR)
    else:
        print('No image/ directory found at', IMAGE_DIR, 'or', alt)
        # Let caller handle absence by returning early
        # We won't raise here to keep behavior gentle

MAX_SIZE = (320, 320)
ALLOWED = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}


def ensure_pillow():
    try:
        from PIL import Image
        return Image
    except Exception as e:
        print('Pillow is not installed. Install with: pip install Pillow')
        raise


def make_thumb(image_path: Path, out_path: Path, Image):
    out_path.parent.mkdir(parents=True, exist_ok=True)
    # Skip if out exists and newer than source
    if out_path.exists() and out_path.stat().st_mtime >= image_path.stat().st_mtime:
        return False
    try:
        with Image.open(image_path) as im:
            im.thumbnail(MAX_SIZE)
            # convert mode if needed
            if im.mode in ('RGBA', 'LA'):
                # preserve transparency for PNG/WebP
                if out_path.suffix.lower() in ('.png', '.webp'):
                    im.save(out_path)
                else:
                    bg = Image.new('RGB', im.size, (255,255,255))
                    bg.paste(im, mask=im.split()[3])
                    bg.save(out_path, quality=85)
            else:
                # for JPEG output, convert to RGB
                if out_path.suffix.lower() in ('.jpg', '.jpeg') and im.mode != 'RGB':
                    im = im.convert('RGB')
                im.save(out_path, quality=85)
        return True
    except Exception as e:
        print('Failed to process', image_path, e)
        return False


def main():
    Image = ensure_pillow()
    if not IMAGE_DIR.exists():
        print('No image/ directory found at', IMAGE_DIR)
        return
    for album in sorted([p for p in IMAGE_DIR.iterdir() if p.is_dir()], key=lambda x: x.name.lower()):
        for img in sorted(album.iterdir()):
            if img.suffix.lower() not in ALLOWED:
                continue
            out = THUMBS_DIR / album.name / img.name
            created = make_thumb(img, out, Image)
            if created:
                print('Created thumb:', out.relative_to(ROOT))

    print('Thumbnails generation complete.')


if __name__ == '__main__':
    main()
