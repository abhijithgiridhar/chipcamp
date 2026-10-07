// node tests/run_all.js [--no-compile]   runs every check: Code Builder sketches, CHIP Challenge levels, Circuit Lab wiring
const { spawnSync } = require('child_process');
const path = require('path');
const extra = process.argv.slice(2);
let bad = 0;
[['Code Builder sketches (compile for a Nano)', 'run_tests.js', extra], ['CHIP Challenge levels', 'logic_tests.js', []], ['Circuit Lab wiring checker', 'lab_tests.js', []]].forEach(([name, file, args]) => {
  process.stdout.write('\n== ' + name + ' ==\n');
  const r = spawnSync(process.execPath, [path.join(__dirname, file)].concat(args), { stdio: 'inherit' });
  if (r.status !== 0) bad++;
});
console.log(bad ? '\nSOMETHING FAILED' : '\nALL GOOD');
process.exit(bad ? 1 : 0);
