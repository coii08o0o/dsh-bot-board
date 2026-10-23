#!/usr/bin/env python3
"""Regenerate docs/social-preview.png — the GitHub social preview image.

What it is: a 1280x640 card. The real panel sits on the right, screenshotted
from the project's own preview export (not a mockup, not a redraw); the left
carries the six lamps, the name, and a three-line tagline whose keywords use
their own state colours, mirroring the panel's three bands.

One command, after the preview HTML exists:

  npm run preview                                          # docs/preview-<version>.html
  python3 tools/social-preview.py docs/preview-0.7.3.html docs/social-preview.png

What it does by itself: launches headless Chrome (the page is file://, so no
server is needed), asks the page over the DevTools protocol for the bounding
box of the first preview panel, screenshots the page at 2x, crops the panel,
and composites the card. Coordinates come from the browser's layout engine,
so a longer intro paragraph above the panel cannot break the crop.

Requirements: Python 3 with pillow, plus node on PATH (the repo already needs
node >= 20; it is used only to speak the DevTools WebSocket). Chrome is
expected at the macOS path below — adjust CHROME elsewhere.
"""
import json
import os
import shutil
import socket
import subprocess
import sys
import tempfile
import time
import urllib.request

from PIL import Image, ImageDraw, ImageFont, ImageFilter

W, H = 1280, 640
BG = (246, 237, 220)            # warm cream; the panel is a light island on it
INK = (44, 44, 42)              # #2C2C2A
GREY = (107, 101, 88)           # #6B6558
OVER = (138, 129, 114)          # #8A8172

# The six states, lamp colours from src/client/const.js
LAMPS = [
    ((0x00, 0xC9, 0x72), 'circle'),   # working
    ((0xFF, 0xAF, 0x38), 'square'),   # needs you
    ((0x2A, 0x92, 0xFE), 'circle'),   # waiting on a bot
    ((0xFF, 0x3E, 0x51), 'diamond'),  # stuck
    ((0x95, 0x95, 0x95), 'circle'),   # idle
    ((0x0F, 0x76, 0x6E), 'circle'),   # just finished
]
# deepened variants, for text legibility on cream
C_GREEN, C_RED, C_AMBER = (14, 138, 95), (217, 54, 74), (180, 83, 9)

F_TITLE = '/System/Library/Fonts/Supplemental/Arial Rounded Bold.ttf'
F_BODY = '/System/Library/Fonts/HelveticaNeue.ttc'
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

# Asks the page (over CDP, through node's global WebSocket) for the first
# preview panel's box. CSS pixels, relative to the viewport. {port} is filled
# in by panel_rect() — the port is picked per run, so a leftover headless
# Chrome from an earlier run cannot squat on a fixed one.
CDP_QUERY = """
const list = await (await fetch('http://127.0.0.1:{port}/json/list')).json()
const page = list.find(t => t.type === 'page')
if (!page) {{ console.error('no page target'); process.exit(1) }}
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise(r => {{ ws.onopen = r }})
const reply = await new Promise(res => {{
  ws.onmessage = ev => {{ const m = JSON.parse(ev.data); if (m.id === 1) res(m) }}
  ws.send(JSON.stringify({{ id: 1, method: 'Runtime.evaluate', params: {{
    expression: "JSON.stringify(document.querySelector('.pv-fig .bb-panel').getBoundingClientRect())",
    returnByValue: true,
  }}}}))
}})
console.log(reply.result.result.value)
ws.close()
"""


def free_port():
    s = socket.socket()
    s.bind(('127.0.0.1', 0))
    port = s.getsockname()[1]
    s.close()
    return port


