/* Circuit Lab core: parts, board and breadboard layout, the netlist, the wiring checker for each robot, and the
   finished circuit for each. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LabCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- geometry (SVG units) ---------- */
  const DIG = [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], ANA = [0, 1, 2, 3, 4, 5];
  const L = {
    W: 1200, H: 800,
    board: { x: 60, y: 210, w: 660, h: 350 },
    dig: { x0: 160, dx: 44, yS: 262, yV: 278, yG: 294, labelY: 247 },
    ana: { x0: 160, dx: 44, yS: 470, yV: 486, yG: 502, labelY: 455 },
    i2c: { x0: 480, dx: 30, y: 486, order: ['GND', 'VCC', 'SDA', 'SCL'] },
    usb: { x: 60, y: 390 },
    unoUsb: { x: 60, y: 340 },
    uno: { x: 60, y: 230, w: 640, h: 300 },
    bb: { x: 745, y: 214, cols: 20, pitch: 20, xOff: 36, rowTop: 74, rowBot: 194, rails: { 'T+': 26, 'T-': 46, 'B+': 306, 'B-': 326 }, w: 452, h: 354 }
  };
  const ROWS = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j'];

  // The plain Arduino Uno (Peeko, Jarvis) has single pin sockets, no S/V/G triples. Labels run as printed on the board.
  const UNO_PINS = [];
  (function () {
    const top = [['I2C.SCL', 'SCL'], ['I2C.SDA', 'SDA'], [null, 'AREF'], ['PWR.GND3', 'GND']];
    for (let n = 13; n >= 8; n--) top.push(['D' + n + '.S', String(n)]);
    let x = 130; top.forEach((t) => { UNO_PINS.push({ id: t[0], label: t[1], x, y: 262 }); x += 26; });
    x += 20;
    for (let n = 7; n >= 0; n--) { UNO_PINS.push({ id: 'D' + n + '.S', label: String(n), x, y: 262 }); x += 26; }
    const bot = [[null, 'IOREF'], [null, 'RESET'], ['PWR.3V3', '3V3'], ['PWR.5V', '5V'], ['PWR.GND1', 'GND'], ['PWR.GND2', 'GND'], ['PWR.VIN', 'VIN']];
    x = 200; bot.forEach((t) => { UNO_PINS.push({ id: t[0], label: t[1], x, y: 498 }); x += 26; });
    x = 410; for (let n = 0; n <= 5; n++) { UNO_PINS.push({ id: 'A' + n + '.S', label: 'A' + n, x, y: 498 }); x += 26; }
  })();
  function boardTermPos(id, kind) {
    if (kind === 'uno') {
      if (id === 'USB') return { x: L.unoUsb.x, y: L.unoUsb.y };
      const pin = UNO_PINS.find((q) => q.id === id); return pin ? { x: pin.x, y: pin.y } : null;
    }
    let m = /^D(\d+)\.([SVG])$/.exec(id);
    if (m) return { x: L.dig.x0 + (Number(m[1]) - 2) * L.dig.dx, y: L.dig['y' + m[2]] };
    m = /^A(\d)\.([SVG])$/.exec(id);
    if (m) return { x: L.ana.x0 + Number(m[1]) * L.ana.dx, y: L.ana['y' + m[2]] };
    m = /^I2C\.(GND|VCC|SDA|SCL)$/.exec(id);
    if (m) return { x: L.i2c.x0 + L.i2c.order.indexOf(m[1]) * L.i2c.dx, y: L.i2c.y };
    if (id === 'USB') return { x: L.usb.x, y: L.usb.y };
    return null;
  }
  const BOARD = { chipbot: 'shield', peeko: 'uno', jarvis: 'uno' };
  const boardKind = (proj) => BOARD[proj] || 'shield';
  const usbPos = (kind) => (kind === 'uno' ? L.unoUsb : L.usb);
  function headerCenter(pin) { const p = boardTermPos(pin + '.V', 'shield'); return p; }
  function holeXY(col, row) {
    const i = ROWS.indexOf(row);
    return { x: L.bb.x + L.bb.xOff + (col - 1) * L.bb.pitch, y: L.bb.y + (i < 5 ? L.bb.rowTop + i * L.bb.pitch : L.bb.rowBot + (i - 5) * L.bb.pitch) };
  }
  function railXY(rail, idx) { return { x: L.bb.x + L.bb.xOff + (idx - 1) * L.bb.pitch, y: L.bb.y + L.bb.rails[rail] }; }
  const HOLE_RE = /^([A-Za-z0-9_]+)#(\d+)([a-j])$/, RAIL_RE = /^([A-Za-z0-9_]+)#([TB][+-])(\d+)$/;
  function holePos(id) {
    let m = HOLE_RE.exec(id); if (m) return holeXY(Number(m[2]), m[3]);
    m = RAIL_RE.exec(id); if (m) return railXY(m[2], Number(m[3]));
    return null;
  }

  /* ---------- parts ---------- */
  const P = L.bb.pitch;
  const PARTS = {
    servo: { name: 'Servo motor', kind: 'plug3', w: 86, h: 42, port: { x: -43, y: 10 }, cable: { s: '#ff9f1a', v: '#e5484d', g: '#6b4423' }, unoTerms: { s: [-92, -14], v: [-92, 0], g: [-92, 14] }, note: 'SG90. Orange = signal, red = power, brown = ground.' },
    buzzer: { name: 'Buzzer module', kind: 'plug3', w: 46, h: 46, port: { x: 0, y: 23 }, cable: { s: '#ffd93b', v: '#e5484d', g: '#2b2f4a' }, unoTerms: { s: [-16, 38], v: [0, 38], g: [16, 38] }, note: 'Beeps when the pin is switched on.' },
    soil: { name: 'Soil moisture sensor', kind: 'plug3', w: 56, h: 84, port: { x: 28, y: -14 }, cable: { s: '#59c059', v: '#e5484d', g: '#2b2f4a' }, unoTerms: { s: [-16, -58], v: [0, -58], g: [16, -58] }, note: 'Two metal probes go in the soil.' },
    usb: { name: 'USB cable', kind: 'usb', w: 80, h: 46, port: { x: 40, y: 0 }, note: 'Powers the board and carries your code to it. Every robot runs from this cable.' },
    hcsr04: { name: 'Ultrasonic sensor (HC-SR04)', kind: 'pins', w: 124, h: 60, terms: { vcc: [-42, 32], trig: [-14, 32], echo: [14, 32], gnd: [42, 32] }, labels: { vcc: 'VCC', trig: 'TRIG', echo: 'ECHO', gnd: 'GND' }, note: 'Chip Bot\'s eyes. It measures distance with sound.' },
    oled: { name: 'OLED screen', kind: 'pins', w: 100, h: 66, terms: { gnd: [-36, -37], vcc: [-12, -37], scl: [12, -37], sda: [36, -37] }, labels: { gnd: 'GND', vcc: 'VCC', scl: 'SCL', sda: 'SDA' }, note: 'Peeko\'s eyes live on this little screen.' },
    ldr: { name: 'Light sensor (LDR)', kind: 'legs', w: 40, h: 30, legs: { a: [0, 0], b: [2 * P, 0] }, seatPitch: 2, note: 'Its resistance changes with light. It needs a partner resistor.' },
    resistor: { name: 'Resistor', kind: 'legs', w: 66, h: 14, legs: { a: [0, 0], b: [4 * P, 0] }, seatPitch: 4, note: 'Click it to change its value.' },
    rgb: { name: 'RGB LED', kind: 'legs', w: 56, h: 50, legs: { r: [0, 0], k: [P, 0], g: [2 * P, 0], b: [3 * P, 0] }, seatPitch: 1, note: 'Red, green, blue and one shared ground (the long leg, K).' },
    breadboard: { name: 'Breadboard', kind: 'breadboard', w: L.bb.w, h: L.bb.h, note: 'Holes in the same column are joined underneath.' }
  };
  const OHMS = [100, 220, 1000, 10000, 100000];
  const ohmLabel = (o) => (o >= 1000 ? (o / 1000) + 'kΩ' : o + 'Ω');
  const legsKind = (type) => PARTS[type].kind === 'legs';
  // On a plain Uno there is no shield to plug onto, so the 3-pin modules are wired pin by pin
  function defFor(part, state) {
    const def = PARTS[part.type];
    if (def.kind === 'plug3' && boardKind(state.proj) === 'uno') return Object.assign({}, def, { kind: 'pins3', terms: def.unoTerms, labels: { s: 'S', v: 'V', g: 'G' } });
    return def;
  }

  /* ---------- what is in each kit ---------- */
  const INV = {
    chipbot: [
      { key: 'usb', type: 'usb', label: 'USB cable', qty: 1 },
      { key: 'lhip', type: 'servo', role: 'lhip', label: 'Servo: left hip', qty: 1 },
      { key: 'rhip', type: 'servo', role: 'rhip', label: 'Servo: right hip', qty: 1 },
      { key: 'lfoot', type: 'servo', role: 'lfoot', label: 'Servo: left foot', qty: 1 },
      { key: 'rfoot', type: 'servo', role: 'rfoot', label: 'Servo: right foot', qty: 1 },
      { key: 'hcsr04', type: 'hcsr04', label: 'Ultrasonic sensor', qty: 1 },
      { key: 'buzzer', type: 'buzzer', label: 'Buzzer (bonus)', qty: 1, optional: true }
    ],
    peeko: [
      { key: 'usb', type: 'usb', label: 'USB cable', qty: 1 },
      { key: 'oled', type: 'oled', label: 'OLED screen', qty: 1 },
      { key: 'head', type: 'servo', role: 'head', label: 'Servo: head', qty: 1 },
      { key: 'buzzer', type: 'buzzer', label: 'Buzzer (bonus)', qty: 1, optional: true },
      { key: 'breadboard', type: 'breadboard', label: 'Breadboard (power rails)', qty: 1, optional: true }
    ],
    jarvis: [
      { key: 'usb', type: 'usb', label: 'USB cable', qty: 1 },
      { key: 'breadboard', type: 'breadboard', label: 'Breadboard', qty: 1 },
      { key: 'soil', type: 'soil', label: 'Soil moisture sensor', qty: 1 },
      { key: 'ldr', type: 'ldr', label: 'Light sensor (LDR)', qty: 1 },
      { key: 'resistor', type: 'resistor', label: 'Resistors (from the box)', qty: 5, multi: true },
      { key: 'rgb', type: 'rgb', label: 'RGB LED', qty: 1 },
      { key: 'buzzer', type: 'buzzer', label: 'Buzzer', qty: 1 }
    ]
  };
  const invOf = (proj, key) => INV[proj].find((i) => i.key === key);

  /* ---------- state ---------- */
  function newState(proj) { return { v: 1, proj, n: 0, parts: [], wires: [] }; }
  function addPart(st, key, x, y) {
    const inv = invOf(st.proj, key); if (!inv) throw new Error('unknown part ' + key);
    const have = st.parts.filter((p) => p.key === key).length; if (have >= inv.qty) return null;
    const id = inv.type + (++st.n);
    const part = { id, key, type: inv.type, role: inv.role || null, x: x || 0, y: y || 0, plug: null, plugPos: null, seat: null };
    if (inv.type === 'resistor') part.ohms = 220;
    st.parts.push(part); return part;
  }
  function addWire(st, a, b) {
    if (a === b) return null;
    if (st.wires.some((w) => (w.a === a && w.b === b) || (w.a === b && w.b === a))) return null;
    const w = { id: 'w' + (++st.n), a, b }; st.wires.push(w); return w;
  }

  /* ---------- the netlist ---------- */
  const canon = (id) => {
    let m = HOLE_RE.exec(id); if (m) return m[1] + ':' + m[2] + ':' + (m[3] < 'f' ? 'top' : 'bot');
    m = RAIL_RE.exec(id); if (m) return m[1] + ':' + m[2];
    return id;
  };
  const SIGNAL = DIG.map((n) => 'D' + n).concat(ANA.map((n) => 'A' + n));
  const signalList = (kind) => (kind === 'uno' ? ['D0', 'D1'].concat(SIGNAL) : SIGNAL);
  function legHoles(part, state) {
    if (!part.seat) return null;
    const out = {}; const base = part.seat;
    Object.keys(PARTS[part.type].legs).forEach((t) => { out[t] = base.bb + '#' + (base.col + PARTS[part.type].legs[t][0] / P) + base.row; });
    return out;
  }
  function buildNets(state) {
    const parent = new Map();
    const find = (x) => { if (!parent.has(x)) parent.set(x, x); let r = x; while (parent.get(r) !== r) r = parent.get(r); let c = x; while (parent.get(c) !== r) { const n = parent.get(c); parent.set(c, r); c = n; } return r; };
    const union = (a, b) => { const ra = find(canon(a)), rb = find(canon(b)); if (ra !== rb) parent.set(ra, rb); };
    const kind = boardKind(state.proj);
    if (kind === 'uno') {
      union('PWR.5V', 'NET:5V'); ['PWR.GND1', 'PWR.GND2', 'PWR.GND3'].forEach((g) => union(g, 'NET:GND'));
      union('PWR.3V3', 'NET:3V3'); union('PWR.VIN', 'NET:VIN');
    } else {
      SIGNAL.forEach((p) => { union(p + '.V', 'NET:5V'); union(p + '.G', 'NET:GND'); });
      union('I2C.VCC', 'NET:5V'); union('I2C.GND', 'NET:GND');
    }
    union('I2C.SDA', 'A4.S'); union('I2C.SCL', 'A5.S');
    state.parts.forEach((p) => {
      const def = PARTS[p.type];
      if (def.kind === 'plug3' && kind === 'shield' && p.plug && boardTermPos(p.plug.to + '.V', 'shield')) {
        const f = !!p.plug.flip;
        union(p.id + '.s', p.plug.to + (f ? '.G' : '.S')); union(p.id + '.v', p.plug.to + '.V'); union(p.id + '.g', p.plug.to + (f ? '.S' : '.G'));
      }
      if (def.kind === 'legs' && p.seat) { const h = legHoles(p); Object.keys(h).forEach((t) => union(p.id + '.' + t, h[t])); }
    });
    state.wires.forEach((w) => union(w.a, w.b));
    return {
      root: (id) => find(canon(id)),
      same: (a, b) => find(canon(a)) === find(canon(b)),
      ids: () => Array.from(parent.keys())
    };
  }

  /* ---------- checking ---------- */
  const NAMES = { 'NET:5V': '5V power', 'NET:GND': 'ground (GND)' };
  function makeCtx(proj, state) {
    const nets = buildNets(state);
    const part = (key) => state.parts.find((p) => p.key === key);
    const label = (key) => (invOf(proj, key) || {}).label || key;
    const boardNames = (id) => {
      const r = nets.root(id), out = [];
      signalList(boardKind(proj)).forEach((p) => { if (nets.root(p + '.S') === r) out.push(p); });
      if (nets.root('NET:5V') === r) out.push('5V power');
      if (nets.root('NET:GND') === r) out.push('ground (GND)');
      if (nets.root('NET:3V3') === r) out.push('3.3V');
      if (nets.root('NET:VIN') === r) out.push('VIN');
      return out;
    };
    return { proj, state, nets, part, label, boardNames };
  }
  const base = (id, group, text, o) => Object.assign({ id, group, text, status: 'todo', msg: '', focus: [], ghost: [], optional: false }, o || {});
  const termName = (t) => ({ s: 'signal', v: 'power', g: 'ground', vcc: 'VCC', gnd: 'GND', trig: 'TRIG', echo: 'ECHO', scl: 'SCL', sda: 'SDA', p: '+', n: '−', ao: 'signal' }[t] || t);

  function plugItem(ctx, group, key, pin, text, opts) {
    const p = ctx.part(key), inv = invOf(ctx.proj, key), it = base(key + '.plug', group, text, { optional: !!(opts && opts.optional || inv && inv.optional), focus: ['header:' + pin] });
    if (!p) { it.status = it.optional ? 'optional' : 'todo'; it.msg = 'Drag the ' + ctx.label(key) + ' onto the board first.'; it.focus = ['bin:' + key]; return it; }
    if (!p.plug) { it.msg = 'Plug the ' + ctx.label(key) + ' cable into ' + pin + '. Drag its plug onto the pins.'; return it; }
    if (p.plug.to !== pin) { it.status = 'bad'; it.msg = 'The ' + ctx.label(key) + ' is plugged into ' + p.plug.to + ', but the code expects ' + pin + '.'; return it; }
    if (p.plug.flip) { it.status = 'bad'; it.msg = 'The plug is the wrong way round! Match the colours: the dark wire goes on the black G pin. Click the plug to flip it.'; return it; }
    it.status = 'ok'; return it;
  }
  function linkItem(ctx, group, key, term, target, text, opts) {
    const p = ctx.part(key), inv = invOf(ctx.proj, key), id = p && p.id + '.' + term;
    const it = base(key + '.' + term, group, text, { optional: !!(opts && opts.optional || inv && inv.optional), focus: [p ? id : 'bin:' + key, target] });
    if (!p) { it.status = it.optional ? 'optional' : 'todo'; it.msg = 'Drag the ' + ctx.label(key) + ' onto the board first.'; it.focus = ['bin:' + key]; return it; }
    it.ghost = [[id, target]];
    if (ctx.nets.same(id, target)) { it.status = 'ok'; return it; }
    const where = ctx.boardNames(id);
    if (where.length) { it.status = 'bad'; it.msg = termName(term) + ' is connected to ' + where.join(' and ') + ', but it needs to go to ' + (NAMES[target] || target.split('.')[0]) + '.'; }
    else it.msg = 'Connect ' + termName(term) + ' to ' + (NAMES[target] || target.split('.')[0] + (target.endsWith('.S') ? ' (the S pin)' : '')) + ' with a wire.';
    return it;
  }
  function resistorBetween(ctx, group, idSuffix, a, b, ohms, text) {
    const res = ctx.state.parts.filter((p) => p.type === 'resistor');
    const it = base(idSuffix, group, text, { focus: [a, b], ghost: [] });
    if (!res.length) { it.msg = 'Take a ' + ohmLabel(ohms) + ' resistor from the box and place it on the breadboard.'; it.focus = ['bin:resistor']; return it; }
    const joins = (r) => (ctx.nets.same(r.id + '.a', a) && ctx.nets.same(r.id + '.b', b)) || (ctx.nets.same(r.id + '.a', b) && ctx.nets.same(r.id + '.b', a));
    const good = res.find((r) => joins(r) && r.ohms === ohms);
    if (good && !ctx.nets.same(a, b)) { it.status = 'ok'; return it; }
    const wrongVal = res.find((r) => joins(r) && r.ohms !== ohms);
    if (wrongVal) { it.status = 'bad'; it.msg = 'That resistor is ' + ohmLabel(wrongVal.ohms) + ' but this job needs ' + ohmLabel(ohms) + '. Click the resistor to change it.'; return it; }
    if (ctx.nets.same(a, b)) { it.status = 'bad'; it.msg = 'These two are joined directly with no resistor in between. Without it things can burn out!'; return it; }
    it.msg = 'Connect them through a ' + ohmLabel(ohms) + ' resistor.';
    return it;
  }
  function simpleItem(ctx, group, id, text, ok, msgTodo, focus) { return base(id, group, text, { status: ok ? 'ok' : 'todo', msg: ok ? '' : msgTodo, focus: focus || [] }); }

  const SPEC = {
    chipbot(c) {
      const out = [];
      out.push(usbItem(c));
      out.push(plugItem(c, 'Servos', 'lhip', 'D2', 'Left hip servo → D2'));
      out.push(plugItem(c, 'Servos', 'rhip', 'D3', 'Right hip servo → D3'));
      out.push(plugItem(c, 'Servos', 'lfoot', 'D4', 'Left foot servo → D4'));
      out.push(plugItem(c, 'Servos', 'rfoot', 'D5', 'Right foot servo → D5'));
      out.push(linkItem(c, 'Ultrasonic eyes', 'hcsr04', 'vcc', 'NET:5V', 'VCC → 5V power'));
      out.push(linkItem(c, 'Ultrasonic eyes', 'hcsr04', 'gnd', 'NET:GND', 'GND → ground'));
      out.push(linkItem(c, 'Ultrasonic eyes', 'hcsr04', 'trig', 'D8.S', 'TRIG → D8'));
      out.push(linkItem(c, 'Ultrasonic eyes', 'hcsr04', 'echo', 'D9.S', 'ECHO → D9'));
      out.push(plugItem(c, 'Bonus', 'buzzer', 'D13', 'Buzzer → D13', { optional: true }));
      return out;
    },
    peeko(c) {
      const out = [];
      out.push(usbItem(c));
      out.push(linkItem(c, 'OLED screen', 'oled', 'gnd', 'NET:GND', 'GND → ground'));
      out.push(linkItem(c, 'OLED screen', 'oled', 'vcc', 'NET:5V', 'VCC → 5V power'));
      out.push(linkItem(c, 'OLED screen', 'oled', 'sda', 'A4.S', 'SDA → A4 (the data wire)'));
      out.push(linkItem(c, 'OLED screen', 'oled', 'scl', 'A5.S', 'SCL → A5 (the clock wire)'));
      moduleItems(c, 'Head servo', 'head', 'D9', 'Head servo', out);
      moduleItems(c, 'Bonus', 'buzzer', 'D8', 'Buzzer', out, true);
      return out;
    },
    jarvis(c) {
      const out = [];
      out.push(usbItem(c));
      moduleItems(c, 'Soil sensor', 'soil', 'A0', 'Soil sensor', out);
      const ldr = c.part('ldr');
      const ldrIt = base('ldr.divider', 'Light sensor', 'LDR between 5V and A1', { focus: ldr ? [ldr.id + '.a', ldr.id + '.b', 'A1.S'] : ['bin:ldr'] });
      if (!ldr) { ldrIt.msg = 'Drag the light sensor (LDR) onto the breadboard.'; }
      else if ((c.nets.same(ldr.id + '.a', 'NET:5V') && c.nets.same(ldr.id + '.b', 'A1.S')) || (c.nets.same(ldr.id + '.b', 'NET:5V') && c.nets.same(ldr.id + '.a', 'A1.S'))) ldrIt.status = 'ok';
      else { ldrIt.msg = 'One LDR leg goes to 5V power and the other leg to A1.'; const w = c.boardNames(ldr.id + '.a').concat(c.boardNames(ldr.id + '.b')); if (w.length) { ldrIt.status = 'bad'; ldrIt.msg = 'The LDR legs reach ' + w.join(' and ') + '. One leg must reach 5V power and the other must reach A1.'; } }
      out.push(ldrIt);
      out.push(resistorBetween(c, 'Light sensor', 'ldr.pulldown', 'A1.S', 'NET:GND', 10000, '10kΩ resistor between A1 and ground'));
      const led = c.part('rgb');
      if (!led) {
        out.push(base('rgb.k', 'RGB light', 'RGB LED long leg (K) → ground', { msg: 'Drag the RGB LED onto the breadboard.', focus: ['bin:rgb'] }));
        ['Red', 'Green', 'Blue'].forEach((n, i) => out.push(base('rgb.' + 'rgb'[i], 'RGB light', n + ' leg ← 220Ω resistor ← ' + ['D9', 'D10', 'D11'][i], { msg: 'Drag the RGB LED onto the breadboard first.', focus: ['bin:rgb'] })));
      } else {
        const k = base('rgb.k', 'RGB light', 'RGB LED long leg (K) → ground', { focus: [led.id + '.k', 'NET:GND'], ghost: [[led.id + '.k', 'NET:GND']] });
        if (c.nets.same(led.id + '.k', 'NET:GND')) k.status = 'ok'; else { const w = c.boardNames(led.id + '.k'); if (w.length) { k.status = 'bad'; k.msg = 'K is connected to ' + w.join(' and ') + '. It must go to ground.'; } else k.msg = 'Connect the LED\'s K leg (the longest one) to ground.'; }
        out.push(k);
        [['r', 'D9', 'Red'], ['g', 'D10', 'Green'], ['b', 'D11', 'Blue']].forEach((x) => {
          out.push(resistorBetween(c, 'RGB light', 'rgb.' + x[0], x[1] + '.S', led.id + '.' + x[0], 220, x[2] + ' leg ← 220Ω resistor ← ' + x[1]));
        });
      }
      moduleItems(c, 'Buzzer', 'buzzer', 'D8', 'Buzzer', out);
      return out;
    }
  };
  // a 3-pin module on a plain Uno: three jumper wires (signal to its pin, power to 5V, ground to GND)
  function moduleItems(c, group, key, pin, name, out, optional) {
    const o = { optional: !!optional };
    out.push(linkItem(c, group, key, 's', pin + '.S', name + ' signal → ' + pin, o));
    out.push(linkItem(c, group, key, 'v', 'NET:5V', name + ' power (V) → 5V', o));
    out.push(linkItem(c, group, key, 'g', 'NET:GND', name + ' ground (G) → GND', o));
  }
  function usbItem(c) {
    const p = c.part('usb'), it = base('usb', 'Power & code', 'USB cable plugged into the ' + (boardKind(c.proj) === 'uno' ? 'Arduino Uno' : 'Nano'), { focus: ['USB'] });
    if (!p) { it.msg = 'Drag the USB cable onto the board first.'; it.focus = ['bin:usb']; return it; }
    if (!p.plug || p.plug.to !== 'USB') { it.msg = 'Drag the end of the USB cable onto the USB port on the left of the board.'; return it; }
    it.status = 'ok'; return it;
  }

  function findProblems(ctx) {
    const probs = [], seen = new Set();
    const ids = ctx.nets.ids();
    const roots = {}; ids.forEach((id) => { const r = ctx.nets.root(id); (roots[r] = roots[r] || []).push(id); });
    const rootOf = (n) => ctx.nets.root(n);
    const kind = boardKind(ctx.proj), rP = rootOf('NET:5V'), rG = rootOf('NET:GND'), r3 = rootOf('NET:3V3'), rV = rootOf('NET:VIN');
    if (rP === rG) probs.push({ type: 'short', msg: '⚡ SHORT CIRCUIT! Power (5V) is touching ground. Unplug the USB cable and find the wire that joins them.', focus: [] });
    if (kind === 'uno') {
      if (r3 === rG || rV === rG) probs.push({ type: 'short', msg: '⚡ The ' + (r3 === rG ? '3.3V' : 'VIN') + ' pin is touching ground. That is a short circuit!', focus: [] });
      if (r3 === rP || rV === rP || r3 === rV) probs.push({ type: 'short', msg: '⚡ Two different power pins (5V, 3.3V, VIN) are joined together. Use only 5V.', focus: [] });
    }
    const pinsByRoot = {};
    signalList(kind).forEach((p) => { const r = rootOf(p + '.S'); (pinsByRoot[r] = pinsByRoot[r] || []).push(p); });
    Object.keys(pinsByRoot).forEach((r) => {
      const pins = pinsByRoot[r];
      if (pins.length > 1 && !seen.has(r)) { seen.add(r); probs.push({ type: 'joined', msg: pins.join(' and ') + ' are connected together. Each pin should do its own job.', focus: pins.map((p) => p + '.S') }); }
      if (pins.length >= 1 && (r === rP || r === rG || r === r3 || r === rV)) probs.push({ type: 'power', msg: pins[0] + ' is wired straight to ' + (r === rG ? 'ground' : 'power') + '. A signal pin should only go to its sensor.', focus: [pins[0] + '.S'] });
    });
    return probs;
  }

  function check(proj, state) {
    const ctx = makeCtx(proj, state);
    const items = SPEC[proj](ctx);
    const problems = findProblems(ctx);
    const req = items.filter((i) => !i.optional || i.status === 'ok' || i.status === 'bad');
    const done = req.filter((i) => i.status === 'ok').length;
    const complete = req.every((i) => i.status === 'ok') && problems.length === 0;
    return { items, problems, done, total: req.length, complete };
  }

  /* ---------- known-good circuits (for "show me", and so tests can prove the checker) ---------- */
  function solution(proj) {
    const st = newState(proj), add = (k, x, y) => addPart(st, k, x, y), plug = (k, to) => { const p = st.parts.find((q) => q.key === k); p.plug = { to, flip: false }; }, w = (a, b) => addWire(st, a, b);
    const seat = (id, col, row, ohms) => { const p = st.parts.find((q) => q.id === id); p.seat = { bb: bb.id, col, row }; if (ohms) p.ohms = ohms; };
    let bb = null;
    add('usb', 110, 110); plug('usb', 'USB');
    if (proj === 'chipbot') {
      [['lhip', 150, 110, 'D2'], ['rhip', 270, 110, 'D3'], ['lfoot', 390, 110, 'D4'], ['rfoot', 510, 110, 'D5']].forEach(([k, x, y, pin]) => { add(k, x, y); plug(k, pin); });
      const hc = add('hcsr04', 660, 120);
      w(hc.id + '.vcc', 'D8.V'); w(hc.id + '.gnd', 'D8.G'); w(hc.id + '.trig', 'D8.S'); w(hc.id + '.echo', 'D9.S');
      add('buzzer', 610, 150); plug('buzzer', 'D13');
    } else if (proj === 'peeko') {
      bb = add('breadboard', L.bb.x, L.bb.y);
      w('PWR.5V', bb.id + '#T+1'); w('PWR.GND1', bb.id + '#T-1');
      const sv = add('head', 250, 120); w(sv.id + '.s', 'D9.S'); w(sv.id + '.v', bb.id + '#T+3'); w(sv.id + '.g', bb.id + '#T-3');
      const bz = add('buzzer', 470, 130); w(bz.id + '.s', 'D8.S'); w(bz.id + '.v', bb.id + '#T+5'); w(bz.id + '.g', bb.id + '#T-5');
      const o = add('oled', 880, 660); w(o.id + '.vcc', bb.id + '#T+7'); w(o.id + '.gnd', bb.id + '#T-7'); w(o.id + '.sda', 'A4.S'); w(o.id + '.scl', 'A5.S');
    } else {
      bb = add('breadboard', L.bb.x, L.bb.y);
      w('PWR.5V', bb.id + '#T+1'); w('PWR.GND1', bb.id + '#T-1');
      const so = add('soil', 250, 130); w(so.id + '.s', 'A0.S'); w(so.id + '.v', bb.id + '#T+3'); w(so.id + '.g', bb.id + '#T-3');
      const bz = add('buzzer', 470, 130); w(bz.id + '.s', 'D8.S'); w(bz.id + '.v', bb.id + '#T+5'); w(bz.id + '.g', bb.id + '#T-5');
      const ldr = add('ldr'); seat(ldr.id, 2, 'c');
      const r10 = add('resistor'); seat(r10.id, 4, 'd', 10000);
      w(bb.id + '#T+2', bb.id + '#2a'); w('A1.S', bb.id + '#4a'); w(bb.id + '#T-8', bb.id + '#8a');
      const led = add('rgb'); seat(led.id, 13, 'a');
      const rr = add('resistor'); seat(rr.id, 9, 'b', 220);
      const rg = add('resistor'); seat(rg.id, 11, 'c', 220);
      const rb = add('resistor'); seat(rb.id, 12, 'd', 220);
      w('D9.S', bb.id + '#9a'); w('D10.S', bb.id + '#11a'); w('D11.S', bb.id + '#12a'); w(bb.id + '#T-14', bb.id + '#14b');
    }
    return st;
  }

  /* position of any terminal for drawing wires and ghosts */
  function seatXY(part, state) {
    const b = state.parts.find((q) => q.id === part.seat.bb); if (!b) return null; return holeXY(part.seat.col, part.seat.row);
  }
  function partOrigin(part, state) {
    if (part.type === 'breadboard') return { x: L.bb.x, y: L.bb.y };
    if (part.seat) return seatXY(part, state) || { x: part.x, y: part.y };
    return { x: part.x, y: part.y };
  }
  function termPos(id, state) {
    const b = boardTermPos(id, boardKind(state.proj)); if (b) return b;
    const h = holePos(id); if (h) return h;
    const m = /^([a-z0-9]+)\.([a-z]+)$/.exec(id); if (!m) return null;
    const part = state.parts.find((p) => p.id === m[1]); if (!part) return null;
    const def = defFor(part, state), o = partOrigin(part, state);
    if (def.terms && def.terms[m[2]]) return { x: o.x + def.terms[m[2]][0], y: o.y + def.terms[m[2]][1] };
    if (def.legs && def.legs[m[2]]) { const l = def.legs[m[2]]; return { x: o.x + l[0], y: o.y + l[1] }; }
    return null;
  }

  return { L, PARTS, INV, ROWS, DIG, ANA, OHMS, ohmLabel, legsKind, invOf, newState, addPart, addWire, buildNets, check, solution, termPos, partOrigin, boardTermPos, headerCenter, holeXY, holePos, canon, legHoles, SIGNAL, signalList, boardKind, usbPos, defFor, UNO_PINS };
});
