/* Circuit Lab UI */
(function () {
  'use strict';
  const Lab = LabCore, L = Lab.L, PARTS = Lab.PARTS, P = L.bb.pitch;
  const $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const ROBOTS = [['chipbot', '🤖', 'Chip Bot', '#2bb3a3'], ['peeko', '👀', 'Peeko', '#ff6b5e'], ['jarvis', '🌱', 'Jarvis', '#8b7fe8']];
  const EMOJI = { usb: '🔌', servo: '⚙️', buzzer: '🔔', soil: '🌱', hcsr04: '📡', oled: '🖥️', battery: '🔋', ldr: '☀️', resistor: '🟫', rgb: '💡', breadboard: '🟦' };
  const CHIPCOL = { usb: '#e8eefc', servo: '#dbeafe', buzzer: '#fff2c4', soil: '#dcf5e1', hcsr04: '#d9ecff', oled: '#e3e0ff', battery: '#ffe1d6', ldr: '#fff2c4', resistor: '#f3e6d6', rgb: '#ffe1f3', breadboard: '#e6f1ff' };
  const BANDS = { 100: ['#7a4a21', '#111', '#7a4a21'], 220: ['#d6342f', '#d6342f', '#7a4a21'], 1000: ['#7a4a21', '#111', '#d6342f'], 10000: ['#7a4a21', '#111', '#f08a1c'], 100000: ['#7a4a21', '#111', '#f0d21c'] };
  const WIRE_COLORS = ['#3b82f6', '#f59e0b', '#10b981', '#a855f7', '#ec4899', '#14b8a6', '#8b5cf6', '#f97316'];

  const svg = $('#svg');
  const S = { proj: ChipCamp.robotOrDefault(), st: null, sel: null, zoom: 1, undo: [], alive: false, hintT: 0, pulses: [], snap: null, preview: null };
  const KEY = (p) => 'chipcamp.lab.v1.' + p;

  /* ---------- persistence ---------- */
  function sanitize(proj, st) {
    const out = Lab.newState(proj); if (!st || !Array.isArray(st.parts)) return out;
    out.n = Number(st.n) || 0;
    const have = {};
    st.parts.forEach((p) => {
      const inv = Lab.invOf(proj, p.key); if (!inv || inv.type !== p.type) return;
      have[inv.key] = (have[inv.key] || 0) + 1; if (have[inv.key] > inv.qty) return;
      const part = { id: String(p.id), key: p.key, type: p.type, role: inv.role || null, x: +p.x || 0, y: +p.y || 0, plug: null, plugPos: null, seat: null };
      if (p.plug && typeof p.plug.to === 'string') part.plug = { to: p.plug.to, flip: !!p.plug.flip };
      if (p.plugPos) part.plugPos = { x: +p.plugPos.x || 0, y: +p.plugPos.y || 0 };
      if (p.seat && Lab.legsKind(p.type)) part.seat = { bb: String(p.seat.bb), col: +p.seat.col, row: String(p.seat.row) };
      if (p.type === 'resistor') part.ohms = Lab.OHMS.indexOf(p.ohms) >= 0 ? p.ohms : 220;
      out.parts.push(part);
    });
    const ids = new Set(out.parts.map((p) => p.id));
    out.parts.forEach((p) => { if (p.seat && !ids.has(p.seat.bb)) p.seat = null; });
    (st.wires || []).forEach((w) => { if (w && typeof w.a === 'string' && typeof w.b === 'string') out.wires.push({ id: String(w.id), a: w.a, b: w.b }); });
    out.wires = out.wires.filter((w) => Lab.termPos(w.a, out) && Lab.termPos(w.b, out));
    return out;
  }
  function load(proj) { try { return sanitize(proj, JSON.parse(localStorage.getItem(KEY(proj)))); } catch (e) { return Lab.newState(proj); } }
  function save() { try { localStorage.setItem(KEY(S.proj), JSON.stringify(S.st)); } catch (e) { /* ignore */ } }
  S.st = load(S.proj);

  /* ---------- toast / confetti ---------- */
  let toastT = 0;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2300); }
  function confetti(x, y) {
    const em = ['⚡', '✨', '⭐', '🎉', '💜', '🟡', '🟢'];
    for (let i = 0; i < 20; i++) {
      const s = el('span', 'conf', em[i % em.length]); s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--dx', (Math.random() * 320 - 160) + 'px'); s.style.setProperty('--dy', (Math.random() * -260 - 20) + 'px'); s.style.setProperty('--r', (Math.random() * 360 - 180) + 'deg');
      document.body.appendChild(s); setTimeout(() => s.remove(), 1200);
    }
  }

  /* ---------- helpers ---------- */
  const getPart = (id) => S.st.parts.find((p) => p.id === id);
  const bbPart = () => S.st.parts.find((p) => p.type === 'breadboard');
  function toSvg(e) { const pt = svg.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const m = svg.getScreenCTM(); return m ? pt.matrixTransform(m.inverse()) : { x: 0, y: 0 }; }
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const snapshot = () => JSON.stringify(S.st);
  function pushUndo(before) { S.undo.push(before); if (S.undo.length > 60) S.undo.shift(); $('#undoBtn').disabled = false; }
  function plugCenter(p) {
    if (p.plug) { if (p.plug.to === 'USB') return { x: L.usb.x - 20, y: L.usb.y }; return Lab.headerCenter(p.plug.to); }
    return p.plugPos || { x: p.x, y: p.y + 90 };
  }

  /* all terminal positions that a wire can attach to */
  function terminals() {
    const out = [];
    const add = (id) => { const pos = Lab.termPos(id, S.st); if (pos) out.push({ id, pos }); };
    Lab.DIG.forEach((n) => ['S', 'V', 'G'].forEach((t) => add('D' + n + '.' + t)));
    Lab.ANA.forEach((n) => ['S', 'V', 'G'].forEach((t) => add('A' + n + '.' + t)));
    ['GND', 'VCC', 'SDA', 'SCL'].forEach((t) => add('I2C.' + t)); add('EXT.P'); add('EXT.N');
    const bb = bbPart();
    if (bb) {
      for (let c = 1; c <= L.bb.cols; c++) {
        Lab.ROWS.forEach((r) => add(bb.id + '#' + c + r));
        ['T+', 'T-', 'B+', 'B-'].forEach((rl) => add(bb.id + '#' + rl + c));
      }
    }
    S.st.parts.forEach((p) => {
      const def = PARTS[p.type];
      if (def.terms) Object.keys(def.terms).forEach((t) => add(p.id + '.' + t));
      if (def.legs && !p.seat) Object.keys(def.legs).forEach((t) => add(p.id + '.' + t));
    });
    return out;
  }
  function nearestTerm(pt, radius, skipId) {
    let best = null;
    terminals().forEach((t) => { if (t.id === skipId) return; const d = dist(pt, t.pos); if (d <= radius && (!best || d < best.d)) best = { id: t.id, pos: t.pos, d }; });
    return best;
  }
  function nearestHeader(pt, radius) {
    let best = null;
    Lab.DIG.map((n) => 'D' + n).concat(Lab.ANA.map((n) => 'A' + n)).forEach((pin) => {
      const c = Lab.headerCenter(pin), d = dist(pt, c); if (d <= radius && (!best || d < best.d)) best = { pin, c, d };
    });
    return best;
  }

  /* ---------- drawing: the board (drawn once) ---------- */
  const PINCOL = { S: '#ffd93b', V: '#ff4d4d', G: '#2b2f4a' };
  function termCircle(id, pos, fill, r, tip) {
    return '<circle class="term" data-term="' + id + '" cx="' + pos.x + '" cy="' + pos.y + '" r="9" fill="rgba(0,0,0,0)"><title>' + esc(tip || id) + '</title></circle><circle cx="' + pos.x + '" cy="' + pos.y + '" r="' + (r || 4.5) + '" fill="' + fill + '" stroke="#0d0f1a" stroke-width="1.2" style="pointer-events:none"/>';
  }
  function headerStrip(pin, hdr) {
    const x = Lab.boardTermPos(pin + '.S').x;
    let s = '<rect x="' + (x - 11) + '" y="' + (hdr.yS - 12) + '" width="22" height="' + (hdr.yG - hdr.yS + 24) + '" rx="5" fill="#1d1f2b"/>';
    ['S', 'V', 'G'].forEach((t) => { s += termCircle(pin + '.' + t, Lab.boardTermPos(pin + '.' + t), PINCOL[t], 4.5, pin + ' ' + { S: 'signal (S)', V: 'power (V)', G: 'ground (G)' }[t]); });
    return s + '<text x="' + x + '" y="' + hdr.labelY + '" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">' + pin + '</text>';
  }
  function boardSVG() {
    const b = L.board; let s = '';
    s += '<rect x="' + b.x + '" y="' + b.y + '" width="' + b.w + '" height="' + b.h + '" rx="18" fill="#12875a" stroke="#0a5a3b" stroke-width="4"/>';
    [[b.x + 16, b.y + 16], [b.x + b.w - 16, b.y + 16], [b.x + 16, b.y + b.h - 16], [b.x + b.w - 16, b.y + b.h - 16]].forEach((c) => { s += '<circle cx="' + c[0] + '" cy="' + c[1] + '" r="6" fill="#0a5a3b"/><circle cx="' + c[0] + '" cy="' + c[1] + '" r="3" fill="#cfe9dc"/>'; });
    s += '<rect x="250" y="320" width="270" height="116" rx="10" fill="#1f56b5" stroke="#173f86" stroke-width="3"/><rect x="290" y="338" width="60" height="60" rx="6" fill="#252a3d"/><text x="385" y="372" font-size="20" font-weight="900" fill="#fff" text-anchor="middle">Arduino Nano</text><text x="385" y="394" font-size="12" font-weight="800" fill="#bcd4ff" text-anchor="middle">on its IO shield</text><circle cx="480" cy="344" r="5" fill="#59c059"/>';
    Lab.DIG.forEach((n) => { s += headerStrip('D' + n, L.dig); });
    Lab.ANA.forEach((n) => { s += headerStrip('A' + n, L.ana); });
    s += '<text x="' + (L.dig.x0 - 38) + '" y="' + (L.dig.yS + 4) + '" font-size="11" font-weight="900" fill="#ffd93b" text-anchor="middle">S</text><text x="' + (L.dig.x0 - 38) + '" y="' + (L.dig.yV + 4) + '" font-size="11" font-weight="900" fill="#ff8a8a" text-anchor="middle">V</text><text x="' + (L.dig.x0 - 38) + '" y="' + (L.dig.yG + 4) + '" font-size="11" font-weight="900" fill="#cfd6e8" text-anchor="middle">G</text>';
    s += '<text x="' + (L.ana.x0 - 38) + '" y="' + (L.ana.yS + 4) + '" font-size="11" font-weight="900" fill="#ffd93b" text-anchor="middle">S</text><text x="' + (L.ana.x0 - 38) + '" y="' + (L.ana.yV + 4) + '" font-size="11" font-weight="900" fill="#ff8a8a" text-anchor="middle">V</text><text x="' + (L.ana.x0 - 38) + '" y="' + (L.ana.yG + 4) + '" font-size="11" font-weight="900" fill="#cfd6e8" text-anchor="middle">G</text>';
    s += '<text x="' + (b.x + 330) + '" y="' + (b.y + 14) + '" font-size="11" font-weight="800" fill="#bff0d8" text-anchor="middle">S = signal (yellow)   V = power (red)   G = ground (black)</text>';
    // I2C header
    const i0 = L.i2c.x0 - 16; s += '<rect x="' + i0 + '" y="' + (L.i2c.y - 12) + '" width="' + (L.i2c.dx * 3 + 32) + '" height="24" rx="5" fill="#1d1f2b"/><text x="' + (L.i2c.x0 + 45) + '" y="' + (L.i2c.y - 20) + '" text-anchor="middle" font-size="12" font-weight="900" fill="#fff">I2C</text>';
    L.i2c.order.forEach((t, i) => { const id = 'I2C.' + t, pos = Lab.boardTermPos(id); s += termCircle(id, pos, t === 'VCC' ? PINCOL.V : t === 'GND' ? PINCOL.G : PINCOL.S, 4.5, 'I2C ' + t) + '<text x="' + pos.x + '" y="' + (pos.y + 26) + '" text-anchor="middle" font-size="10.5" font-weight="900" fill="#fff">' + t + '</text>'; });
    // external power
    s += '<rect x="' + (L.ext.x - 26) + '" y="' + (L.ext.yP - 18) + '" width="52" height="' + (L.ext.yN - L.ext.yP + 36) + '" rx="6" fill="#2d6bd1" stroke="#1d4a99" stroke-width="2"/><text x="' + L.ext.x + '" y="' + (L.ext.yP - 26) + '" text-anchor="middle" font-size="11" font-weight="900" fill="#fff">EXT POWER</text>';
    s += termCircle('EXT.P', Lab.boardTermPos('EXT.P'), '#ff4d4d', 7, 'External power +') + '<text x="' + (L.ext.x - 18) + '" y="' + (L.ext.yP + 4) + '" font-size="14" font-weight="900" fill="#fff" text-anchor="middle">+</text>';
    s += termCircle('EXT.N', Lab.boardTermPos('EXT.N'), '#2b2f4a', 7, 'External power −') + '<text x="' + (L.ext.x - 18) + '" y="' + (L.ext.yN + 5) + '" font-size="16" font-weight="900" fill="#fff" text-anchor="middle">−</text>';
    // USB
    s += '<rect x="' + (L.usb.x - 6) + '" y="' + (L.usb.y - 18) + '" width="30" height="36" rx="5" fill="#9aa3b5" stroke="#6b7385" stroke-width="2"/><rect x="' + (L.usb.x + 2) + '" y="' + (L.usb.y - 9) + '" width="16" height="18" rx="2" fill="#2b2f4a"/><text x="' + (L.usb.x + 40) + '" y="' + (L.usb.y + 5) + '" font-size="12" font-weight="900" fill="#fff">USB</text>';
    return s;
  }

  /* ---------- drawing: breadboard ---------- */
  function bbSVG(bb) {
    const B = L.bb, x = B.x, y = B.y; let s = '<g data-part="' + bb.id + '" class="part' + (S.sel && S.sel.id === bb.id ? ' sel' : '') + '">';
    const eY = Lab.holeXY(1, 'e').y, fY = Lab.holeXY(1, 'f').y, tp = B.y + B.rails['T+'], tn = B.y + B.rails['T-'], bp = B.y + B.rails['B+'], bn = B.y + B.rails['B-'];
    s += '<rect class="hl" x="' + (x - 6) + '" y="' + (y - 6) + '" width="' + (B.w + 12) + '" height="' + (B.h + 12) + '" rx="14"/>';
    s += '<rect x="' + x + '" y="' + y + '" width="' + B.w + '" height="' + B.h + '" rx="12" fill="#f3efe4" stroke="#c9c2ae" stroke-width="3"/>';
    const rx0 = x + 20, rw = B.w - 40;
    s += '<rect x="' + rx0 + '" y="' + (tp - 11) + '" width="' + rw + '" height="3" fill="#e5484d"/><rect x="' + rx0 + '" y="' + (tn + 8) + '" width="' + rw + '" height="3" fill="#2d6bd1"/>';
    s += '<rect x="' + rx0 + '" y="' + (bp - 11) + '" width="' + rw + '" height="3" fill="#e5484d"/><rect x="' + rx0 + '" y="' + (bn + 8) + '" width="' + rw + '" height="3" fill="#2d6bd1"/>';
    s += '<rect x="' + (x + 16) + '" y="' + ((eY + fY) / 2 - 7) + '" width="' + (B.w - 32) + '" height="14" rx="3" fill="#ded8c6"/>';
    for (let c = 1; c <= B.cols; c++) {
      const hx = Lab.holeXY(c, 'a').x;
      if (c === 1 || c % 5 === 0) s += '<text x="' + hx + '" y="' + (Lab.holeXY(c, 'a').y - 14) + '" text-anchor="middle" font-size="10.5" font-weight="900" fill="#8a8470">' + c + '</text>';
      Lab.ROWS.forEach((r) => { const id = bb.id + '#' + c + r, p = Lab.holeXY(c, r); s += '<circle class="term" data-term="' + id + '" cx="' + p.x + '" cy="' + p.y + '" r="8" fill="rgba(0,0,0,0)"><title>column ' + c + ', row ' + r + '</title></circle><rect x="' + (p.x - 3.2) + '" y="' + (p.y - 3.2) + '" width="6.4" height="6.4" rx="1.2" fill="#6b6a62" style="pointer-events:none"/>'; });
      ['T+', 'T-', 'B+', 'B-'].forEach((rl) => { const id = bb.id + '#' + rl + c, p = Lab.holePos(id); s += '<rect x="' + (p.x - 3.2) + '" y="' + (p.y - 3.2) + '" width="6.4" height="6.4" rx="1.2" fill="#6b6a62" style="pointer-events:none"/><circle class="term" data-term="' + id + '" cx="' + p.x + '" cy="' + p.y + '" r="8" fill="rgba(0,0,0,0)"><title>' + (rl[1] === '+' ? 'power rail (+)' : 'ground rail (−)') + '</title></circle>'; });
    }
    Lab.ROWS.forEach((r) => { const p = Lab.holeXY(1, r); s += '<text x="' + (p.x - 20) + '" y="' + (p.y + 4) + '" text-anchor="middle" font-size="10.5" font-weight="900" fill="#8a8470">' + r + '</text>'; });
    [[tp, '+', '#e5484d'], [tn, '−', '#2d6bd1'], [bp, '+', '#e5484d'], [bn, '−', '#2d6bd1']].forEach((r) => { s += '<text x="' + (x + 12) + '" y="' + (r[0] + 5) + '" font-size="15" font-weight="900" fill="' + r[2] + '">' + r[1] + '</text>'; });
    return s + '</g>';
  }

  /* ---------- drawing: parts ---------- */
  function pinDot(id, pos, label, dy, up) {
    return termCircle(id, pos, '#e2b93b', 4.5, label) + '<text x="' + pos.x + '" y="' + (pos.y + dy) + '" text-anchor="middle" font-size="9.5" font-weight="900" fill="' + (up ? '#fff' : '#fff') + '">' + label + '</text>';
  }
  function plugMarkup(p, def) {
    const c = plugCenter(p); let s = '<g class="plugg" data-plug="' + p.id + '" style="cursor:grab" transform="translate(' + c.x + ',' + c.y + ')">';
    if (def.kind === 'usb') {
      s += '<rect x="-22" y="-12" width="36" height="24" rx="4" fill="#9aa3b5" stroke="#6b7385" stroke-width="2"/><rect x="-18" y="-6" width="24" height="12" rx="2" fill="#d9deea"/><rect x="-26" y="-18" width="52" height="36" fill="rgba(0,0,0,0)"/>';
    } else {
      const f = p.plug && p.plug.flip, top = f ? def.cable.g : def.cable.s, bot = f ? def.cable.s : def.cable.g;
      s += '<rect x="-11" y="-29" width="22" height="58" rx="5" fill="#1d1f2b" stroke="#000" stroke-width="1.5"/>';
      s += '<circle cx="0" cy="-16" r="5" fill="' + top + '" stroke="#fff" stroke-width="1"/><circle cx="0" cy="0" r="5" fill="' + def.cable.v + '" stroke="#fff" stroke-width="1"/><circle cx="0" cy="16" r="5" fill="' + bot + '" stroke="#fff" stroke-width="1"/>';
      if (p.plug) s += '<title>Click to flip the plug</title>';
    }
    return s + '</g>';
  }
  function cableMarkup(p, def, o) {
    const port = { x: o.x + def.port.x, y: o.y + def.port.y }, c = plugCenter(p);
    let end, ctrl1, ctrl2;
    if (def.kind === 'usb') { end = { x: c.x - 22, y: c.y }; ctrl1 = { x: port.x + 60, y: port.y }; ctrl2 = { x: end.x - 70, y: end.y }; }
    else { end = { x: c.x, y: c.y - 30 }; ctrl1 = { x: port.x + (def.port.x < 0 ? -50 : 0), y: port.y + 60 }; ctrl2 = { x: end.x, y: end.y - 70 }; }
    const d = 'M' + port.x + ' ' + port.y + ' C' + ctrl1.x + ' ' + ctrl1.y + ' ' + ctrl2.x + ' ' + ctrl2.y + ' ' + end.x + ' ' + end.y;
    return '<path d="' + d + '" fill="none" stroke="#1d1f2b" stroke-width="8" stroke-linecap="round"/><path d="' + d + '" fill="none" stroke="' + (def.kind === 'usb' ? '#7d8599' : def.cable.s) + '" stroke-width="3" stroke-linecap="round" style="pointer-events:none"/>';
  }
  function labelFor(p) { const inv = Lab.invOf(S.proj, p.key); const l = (inv && inv.label) || ''; return l.replace(/^Servo: /, '').replace(/ \(bonus\)/, ''); }
  function bandsSVG(ohms) { const b = BANDS[ohms] || BANDS[220]; return b.map((c, i) => '<rect x="' + (19 + i * 8) + '" y="-20" width="4.5" height="16" fill="' + c + '"/>').join('') + '<rect x="44" y="-20" width="3.5" height="16" fill="#d4af37"/>'; }
  function partMarkup(p) {
    const def = PARTS[p.type]; if (def.kind === 'breadboard') return '';
    const o = Lab.partOrigin(p, S.st), sel = S.sel && S.sel.kind === 'part' && S.sel.id === p.id;
    let s = '<g class="part' + (sel ? ' sel' : '') + '" data-part="' + p.id + '">';
    if (def.kind === 'plug3' || def.kind === 'usb') s += cableMarkup(p, def, o);
    s += '<g transform="translate(' + o.x + ',' + o.y + ')">';
    const bound = (w, h, dx, dy) => '<rect class="hl" x="' + (-w / 2 - 8 + (dx || 0)) + '" y="' + (-h / 2 - 8 + (dy || 0)) + '" width="' + (w + 16) + '" height="' + (h + 16) + '" rx="10"/>';
    switch (p.type) {
      case 'servo':
        s += bound(100, 60) + '<rect x="-52" y="-6" width="104" height="9" rx="2" fill="#2f6fa8"/><rect x="-43" y="-21" width="86" height="42" rx="6" fill="#3b82c4" stroke="#1f5b94" stroke-width="2"/><circle cx="22" cy="0" r="12" fill="#f3f4f8" stroke="#9aa3b5" stroke-width="2"/><g class="horn"><rect x="12" y="-3.5" width="26" height="7" rx="3.5" fill="#fff" stroke="#9aa3b5"/></g><text y="38" text-anchor="middle" font-size="12" font-weight="900" fill="#38406a">' + esc(labelFor(p)) + '</text>';
        break;
      case 'buzzer':
        s += bound(46, 46) + '<circle r="23" fill="#2b2f4a" stroke="#0d0f1a" stroke-width="2"/><circle r="8" fill="#0d0f1a"/><circle r="15" fill="none" stroke="#3a3f5e" stroke-width="2"/><text x="-12" y="-11" font-size="12" font-weight="900" fill="#ff9a9a">+</text><text y="40" text-anchor="middle" font-size="12" font-weight="900" fill="#38406a">Buzzer</text>';
        break;
      case 'soil':
        s += bound(56, 90, 0, 0) + '<rect x="-28" y="-44" width="56" height="42" rx="6" fill="#2fa86a" stroke="#1f7a4c" stroke-width="2"/><rect x="-18" y="-2" width="12" height="40" rx="3" fill="#d4af37" stroke="#9c8023"/><rect x="6" y="-2" width="12" height="40" rx="3" fill="#d4af37" stroke="#9c8023"/><circle cx="0" cy="-28" r="6" fill="#0d0f1a"/><text y="56" text-anchor="middle" font-size="12" font-weight="900" fill="#38406a">Soil sensor</text>';
        break;
      case 'usb':
        s += bound(80, 46) + '<rect x="-40" y="-23" width="80" height="46" rx="8" fill="#e8eefc" stroke="#9aa3b5" stroke-width="2"/><rect x="-30" y="-15" width="60" height="30" rx="4" fill="#2b2f4a"/><text y="5" text-anchor="middle" font-size="12" font-weight="900" fill="#9fd8c6">LAPTOP</text>';
        break;
      case 'hcsr04':
        s += bound(124, 62, 0, 4) + '<rect x="-62" y="-30" width="124" height="60" rx="6" fill="#1e6fbf" stroke="#154e87" stroke-width="2"/><circle cx="-30" cy="-6" r="19" fill="#d9deea" stroke="#7d8599" stroke-width="3"/><circle cx="-30" cy="-6" r="11" fill="#2b2f4a"/><circle cx="30" cy="-6" r="19" fill="#d9deea" stroke="#7d8599" stroke-width="3"/><circle cx="30" cy="-6" r="11" fill="#2b2f4a"/><ellipse class="sonar" cx="0" cy="-44" rx="40" ry="12" fill="none" stroke="#4C97FF" stroke-width="3"/>';
        Object.keys(def.terms).forEach((t) => { const pos = Lab.termPos(p.id + '.' + t, S.st); s += '</g>' + pinDot(p.id + '.' + t, pos, def.labels[t], 22) + '<g transform="translate(' + o.x + ',' + o.y + ')">'; });
        break;
      case 'oled':
        s += bound(100, 66) + '<rect x="-50" y="-33" width="100" height="66" rx="6" fill="#1b2236" stroke="#0d0f1a" stroke-width="2"/><rect x="-40" y="-20" width="80" height="46" rx="3" fill="#050b14"/><g class="eyes"><circle cx="-16" cy="2" r="9" fill="#e8f6ff"/><circle cx="16" cy="2" r="9" fill="#e8f6ff"/></g>';
        Object.keys(def.terms).forEach((t) => { const pos = Lab.termPos(p.id + '.' + t, S.st); s += '</g>' + pinDot(p.id + '.' + t, pos, def.labels[t], -9) + '<g transform="translate(' + o.x + ',' + o.y + ')">'; });
        break;
      case 'battery':
        s += bound(104, 48, 6, 0) + '<rect x="-52" y="-24" width="104" height="48" rx="8" fill="#2b2f4a" stroke="#0d0f1a" stroke-width="2"/><text x="-4" y="5" text-anchor="middle" font-size="14" font-weight="900" fill="#ffd93b">4 × AA</text><rect x="-44" y="-18" width="22" height="8" rx="3" fill="#59c059"/><path d="M52 -12 H64" stroke="#e5484d" stroke-width="4"/><path d="M52 12 H64" stroke="#111" stroke-width="4"/>';
        Object.keys(def.terms).forEach((t) => { const pos = Lab.termPos(p.id + '.' + t, S.st); s += '</g>' + termCircle(p.id + '.' + t, pos, t === 'p' ? '#ff4d4d' : '#2b2f4a', 5.5, 'battery ' + def.labels[t]) + '<text x="' + (pos.x + 14) + '" y="' + (pos.y + 5) + '" font-size="15" font-weight="900" fill="#38406a" style="pointer-events:none">' + def.labels[t] + '</text><g transform="translate(' + o.x + ',' + o.y + ')">'; });
        break;
      case 'ldr': {
        const m = P; // legs at 0 and 2P, body centred between them
        s += bound(2 * P + 20, 48, m, -20) + '<path d="M0 0 V-14 M' + (2 * P) + ' 0 V-14" stroke="#9aa3b5" stroke-width="3" fill="none"/><circle cx="' + m + '" cy="-30" r="17" fill="#e9c98f" stroke="#a88548" stroke-width="2"/><path d="M' + (m - 10) + ' -30 l5 -7 l5 14 l5 -14 l5 7" stroke="#7a5a1f" stroke-width="2.4" fill="none"/><text x="' + m + '" y="-53" text-anchor="middle" font-size="11" font-weight="900" fill="#38406a">LDR</text>';
        break; }
      case 'resistor': {
        const e = 4 * P;
        s += bound(e + 14, 40, e / 2, -14) + '<path d="M0 0 V-12 H' + (P * 0.9) + ' M' + e + ' 0 V-12 H' + (e - P * 0.9) + '" stroke="#9aa3b5" stroke-width="3" fill="none"/><g transform="translate(' + (e / 2 - 32) + ',0)"><rect x="12" y="-20" width="40" height="16" rx="7" fill="#e8d3a8" stroke="#b39a63" stroke-width="1.5"/>' + bandsSVG(p.ohms) + '</g><text x="' + (e / 2) + '" y="-27" text-anchor="middle" font-size="13" font-weight="900" fill="#38406a">' + Lab.ohmLabel(p.ohms) + '</text>';
        break; }
      case 'rgb': {
        const c = 1.5 * P;
        s += bound(3 * P + 24, 60, c, -26) + '<path d="M0 0 V-12 M' + P + ' 0 V-20 M' + (2 * P) + ' 0 V-12 M' + (3 * P) + ' 0 V-12" stroke="#9aa3b5" stroke-width="3" fill="none"/><path d="M' + (c - 28) + ' -16 a28 28 0 1 1 56 0 z" fill="#f5f7ff" stroke="#9aa3b5" stroke-width="2"/><circle class="ledglow" cx="' + c + '" cy="-30" r="11"/>';
        ['r', 'k', 'g', 'b'].forEach((t, i) => { s += '<text x="' + (i * P) + '" y="' + (i === 1 ? -23 : -17) + '" text-anchor="middle" font-size="10" font-weight="900" fill="' + ({ r: '#e5484d', k: '#2b2f4a', g: '#1e9e6b', b: '#2d6bd1' })[t] + '">' + t.toUpperCase() + '</text>'; });
        break; }
    }
    s += '</g>';
    if (def.kind === 'legs' && !p.seat) Object.keys(def.legs).forEach((t) => { const pos = Lab.termPos(p.id + '.' + t, S.st); s += termCircle(p.id + '.' + t, pos, '#c9ced9', 4, t); });
    if (def.kind === 'plug3' || def.kind === 'usb') s += plugMarkup(p, def);
    if (sel) { const legs = def.kind === 'legs', x = legs ? o.x + ({ resistor: 2 * P, ldr: 2 * P, rgb: 3 * P })[p.type] : o.x + (def.w || 60) / 2 + 6, y = legs ? o.y - ({ resistor: 52, ldr: 70, rgb: 76 })[p.type] : o.y - (def.h || 40) / 2 - 12; s += '<g class="xbtn" data-del="' + p.id + '" transform="translate(' + x + ',' + y + ')"><circle r="11" fill="#e5484d" stroke="#fff" stroke-width="2"/><text y="4.5" text-anchor="middle" font-size="13" font-weight="900" fill="#fff">✕</text></g>'; }
    return s + '</g>';
  }

  /* ---------- drawing: wires and overlay ---------- */
  function wirePath(a, b) {
    const d = dist(a, b), sag = Math.min(70, 14 + d * 0.22);
    return 'M' + a.x + ' ' + a.y + ' C' + a.x + ' ' + (a.y + sag) + ' ' + b.x + ' ' + (b.y + sag) + ' ' + b.x + ' ' + b.y;
  }
  function wiresMarkup() {
    const nets = Lab.buildNets(S.st), r5 = nets.root('NET:5V'), rg = nets.root('NET:GND'), re = nets.root('NET:VEXT'), hash = {};
    let s = '';
    S.st.wires.forEach((w) => {
      const a = Lab.termPos(w.a, S.st), b = Lab.termPos(w.b, S.st); if (!a || !b) return;
      const r = nets.root(w.a);
      let col = r === r5 ? '#e5484d' : r === rg ? '#2b2f4a' : r === re ? '#e0832b' : (hash[r] = hash[r] || WIRE_COLORS[Object.keys(hash).length % WIRE_COLORS.length]);
      const sel = S.sel && S.sel.kind === 'wire' && S.sel.id === w.id, d = wirePath(a, b);
      s += '<g data-wire="' + w.id + '"><path class="wirehit" d="' + d + '"/><path class="wire' + (sel ? ' sel' : '') + '" d="' + d + '" stroke="' + col + '"/><circle cx="' + a.x + '" cy="' + a.y + '" r="4.5" fill="' + col + '"/><circle cx="' + b.x + '" cy="' + b.y + '" r="4.5" fill="' + col + '"/></g>';
    });
    return s;
  }
  function overlayMarkup() {
    let s = '';
    S.pulses.forEach((p) => { s += '<circle class="pulse" cx="' + p.x + '" cy="' + p.y + '" r="8"/>'; });
    if (S.snap) s += '<circle class="snap" cx="' + S.snap.x + '" cy="' + S.snap.y + '" r="' + (S.snap.r || 16) + '"/>';
    if (S.preview) s += '<path d="' + wirePath(S.preview.a, S.preview.b) + '" fill="none" stroke="#7c4dff" stroke-width="4" stroke-dasharray="7 6" stroke-linecap="round"/>';
    return s;
  }
  let gBoard, gBB, gParts, gWires, gOver;
  function initSvg() {
    svg.innerHTML = '<g id="gBoard"></g><g id="gBB"></g><g id="gParts"></g><g id="gWires"></g><g id="gOver"></g>';
    gBoard = $('#gBoard'); gBB = $('#gBB'); gParts = $('#gParts'); gWires = $('#gWires'); gOver = $('#gOver');
    gBoard.innerHTML = boardSVG();
  }
  function render() {
    const bb = bbPart();
    gBB.innerHTML = bb ? bbSVG(bb) : '';
    gParts.innerHTML = S.st.parts.map(partMarkup).join('');
    gWires.innerHTML = wiresMarkup();
    gOver.innerHTML = overlayMarkup();
    renderBin(); renderCheck(); save();
    $('#delBtn').disabled = !S.sel;
    const sp = S.sel && S.sel.kind === 'part' ? getPart(S.sel.id) : null;
    $('#flipBtn').hidden = !(sp && sp.plug && sp.plug.to !== 'USB');
    $('#undoBtn').disabled = !S.undo.length;
  }
  function renderOver() { gOver.innerHTML = overlayMarkup(); }

  /* ---------- bin ---------- */
  function renderBin() {
    const bin = $('#bin'); bin.innerHTML = '';
    Lab.INV[S.proj].forEach((inv) => {
      const used = S.st.parts.filter((p) => p.key === inv.key).length, left = inv.qty - used;
      const c = el('div', 'chip' + (left <= 0 ? ' used' : ''), '<span class="em">' + EMOJI[inv.type] + '</span><span>' + esc(inv.label) + '<small>' + (left <= 0 ? 'on the board' : (inv.qty > 1 ? left + ' left' : PARTS[inv.type].name)) + '</small></span>');
      c.style.setProperty('--cc', CHIPCOL[inv.type]); c.dataset.key = inv.key; c.title = PARTS[inv.type].note || '';
      bin.appendChild(c);
    });
  }
  const SPOTS = [[150, 110], [270, 110], [390, 110], [510, 110], [630, 110], [140, 650], [320, 650], [520, 650], [740, 640], [930, 620], [960, 700], [1080, 640]];
  function defaultSpot(type) {
    if (type === 'hcsr04' || type === 'oled') return type === 'oled' ? { x: 560, y: 650 } : { x: 700, y: 110 };
    if (type === 'battery') return { x: 920, y: 650 };
    if (Lab.legsKind(type)) { const n = S.st.parts.filter((p) => Lab.legsKind(p.type) && !p.seat).length; return { x: 790 + (n % 4) * 100, y: 650 + Math.floor(n / 4) * 60 }; }
    const used = S.st.parts.filter((p) => !p.seat && PARTS[p.type].kind !== 'breadboard');
    const free = SPOTS.find((sp) => used.every((p) => dist({ x: p.x, y: p.y }, { x: sp[0], y: sp[1] }) > 70)) || SPOTS[0];
    return { x: free[0], y: free[1] };
  }
  function addFromBin(key, at) {
    const before = snapshot(), inv = Lab.invOf(S.proj, key); if (!inv) return;
    const pos = at || defaultSpot(inv.type);
    const part = Lab.addPart(S.st, key, pos.x, pos.y); if (!part) return;
    const def = PARTS[part.type];
    if (def.kind === 'plug3' || def.kind === 'usb') part.plugPos = { x: Math.min(L.W - 40, Math.max(40, pos.x)), y: Math.min(L.H - 60, pos.y + 95) };
    if (def.kind === 'breadboard') { part.x = L.bb.x; part.y = L.bb.y; }
    if (Lab.legsKind(part.type)) { trySeat(part); }
    S.sel = { kind: 'part', id: part.id }; pushUndo(before); render();
  }
  let binDrag = null;
  $('#bin').addEventListener('pointerdown', (e) => {
    const chip = e.target.closest('.chip'); if (!chip || chip.classList.contains('used')) return;
    binDrag = { key: chip.dataset.key, sx: e.clientX, sy: e.clientY, active: false, ghost: null, label: chip.textContent };
    e.preventDefault();
  });

  /* ---------- seating legs into breadboard holes ---------- */
  function seatCandidate(part, at) {
    const bb = bbPart(); if (!bb) return null;
    const legs = PARTS[part.type].legs, offs = Object.keys(legs).map((t) => legs[t][0] / P), maxOff = Math.max.apply(null, offs);
    let best = null;
    for (let c = 1; c <= L.bb.cols; c++) Lab.ROWS.forEach((r) => { const h = Lab.holeXY(c, r), d = dist(at, h); if (d <= 18 && (!best || d < best.d)) best = { c, r, d, h }; });
    if (!best || best.c + maxOff > L.bb.cols) return null;
    const used = new Set(); S.st.parts.forEach((q) => { if (q.id !== part.id && q.seat) { const h = Lab.legHoles(q); Object.keys(h).forEach((t) => used.add(h[t])); } });
    if (offs.some((o) => used.has(bb.id + '#' + (best.c + o) + best.r))) return null;
    return { bb: bb.id, col: best.c, row: best.r, pos: best.h };
  }
  function trySeat(part) {
    const cand = seatCandidate(part, { x: part.x, y: part.y });
    if (cand) { part.seat = { bb: cand.bb, col: cand.col, row: cand.row }; return true; }
    part.seat = null; return false;
  }

  /* ---------- pointer interaction ---------- */
  let drag = null;
  function select(kind, id) { S.sel = id ? { kind, id } : null; }
  svg.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const pt = toSvg(e), before = snapshot();
    const del = e.target.closest('[data-del]'); if (del) { removePart(del.dataset.del); return; }
    const plug = e.target.closest('[data-plug]');
    if (plug) { const p = getPart(plug.dataset.plug); select('part', p.id); drag = { kind: 'plug', part: p, moved: false, sx: e.clientX, sy: e.clientY, before }; e.preventDefault(); return; }
    const termEl = e.target.closest('.term');
    const startWire = (id) => { const pos = Lab.termPos(id, S.st); if (!pos) return false; drag = { kind: 'wire', from: id, fromPos: pos, before, sx: e.clientX, sy: e.clientY, moved: false }; S.preview = { a: pos, b: pt }; renderOver(); e.preventDefault(); return true; };
    if (termEl && termEl.dataset.term && startWire(termEl.dataset.term)) return;
    const pb = e.target.closest('[data-part]'), pbPart = pb && getPart(pb.dataset.part);
    if (pbPart && pbPart.type !== 'breadboard') {
      select('part', pbPart.id); const o = Lab.partOrigin(pbPart, S.st);
      drag = { kind: 'part', part: pbPart, ox: pt.x - o.x, oy: pt.y - o.y, moved: false, sx: e.clientX, sy: e.clientY, before };
      e.preventDefault(); return;
    }
    const near = nearestTerm(pt, 10);
    if (near && startWire(near.id)) return;
    if (pbPart) { select('part', pbPart.id); render(); e.preventDefault(); return; }
    const wr = e.target.closest('[data-wire]'); if (wr) { select('wire', wr.dataset.wire); render(); return; }
    select(null); render();
  });
  window.addEventListener('pointermove', (e) => {
    if (binDrag) {
      if (!binDrag.active && Math.hypot(e.clientX - binDrag.sx, e.clientY - binDrag.sy) > 6) { binDrag.active = true; binDrag.ghost = el('div', 'chipghost', esc(binDrag.label)); document.body.appendChild(binDrag.ghost); }
      if (binDrag.ghost) { binDrag.ghost.style.left = (e.clientX + 8) + 'px'; binDrag.ghost.style.top = (e.clientY + 8) + 'px'; }
      return;
    }
    if (!drag) return;
    const pt = toSvg(e);
    if (drag.kind === 'wire') { if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 6) drag.moved = true; if (!drag.moved) return; const n = nearestTerm(pt, 14, drag.from); S.preview = { a: drag.fromPos, b: n ? n.pos : pt }; S.snap = n ? { x: n.pos.x, y: n.pos.y, r: 11 } : null; renderOver(); return; }
    if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) > 4) drag.moved = true;
    if (!drag.moved) return;
    if (drag.kind === 'plug') {
      drag.part.plug = null; drag.part.plugPos = { x: pt.x, y: pt.y };
      if (drag.part.type === 'usb') { const d = dist(pt, { x: L.usb.x - 20, y: L.usb.y }); S.snap = d < 46 ? { x: L.usb.x, y: L.usb.y, r: 22 } : null; }
      else { const h = nearestHeader(pt, 34); S.snap = h ? { x: h.c.x, y: h.c.y, r: 30 } : null; }
      render(); S.snap && renderOver();
    } else if (drag.kind === 'part') {
      const p = drag.part; p.seat = null; p.x = pt.x - drag.ox; p.y = pt.y - drag.oy;
      if (Lab.legsKind(p.type)) { const c = seatCandidate(p, { x: p.x, y: p.y }); S.snap = c ? { x: c.pos.x, y: c.pos.y, r: 12 } : null; } else S.snap = null;
      render(); S.snap && renderOver();
    }
  });
  window.addEventListener('pointerup', (e) => {
    if (binDrag) {
      const b = binDrag; binDrag = null; if (b.ghost) b.ghost.remove();
      if (!b.active) { addFromBin(b.key); return; }
      const wrap = $('#svgwrap').getBoundingClientRect();
      if (e.clientX >= wrap.left && e.clientX <= wrap.right && e.clientY >= wrap.top && e.clientY <= wrap.bottom) addFromBin(b.key, toSvg(e)); else toast('Drop it on the board');
      return;
    }
    if (!drag) return;
    const d = drag, pt = toSvg(e); drag = null; S.snap = null; S.preview = null;
    if (d.kind === 'wire') {
      const n = d.moved ? nearestTerm(pt, 14, d.from) : null;
      if (n) { const w = Lab.addWire(S.st, d.from, n.id); if (w) pushUndo(d.before); }
    } else if (d.kind === 'plug') {
      const p = d.part;
      if (!d.moved && p.plug && p.type !== 'usb') { p.plug.flip = !p.plug.flip; pushUndo(d.before); }
      if (d.moved) {
        if (p.type === 'usb') { p.plug = dist(pt, { x: L.usb.x - 20, y: L.usb.y }) < 46 ? { to: 'USB', flip: false } : null; }
        else { const h = nearestHeader(pt, 34); p.plug = h ? { to: h.pin, flip: false } : null; }
        if (!p.plug) p.plugPos = { x: pt.x, y: pt.y };
        pushUndo(d.before);
      }
    } else if (d.kind === 'part') {
      const p = d.part;
      if (!d.moved && p.type === 'resistor') { p.ohms = Lab.OHMS[(Lab.OHMS.indexOf(p.ohms) + 1) % Lab.OHMS.length]; pushUndo(d.before); }
      if (d.moved) { if (Lab.legsKind(p.type)) trySeat(p); else p.seat = null; pushUndo(d.before); }
    }
    render();
  });
  function removePart(id) {
    const before = snapshot(), p = getPart(id); if (!p) return;
    S.st.parts = S.st.parts.filter((q) => q.id !== id);
    S.st.wires = S.st.wires.filter((w) => !w.a.startsWith(id + '.') && !w.b.startsWith(id + '#') && !w.a.startsWith(id + '#') && !w.b.startsWith(id + '.'));
    if (p.type === 'breadboard') S.st.parts.forEach((q) => { if (q.seat && q.seat.bb === id) q.seat = null; });
    S.sel = null; pushUndo(before); render();
  }
  function deleteSelection() {
    if (!S.sel) return;
    if (S.sel.kind === 'part') removePart(S.sel.id);
    else { const before = snapshot(); S.st.wires = S.st.wires.filter((w) => w.id !== S.sel.id); S.sel = null; pushUndo(before); render(); }
  }
  window.addEventListener('keydown', (e) => { if ((e.key === 'Delete' || e.key === 'Backspace') && !/INPUT|TEXTAREA|SELECT/.test((e.target || {}).tagName || '')) { e.preventDefault(); deleteSelection(); } });
  $('#delBtn').onclick = deleteSelection;
  $('#flipBtn').onclick = () => { const p = S.sel && getPart(S.sel.id); if (p && p.plug) { const b = snapshot(); p.plug.flip = !p.plug.flip; pushUndo(b); render(); } };
  $('#undoBtn').onclick = () => { const prev = S.undo.pop(); if (!prev) return; S.st = sanitize(S.proj, JSON.parse(prev)); S.sel = null; render(); };

  /* ---------- the checklist, hints and power-on ---------- */
  let lastResult = null, wasComplete = false;
  function renderCheck() {
    const r = lastResult = Lab.check(S.proj, S.st);
    $('#barfill').style.width = (r.total ? (r.done / r.total * 100) : 0) + '%'; $('#progtext').textContent = r.done + ' of ' + r.total;
    const pr = $('#problems'); pr.innerHTML = r.problems.map((p) => '<div class="problem">' + esc(p.msg) + '</div>').join('');
    const firstTodo = r.items.find((i) => i.status === 'todo' && !i.optional);
    const box = $('#checklist'); box.innerHTML = '';
    if (r.complete) box.appendChild(el('div', 'celebrate', '🎉 Everything is wired correctly! Press <b>⚡ Power on!</b>' + '<br><a class="btn small go" href="blocks.html" style="text-decoration:none">Next: build the code ➜</a>'));
    let group = null;
    r.items.forEach((it) => {
      if (it.group !== group) { group = it.group; box.appendChild(el('div', 'grp', esc(group))); }
      const cls = it.status === 'optional' ? 'opt' : it.status;
      const c = el('div', 'citem ' + cls, '<span class="ic">' + (it.status === 'ok' ? '✓' : it.status === 'bad' ? '!' : it.status === 'optional' ? '★' : '') + '</span><span>' + esc(it.text) + (it.status === 'bad' || (it === firstTodo && it.msg) ? '<span class="why">' + esc(it.msg) + '</span>' : '') + '</span>');
      c.onclick = () => showHint(it);
      box.appendChild(c);
    });
    if (r.complete && !wasComplete) { wasComplete = true; ChipCamp.circuitDone(S.proj); }
    if (!r.complete) wasComplete = false;
  }
  function pulseFor(it) {
    S.pulses = []; $$('.chip.pulse').forEach((c) => c.classList.remove('pulse'));
    (it.focus || []).forEach((f) => {
      if (f.indexOf('bin:') === 0) { const c = $('.chip[data-key="' + f.slice(4) + '"]'); if (c) c.classList.add('pulse'); }
      else if (f.indexOf('header:') === 0) { const pos = Lab.headerCenter(f.slice(7)); if (pos) S.pulses.push(pos); }
      else { const pos = Lab.termPos(f, S.st); if (pos) S.pulses.push(pos); }
    });
    renderOver(); clearTimeout(S.hintT); S.hintT = setTimeout(() => { S.pulses = []; renderOver(); $$('.chip.pulse').forEach((c) => c.classList.remove('pulse')); }, 4200);
  }
  function showHint(it) {
    const h = $('#hintline'); h.className = 'hintline' + (it.status === 'bad' ? ' bad' : ''); h.textContent = (it.status === 'ok' ? '✓ ' : '💡 ') + (it.msg || it.text);
    pulseFor(it);
  }
  $('#hintBtn').onclick = () => {
    const r = lastResult || Lab.check(S.proj, S.st);
    if (r.problems.length) { const h = $('#hintline'); h.className = 'hintline bad'; h.textContent = r.problems[0].msg; return; }
    const it = r.items.find((i) => i.status === 'bad') || r.items.find((i) => i.status === 'todo' && !i.optional);
    if (!it) { const h = $('#hintline'); h.className = 'hintline good'; h.textContent = '✓ Nothing left to fix. Press Power on!'; return; }
    showHint(it);
  };
  $('#powerBtn').onclick = (e) => {
    const r = Lab.check(S.proj, S.st), h = $('#hintline');
    if (r.complete) {
      h.className = 'hintline good'; h.textContent = '⚡ It’s alive! Your circuit is wired correctly. Now go and teach it what to do in the Code Builder.';
      svg.classList.add('alive'); const b = e.currentTarget.getBoundingClientRect(); confetti(b.left + 40, b.top);
      ChipCamp.circuitDone(S.proj); setTimeout(() => svg.classList.remove('alive'), 7000);
    } else if (r.problems.length) { h.className = 'hintline bad'; h.textContent = r.problems[0].msg; }
    else {
      const it = r.items.find((i) => i.status === 'bad') || r.items.find((i) => i.status === 'todo' && !i.optional);
      h.className = 'hintline bad'; h.textContent = '🔌 Not quite yet. ' + (it ? (it.msg || it.text) : ''); if (it) pulseFor(it);
    }
  };
  (function () { const b = $('#solveBtn'); let armed = false, t = 0; b.onclick = () => { if (!armed) { armed = true; b.textContent = 'Replace the board? Click again'; t = setTimeout(() => { armed = false; b.textContent = '🎓 Show finished circuit'; }, 3000); return; } clearTimeout(t); armed = false; b.textContent = '🎓 Show finished circuit'; const before = snapshot(); S.st = sanitize(S.proj, Lab.solution(S.proj)); pushUndo(before); S.sel = null; render(); toast('Here is a finished circuit. Compare it with yours.'); }; })();
  (function () { const b = $('#clearBtn'); let armed = false, t = 0; b.onclick = () => { if (!armed) { armed = true; b.textContent = 'Clear everything? Click again'; t = setTimeout(() => { armed = false; b.textContent = '🧹 Clear board'; }, 3000); return; } clearTimeout(t); armed = false; b.textContent = '🧹 Clear board'; const before = snapshot(); S.st = Lab.newState(S.proj); pushUndo(before); S.sel = null; $('#hintline').className = 'hintline'; $('#hintline').textContent = ''; render(); }; })();

  /* ---------- zoom ---------- */
  function setZoom(z) { S.zoom = Math.min(2.4, Math.max(0.8, z)); svg.style.width = (S.zoom * 100) + '%'; }
  $('#zoomIn').onclick = () => setZoom(S.zoom + 0.25); $('#zoomOut').onclick = () => setZoom(S.zoom - 0.25); $('#zoomFit').onclick = () => setZoom(1);

  /* ---------- robot tabs ---------- */
  function renderTabs() {
    const nav = $('#ptabs'); nav.innerHTML = '';
    ROBOTS.forEach((r) => {
      const b = el('button', 'ptab', '<span>' + r[1] + '</span>' + r[2]); b.style.setProperty('--pc', r[3]); b.setAttribute('aria-selected', r[0] === S.proj ? 'true' : 'false');
      b.onclick = () => { if (r[0] === S.proj) return; S.proj = r[0]; ChipCamp.setRobot(r[0]); S.st = load(S.proj); S.sel = null; S.undo = []; S.pulses = []; $('#hintline').className = 'hintline'; $('#hintline').textContent = ''; renderTabs(); render(); };
      nav.appendChild(b);
    });
  }

  initSvg(); renderTabs(); render();
  window.__lab = { S, Lab, render, toSvg };
})();
