#!/usr/bin/env python3
"""Renders the slide characters (src/art.js) to transparent PNGs for the PowerPoint files, using headless Chrome.
Run from the camp-blocks folder:  python3 tools/render_art.py"""
import os, subprocess, tempfile

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'session-plan', 'pptx', 'art')
CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
KEYS = ['chipbot', 'peeko', 'jarvis', 'bug', 'dad', 'chip', 'sandwich', 'brain', 'camera', 'plant', 'spark', 'party', 'kid']
SIZES = {'kids': (1160, 480), 'splash': (1280, 720)}


def render(key, w, h, tmp):
    art = open(os.path.join(ROOT, 'src', 'art.js')).read()
    call = 'CampArt.splash()' if key == 'splash' else 'CampArt.raw(%r)' % key
    html = ('<!doctype html><meta charset=utf-8><style>html,body{margin:0;background:transparent}svg{width:%dpx;height:%dpx;display:block}'
            '.splash{width:%dpx}.splash svg{width:100%%;height:auto}</style><body></body><script>%s</script>'
            '<script>document.body.innerHTML=%s;</script>') % (w, h, w, art, call)
    src = os.path.join(tmp, key + '.html')
    open(src, 'w').write(html)
    out = os.path.join(OUT, key + '.png')
    subprocess.run([CHROME, '--headless=new', '--disable-gpu', '--hide-scrollbars', '--default-background-color=00000000',
                    '--window-size=%d,%d' % (w, h), '--screenshot=' + out, 'file://' + src], capture_output=True, timeout=90)
    return out


def main():
    os.makedirs(OUT, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        for k in KEYS:
            print(render(k, 600, 600, tmp))
        for k, (w, h) in SIZES.items():
            print(render(k, w, h, tmp))


if __name__ == '__main__':
    main()
