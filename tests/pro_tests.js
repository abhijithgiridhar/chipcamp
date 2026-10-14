// node tests/pro_tests.js   the Pro sketches (kept private) must build from the base code and compile for the real boards
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const Core = require('../src/core.js');
const CLI = '/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli';
const LIBS = [process.env.HOME + '/Documents/Arduino/libraries', process.env.HOME + '/Library/Arduino15/libraries'];
const BOARDS = { chipbot: 'arduino:avr:nano:cpu=atmega328', peeko: 'arduino:avr:uno', jarvis: 'arduino:avr:uno' };
const dir = path.join(__dirname, '..', 'session-plan', 'pro');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
if (!fs.existsSync(dir)) { console.log('  (no session-plan/pro folder here, skipping)'); process.exit(0); }
const noCompile = process.argv.includes('--no-compile') || !fs.existsSync(CLI);
// the Chip Bot upload desk sketch (what the facilitator puts on every robot) must compile with the Otto library
(function () {
  const pro = require(path.join(dir, 'chipbot.pro.js'));
  ok(typeof pro.desk === 'string' && /@@ID@@/.test(pro.desk), 'chipbot desk sketch with an @@ID@@ placeholder');
  const text = pro.desk.split('@@ID@@').join('CB-TEST');
  ok(/void setup\(\)/.test(text) && /void loop\(\)/.test(text) && /Servo/.test(text) && !/Otto/.test(text), 'chipbot desk sketch has setup, loop and uses only the Servo library');
  ok(!/[^\x00-\x7F]/.test(text), 'chipbot desk sketch is plain ASCII');
  const out = path.join(__dirname, 'out', 'chipbot_desk', 'chipbot_desk'); fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, 'chipbot_desk.ino'), text);
  if (noCompile) return;
  const args = ['compile', '--fqbn', BOARDS.chipbot, '--build-cache-path', '/tmp/cb_cache', '--build-path', '/tmp/cb_build_desk'];
  LIBS.forEach((l) => args.push('--libraries', l)); args.push(out);
  const r = spawnSync(CLI, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  ok(r.status === 0, 'chipbot desk sketch does not compile\n' + ((r.stdout || '') + (r.stderr || '')).split('\n').filter((l) => /error/i.test(l)).slice(0, 6).join('\n'));
  console.log('  chipbot desk sketch compiles');
})();
Object.keys(BOARDS).forEach((id) => {
  const pro = require(path.join(dir, id + '.pro.js'));
  const st = Core.newState(id); st.builder = 'Aarav'; st.robot = 'Zippy'; st.date = '14 Oct 2026';
  let text = '';
  try { text = Core.generate(id, st, { pro }).text; } catch (e) { ok(false, id + ': ' + e.message); return; }
  ok(/void setup\(\)/.test(text) && /void loop\(\)/.test(text), id + ' pro sketch has setup and loop');
  ok(!/@@/.test(text) && !/[]/.test(text), id + ' pro sketch has no leftover markers');
  ok(!/[^\x00-\x7F]/.test(text.replace(/·|—/g, '')), id + ' pro sketch is plain ASCII');
  ok(pro.features.length >= 4 && pro.blurb.length > 40, id + ' pro has a blurb and features');
  const out = path.join(__dirname, 'out', id + '_pro');
  fs.mkdirSync(out, { recursive: true }); fs.writeFileSync(path.join(out, id + '_pro.ino'), text);
  if (noCompile) return;
  const args = ['compile', '--fqbn', BOARDS[id], '--warnings', 'default', '--build-cache-path', '/tmp/cb_cache', '--build-path', '/tmp/cb_build_pro_' + id];
  LIBS.forEach((l) => args.push('--libraries', l)); args.push(out);
  const r = spawnSync(CLI, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  const o = (r.stdout || '') + (r.stderr || '');
  ok(r.status === 0, id + ' pro does not compile\n' + o.split('\n').filter((l) => /error/i.test(l)).slice(0, 8).join('\n'));
  const prog = o.match(/Sketch uses (\d+) bytes \((\d+)%\)/), ram = o.match(/Global variables use (\d+) bytes/);
  if (prog && ram) {
    const extra = (id === 'peeko' || id === 'jarvis') ? 1024 : 0, free = 2048 - Number(ram[1]) - extra;
    ok(free > 120, id + ' pro leaves too little RAM (' + free + ' B)');
    console.log(('  ' + id + ' pro').padEnd(22) + 'flash ' + prog[2] + '%   RAM ' + ram[1] + ' B' + (extra ? ' + 1024 B display buffer' : '') + '  → ~' + free + ' B free');
  }
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
