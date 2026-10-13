// node tests/echo_tests.js   Echo Lab: every level is solvable, the maths works, foam is silent, and stars make sense
const E = require('../src/echocore.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };

ok(E.LEVELS.length === 10, 'ten levels');
E.LEVELS.forEach((lv) => {
  const m = E.parse(lv), tag = 'level ' + lv.id + ' (' + lv.title + ')';
  ok(m.start && m.goal, tag + ': has S and G');
  ok(lv.map.every((r) => r.length === m.w), tag + ': rows are the same width');
  ok(lv.map[0].split('').every((c) => c === '#') && lv.map[m.h - 1].split('').every((c) => c === '#') && lv.map.every((r) => r[0] === '#' && r[m.w - 1] === '#'), tag + ': closed border');
  const legs = E.shortestLegs(lv);
  ok(!!legs, tag + ': goal reachable without crossing foam');
  if (!legs) return;
  const g = E.playReference(lv);
  ok(g.status === 'won', tag + ': reference route wins');
  ok(g.bumps === 0, tag + ': reference route never bumps');
  ok(g.pingsUsed === E.par(lv) && g.stars() === 3, tag + ': reference gets 3 stars with par pings (' + g.pingsUsed + ' vs ' + E.par(lv) + ')');
  ok(E.budget(lv) > E.par(lv), tag + ': budget leaves room');
});

// the echo maths: every wall distance from 1 to 8 free steps gives the right step count, with a +-1 cm wobble too
for (let steps = 0; steps <= 8; steps++) {
  const cm = steps * E.STEP_CM + E.FRONT_CM;
  [-1, 0, 1].forEach((j) => ok(E.stepsFromEcho(Math.round((cm + j) * E.US_PER_CM)) === steps, 'echo maths for ' + steps + ' steps (jitter ' + j + ')'));
}

// level 1 by hand: ping, the echo is 5,220 microseconds, 4 steps
(function () {
  const g = E.newGame(E.LEVELS[0]);
  const r = g.ping(); ok(r.echo && r.us === 5220, 'level 1 echo is 5220 us, got ' + r.us);
  ok(!g.answer(3).ok && g.wrong === 1, 'wrong answer is refused');
  ok(g.known[1][2] === 0, 'nothing is revealed by a wrong answer');
  ok(g.answer(4).ok && g.known[1][5] === 1 && g.known[1][6] === 2, 'right answer reveals the squares and the wall');
  for (let i = 0; i < 4; i++) g.forward();
  ok(g.status === 'won' && g.stars() === 3, 'walks to the flag with 3 stars');
})();

// foam is silent and a bump reveals it
(function () {
  const g = E.newGame(E.LEVELS[3]);
  const r = g.ping(); ok(r.ok && r.echo === false && g.pending === null, 'foam gives no echo');
  g.forward(); g.forward();               // (2,1) (3,1)
  const b = g.forward();                  // foam at (4,1)
  ok(b.moved === false && b.bump === '~' && g.known[1][4] === 3 && g.bumps === 1, 'bump into foam reveals it');
  ok(g.stars() === 2 || g.stars() === 1, 'a bump costs a star');
})();

// running out of pings, walls and turning
(function () {
  const g = E.newGame(E.LEVELS[1]);
  const b = E.budget(E.LEVELS[1]); for (let i = 0; i < b; i++) g.ping();
  ok(g.ping().why === 'empty', 'no pings left');
  ok(g.stuck() === true || g.pending !== null, 'stuck detected when out of pings');
  const h = E.newGame(E.LEVELS[1]); h.turn('right'); ok(h.d === 2, 'turn right from east faces south'); h.turn('left'); h.turn('left'); ok(h.d === 0, 'turn left twice faces north');
  const w = h.forward(); ok(w.moved === false && h.known[0][1] === 2, 'walking into a hard wall bumps and shows it');
})();

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
