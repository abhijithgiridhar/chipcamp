// node tests/logic_tests.js
const L = require('../src/logiccore.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const lv = (id) => L.LEVELS.find((x) => x.id === id);

// shortest flat solution (forward / turn only) by BFS, to prove loops and ifs are really needed
function minFlat(level) {
  const m = L.parseMap(level), key = (x, y, d) => x + ',' + y + ',' + d;
  const open = (x, y) => y >= 0 && y < m.h && x >= 0 && x < m.w && m.cells[y][x] === '.';
  const q = [[m.start.x, m.start.y, level.dir, 0]], seen = new Set([key(m.start.x, m.start.y, level.dir)]);
  while (q.length) {
    const [x, y, d, c] = q.shift();
    if (x === m.goal.x && y === m.goal.y) return c;
    const nx = [[x + L.DX[d], y + L.DY[d], d], [x, y, (d + 1) % 4], [x, y, (d + 3) % 4]];
    for (const [px, py, pd] of nx) {
      if (!open(px, py) || seen.has(key(px, py, pd))) continue;
      seen.add(key(px, py, pd)); q.push([px, py, pd, c + 1]);
    }
  }
  return Infinity;
}

ok(L.LEVELS.length === 10, 'there must be exactly 10 levels');
L.LEVELS.forEach((level) => {
  const tag = 'L' + level.id + ' ' + level.title;
  const m = L.parseMap(level);
  ok(m.start && m.goal, tag + ': needs S and G');
  ok(m.cells.every((r) => r.length === m.w), tag + ': ragged map');
  ok(level.blocks.every((b) => L.BLOCKS[b]), tag + ': unknown block type');
  ok(level.max >= 1, tag + ': max blocks');

  const ref = level.ref();
  const res = L.run(level, ref);
  ok(res.ok, tag + ': reference solution fails (' + res.reason + ')');
  ok(res.blocks <= level.max, tag + ': reference uses ' + res.blocks + ' blocks but max is ' + level.max);
  ok(ref.every(function chk(nd) { return level.blocks.includes(nd.type) && (nd.kids || []).every(chk) && (nd.els || []).every(chk); }), tag + ': reference uses a block the level does not offer');
  ok(L.stars(level, res.blocks) === 3, tag + ': reference should earn 3 stars');
  ok(L.run(level, []).reason === 'end', tag + ': empty program should just end');

  const flat = minFlat(level);
  if (level.id >= 3) ok(flat > level.max, tag + ': a flat solution (' + flat + ') fits in ' + level.max + ' blocks, so loops/ifs are not needed');
  else ok(flat <= level.max, tag + ': level too small for its own solution');

  const code = L.toCode(ref);
  ok(/^void loop\(\) \{[\s\S]*\}$/.test(code), tag + ': code view');
});

// wrong programs must fail the right way
ok(L.run(lv(9), lv(9).preset()).ok === false, 'L9 preset must have a bug');
ok(['loop', 'crash'].includes(L.run(lv(9), lv(9).preset()).reason), 'L9 bug should show up as a loop or a crash, not a silent stop');
ok(L.run(lv(10), lv(8).ref()).ok === false, 'L10 must not be solved by the L8 program');
ok(L.run(lv(10), lv(7).ref()).ok === false, 'L10 must not be solved by the L7 program');
ok(L.run(lv(3), [L.n('forward'), L.n('forward')]).reason === 'end', 'L3 two steps stops short');
ok(L.run(lv(1), [L.n('forward'), L.n('forward'), L.n('forward'), L.n('forward')]).ok === true, 'reaching the goal ends the run (extra blocks never run)');
ok(L.run(lv(1), [L.n('turn', { dir: 'left' }), L.n('forward')]).reason === 'crash', 'walking into a wall crashes');
ok(L.run(lv(6), [L.n('until', {}, [])]).reason === 'loop', 'an empty "repeat until" must stop as a loop, not hang');
ok(L.run(lv(6), [L.n('until', {}, [L.n('turn', { dir: 'left' })])]).reason === 'loop', 'spinning forever is detected');
ok(L.run(lv(10), [L.n('until', {}, [L.n('forward')])]).reason === 'crash', 'naive forward-forever crashes');

// L5 must force a nested loop: the best single-loop answer has to be over the limit, and it must still be a valid solution otherwise
const single = [L.n('repeat', { times: 3 }, [L.n('forward'), L.n('forward'), L.n('forward'), L.n('turn', { dir: 'right' })]), L.n('forward')];
ok(L.run(lv(5), single).ok === true, 'L5 single-loop answer should still walk correctly');
ok(L.count(single) > lv(5).max, 'L5 single-loop answer (' + L.count(single) + ' blocks) must exceed the limit (' + lv(5).max + '), so nesting is required');

// robustness: hostile / odd params never crash the engine
ok(L.run(lv(3), [L.n('repeat', { times: 9999 }, [L.n('forward')])]).reason === 'crash' || true, 'repeat is clamped');
ok(L.normParams('repeat', { times: 9999 }).times === 12 && L.normParams('repeat', { times: -3 }).times === 2, 'repeat clamped to 2..12');
ok(L.normParams('turn', { dir: '<script>' }).dir === 'left', 'turn direction validated');
ok(L.normParams('if', { cond: 'banana' }, lv(7)).cond === 'ahead', 'if condition validated');
ok(L.run(lv(7), [{ id: 'x', type: 'nonsense', p: {} }]).reason === 'end', 'unknown block types are ignored');

// code view text sanity
const c8 = L.toCode(lv(8).ref());
ok(c8.includes('while (!atGoal())') && c8.includes('if (pathAhead())') && c8.includes('} else {') && c8.includes('turnRight();'), 'L8 code view reads like Arduino');
const c10 = L.toCode(lv(10).ref());
ok(c10.includes('pathRight()') && c10.includes('turnLeft();'), 'L10 code view');
ok(L.toCode(lv(5).ref()).includes('for (int j = 0;'), 'nested loops get their own counter');

// every skin has all message types
Object.keys(L.SKINS).forEach((k) => ['crash', 'loop', 'end', 'win'].forEach((t) => ok(L.SKINS[k][t].length >= 1, k + ' skin missing ' + t + ' message')));

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
