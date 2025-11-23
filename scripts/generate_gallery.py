#!/usr/bin/env python3
"""
Simple gallery generator: scan images under `image/` or `web/image`, write `web/xiangce1.htm`, `web/xiangce2.htm`, ... and update `web/xiangce.htm` overview.
- Uses `web/thumbs/<album>/` thumbnails when present.
- Backs up existing xiangceN.htm files before overwrite.
"""
from pathlib import Path
import datetime
import sys

ROOT = Path(__file__).resolve().parents[1]
WEB = ROOT / 'web'
IMAGE = ROOT / 'image'
if not IMAGE.exists():
    alt = WEB / 'image'
    if alt.exists():
        IMAGE = alt
        print('Using image directory at', IMAGE)
    else:
        print('No image directory found at', IMAGE, 'or', alt)
        sys.exit(1)

THUMBS = WEB / 'thumbs'
ALLOWED = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

# read album folders
albums = [p for p in sorted(IMAGE.iterdir()) if p.is_dir()]
if not albums:
    print('No album folders found under', IMAGE)
    sys.exit(0)

# helper: backup file if exists

def backup(path: Path):
    if path.exists():
        ts = datetime.datetime.now().strftime('%Y%m%d%H%M%S')
        bak = path.with_suffix(path.suffix + '.' + ts + '.bak')
        path.replace(bak)
        print(f'Backed up {path.name} -> {bak.name}')

# generate per-album pages
for idx, alb in enumerate(albums, start=1):
    out = WEB / f'xiangce{idx}.htm'
    # build gallery HTML
    imgs = [p for p in sorted(alb.iterdir()) if p.suffix.lower() in ALLOWED]
    lines = []
    lines.append('<!doctype html>')
    lines.append('<html lang="zh-CN">')
    lines.append('<head>')
    lines.append('  <meta charset="utf-8">')
    lines.append('  <meta name="viewport" content="width=device-width,initial-scale=1">')
    lines.append(f'  <title>zjm的空间 - {alb.name}</title>')
    lines.append('  <link rel="stylesheet" href="./css/style.css">')
    lines.append('</head>')
    lines.append('<body>')
    lines.append('  <header>')
    lines.append('    <h1 style="margin:0">zjm的空间</h1>')
    lines.append('    <nav>')
    lines.append('      <a href="./index.htm">首页</a>')
    lines.append('      <a href="./gerenjianjie.htm">个人简介</a>')
    lines.append('      <a href="./xiangce.htm">相册</a>')
    lines.append('      <a href="./shipin.htm">视频</a>')
    lines.append('      <a href="./zuopin.htm">作品</a>')
    lines.append('      <a href="./jianyixiang.htm">建议箱</a>')
    lines.append('    </nav>')
    lines.append('  </header>')
    lines.append('\n  <div class="site">')
    lines.append('    <main class="card">')
    lines.append(f'      <h2 style="color:#fff;margin-top:0">{alb.name}</h2>')
    lines.append('\n      <div class="gallery-grid">')

    for img in imgs:
        rel_thumb = THUMBS / alb.name / img.name
        if rel_thumb.exists():
            thumb_path = f'./thumbs/{alb.name}/{img.name}'
        else:
            # use image file relative to web (images may be in web/image)
            # compute path from web directory
            try:
                thumb_path = str(img.relative_to(WEB))
            except Exception:
                thumb_path = f'../{img.relative_to(ROOT)}'
        # big image href
        try:
            big_href = str(img.relative_to(WEB))
        except Exception:
            big_href = f'../{img.relative_to(ROOT)}'
        lines.append(f'          <a href="{big_href}"><img src="{thumb_path}" alt="" loading="lazy"></a>')

    lines.append('      </div>')
    lines.append('\n      <div style="margin-top:12px"><a href="./xiangce.htm">返回相册总览</a></div>')
    lines.append('    </main>')
    lines.append('  </div>')
    lines.append('\n  <div id="lightbox" class="lightbox" aria-hidden="true">')
    lines.append('    <div class="inner">')
    lines.append('      <img src="" alt="">')
    lines.append('      <div class="nav">')
    lines.append('        <button id="lb-prev">◀</button>')
    lines.append('        <button id="lb-next">▶</button>')
    lines.append('      </div>')
    lines.append('      <button id="lb-close" class="close">关闭</button>')
    lines.append('    </div>')
    lines.append('  </div>')
    lines.append('\n  <script src="./js/gallery.js"></script>')
    lines.append('</body>')
    lines.append('</html>')

    # backup and write
    if out.exists():
        backup(out)
    out.write_text('\n'.join(lines), encoding='utf-8')
    print('Wrote', out.relative_to(WEB))

# update overview page (simple)
overview = WEB / 'xiangce.htm'
lines = []
lines.append('<!doctype html>')
lines.append('<html lang="zh-CN">')
lines.append('<head>')
lines.append('  <meta charset="utf-8">')
lines.append('  <title>zjm的空间 - 相册</title>')
lines.append('  <link rel="stylesheet" href="./css/style.css">')
lines.append('</head>')
lines.append('<body>')
lines.append('  <header>')
lines.append('    <h1 style="margin:0">zjm的空间</h1>')
lines.append('    <nav>')
lines.append('      <a href="./index.htm">首页</a>')
lines.append('      <a href="./gerenjianjie.htm">个人简介</a>')
lines.append('      <a href="./xiangce.htm">相册</a>')
lines.append('      <a href="./shipin.htm">视频</a>')
lines.append('      <a href="./zuopin.htm">作品</a>')
lines.append('      <a href="./jianyixiang.htm">建议箱</a>')
lines.append('    </nav>')
lines.append('  </header>')
lines.append('\n  <div class="site">')
lines.append('    <main class="card">')
lines.append('      <h2 style="color:#fff;margin-top:0">相册总览</h2>')

for idx, alb in enumerate(albums, start=1):
    # choose cover: first thumb if exists else first image
    imgs = [p for p in sorted(alb.iterdir()) if p.suffix.lower() in ALLOWED]
    cover = None
    if imgs:
        first = imgs[0]
        t = THUMBS / alb.name / first.name
        if t.exists():
            cover = f'./thumbs/{alb.name}/{first.name}'
        else:
            try:
                cover = str(first.relative_to(WEB))
            except Exception:
                cover = f'../{first.relative_to(ROOT)}'
    lines.append('        <section class="album">')
    lines.append(f'          <div class="info"><h3 style="color:#fff;margin:0">{alb.name}</h3></div>')
    if cover:
        lines.append(f'          <a href="./xiangce{idx}.htm"><img src="{cover}" alt="{alb.name}"></a>')
    else:
        lines.append(f'          <a href="./xiangce{idx}.htm"><img src="./qiang.jpg" alt="{alb.name}"></a>')
    lines.append('        </section>')
    lines.append('')

lines.append('      </main>')
lines.append('  </div>')
lines.append('</body>')
lines.append('</html>')

# backup overview
if overview.exists():
    backup(overview)
overview.write_text('\n'.join(lines), encoding='utf-8')
print('Updated', overview.relative_to(WEB))
