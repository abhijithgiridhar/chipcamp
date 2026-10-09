#!/usr/bin/env python3
"""Makes one PowerPoint file per deck from session-plan/decks/*.js (the same content as the web slides).
Run from the camp-blocks folder:  python3 tools/make_pptx.py   then   node build.js"""
import json, math, os, re, subprocess
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'session-plan', 'pptx')
W, H = 13.333, 7.5
FONT = 'Calibri'
EMOJI = {'chipbot': '🤖', 'peeko': '👀', 'jarvis': '🌱', 'bug': '🐛', 'dad': '👨', 'chip': '💾', 'sandwich': '🥪', 'plant': '🌱',
         'brain': '🧠', 'camera': '📸', 'spark': '⚡', 'party': '🎉', 'body': '🦴', 'nerve': '⚡'}


def load_decks():
    js = "const o=['kickoff','chipbot','peeko','jarvis'].map(i=>require('./session-plan/decks/'+i+'.js'));process.stdout.write(JSON.stringify(o))"
    return json.loads(subprocess.check_output(['node', '-e', js], cwd=ROOT))


def rgb(hexs):
    hexs = hexs.lstrip('#')
    return RGBColor(int(hexs[0:2], 16), int(hexs[2:4], 16), int(hexs[4:6], 16))


def tint(hexs, t):
    hexs = hexs.lstrip('#')
    c = [int(hexs[i:i + 2], 16) for i in (0, 2, 4)]
    return '%02x%02x%02x' % tuple(round(v + (255 - v) * t) for v in c)


def fit(text, w_in, h_in, start, minimum=14, factor=0.64, line=1.18):
    """Biggest font size (pt) at which the text should fit the box. A rough estimate, kept on the safe side."""
    plain = text.replace('**', '')
    for size in range(start, minimum - 1, -1):
        chars_per_line = max(1, int(w_in * 72 / (size * factor)))
        lines = sum(max(1, math.ceil(len(p) / chars_per_line)) for p in plain.split('\n'))
        if lines * size * line / 72 <= h_in:
            return size
    return minimum


def add_runs(par, text, size, color, bold=False, accent=None, font=FONT):
    parts = re.split(r'(\*\*[^*]+\*\*)', text)
    for p in parts:
        if not p:
            continue
        b = p.startswith('**') and p.endswith('**')
        r = par.add_run()
        r.text = p[2:-2] if b else p
        r.font.size = Pt(size)
        r.font.name = font
        r.font.bold = bold or b
        r.font.color.rgb = rgb(accent if (b and accent) else color)


def text(slide, s, x, y, w, h, size, color='2b2f4a', bold=False, align=PP_ALIGN.LEFT, anchor=MSO_ANCHOR.TOP, accent=None, font=FONT, name=None):
    tb = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    if name:
        tb.name = name
    tf = tb.text_frame
    tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = 0
    tf.vertical_anchor = anchor
    first = True
    for line in s.split('\n'):
        par = tf.paragraphs[0] if first else tf.add_paragraph()
        first = False
        par.alignment = align
        add_runs(par, line, size, color, bold, accent, font)
    return tb


def box(slide, x, y, w, h, fill, line=None, shape=MSO_SHAPE.ROUNDED_RECTANGLE, radius=0.18, line_w=3):
    sh = slide.shapes.add_shape(shape, Inches(x), Inches(y), Inches(w), Inches(h))
    if shape == MSO_SHAPE.ROUNDED_RECTANGLE:
        sh.adjustments[0] = radius
    sh.fill.solid()
    sh.fill.fore_color.rgb = rgb(fill)
    if line:
        sh.line.color.rgb = rgb(line)
        sh.line.width = Pt(line_w)
    else:
        sh.line.fill.background()
    sh.shadow.inherit = False
    return sh


def art(slide, key, cx, cy, d, circle='ffffff'):
    box(slide, cx - d / 2, cy - d / 2, d, d, circle, shape=MSO_SHAPE.OVAL)
    text(slide, EMOJI.get(key, '⭐'), cx - d / 2, cy - d / 2, d, d, int(d * 46), align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE, name='Art')


def title_text(slide, s, color, y=0.55, size=40):
    sz = fit(s, W - 1.6, 1.1, size, 28)
    text(slide, s, 0.8, y, W - 1.6, 1.1, sz, color, bold=True, anchor=MSO_ANCHOR.MIDDLE, name='Title')


