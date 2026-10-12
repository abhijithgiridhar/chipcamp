// node tests/testsketch_tests.js   the "test my robot" sketches must compile for their real boards
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const CLI = '/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli';
const LIBS = [process.env.HOME + '/Documents/Arduino/libraries', process.env.HOME + '/Library/Arduino15/libraries'];
const BOARDS = { chipbot: 'arduino:avr:nano:cpu=atmega328', peeko: 'arduino:avr:uno', jarvis: 'arduino:avr:uno' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
Object.keys(BOARDS).forEach((id) => {
  const dir = path.join(__dirname, '..', 'firmware', 'test', id + '_test');
  const src = fs.readFileSync(path.join(dir, id + '_test.ino'), 'utf8');
  ok(/void setup\(\)/.test(src) && /void loop\(\)/.test(src), id + ' test sketch has setup and loop');
  ok(!/[^\x00-\x7F]/.test(src), id + ' test sketch is plain ASCII');
  if (!fs.existsSync(CLI) || process.argv.includes('--no-compile')) return;
  const args = ['compile', '--fqbn', BOARDS[id], '--warnings', 'default', '--build-cache-path', '/tmp/cb_cache', '--build-path', '/tmp/cb_build_test_' + id];
  LIBS.forEach((l) => args.push('--libraries', l));
  args.push(dir);
  const r = spawnSync(CLI, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = (r.stdout || '') + (r.stderr || '');
  ok(r.status === 0, id + ' test sketch does not compile\n' + out.split('\n').filter((l) => /error/i.test(l)).slice(0, 6).join('\n'));
  const prog = out.match(/Sketch uses (\d+) bytes \((\d+)%\)/), ram = out.match(/Global variables use (\d+) bytes/);
  if (prog && ram) console.log(('  ' + id + ' test').padEnd(24) + 'flash ' + prog[2] + '%   RAM ' + ram[1] + ' B' + (id === 'peeko' ? ' + 1024 B display buffer' : ''));
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
