// node tests/bringup_tests.js   The pre-flash bring-up sketches must compile for their real boards
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const CLI = '/Applications/Arduino IDE.app/Contents/Resources/app/lib/backend/resources/arduino-cli';
const LIBS = [process.env.HOME + '/Documents/Arduino/libraries', process.env.HOME + '/Library/Arduino15/libraries'];
const BOARDS = { chipbot: 'arduino:avr:nano:cpu=atmega328', peeko: 'arduino:avr:uno', jarvis: 'arduino:avr:uno' };
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
if (!fs.existsSync(CLI)) { console.log('  (arduino-cli not found, skipping)'); process.exit(0); }
Object.keys(BOARDS).forEach((id) => {
  const dir = path.join(__dirname, '..', 'firmware', 'bringup', id + '_bringup');
  const args = ['compile', '--fqbn', BOARDS[id], '--warnings', 'default', '--build-cache-path', '/tmp/cb_cache', '--build-path', '/tmp/cb_build_bringup_' + id];
  LIBS.forEach((l) => args.push('--libraries', l));
  args.push(dir);
  const r = spawnSync(CLI, args, { encoding: 'utf8', maxBuffer: 1 << 26 });
  const out = (r.stdout || '') + (r.stderr || '');
  ok(r.status === 0, id + ' bring-up does not compile\n' + out.split('\n').filter((l) => /error/i.test(l)).slice(0, 6).join('\n'));
  const prog = out.match(/Sketch uses (\d+) bytes \((\d+)%\)/), ram = out.match(/Global variables use (\d+) bytes/);
  if (prog && ram) console.log(('  ' + id + ' bring-up').padEnd(26) + 'flash ' + prog[2] + '%   RAM ' + ram[1] + ' B' + (id === 'peeko' ? ' + 1024 B display buffer' : ''));
  if (id === 'peeko' && ram) ok(2048 - Number(ram[1]) - 1024 > 150, 'peeko bring-up leaves too little RAM');
});
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
