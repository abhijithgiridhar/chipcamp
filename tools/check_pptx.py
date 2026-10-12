#!/usr/bin/env python3
"""Rough check of the PowerPoint files made by make_pptx.py. It wraps every text box with Arial metrics (wider than the
fonts the files ask for, so a fit here is a fit in PowerPoint), reports text that overflows its box, and can draw each
slide as a PNG for a quick look.   python3 tools/check_pptx.py [--png OUTDIR] file.pptx ..."""
import io, os, sys
from pptx import Presentation
from pptx.util import Emu
from PIL import Image, ImageDraw, ImageFont

SCALE = 90   # pixels per inch
FONTS = {'regular': '/System/Library/Fonts/Supplemental/Arial.ttf', 'bold': '/System/Library/Fonts/Supplemental/Arial Bold.ttf', 'mono': '/System/Library/Fonts/Supplemental/Courier New.ttf'}
_cache = {}


def font(name, size, bold):
    key = (bool(name and 'Courier' in name), size, bool(bold))
    if key not in _cache:
        path = FONTS['mono'] if key[0] else FONTS['bold' if bold else 'regular']
        _cache[key] = ImageFont.truetype(path, max(6, int(size * SCALE / 72)))
    return _cache[key]


def has_emoji(s):
    return any(ord(c) > 0x2000 for c in s)


def check(path, outdir=None):
    prs = Presentation(path)
    problems = []
    for n, slide in enumerate(prs.slides, 1):
        bg = slide.background.fill.fore_color.rgb
        img = Image.new('RGB', (int(13.333 * SCALE), int(7.5 * SCALE)), (bg[0], bg[1], bg[2]))
        d = ImageDraw.Draw(img)
        for sh in slide.shapes:
            x, y, w, h = [Emu(v).inches * SCALE for v in (sh.left, sh.top, sh.width, sh.height)]
            if sh.shape_type == 13:
                im = Image.open(io.BytesIO(sh.image.blob)).convert('RGBA').resize((max(1, int(w)), max(1, int(h))))
                img.paste(im, (int(x), int(y)), im)
                continue
            if sh.shape_type == 9:
                d.line([x, y, x + w, y + h], fill=(180, 180, 210), width=3)
                continue
            if sh.shape_type == 1:
                try:
                    f = sh.fill.fore_color.rgb
                    ln = sh.line.color.rgb if sh.line.fill.type == 1 else None
                    kw = dict(fill=(f[0], f[1], f[2]), outline=(ln[0], ln[1], ln[2]) if ln else None, width=3)
                    if sh.name.startswith('Oval'):
                        d.ellipse([x, y, x + w, y + h], **kw)
                    else:
                        d.rounded_rectangle([x, y, x + w, y + h], radius=22, **kw)
                except Exception:
                    pass
                continue
            if not sh.has_text_frame:
                continue
            lines_out, total = [], 0
            for par in sh.text_frame.paragraphs:
                runs = [(r.text, r.font.size.pt, r.font.bold, r.font.name, r.font.color.rgb) for r in par.runs]
                if not runs:
                    continue
                words = [(wd, sz, b, nm, col) for t, sz, b, nm, col in runs for wd in t.replace('\n', ' ').split(' ') if wd]
                line, lw, rows = [], 0, []
                for wd in words:
                    wl = (font(wd[3], wd[1], wd[2]).getlength(wd[0] + ' ') if not has_emoji(wd[0]) else wd[1] * SCALE / 72)
                    if lw + wl > w and line:
                        rows.append(line); line, lw = [], 0
                    line.append((wd, wl)); lw += wl
                if line:
                    rows.append(line)
                size = max(r[1] for r in runs)
                for rw in rows:
                    lines_out.append((rw, size)); total += size * 1.2 * SCALE / 72
            if total > h + 4:
                problems.append('slide %d: text overflows its box by %.2f in: %r' % (n, (total - h) / SCALE, sh.text_frame.text[:50]))
            anchor = sh.text_frame.vertical_anchor
            cy = y + (h - total) / 2 if anchor == 3 else (y + h - total if anchor == 4 else y)
            centred = sh.text_frame.paragraphs[0].alignment == 2
            for rw, size in lines_out:
                lw = sum(wl for _, wl in rw)
                cx = x + (w - lw) / 2 if centred else x
                for wd, wl in rw:
                    t = wd[0]
                    if has_emoji(t):
                        d.rectangle([cx, cy + 4, cx + wd[1] * SCALE / 72 * 0.8, cy + 4 + wd[1] * SCALE / 72 * 0.8], outline=(170, 170, 170))
                    else:
                        d.text((cx, cy), t, font=font(wd[3], wd[1], wd[2]), fill=(wd[4][0], wd[4][1], wd[4][2]))
                    cx += wl
                cy += size * 1.2 * SCALE / 72
        if outdir:
            os.makedirs(outdir, exist_ok=True)
            img.save(os.path.join(outdir, '%s_%02d.png' % (os.path.basename(path)[:-5], n)))
    return problems


if __name__ == '__main__':
    args = sys.argv[1:]
    out = None
    if args and args[0] == '--png':
        out, args = args[1], args[2:]
    bad = 0
    for p in args:
        for msg in check(p, out):
            bad += 1
            print(os.path.basename(p), msg)
    print('no overflow found' if not bad else '%d problem(s)' % bad)
    sys.exit(1 if bad else 0)
