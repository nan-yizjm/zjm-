#!/usr/bin/env python3
"""
Generate gallery pages from folders in `image/` and update `web/xiangce.htm` overview.
Run from repository root (where `web/` and `image/` live):

    python .\scripts\generate_gallery.py

The script creates `web/xiangce_auto_<n>_<slug>.htm` for each folder and writes a new `web/xiangce.htm` overview that links to them.
"""
import os
from pathlib import Path
import re
import shutil
from datetime import datetime

ROOT = Path(__file__).resolve().parents[1]
IMAGE_DIR = ROOT / 'image'
WEB_DIR = ROOT / 'web'
CSS_PATH = './css/style.css'
JS_PATH = './js/gallery.js'

ALLOWED = {'.jpg', '.jpeg', '.png', '.gif', '.webp', '.bmp'}

def slugify(name):
    s = re.sub(r'\s+', '_', name)
    s = re.sub(r'[^0-9A-Za-z_\-]', '_', s)
    return s

TPL_PAGE = '''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>zjm的空间 - {title}</title>
  <link rel="stylesheet" href="{css}">
</head>
<body>
  <header>
    <h1 style="margin:0">zjm的空间</h1>
    <nav>
      <a href="./index.htm">首页</a>
      <a href="./gerenjianjie.htm">个人简介</a>
      <a href="./xiangce.htm">相册</a>
      <a href="./shipin.htm">视频</a>
      <a href="./zuopin.htm">作品</a>
      <a href="./jianyixiang.htm">建议箱</a>
    </nav>
  </header>

  <div class="site">
    <main class="card">
      <h2 style="color:#fff;margin-top:0">{title}</h2>

      <div class="gallery-grid">
{items}
      </div>

      <div style="margin-top:12px"><a href="./xiangce.htm">返回相册总览</a></div>
    </main>
  </div>

  <div id="lightbox" class="lightbox" aria-hidden="true">
    <div class="inner">
      <img src="" alt="">
      <div class="nav">
        <button id="lb-prev">◀</button>
        <button id="lb-next">▶</button>
      </div>
      <button id="lb-close" class="close">关闭</button>
    </div>
  </div>

  <script src="{js}"></script>
</body>
</html>
'''

TPL_OVERVIEW = '''<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>zjm的空间 - 相册</title>
  <link rel="stylesheet" href="{css}">
</head>
<body>
  <header>
    <h1 style="margin:0">zjm的空间</h1>
    <nav>
      <a href="./index.htm">首页</a>
      <a href="./gerenjianjie.htm">个人简介</a>
      <a href="./xiangce.htm">相册</a>
      <a href="./shipin.htm">视频</a>
      <a href="./zuopin.htm">作品</a>
      <a href="./jianyixiang.htm">建议箱</a>
    </nav>
  </header>

  <div class="site">
    <main class="card">
      <h2 style="color:#fff;margin-top:0">相册总览</h2>
{albums}
    </main>
  </div>
</body>
</html>
'''


def make_item(img_rel, folder, name):
  # img_rel is a relative path from the page to the full image (e.g. ../image/高中/xxx.jpg)
  # if thumbnail exists at web/thumbs/<folder>/<name>, use it as src
  thumb_path = WEB_DIR / 'thumbs' / folder / name
  if thumb_path.exists():
    thumb_rel = f'./thumbs/{folder}/{name}'
  else:
    thumb_rel = img_rel
  return f'          <a href="{img_rel}"><img src="{thumb_rel}" alt="" loading="lazy"></a>'


def generate():
    if not IMAGE_DIR.exists():
        print('No image/ directory found at', IMAGE_DIR)
        return
    albums = []
    for p in sorted(IMAGE_DIR.iterdir(), key=lambda x: x.name.lower()):
        if not p.is_dir():
            continue
        images = [f for f in sorted(p.iterdir()) if f.suffix.lower() in ALLOWED]
        if not images:
            print('Skipping empty folder:', p.name)
            continue
        albums.append((p.name, images))

    if not WEB_DIR.exists():
        print('Creating web/ directory')
        WEB_DIR.mkdir(parents=True, exist_ok=True)

    generated_pages = []
    for i, (folder_name, images) in enumerate(albums, start=1):
      # generate fixed numeric filenames xiangce1.htm, xiangce2.htm ...
      out_name = f'xiangce{i}.htm'
      out_path = WEB_DIR / out_name
      # backup existing file if present
      if out_path.exists():
        ts = datetime.now().strftime('%Y%m%d%H%M%S')
        backup = WEB_DIR / f"{out_path.name}.{ts}.bak"
        shutil.copy2(out_path, backup)
        print('Backed up', out_path.name, '->', backup.name)
        items = []
        for img in images:
          rel = f'../image/{folder_name}/{img.name}'
          items.append(make_item(rel, folder_name, img.name))
        page_html = TPL_PAGE.format(title=folder_name, items="\n".join(items), css=CSS_PATH, js=JS_PATH)
        out_path.write_text(page_html, encoding='utf-8')
        print('Wrote', out_path.name)
        generated_pages.append((folder_name, out_name, images[0]))

    # generate overview xiangce.htm
    album_blocks = []
    for folder_name, page_fname, cover in generated_pages:
        cover_rel = f'../image/{folder_name}/{cover.name}'
        block = f'      <section class="album">\n        <div class="info"><h3 style="color:#fff;margin:0">{folder_name}</h3></div>\n        <a href="./{page_fname}"><img src="{cover_rel}" alt="{folder_name}"></a>\n      </section>\n'
        album_blocks.append(block)
    overview_html = TPL_OVERVIEW.format(css=CSS_PATH, albums=''.join(album_blocks))
    overview_path = WEB_DIR / 'xiangce.htm'
    overview_path.write_text(overview_html, encoding='utf-8')
    print('Updated', overview_path.name)


if __name__ == '__main__':
    generate()
