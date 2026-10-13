/* Echo Lab: a hidden-room sonar puzzle. Chip Bot cannot see the map. It can ping with its ultrasonic sensor, read the echo time,
   work out how many steps are free, and walk. The engine is plain data, so it can be tested without a browser. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EchoCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const STEP_CM = 20;      // one step of Chip Bot, and one grid square
  const FRONT_CM = 10;     // the sensor sits at the front: 10 cm from the middle of the square to the wall in front
  const US_PER_CM = 58;    // sound goes there and back: 58 microseconds for each centimetre of distance
  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];   // 0 up, 1 right, 2 down, 3 left

  // # hard wall (echoes back)   ~ foam (soaks up the sound: NO echo)   . floor   S start   G goal
  const LEVELS = [
    {
      id: 1, title: 'Hello, echo', concept: 'Time to distance', dir: 1, extra: 3,
      map: ['#######', '#S...G#', '#######'],
      say: 'Chip Bot is in a dark corridor. Press 📡 Ping. The echo comes back after some time. Turn it into steps, type the number, and Chip Bot learns the way. Reach the 🚩.',
      worked: 'Example: an echo of 3,000 µs. Sound travels there and back, so 3,000 ÷ 58 = about 52 cm. The sensor starts 10 cm from the wall of its own square, so 52 − 10 = 42. One step is 20 cm, so 42 ÷ 20 = about 2 steps.'
    },
    {
      id: 2, title: 'Round the corner', concept: 'Ping, walk, turn, ping', dir: 1, extra: 3,
      map: ['#######', '#S....#', '#####.#', '#####G#', '#######'],
      say: 'You can only learn about the way straight ahead. After a turn, ping again!'
    },
    {
      id: 3, title: 'The zig-zag', concept: 'Planning legs', dir: 1, extra: 3,
      map: ['#########', '#S....###', '#####.###', '#####..G#', '#########'],
      say: 'Every straight stretch of the path is a "leg". A good robot spends about one ping per leg.'
    },
    {
      id: 4, title: 'Foam!', concept: 'Why sensors fail', dir: 1, extra: 4,
      map: ['#########', '#S..~..G#', '#.......#', '#########'],
      say: 'Careful. Soft things like foam and curtains soak up sound, so there is NO echo at all. A wall always echoes. If you get silence, something soft is in the way. Find another route.',
      hint: 'No echo means foam ahead. Turn and look for a clear row.'
    },
    {
      id: 5, title: 'Dead ends', concept: 'Mazes', dir: 2, extra: 4,
      map: ['#########', '#S#.....#', '#.#.###.#', '#.#.#G..#', '#.#.#.###', '#...#...#', '#########'],
      say: 'A proper maze. Dead ends cost pings, so think before you press the button.'
    },
    {
      id: 6, title: 'Wobbly sensor', concept: 'Noisy data', dir: 2, extra: 3, jitter: true,
      map: ['#########', '#S..#...#', '#.#.#.#.#', '#.#...#.#', '#.#####.#', '#......G#', '#########'],
      say: 'Real sensors wobble by a centimetre or two. Your answer is the nearest whole number of steps, so round it. Watch out for decoy side rooms.'
    },
    {
      id: 7, title: 'The foam trap', concept: 'Detours', dir: 2, extra: 4,
      map: ['#########', '#S......#', '#.#####.#', '#.#####.#', '#...~..G#', '#########'],
      say: 'One way is blocked by foam you cannot hear. Ping, walk, and bump only if you have to. A bump shows what is there but costs you a star.'
    },
    {
      id: 8, title: 'Pillar room', concept: 'Many ways', dir: 1, extra: 3, jitter: true,
      map: ['#########', '#S......#', '#.#.#.#.#', '#.......#', '#.#.#.#.#', '#......G#', '#########'],
      say: 'A wide room with pillars. Lots of routes, but fewer pings means more stars. How few can you manage?'
    },
    {
      id: 9, title: 'The spiral', concept: 'A tight budget', dir: 1, extra: 1,
      map: ['#########', '#S......#', '#######.#', '#....G#.#', '#.#####.#', '#.......#', '#########'],
      say: 'You only get one spare ping here. Plan every leg before you walk it.'
    },
    {
      id: 10, title: 'The warehouse', concept: 'Everything together', dir: 2, extra: 2, jitter: true,
      map: ['#########', '#S...~..#', '#.###.#.#', '#...#.#.#', '#.#.#...#', '#.#....G#', '#########'],
      say: 'Foam, a wobbly sensor and a small budget. This is the final test for Chip Bot.',
      hint: 'The obvious corridor along the top is a trap. Use your pings on the other way.'
    }
  ];

  function parse(level) {
    const rows = level.map, cells = rows.map((r) => r.split(''));
    let start = null, goal = null;
    cells.forEach((r, y) => r.forEach((c, x) => { if (c === 'S') { start = { x, y }; r[x] = '.'; } if (c === 'G') { goal = { x, y }; r[x] = '.'; } }));
    return { w: rows[0].length, h: rows.length, cells, start, goal };
  }
  const at = (m, x, y) => (y >= 0 && y < m.h && x >= 0 && x < m.w ? m.cells[y][x] : '#');

  // the route with the fewest straight legs from start to goal, as [{ d, n }] (that is the fewest pings a perfect robot needs)
  function shortestLegs(level) {
    const m = parse(level), key = (x, y) => x + ',' + y;
    const from = {}; from[key(m.start.x, m.start.y)] = null;
    let frontier = [{ x: m.start.x, y: m.start.y }];
    while (frontier.length) {
      const next = [];
      for (const c of frontier) {
        if (c.x === m.goal.x && c.y === m.goal.y) {
          const legs = []; let k = key(c.x, c.y);
          while (from[k]) { legs.unshift({ d: from[k].d, n: from[k].n }); k = from[k].prev; }
          return legs;
        }
        for (let d = 0; d < 4; d++) {
          for (let n = 1; at(m, c.x + DX[d] * n, c.y + DY[d] * n) === '.'; n++) {
            const nx = c.x + DX[d] * n, ny = c.y + DY[d] * n, k = key(nx, ny);
            if (k in from) continue;
            from[k] = { prev: key(c.x, c.y), d, n }; next.push({ x: nx, y: ny });
          }
        }
      }
      frontier = next;
    }
    return null;
  }
  function par(level) { const legs = shortestLegs(level); return legs ? legs.length : 0; }
  function budget(level) { return par(level) + (level.extra == null ? 3 : level.extra); }

  const stepsFromEcho = (us) => Math.max(0, Math.round((us / US_PER_CM - FRONT_CM) / STEP_CM));

  function newGame(level) {
    const m = parse(level);
    const known = m.cells.map((r) => r.map(() => 0));    // 0 fog, 1 floor, 2 wall, 3 foam
    known[m.start.y][m.start.x] = 1;
    const g = {
      level, m, x: m.start.x, y: m.start.y, d: level.dir, known,
      pingsLeft: budget(level), pingsUsed: 0, bumps: 0, steps: 0, status: 'play', pending: null, log: [], wrong: 0
    };
    let seed = level.id * 7919;
    const jitter = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return level.jitter ? ((seed >> 8) % 3) - 1 : 0; };   // -1, 0 or +1 cm

    g.turn = function (dir) { if (g.status !== 'play') return; g.d = dir === 'left' ? (g.d + 3) % 4 : (g.d + 1) % 4; g.pending = null; };
    g.ping = function () {
      if (g.status !== 'play') return { ok: false, why: 'over' };
      if (g.pingsLeft <= 0) return { ok: false, why: 'empty' };
      g.pingsLeft--; g.pingsUsed++;
      let k = 1;
      while (at(m, g.x + DX[g.d] * k, g.y + DY[g.d] * k) === '.') k++;
      const hit = at(m, g.x + DX[g.d] * k, g.y + DY[g.d] * k);
      if (hit === '~') { g.pending = null; g.log.push({ d: g.d, echo: null }); return { ok: true, echo: false }; }
      const cm = (k - 1) * STEP_CM + FRONT_CM, us = Math.round((cm + jitter()) * US_PER_CM);
      g.pending = { us, steps: k - 1, wall: { x: g.x + DX[g.d] * k, y: g.y + DY[g.d] * k }, from: { x: g.x, y: g.y }, d: g.d };
      g.log.push({ d: g.d, echo: us });
      return { ok: true, echo: true, us };
    };
    // the student works out the number of free steps. Right answer: the squares in front are revealed.
    g.answer = function (n) {
      const p = g.pending; if (!p) return { ok: false, why: 'none' };
      if (Math.round(Number(n)) !== p.steps) { g.wrong++; return { ok: false, why: 'wrong', expected: p.steps }; }
      for (let i = 1; i <= p.steps; i++) known[p.from.y + DY[p.d] * i][p.from.x + DX[p.d] * i] = 1;
      if (p.wall.y >= 0 && p.wall.y < m.h && p.wall.x >= 0 && p.wall.x < m.w) known[p.wall.y][p.wall.x] = 2;
      g.pending = null; g.wrong = 0;
      return { ok: true, steps: p.steps };
    };
    g.forward = function () {
      if (g.status !== 'play') return { ok: false };
      g.pending = null;
      const nx = g.x + DX[g.d], ny = g.y + DY[g.d], c = at(m, nx, ny);
      if (c === '.') {
        g.x = nx; g.y = ny; g.steps++; known[ny][nx] = 1;
        if (nx === m.goal.x && ny === m.goal.y) g.status = 'won';
        return { ok: true, moved: true, won: g.status === 'won' };
      }
      g.bumps++;
      if (nx >= 0 && nx < m.w && ny >= 0 && ny < m.h) known[ny][nx] = c === '~' ? 3 : 2;
      return { ok: true, moved: false, bump: c };
    };
    // 3 stars: spent no more pings than there are legs in the best route. A bump costs a star.
    g.stars = function () {
      const p = par(level);
      let s = g.pingsUsed <= p ? 3 : g.pingsUsed <= p + 2 ? 2 : 1;
      if (g.bumps > 0) s = Math.max(1, s - 1);
      return s;
    };
    g.stuck = () => g.status === 'play' && g.pingsLeft <= 0 && !g.pending;
    return g;
  }

  // plays the best route with perfect knowledge (used by the tests)
  function playReference(level) {
    const g = newGame(level), legs = shortestLegs(level);
    legs.forEach((leg) => {
      while (g.d !== leg.d) g.turn(((leg.d - g.d + 4) % 4) === 3 ? 'left' : 'right');
      const r = g.ping();
      if (r.echo) { const a = g.answer(stepsFromEcho(r.us)); if (!a.ok) throw new Error('reference answer wrong on level ' + level.id); }
      for (let i = 0; i < leg.n; i++) g.forward();
    });
    return g;
  }

  return { LEVELS, STEP_CM, FRONT_CM, US_PER_CM, DX, DY, parse, shortestLegs, par, budget, stepsFromEcho, newGame, playReference };
});
