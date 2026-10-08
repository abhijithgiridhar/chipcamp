// node tests/lab_tests.js
const Lab = require('../src/labcore.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const clone = (x) => JSON.parse(JSON.stringify(x));
const find = (r, id) => r.items.find((i) => i.id === id);
const PROJECTS = ['chipbot', 'peeko', 'jarvis'];

PROJECTS.forEach((proj) => {
  const sol = Lab.solution(proj), res = Lab.check(proj, sol);
  ok(res.complete, proj + ': the known-good circuit must pass (' + res.items.filter((i) => i.status !== 'ok').map((i) => i.text).join('; ') + ')');
  ok(res.problems.length === 0, proj + ': known-good circuit has problems');

  // an empty bench is not complete and nothing is wrongly "ok"
  const empty = Lab.check(proj, Lab.newState(proj));
  ok(!empty.complete, proj + ': empty bench must not be complete');
  ok(empty.items.every((i) => i.status !== 'ok' && i.status !== 'bad'), proj + ': empty bench should only have todo/optional items');
  ok(empty.problems.length === 0, proj + ': empty bench has no problems');
  ok(empty.items.every((i) => i.status === 'optional' || i.msg), proj + ': every todo item explains what to do');

  // the kit lists only parts the spec knows, within quantity
  const st = Lab.newState(proj);
  Lab.INV[proj].forEach((inv) => { for (let k = 0; k < inv.qty; k++) ok(Lab.addPart(st, inv.key, 0, 0), proj + ': cannot add ' + inv.key); ok(Lab.addPart(st, inv.key, 0, 0) === null, proj + ': quantity limit of ' + inv.key); });
  res.items.forEach((i) => { const key = i.id.split('.')[0]; ok(i.id === 'usb' || i.id.startsWith('ldr') || i.id.startsWith('rgb') || Lab.invOf(proj, key), proj + ': item ' + i.id + ' refers to a part not in the kit'); });

  // removing any required part breaks the circuit
  sol.parts.filter((p) => !(Lab.invOf(proj, p.key) || {}).optional).forEach((p) => {
    if (p.type === 'breadboard' || p.type === 'resistor') return;
    const s = clone(sol); s.parts = s.parts.filter((q) => q.id !== p.id); s.wires = s.wires.filter((w) => !w.a.startsWith(p.id + '.') && !w.b.startsWith(p.id + '.'));
    ok(!Lab.check(proj, s).complete, proj + ': removing ' + p.key + ' should break it');
  });
  // removing any single wire breaks it (every wire in the solution is needed)
  sol.wires.forEach((w) => {
    const s = clone(sol); s.wires = s.wires.filter((x) => x.id !== w.id);
    const r = Lab.check(proj, s);
    const isBonus = /buzzer/.test(w.a + w.b);
    ok(isBonus || !r.complete, proj + ': removing wire ' + w.a + '–' + w.b + ' should break it');
  });
  // every plug: unplugged, flipped, wrong pin
  sol.parts.filter((p) => p.plug && p.plug.to !== 'USB').forEach((p) => {
    const a = clone(sol); a.parts.find((q) => q.id === p.id).plug = null;
    const ra = Lab.check(proj, a); const optional = (Lab.invOf(proj, p.key) || {}).optional; ok(optional ? ra.complete : !ra.complete, proj + ': unplugging ' + p.key + (optional ? ' (a bonus part) is allowed' : ' must break it'));
    const b = clone(sol); b.parts.find((q) => q.id === p.id).plug.flip = true;
    const rb = Lab.check(proj, b); ok(!rb.complete, proj + ': flipping ' + p.key); ok(find(rb, p.key + '.plug').status === 'bad' && /wrong way round/.test(find(rb, p.key + '.plug').msg), proj + ': flipped plug of ' + p.key + ' needs a helpful message');
    const c = clone(sol); c.parts.find((q) => q.id === p.id).plug.to = 'D12';
    const rc = Lab.check(proj, c); ok(!rc.complete, proj + ': wrong pin for ' + p.key); ok(/D12/.test(find(rc, p.key + '.plug').msg) && new RegExp(p.plug.to).test(find(rc, p.key + '.plug').msg), proj + ': wrong-pin message for ' + p.key + ' names both pins: ' + find(rc, p.key + '.plug').msg);
  });
  // short circuits and joined pins are caught wherever they are made
  const uno = Lab.boardKind(proj) === 'uno', PV = uno ? 'PWR.5V' : 'D2.V', PG = uno ? 'PWR.GND2' : 'D3.G', PV2 = uno ? 'PWR.5V' : 'D7.V';
  const s1 = clone(sol); Lab.addWire(s1, PV, PG); const r1 = Lab.check(proj, s1);
  ok(!r1.complete && r1.problems.some((p) => p.type === 'short'), proj + ': 5V to GND wire must be a short circuit');
  const s2 = clone(sol); Lab.addWire(s2, 'D6.S', 'D7.S'); const r2 = Lab.check(proj, s2);
  ok(!r2.complete && r2.problems.some((p) => p.type === 'joined'), proj + ': joining two signal pins must be flagged');
  const s3 = clone(sol); Lab.addWire(s3, 'D6.S', PV2); const r3 = Lab.check(proj, s3);
  ok(!r3.complete && r3.problems.some((p) => p.type === 'power'), proj + ': a signal pin wired to power must be flagged');
  if (uno) {
    const s4 = clone(sol); Lab.addWire(s4, 'PWR.3V3', 'PWR.5V'); const r4 = Lab.check(proj, s4); ok(!r4.complete && r4.problems.some((p) => p.type === 'short'), proj + ': 3.3V joined to 5V must be flagged');
    const s5 = clone(sol); Lab.addWire(s5, 'PWR.VIN', 'PWR.GND1'); ok(!Lab.check(proj, s5).complete, proj + ': VIN to ground must be flagged');
  }
  ok(!JSON.stringify(sol).includes('battery') && !JSON.stringify(sol).includes('EXT.'), proj + ': no battery or external power anywhere (everything runs from the USB cable)');
  ok(Lab.INV[proj].every((i) => i.type !== 'battery'), proj + ': kit must not contain a battery pack');
});

/* ---------- Chip Bot specifics ---------- */
(function () {
  const sol = Lab.solution('chipbot');
  const hc = sol.parts.find((p) => p.key === 'hcsr04');
  // TRIG and ECHO swapped
  const s = clone(sol); s.wires.forEach((w) => { if (w.a === hc.id + '.trig') w.b = 'D9.S'; else if (w.a === hc.id + '.echo') w.b = 'D8.S'; });
  const r = Lab.check('chipbot', s);
  ok(find(r, 'hcsr04.trig').status === 'bad' && /D9/.test(find(r, 'hcsr04.trig').msg) && /D8/.test(find(r, 'hcsr04.trig').msg), 'swapped TRIG/ECHO: message should say it is on D9 but needs D8: ' + find(r, 'hcsr04.trig').msg);
  ok(find(r, 'hcsr04.echo').status === 'bad', 'swapped ECHO is bad');
  // VCC on ground
  const g = clone(sol); g.wires.forEach((w) => { if (w.a === hc.id + '.vcc') w.b = 'D8.G'; });
  const rg = Lab.check('chipbot', g); ok(find(rg, 'hcsr04.vcc').status === 'bad' && /ground/.test(find(rg, 'hcsr04.vcc').msg), 'VCC on ground is explained');
  ok(Lab.boardKind('chipbot') === 'shield' && Lab.boardTermPos('EXT.P', 'shield') === null, 'Chip Bot has no external power terminal');
  // each servo in the wrong slot (swap left/right hips)
  const sw = clone(sol); sw.parts.find((p) => p.key === 'lhip').plug.to = 'D3'; sw.parts.find((p) => p.key === 'rhip').plug.to = 'D2';
  const rs = Lab.check('chipbot', sw); ok(find(rs, 'lhip.plug').status === 'bad' && find(rs, 'rhip.plug').status === 'bad', 'swapped hip servos are both flagged');
  // the optional buzzer: absent is fine, wrong is not
  const nb = clone(sol); nb.parts = nb.parts.filter((p) => p.key !== 'buzzer'); ok(Lab.check('chipbot', nb).complete, 'Chip Bot is complete without the optional buzzer');
  const wb = clone(sol); wb.parts.find((p) => p.key === 'buzzer').plug.to = 'D12'; ok(!Lab.check('chipbot', wb).complete, 'a wrongly plugged bonus buzzer must still be fixed');
})();

/* ---------- Peeko specifics (plain Arduino Uno, jumper wires, breadboard rails) ---------- */
(function () {
  ok(Lab.boardKind('peeko') === 'uno' && Lab.boardKind('jarvis') === 'uno' && Lab.boardKind('chipbot') === 'shield', 'only Chip Bot uses the Nano IO shield');
  const sol = Lab.solution('peeko'), o = sol.parts.find((p) => p.key === 'oled'), sv = sol.parts.find((p) => p.key === 'head');
  const s = clone(sol); s.wires.forEach((w) => { if (w.a === o.id + '.sda') w.b = 'I2C.SCL'; else if (w.a === o.id + '.scl') w.b = 'I2C.SDA'; });
  const r = Lab.check('peeko', s); ok(!r.complete && find(r, 'oled.sda').status === 'bad', 'swapped SDA/SCL is caught');
  ok(/A5/.test(find(r, 'oled.sda').msg), 'SDA on the clock line mentions A5: ' + find(r, 'oled.sda').msg);
  // the Uno's own SDA/SCL pins (next to AREF) are the same wires as A4/A5
  const a = clone(sol); a.wires.forEach((w) => { if (w.a === o.id + '.sda') w.b = 'I2C.SDA'; if (w.a === o.id + '.scl') w.b = 'I2C.SCL'; }); ok(Lab.check('peeko', a).complete, 'the SDA/SCL pins by AREF work exactly like A4/A5');
  // reversed OLED power
  const swap = clone(sol); swap.wires.forEach((w) => { if (w.a === o.id + '.vcc') w.b = 'PWR.GND1'; else if (w.a === o.id + '.gnd') w.b = 'PWR.5V'; });
  const rr = Lab.check('peeko', swap); ok(!rr.complete && find(rr, 'oled.vcc').status === 'bad' && find(rr, 'oled.gnd').status === 'bad', 'reversed OLED power is flagged on both pins');
  // servo wires crossed: signal and ground swapped
  const x = clone(sol); x.wires.forEach((w) => { if (w.a === sv.id + '.s') w.b = 'PWR.GND1'; else if (w.a === sv.id + '.g') w.b = 'D9.S'; });
  const rx = Lab.check('peeko', x); ok(!rx.complete && find(rx, 'head.s').status === 'bad' && /ground/.test(find(rx, 'head.s').msg), 'servo signal on ground is explained: ' + find(rx, 'head.s').msg);
  // servo signal on the wrong pin
  const y = clone(sol); y.wires.forEach((w) => { if (w.a === sv.id + '.s') w.b = 'D10.S'; });
  const ry = Lab.check('peeko', y); ok(find(ry, 'head.s').status === 'bad' && /D10/.test(find(ry, 'head.s').msg) && /D9/.test(find(ry, 'head.s').msg), 'servo on D10 says it needs D9: ' + find(ry, 'head.s').msg);
  // without the breadboard rails everything can still go to the single 5V and GND pins (it works, it is just messier)
  const d = Lab.newState('peeko'); const u = Lab.addPart(d, 'usb', 100, 100); u.plug = { to: 'USB', flip: false };
  const ol = Lab.addPart(d, 'oled', 500, 650), hd = Lab.addPart(d, 'head', 250, 120);
  [[ol.id + '.vcc', 'PWR.5V'], [ol.id + '.gnd', 'PWR.GND1'], [ol.id + '.sda', 'A4.S'], [ol.id + '.scl', 'A5.S'], [hd.id + '.s', 'D9.S'], [hd.id + '.v', 'PWR.5V'], [hd.id + '.g', 'PWR.GND2']].forEach((w) => Lab.addWire(d, w[0], w[1]));
  ok(Lab.check('peeko', d).complete, 'wiring straight to the Uno power pins (no breadboard) is accepted');
  // removing the rail feed breaks everything hanging off the rail
  const nf = clone(sol); nf.wires = nf.wires.filter((w) => w.a !== 'PWR.5V'); ok(!Lab.check('peeko', nf).complete, 'cutting the 5V feed to the rail breaks the circuit');
  // the optional buzzer: absent is fine, wrong is not
  const nb = clone(sol); nb.parts = nb.parts.filter((p) => p.key !== 'buzzer'); nb.wires = nb.wires.filter((w) => !/buzzer/.test(w.a)); ok(Lab.check('peeko', nb).complete, 'Peeko is complete without the optional buzzer');
  const bz = sol.parts.find((p) => p.key === 'buzzer'), wb = clone(sol); wb.wires.forEach((w) => { if (w.a === bz.id + '.s') w.b = 'D12.S'; }); ok(!Lab.check('peeko', wb).complete, 'a wrongly wired bonus buzzer must still be fixed');
})();

/* ---------- Jarvis specifics ---------- */
(function () {
  const sol = Lab.solution('jarvis');
  const resistors = sol.parts.filter((p) => p.type === 'resistor');
  const r10 = resistors.find((r) => r.ohms === 10000), r220 = resistors.filter((r) => r.ohms === 220);
  ok(resistors.length === 4 && r220.length === 3, 'solution should use one 10k and three 220 ohm resistors');
  // 10k pull-down swapped for 220
  let s = clone(sol); s.parts.find((p) => p.id === r10.id).ohms = 220; let r = Lab.check('jarvis', s);
  ok(!r.complete && find(r, 'ldr.pulldown').status === 'bad' && /10kΩ/.test(find(r, 'ldr.pulldown').msg), 'wrong divider resistor value explained: ' + find(r, 'ldr.pulldown').msg);
  // LED resistor wrong value
  s = clone(sol); s.parts.find((p) => p.id === r220[0].id).ohms = 10000; r = Lab.check('jarvis', s); ok(!r.complete && r.items.some((i) => i.id.startsWith('rgb.') && i.status === 'bad' && /220Ω/.test(i.msg)), 'wrong LED resistor value explained');
  // LED connected straight to pin with no resistor (move resistor out, bridge with wire)
  s = clone(sol); const led = s.parts.find((p) => p.type === 'rgb'); s.parts = s.parts.filter((p) => p.id !== r220[0].id); Lab.addWire(s, 'D9.S', led.id + '.r'); r = Lab.check('jarvis', s);
  ok(!r.complete && find(r, 'rgb.r').status === 'bad' && /no resistor/.test(find(r, 'rgb.r').msg), 'LED with no resistor is called out: ' + find(r, 'rgb.r').msg);
  // LED cathode not grounded
  const bbid = sol.parts.find((p) => p.type === 'breadboard').id;
  s = clone(sol); s.wires = s.wires.filter((w) => !(w.a === bbid + '#T-14')); r = Lab.check('jarvis', s); ok(!r.complete && find(r, 'rgb.k').status !== 'ok', 'LED K not grounded');
  s = clone(sol); s.wires.forEach((w) => { if (w.a === bbid + '#T-14') w.a = bbid + '#T+14'; }); r = Lab.check('jarvis', s); ok(find(r, 'rgb.k').status === 'bad' && /5V/.test(find(r, 'rgb.k').msg), 'LED K on 5V explained: ' + find(r, 'rgb.k').msg);
  // LDR divider with both legs on the same side
  s = clone(sol); s.wires.forEach((w) => { if (w.a === bbid + '#T+2') w.a = bbid + '#T-2'; }); r = Lab.check('jarvis', s); ok(!r.complete && find(r, 'ldr.divider').status === 'bad', 'LDR with no 5V is flagged');
  // soil sensor: signal and ground swapped
  const so = sol.parts.find((p) => p.key === 'soil'); s = clone(sol); s.wires.forEach((w) => { if (w.a === so.id + '.s') w.b = bbid + '#T-3'; else if (w.a === so.id + '.g') w.b = 'A0.S'; }); r = Lab.check('jarvis', s); ok(!r.complete && find(r, 'soil.s').status === 'bad', 'soil sensor signal/ground swapped is caught');
  // LDR + pull-down in different columns (not joined) → not connected to A1
  s = clone(sol); s.parts.find((p) => p.type === 'ldr').seat.col = 6; r = Lab.check('jarvis', s); ok(!r.complete, 'moving the LDR to another column breaks the divider');
  // parts floating off the board (not seated): not complete
  s = clone(sol); s.parts.find((p) => p.type === 'ldr').seat = null; r = Lab.check('jarvis', s); ok(!r.complete, 'unseated LDR breaks the circuit');
  // buzzer is required for Jarvis
  s = clone(sol); s.parts = s.parts.filter((p) => p.key !== 'buzzer'); ok(!Lab.check('jarvis', s).complete, 'Jarvis needs its buzzer');
})();

/* ---------- breadboard rules ---------- */
(function () {
  const s = Lab.newState('jarvis'), bb = Lab.addPart(s, 'breadboard', 0, 0), n = (a, b) => Lab.buildNets(s).same(a, b);
  Lab.addWire(s, 'D2.S', bb.id + '#5a'); Lab.addWire(s, 'D3.S', bb.id + '#5f'); Lab.addWire(s, 'D4.S', bb.id + '#5e'); Lab.addWire(s, 'D5.S', bb.id + '#6a'); Lab.addWire(s, 'D6.S', bb.id + '#T+3'); Lab.addWire(s, 'D7.S', bb.id + '#T+17');
  ok(n('D2.S', 'D4.S'), 'holes a and e in a column are joined');
  ok(!n('D2.S', 'D3.S'), 'the two halves of a column are NOT joined (the trench)');
  ok(!n('D2.S', 'D5.S'), 'neighbouring columns are separate');
  ok(n('D6.S', 'D7.S'), 'a whole power rail is one net');
  ok(Lab.holePos(bb.id + '#1a').x < Lab.holePos(bb.id + '#20a').x, 'columns run left to right');
  ok(Lab.holePos(bb.id + '#5e').y < Lab.holePos(bb.id + '#5f').y, 'row f is below row e');
})();

/* ---------- geometry ---------- */
(function () {
  const seen = new Set();
  const ids = [];
  Lab.DIG.forEach((n) => ['S', 'V', 'G'].forEach((t) => ids.push('D' + n + '.' + t)));
  Lab.ANA.forEach((n) => ['S', 'V', 'G'].forEach((t) => ids.push('A' + n + '.' + t)));
  ['GND', 'VCC', 'SDA', 'SCL'].forEach((t) => ids.push('I2C.' + t));
  ids.push('USB');
  ids.forEach((id) => { const p = Lab.boardTermPos(id, 'shield'); ok(!!p, 'board terminal ' + id + ' has a position'); if (p) { const k = p.x + ',' + p.y; ok(!seen.has(k), 'board terminals must not overlap: ' + id); seen.add(k); ok(p.x >= Lab.L.board.x && p.x < Lab.L.board.x + Lab.L.board.w && p.y > Lab.L.board.y && p.y < Lab.L.board.y + Lab.L.board.h, id + ' is inside the board'); } });
  // the Uno: every pin socket exists, is unique and sits inside the board
  const seenU = new Set();
  Lab.UNO_PINS.forEach((q) => { const k = q.x + ',' + q.y; ok(!seenU.has(k), 'Uno pins must not overlap: ' + q.label); seenU.add(k); ok(q.x > Lab.L.uno.x && q.x < Lab.L.uno.x + Lab.L.uno.w && q.y > Lab.L.uno.y && q.y < Lab.L.uno.y + Lab.L.uno.h, 'Uno pin ' + q.label + ' is inside the board'); });
  ['D0', 'D13', 'A0', 'A5'].forEach((n) => ok(!!Lab.boardTermPos(n + '.S', 'uno'), 'Uno has ' + n));
  ['PWR.5V', 'PWR.GND1', 'PWR.GND2', 'PWR.GND3', 'PWR.3V3', 'PWR.VIN', 'I2C.SDA', 'I2C.SCL', 'USB'].forEach((id) => ok(!!Lab.boardTermPos(id, 'uno'), 'Uno has ' + id));
  ok(Lab.boardTermPos('D2.V', 'uno') === null, 'a plain Uno has no V/G pins beside each signal pin');
  // everything the solution places fits on the canvas and no two seated legs share a hole
  PROJECTS.forEach((proj) => {
    const sol = Lab.solution(proj), used = new Set();
    sol.parts.forEach((p) => {
      if (p.seat) { const h = Lab.legHoles(p); Object.keys(h).forEach((t) => { ok(!used.has(h[t]), proj + ': two legs in one hole ' + h[t]); used.add(h[t]); const m = /#(\d+)/.exec(h[t]); ok(+m[1] >= 1 && +m[1] <= Lab.L.bb.cols, proj + ': leg off the breadboard ' + h[t]); }); }
      else { ok(p.x >= 0 && p.x <= Lab.L.W && p.y >= 0 && p.y <= Lab.L.H, proj + ': ' + p.key + ' is on the canvas'); }
    });
    sol.wires.forEach((w) => { ok(!!Lab.termPos(w.a, sol) && !!Lab.termPos(w.b, sol), proj + ': wire ends have positions ' + w.a + ' ' + w.b); });
  });
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
