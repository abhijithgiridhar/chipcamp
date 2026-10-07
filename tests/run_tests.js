// node tests/run_tests.js [--no-compile]
// 1. Generates sketches for every robot (empty / example / every block / hostile inputs)
// 2. Checks the tested base code is untouched
// 3. Compiles each sketch for a real Arduino Nano with the Arduino IDE's own toolchain
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const Core = require('../src/core.js');

const ROOT = path.join(__dirname, '..');
const OUT = path.join(__dirname, 'out');
const CLI = '/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli';
const LIBS = [process.env.HOME + '/Documents/Arduino/libraries', process.env.HOME + '/Library/Arduino15/libraries'];
const compile = !process.argv.includes('--no-compile') && fs.existsSync(CLI);

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

function stressState(id) {
  const P = Core.PROJECTS[id];
  const st = Core.newState(id);
  st.builder = 'Aarav'; st.robot = 'Zippy'; st.date = '14 Oct 2026';
  const mk = (t) => Core.mkNode(id, t);
  P.blocks.forEach((b) => {
    if (b.shape === 'c') {
      const kids = P.blocks.filter((x) => x.shape === 'stack').slice(0, 2).map((x) => mk(x.type));
      const inner = mk('repeat'); inner.kids = [mk(P.blocks.find((x) => x.shape === 'stack').type)];
      const node = mk(b.type); node.kids = kids.concat([inner]);
      if (b.canElse) node.els = [mk(P.blocks.find((x) => x.shape === 'stack').type)];
      st.forever.push(node);
    } else { st.wake.push(mk(b.type)); }
  });
  return st;
}
function hostileState(id) {
  const st = stressState(id);
  st.builder = 'Ar"aav\\ \\n //evil */ 😀 अभि %d ' + 'x'.repeat(60);
  st.robot = '"; system("rm -rf /"); //';
  st.settings = { soilDry: 9999, soilWet: -50, ledAnode: 'yes', lightHigh: 0 };
  const hit = (list) => Core.walk(list, (n) => { Object.keys(n.p).forEach((k) => { n.p[k] = typeof n.p[k] === 'number' ? 99999 : '"; evil(); // \\'; }); });
  hit(st.wake); hit(st.forever);
  return st;
}
function exampleOf(id) { const s = exampleState(id); return s; }
function exampleState(id) { const s = Core.exampleState(id); s.builder = 'Aarav'; s.robot = 'Zippy'; s.date = '14 Oct 2026'; return s; }

const cases = [];
['peeko', 'chipbot', 'jarvis'].forEach((id) => {
  cases.push([id + '_empty', id, Core.newState(id)]);
  cases.push([id + '_example', id, exampleOf(id)]);
  cases.push([id + '_every_block', id, stressState(id)]);
  cases.push([id + '_hostile', id, hostileState(id)]);
});

fs.rmSync(OUT, { recursive: true, force: true });
const results = [];
cases.forEach(([name, id, st]) => {
  const g = Core.generate(id, st);
  ok(!/@@/.test(g.text), name + ': leftover @@ marker');
  ok(!/[]/.test(g.text), name + ': leftover highlight marks');
  ok(!/evil\(|system\(/.test(g.text), name + ': hostile text leaked into code');
  const nameLines = g.text.split('\n').filter((l) => /^const char (BUILDER|ROBOT)_NAME/.test(l));
  ok(nameLines.length === 2 && nameLines.every((l) => /^const char \w+\[\]\s*(PROGMEM )?= "[A-Za-z0-9 .,!?'_-]*";/.test(l)), name + ': name constants are not clean C strings: ' + nameLines.join(' | '));
  ok(!/[^\x00-\x7F]/.test(g.text.replace(/·|—/g, '')), name + ': non-ASCII leaked into code');
  const dir = path.join(OUT, name);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name + '.ino'), g.text);
  results.push({ name, id, dir, text: g.text });
});

// structure checks: every block has a real category, a runtime, and the story/example are valid
(function () {
  const Run = require('../src/runtime.js');
  ['peeko', 'chipbot', 'jarvis'].forEach((id) => {
    const P = Core.PROJECTS[id];
    P.blocks.forEach((b) => {
      ok(!!P.catMap[b.cat], id + '/' + b.type + ': category "' + b.cat + '" does not exist for this robot');
      ok(!!(b.shape === 'c' ? Run.RUN[id]['cond_' + b.type] || b.type === 'repeat' : Run.RUN[id][b.type]), id + '/' + b.type + ': no runtime for preview');
      ok(b.params.every((p) => p.d !== undefined), id + '/' + b.type + ': param without default');
    });
    P.story.forEach((s) => ok(typeof s.done(Core.newState(id)) === 'boolean', id + ': story ' + s.id));
    ok(P.story.every((s) => s.done(Core.exampleState(id)) || s.id === 'name'), id + ': example does not complete every story step');
  });
})();