def panel_rect(page_url):
    """Launch Chrome on the page, return the first panel's (x, y, w, h) in CSS px.

    A private --user-data-dir is not optional: with the default profile a
    second Chrome (headless or not) defers to whichever instance owns the
    profile and exits without opening the debugging port.
    """
    port = free_port()
    profile = tempfile.mkdtemp(prefix='social-preview-')
    proc = subprocess.Popen(
        [CHROME, '--headless', '--disable-gpu', '--no-sandbox',
         f'--user-data-dir={profile}', f'--remote-debugging-port={port}',
         '--window-size=1400,1000', page_url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    try:
        query = CDP_QUERY.format(port=port)
        for _ in range(20):
            time.sleep(0.5)
            try:
                r = subprocess.run(['node', '--input-type=module', '-e', query],
                                   capture_output=True, text=True, timeout=15)
                if r.returncode == 0 and r.stdout.strip():
                    box = json.loads(r.stdout.strip())
                    if box:
                        return box['x'], box['y'], box['width'], box['height']
            except (subprocess.TimeoutExpired, json.JSONDecodeError,
                    TypeError, KeyError):
                continue
        sys.exit('could not read the panel box from the page — is Chrome at ' + CHROME + '?')
    finally:
        proc.kill()
        shutil.rmtree(profile, ignore_errors=True)


def screenshot(page_url, out_path):
    subprocess.run(
        [CHROME, '--headless', '--disable-gpu', '--no-sandbox', '--hide-scrollbars',
         f'--user-data-dir={tempfile.mkdtemp(prefix="social-preview-shot-")}',
         '--force-device-scale-factor=2', '--window-size=1400,1000',
         f'--screenshot={out_path}', page_url],
        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, check=True)


def font(path, size, index=0):
    return ImageFont.truetype(path, size, index=index)


def darken(rgb, f=0.72):
    return tuple(int(c * f) for c in rgb)


def draw_lamp(d, cx, cy, color, shape, r=8):
    out = darken(color)
    if shape == 'circle':
        d.ellipse([cx - r, cy - r, cx + r, cy + r], fill=color, outline=out, width=2)
    elif shape == 'square':
        d.rounded_rectangle([cx - r, cy - r, cx + r, cy + r], radius=3,
                            fill=color, outline=out, width=2)
    elif shape == 'diamond':
        d.polygon([(cx, cy - r - 1), (cx + r + 1, cy), (cx, cy + r + 1), (cx - r - 1, cy)],
                  fill=color, outline=out)


def rounded(img, radius):
    m = Image.new('L', img.size, 0)
    ImageDraw.Draw(m).rounded_rectangle([0, 0, img.size[0] - 1, img.size[1] - 1],
                                        radius=radius, fill=255)
    out = Image.new('RGBA', img.size, (0, 0, 0, 0))
    out.paste(img, (0, 0), m)
    return out


def text_block(canvas):
    d = ImageDraw.Draw(canvas)
    x = 72
    for i, (color, shape) in enumerate(LAMPS):
        draw_lamp(d, x + 8 + i * 30, 108, color, shape)
    f_over = font(F_BODY, 14, index=1)
    cx = x
    for ch in 'A DEEPSEEK HARNESS PLUGIN':
        d.text((cx, 148), ch, font=f_over, fill=OVER)
        cx += d.textlength(ch, font=f_over) + 2.6
    d.text((x - 2, 178), 'dsh-bot-board', font=font(F_TITLE, 64), fill=INK)
    f_tag = font(F_BODY, 24)
    y = 296
    for head, kw, color in [("Who's ", 'running.', C_GREEN),
                            ("Who's ", 'stuck.', C_RED),
                            ("Who's ", 'needs you.', C_AMBER)]:
        d.text((x, y), head, font=f_tag, fill=INK)
        d.text((x + d.textlength(head, font=f_tag), y), kw, font=f_tag, fill=color)
        y += 38
    f_foot = font(F_BODY, 15)
    d.text((x, 486), 'Reads DS Bot’s state.', font=f_foot, fill=GREY)
    d.text((x, 508), 'Writes nothing back.', font=f_foot, fill=GREY)


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    page_path, out_path = sys.argv[1], sys.argv[2]
    url = 'file://' + os.path.abspath(page_path)

    x, y, w, h = panel_rect(url)
    print(f'panel at ({x:g}, {y:g}), {w:g}x{h:g} CSS px')
    shot = '/tmp/social-preview-shot.png'
    screenshot(url, shot)

    canvas = Image.new('RGBA', (W, H), BG + (255,))
    art = rounded(Image.open(shot).convert('RGB').crop(
        (round(x * 2), round(y * 2), round((x + w) * 2), round((y + h) * 2))
    ).resize((700, 600), Image.LANCZOS), 20)
    ax, ay = W - 64 - art.size[0], (H - art.size[1]) // 2
    sh = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    ImageDraw.Draw(sh).rounded_rectangle([ax, ay + 10, ax + art.size[0], ay + 10 + art.size[1]],
                                         radius=20, fill=(60, 50, 35, 70))
    canvas.alpha_composite(sh.filter(ImageFilter.GaussianBlur(16)))
    canvas.alpha_composite(art, (ax, ay))
    text_block(canvas)
    canvas.convert('RGB').save(out_path, optimize=True)
    print(f'wrote {out_path} ({W}x{H})')


if __name__ == '__main__':
    main()