def build(deck):
    prs = Presentation()
    prs.slide_width, prs.slide_height = Inches(W), Inches(H)
    c, d = deck['color'].lstrip('#'), deck['dark'].lstrip('#')
    for s in deck['slides']:
        sl = prs.slides.add_slide(prs.slide_layouts[6])
        bg = sl.background.fill
        bg.solid()
        t = s['t']
        dark_bg = t in ('title', 'end', 'big')
        bg.fore_color.rgb = rgb(c if t in ('title', 'end') else d if t == 'big' else tint(c, 0.9))

        if t in ('title', 'end'):
            if t == 'title':
                text(sl, s.get('kicker', '').upper(), 0.9, 1.7, 8, 0.5, 20, 'ffffff', bold=True)
            tsz = fit(s['title'], 7.5, 2.4, 60 if t == 'title' else 54, 26)
            text(sl, s['title'], 0.9, 2.15, 7.5, 2.4, tsz, 'ffffff', bold=True, anchor=MSO_ANCHOR.TOP, name='Title')
            per = max(1, int(7.5 * 72 / (tsz * 0.64)))
            used = sum(max(1, math.ceil(len(w) / per)) for w in s['title'].split('\n')) * tsz * 1.2 / 72
            text(sl, s.get('sub', ''), 0.9, 2.15 + used + 0.3, 7.5, 1.3, fit(s.get('sub', ''), 7.5, 1.3, 28, 18), 'ffffff', bold=True)
            art(sl, s.get('art', 'chip'), 10.6, 3.75, 3.7)
        elif t == 'story':
            title_text(sl, s['title'], d)
            body = '\n'.join(s['lines'])
            text(sl, body, 0.9, 1.9, 7.9, 4.6, fit(body, 7.9, 4.6, 32, 20) , '2b2f4a', bold=True, accent=d)
            art(sl, s.get('art', 'chip'), 10.8, 4.0, 3.4, circle=tint(c, 0.7))
        elif t == 'big':
            bsz = fit(s['big'], 8.4, 3.2, 60, 36)
            text(sl, s['big'], 0.9, 1.6, 8.4, 3.2, bsz, 'ffffff', bold=True, anchor=MSO_ANCHOR.BOTTOM, name='Title')
            text(sl, s.get('small', ''), 0.9, 5.0, 8.4, 1.6, fit(s.get('small', ''), 8.4, 1.6, 26, 16), 'ffffff')
            art(sl, s.get('art', 'spark'), 10.9, 3.75, 3.0, circle=tint(c, 0.15))
        elif t == 'list':
            title_text(sl, s['title'], d)
            n = len(s['items'])
            gap, top = 0.22, 1.85
            ih = min(1.2, (H - top - 0.6 - gap * (n - 1)) / n)
            width = 8.6 if n <= 3 else 11.7
            for i, it in enumerate(s['items']):
                y = top + i * (ih + gap)
                box(sl, 0.8, y, width, ih, 'ffffff', line=c)
                lead = it[0]
                circ = box(sl, 1.0, y + (ih - 0.8) / 2, 0.8, 0.8, c, shape=MSO_SHAPE.OVAL)
                text(sl, lead, 1.0, y + (ih - 0.8) / 2, 0.8, 0.8, 26 if len(lead) <= 2 else 11, 'ffffff', bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, it[1], 2.05, y + 0.08, width - 1.5, ih * 0.5, fit(it[1], width - 1.5, ih * 0.5, 24, 15), '2b2f4a', bold=True, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, it[2] or '', 2.05, y + ih * 0.52, width - 1.5, ih * 0.42, fit(it[2] or ' ', width - 1.5, ih * 0.42, 17, 12), '4a5072')
            if n <= 3:
                art(sl, s.get('art', 'spark'), 11.3, 4.2, 2.6, circle=tint(c, 0.7))
        elif t in ('steps', 'activity'):
            title_text(sl, s['title'], d)
            if t == 'activity':
                b = box(sl, 10.6, 0.6, 2.0, 0.8, d)
                text(sl, '⏱ %d min' % s['minutes'], 10.6, 0.6, 2.0, 0.8, 22, 'ffffff', bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
            n = len(s['steps'])
            top, avail = 1.9, H - 1.9 - 0.5
            rh = min(0.95, avail / n)
            width = 8.6 if n <= 5 else 11.6
            for i, st in enumerate(s['steps']):
                y = top + i * rh
                box(sl, 0.9, y + 0.05, 0.62, 0.62, c, shape=MSO_SHAPE.OVAL)
                text(sl, str(i + 1), 0.9, y + 0.05, 0.62, 0.62, 20, 'ffffff', bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, st, 1.75, y, width - 0.9, rh - 0.04, fit(st, width - 0.9, rh - 0.04, 22, 14), '2b2f4a', bold=True, anchor=MSO_ANCHOR.MIDDLE)
            if n <= 5 and t == 'steps':
                art(sl, s.get('art', 'spark'), 11.3, 4.3, 2.4, circle=tint(c, 0.7))
            elif t == 'activity':
                art(sl, s.get('art', 'spark'), 11.4, 4.6, 2.2, circle=tint(c, 0.7))
        elif t == 'parts':
            title_text(sl, s['title'], d)
            cw, ch, gx, gy = 3.8, 2.3, 0.35, 0.3
            for i, p in enumerate(s['parts']):
                x = 0.9 + (i % 3) * (cw + gx)
                y = 1.95 + (i // 3) * (ch + gy)
                box(sl, x, y, cw, ch, 'ffffff', line=c)
                text(sl, p[0], x, y + 0.15, cw, 0.9, 44, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, p[1], x + 0.15, y + 1.05, cw - 0.3, 0.5, fit(p[1], cw - 0.3, 0.5, 22, 15), '2b2f4a', bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, p[2], x + 0.15, y + 1.55, cw - 0.3, 0.65, fit(p[2], cw - 0.3, 0.65, 16, 12), '4a5072', align=PP_ALIGN.CENTER)
        elif t == 'demo':
            title_text(sl, s['title'], d)
            text(sl, s['text'], 0.9, 2.0, 6.2, 2.4, fit(s['text'], 6.2, 2.4, 28, 18), '2b2f4a', bold=True)
            if s.get('link'):
                box(sl, 0.9, 4.6, 5.0, 0.9, c)
                text(sl, s['link']['label'] + ' ↗', 0.9, 4.6, 5.0, 0.9, 22, 'ffffff', bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, 'Open it on the camp website (Facilitators > Presentations has the live version of this slide).', 0.9, 5.7, 6.2, 0.9, 14, '4a5072')
            key = s.get('art') or (deck.get('stage') if s.get('stage') else 'spark')
            art(sl, key, 10.2, 4.2, 4.0, circle=tint(c, 0.7))
        elif t == 'question':
            qsz = fit(s['title'], 8.6, 2.0, 40, 26)
            text(sl, s['title'], 0.9, 0.7, 8.6, 2.0, qsz, d, bold=True, anchor=MSO_ANCHOR.MIDDLE, name='Title')
            for i, o in enumerate(s['options']):
                y = 2.95 + i * 1.3
                box(sl, 0.9, y, 8.6, 1.1, 'ffffff', line=c)
                box(sl, 1.1, y + 0.2, 0.7, 0.7, c, shape=MSO_SHAPE.OVAL)
                text(sl, 'ABCD'[i], 1.1, y + 0.2, 0.7, 0.7, 22, 'ffffff', bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, o, 2.05, y + 0.05, 7.2, 1.0, fit(o, 7.2, 1.0, 24, 15), '2b2f4a', bold=True, anchor=MSO_ANCHOR.MIDDLE)
            art(sl, s.get('art', 'brain'), 11.2, 4.2, 2.6, circle=tint(c, 0.7))
        elif t == 'code':
            title_text(sl, s['title'], d)
            nlines = s['code'].count('\n') + 1
            box(sl, 0.9, 1.95, 11.5, min(4.2, 0.62 * nlines + 0.6), '2b2f4a', radius=0.06)
            text(sl, s['code'], 1.3, 2.2, 10.7, min(3.7, 0.62 * nlines + 0.2), 28, 'e8f6ff', font='Courier New', name='Code')
            text(sl, s.get('text', ''), 0.9, 6.45, 11.5, 0.6, 20, '2b2f4a', bold=True)
        elif t == 'crew':
            title_text(sl, s['title'], d)
            for i, cr in enumerate(s['crew']):
                x = 0.9 + i * 3.95
                box(sl, x, 1.95, 3.6, 4.6, 'ffffff', line=c)
                text(sl, EMOJI.get(cr[0], '⭐'), x, 2.1, 3.6, 1.9, 80, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, cr[1], x + 0.2, 4.15, 3.2, 0.7, 30, '2b2f4a', bold=True, align=PP_ALIGN.CENTER, anchor=MSO_ANCHOR.MIDDLE)
                text(sl, cr[2], x + 0.25, 4.95, 3.1, 1.4, fit(cr[2], 3.1, 1.4, 20, 14), '4a5072', align=PP_ALIGN.CENTER)
        if s.get('notes'):
            sl.notes_slide.notes_text_frame.text = s['notes']
        _ = dark_bg
    return prs


def main():
    os.makedirs(OUT, exist_ok=True)
    for deck in load_decks():
        path = os.path.join(OUT, deck['id'] + '.pptx')
        build(deck).save(path)
        print('wrote', os.path.relpath(path, ROOT), '(%d slides)' % len(deck['slides']))


if __name__ == '__main__':
    main()