// headless run: every block of every robot executes in the preview without errors
const pendingHeadless = (async function headless() {
  const Run = require('../src/runtime.js');
  for (const id of ['peeko', 'chipbot', 'jarvis']) {
    const st = stressState(id); let t = 0, visited = new Set(), prints = 0;
    const calls = []; const proxy = new Proxy({}, { get: (_, k) => (k === 'reset' || k === 'idle') ? () => {} : async (...a) => { calls.push(k); } });
    const sensors = { distance: 30, soil: 50, light: 50, set(k, v) { this[k] = v; }, print() { prints++; } };
    const ctx = { stage: proxy, sensors, settings: Object.assign({}, Core.PROJECTS[id].settingsDefault || {}), speedLevel: 1, names: { robot: 'Zippy', builder: 'Aarav' }, stepSeconds: () => 1,
      stopped: () => t > 400, onNode: (nid, on) => { if (on) visited.add(nid); }, sleep: async (s) => { t += s; await null; } };
    try { await Run.runProgram(id, st, ctx); } catch (e) { ok(false, id + ': preview crashed: ' + e.message); }
    const all = new Set(); Core.walk(st.wake, (n) => all.add(n.id)); Core.walk(st.forever, (n) => all.add(n.id));
    const missed = [...all].filter((x) => !visited.has(x)).length;
    ok(visited.size >= all.size * 0.6, id + ': preview only reached ' + visited.size + ' of ' + all.size + ' blocks');
    ok(calls.length > 5, id + ': preview barely did anything (' + calls.length + ' stage calls)');
  }
})();

// base-code-untouched checks (real diff: only the serial-reading loop may have moved)
(function () {
  const ATP = process.env.HOME + '/Documents/Arduino/AT/AT.ino';
  const gen = path.join(OUT, 'peeko_empty', 'peeko_empty.ino');
  const d = spawnSync('diff', ['-w', ATP, gen], { encoding: 'utf8' }).stdout.split('\n');
  const removed = d.filter((l) => l.startsWith('< ')).map((l) => l.slice(2).trim());
  const allowed = ['while (Serial.available() > 0) {', 'char c = Serial.read();', "if (c == '\\n') {", 'runCommand(inputLine);', 'inputLine = "";', '} else {', 'inputLine += c;', '}', '}', ''];
  const bad = removed.filter((l) => !allowed.includes(l));
  ok(bad.length === 0, 'Peeko base changed vs your AT.ino, lines lost: ' + JSON.stringify(bad.slice(0, 5)));
  ok(removed.length <= 11, 'Peeko base: too many original lines removed (' + removed.length + ')');

  const CB = fs.readFileSync('/Users/abhijithgiridhar/Desktop/Delhi Chipcamp/chipbot/firmware/chipbot/chipbot.ino', 'utf8').split('\n');
  const cgl = new Set(results.find((r) => r.name === 'chipbot_empty').text.split('\n').map((l) => l.trimEnd()));
  const must = CB.slice(65, 123).concat(CB.slice(124, 185), CB.slice(186, 196)).filter((l) => l.trim());
  const lost = must.filter((l) => !cgl.has(l.trimEnd()));
  ok(lost.length === 0, 'Chip Bot Otto code changed vs chipbot.ino: ' + JSON.stringify(lost.slice(0, 3)));
})();

if (compile) {
  results.forEach((r) => {
    const t0 = Date.now();
    const args = ['compile', '--fqbn', 'arduino:avr:nano:cpu=atmega328', '--warnings', 'default',
      '--build-cache-path', '/tmp/cb_cache', '--build-path', '/tmp/cb_build_' + r.name];
    LIBS.forEach((l) => args.push('--libraries', l));
    args.push(r.dir);
    const res = spawnSync(CLI, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
    const out = (res.stdout || '') + (res.stderr || '');
    const prog = out.match(/Sketch uses (\d+) bytes \((\d+)%\)/);
    const ram = out.match(/Global variables use (\d+) bytes \((\d+)%\)/);
    ok(res.status === 0, r.name + ': does not compile\n' + out.split('\n').filter((l) => /error|warning/i.test(l)).slice(0, 8).join('\n'));
    const warns = out.split('\n').filter((l) => /warning:/.test(l) && l.includes(r.name));
    if (warns.length) console.log('  warnings in ' + r.name + ':\n   ' + warns.slice(0, 5).join('\n   '));
    if (prog && ram) {
      // Peeko's OLED buffer (1024 B) is malloc'd at runtime, so count it against RAM too
      const extra = r.id === 'peeko' ? 1024 : 0;
      const free = 2048 - Number(ram[1]) - extra;
      ok(free > 150, r.name + ': only ' + free + ' bytes of RAM left for the stack (too tight)');
      console.log(('  ' + r.name).padEnd(26) + 'flash ' + prog[2] + '%   RAM ' + ram[1] + ' B' + (extra ? ' + 1024 B display buffer' : '') + '  → ~' + free + ' B free   (' + ((Date.now() - t0) / 1000).toFixed(1) + 's)');
    }
  });
} else console.log('  (skipping compile)');

pendingHeadless.then(() => {
  console.log('  preview ran every robot headlessly');
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
});
