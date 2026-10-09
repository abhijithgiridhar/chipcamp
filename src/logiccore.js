/* CHIP Challenge: levels and the maze engine. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.LogicCore = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  /* ---------- skins: the same puzzles, themed for each robot's room ---------- */
  const SKINS = {
    chipbot: {
      id: 'chipbot', name: 'Chip Bot', hero: '🤖', goal: 'chip', goalName: 'microchip', color: '#2bb3a3',
      crash: ['💥 BONK! You said “move forward” and Chip Bot did exactly that. Straight into a wall.', '💥 Chip Bot walked into the wall. It only does what you tell it, not what you meant.'],
      loop: ['🌀 Chip Bot is still going… you never told it when to stop. Machines don’t guess!', '🌀 Round and round! Chip Bot will keep following those instructions forever.'],
      end: ['😴 Chip Bot did everything you asked, then stopped. The microchip is still over there.', '🤷 Program finished, but Chip Bot isn’t at the chip. It can’t do anything you didn’t say.'],
      win: ['⚡ Chip Bot got the microchip! Exact instructions work.', '⚡ Chip installed. Chip Bot says thanks!']
    },
    peeko: {
      id: 'peeko', name: 'Peeko', hero: '👀', goal: 'smile', goalName: 'smile', color: '#ff6b5e',
      crash: ['😳 Peeko’s eyes slid right off the edge! It does exactly what you say and nothing more.', '😳 Oops, Peeko looked straight into a wall. It trusted your instructions completely.'],
      loop: ['🌀 Peeko is still looking around… you never told it when to stop looking!', '🌀 Peeko will keep doing this forever. Machines don’t get bored or guess.'],
      end: ['😴 Peeko finished your instructions and stopped. The smile is still over there.', '🤷 Peeko did everything you said. It just didn’t say enough to get there.'],
      win: ['😊 Peeko found the smile! Exact instructions work.', '😊 Peeko is happy. Great instructions!']
    },
    jarvis: {
      id: 'jarvis', name: 'Jarvis', hero: '💧', goal: 'plant', goalName: 'thirsty plant', color: '#8b7fe8',
      crash: ['💦 SPLAT! The water drop hit a stone. It does exactly what you tell it.', '💦 Splat! The drop followed your instructions right into a wall.'],
      loop: ['🌀 The drop keeps rolling… you never told it when to stop. Machines don’t guess!', '🌀 Round and round it goes. It will do that forever unless you say otherwise.'],
      end: ['😴 The drop did everything you asked and stopped. The plant is still thirsty.', '🤷 Your program ended, but the plant didn’t get its water.'],
      win: ['🌱 The plant got its water! Exact instructions work.', '🌱 Glug glug. One happy plant!']
    }
  };

  /* ---------- program tree helpers ---------- */
  let uidN = 0;
  const uid = () => 'p' + (++uidN) + Math.random().toString(36).slice(2, 5);
  const n = (type, p, kids, els) => {
    const node = { id: uid(), type, p: Object.assign({}, p || {}) };
    if (BLOCKS[type].shape === 'c') { node.kids = kids || []; if (els) node.els = els; }
    return node;
  };

  const choice = (id, d, opts) => ({ id, t: 'choice', d, opts });
  const num = (id, d, min, max) => ({ id, t: 'num', d, min, max });
  const COND_LABEL = { ahead: 'path ahead', left: 'path to the left', right: 'path to the right', '!ahead': 'no path ahead', '!left': 'no path to the left', '!right': 'no path to the right' };
  const condOpts = (list) => list.map((c) => [c, COND_LABEL[c]]);

  const CATS = {
    move: { id: 'move', label: 'Move', color: '#4C97FF' },
    loops: { id: 'loops', label: 'Loops', color: '#FFAB19' },
    logic: { id: 'logic', label: 'Logic', color: '#59C059' }
  };
  const BLOCKS = {
    forward: { type: 'forward', cat: 'move', shape: 'stack', parts: ['move forward'], params: [] },
    turn: { type: 'turn', cat: 'move', shape: 'stack', parts: ['turn ', choice('dir', 'left', [['left', 'left ⟲'], ['right', 'right ⟳']])] },
    repeat: { type: 'repeat', cat: 'loops', shape: 'c', parts: ['repeat ', num('times', 3, 2, 12), ' times'] },
    until: { type: 'until', cat: 'loops', shape: 'c', parts: ['repeat until at the ', { id: '_goal', t: 'goal' }] },
    if: { type: 'if', cat: 'logic', shape: 'c', canElse: true, parts: ['if ', choice('cond', 'ahead', condOpts(['ahead', 'left', 'right']))] }
  };
  Object.keys(BLOCKS).forEach((k) => { BLOCKS[k].params = BLOCKS[k].parts.filter((x) => typeof x === 'object' && x.t !== 'goal'); });

  function normParams(type, p, level) {
    const def = BLOCKS[type], out = {};
    def.params.forEach((prm) => {
      let v = p ? p[prm.id] : undefined;
      if (prm.t === 'num') { v = Math.round(Number(v)); if (!isFinite(v)) v = prm.d; v = Math.min(prm.max, Math.max(prm.min, v)); }
      else {
        const opts = (type === 'if' && level && level.conds) ? level.conds : prm.opts.map((o) => o[0]);
        if (opts.indexOf(v) < 0) v = prm.d;
      }
      out[prm.id] = v;
    });
    return out;
  }
  function count(list) { let c = 0; (list || []).forEach((x) => { c++; c += count(x.kids) + count(x.els); }); return c; }

  /* ---------- levels ---------- */
  // dir: 0 up, 1 right, 2 down, 3 left.  # wall  . floor  S start  G goal
  const LEVELS = [
    {
      id: 1, title: 'Say it exactly', concept: 'Sequence', max: 6, blocks: ['forward'],
      map: ['######', '#S..G#', '######'], dir: 1,
      mission: 'Machines do exactly what you tell them, and only that. Snap blocks under “when Run is clicked” so {hero} reaches the {goal}.',
      hint: 'Each block is one instruction. {hero} needs to move forward 3 times.',
      ref: () => [n('forward'), n('forward'), n('forward')]
    },
    {
      id: 2, title: 'Turn the corner', concept: 'Sequence + turning', max: 8, blocks: ['forward', 'turn'],
      map: ['######', '#S...#', '####.#', '####G#', '######'], dir: 1,
      mission: 'The {goal} is around the corner. Turning is an instruction too, and order matters!',
      hint: 'Forward 3 times, then turn right, then forward 2 more times.',
      ref: () => [n('forward'), n('forward'), n('forward'), n('turn', { dir: 'right' }), n('forward'), n('forward')]
    },
    {
      id: 3, title: 'Don’t repeat yourself', concept: 'Loops', max: 3, blocks: ['forward', 'turn', 'repeat'],
      map: ['##########', '#S......G#', '##########'], dir: 1,
      mission: 'This corridor is long, and you only get 3 blocks! A loop repeats instructions so you don’t have to.',
      hint: 'Put one “move forward” inside a “repeat” block, and change how many times it repeats.',
      ref: () => [n('repeat', { times: 7 }, [n('forward')])]
    },
    {
      id: 4, title: 'Climb the stairs', concept: 'Loops with several blocks', max: 6, blocks: ['forward', 'turn', 'repeat'],
      map: ['#######', '#####G#', '####..#', '###..##', '##..###', '#S.####', '#######'], dir: 1,
      mission: 'A loop can repeat more than one block. Find the pattern in the stairs.',
      hint: 'Each stair is the same: forward, turn left, forward, turn right. How many stairs?',
      ref: () => [n('repeat', { times: 4 }, [n('forward'), n('turn', { dir: 'left' }), n('forward'), n('turn', { dir: 'right' })])]
    },
    {
      id: 5, title: 'A loop inside a loop', concept: 'Nested loops', max: 5, blocks: ['forward', 'turn', 'repeat'],
      map: ['######', '#S...#', '####.#', '#G##.#', '#....#', '######'], dir: 1,
      mission: 'Walk around the block! Each side is the same, so you can put a loop inside a loop.',
      hint: 'Each side: forward 3 times, then turn right. Repeat that 3 times, then step forward once.',
      ref: () => [n('repeat', { times: 3 }, [n('repeat', { times: 3 }, [n('forward')]), n('turn', { dir: 'right' })]), n('forward')]
    },
    {
      id: 6, title: 'Are we there yet?', concept: 'Repeat until', max: 3, blocks: ['forward', 'until'],
      map: ['############', '#S........G#', '############'], dir: 1,
      mission: 'Counting is boring. “Repeat until” keeps going until {hero} arrives, however far it is.',
      hint: 'Put “move forward” inside “repeat until at the goal”.',
      ref: () => [n('until', {}, [n('forward')])]
    },
    {
      id: 7, title: 'Look before you leap', concept: 'If', max: 5, blocks: ['forward', 'turn', 'repeat', 'until', 'if'], conds: ['left', 'ahead', 'right'],
      map: ['#######', '##G..##', '####.##', '#S...##', '#######'], dir: 1,
      mission: '{hero} can look around! An “if” block only runs when the answer is yes. Here, whenever there is a path on the left, turn left.',
      hint: 'Repeat until the goal: if path to the left, turn left. Then move forward.',
      ref: () => [n('until', {}, [n('if', { cond: 'left' }, [n('turn', { dir: 'left' })]), n('forward')])]
    },
    {
      id: 8, title: 'If this, otherwise that', concept: 'If / else', max: 5, blocks: ['forward', 'turn', 'repeat', 'until', 'if'], conds: ['ahead', 'left', 'right'],
      map: ['#######', '#S....#', '#####.#', '#..G#.#', '#.###.#', '#.....#', '#######'], dir: 1,
      mission: 'This path spirals inward. Teach {hero} one rule: if there is a path ahead, go forward. Otherwise, turn right.',
      hint: 'Use the “+ add else” button on the if block.',
      ref: () => [n('until', {}, [n('if', { cond: 'ahead' }, [n('forward')], [n('turn', { dir: 'right' })])])]
    },
    {
      id: 9, title: 'Bug hunt', concept: 'Debugging', max: 5, blocks: ['forward', 'turn', 'repeat', 'until', 'if'], conds: ['ahead', 'left', 'right'],
      map: ['#######', '#....S#', '#.#####', '#.#G..#', '#.###.#', '#.....#', '#######'], dir: 3,
      mission: 'Someone wrote this program but it doesn’t work. Run it, watch what goes wrong, and fix the bug.',
      hint: 'Which way does this path turn? Look at the turn block.',
      preset: () => [n('until', {}, [n('if', { cond: 'ahead' }, [n('forward')], [n('turn', { dir: 'right' })])])],
      ref: () => [n('until', {}, [n('if', { cond: 'ahead' }, [n('forward')], [n('turn', { dir: 'left' })])])]
    },
    {
      id: 10, title: 'The wall follower', concept: 'Everything together', max: 8, blocks: ['forward', 'turn', 'repeat', 'until', 'if'], conds: ['ahead', 'left', 'right', '!ahead'],
      map: ['#########', '#S....#.#', '#####.#.#', '#...#...#', '#.#.###.#', '#G#.....#', '#########'], dir: 1,
      mission: 'Real robots solve mazes with the right-hand rule: keep your right hand on the wall. If there is a path on the right, take it. Otherwise go ahead. Dead end? Turn around.',
      hint: 'Repeat until the goal: if path to the right, turn right and go forward. Otherwise, if path ahead, go forward, otherwise turn left.',
      ref: () => [n('until', {}, [n('if', { cond: 'right' }, [n('turn', { dir: 'right' }), n('forward')], [n('if', { cond: 'ahead' }, [n('forward')], [n('turn', { dir: 'left' })])])])]
    }
  ];

  const DX = [0, 1, 0, -1], DY = [-1, 0, 1, 0];
  function parseMap(level) {
    const rows = level.map, cells = rows.map((r) => r.split(''));
    let start = null, goal = null;
    cells.forEach((r, y) => r.forEach((c, x) => { if (c === 'S') { start = { x, y }; r[x] = '.'; } if (c === 'G') { goal = { x, y }; r[x] = '.'; } }));
    return { w: rows[0].length, h: rows.length, cells, start, goal };
  }
  const MAX_EVENTS = 1400, MAX_ITER = 400;

  /* ---------- the engine ---------- */
  function run(level, program) {
    const m = parseMap(level), events = [];
    let x = m.start.x, y = m.start.y, d = level.dir, result = null, iter = 0;
    const open = (px, py) => py >= 0 && py < m.h && px >= 0 && px < m.w && m.cells[py][px] === '.';
    const atGoal = () => x === m.goal.x && y === m.goal.y;
    const look = (cond) => {
      const neg = cond.charAt(0) === '!', k = neg ? cond.slice(1) : cond;
      const dd = k === 'ahead' ? d : k === 'left' ? (d + 3) % 4 : (d + 1) % 4;
      const v = open(x + DX[dd], y + DY[dd]);
      return neg ? !v : v;
    };
    const fin = (r) => { result = result || r; };
    function exec(list) {
      for (let i = 0; i < list.length && !result; i++) {
        const node = list[i], def = BLOCKS[node.type]; if (!def) continue;
        if (events.length > MAX_EVENTS) { fin('loop'); return; }
        const p = normParams(node.type, node.p, level);
        events.push({ t: 'enter', node: node.id });
        if (node.type === 'forward') {
          const nx = x + DX[d], ny = y + DY[d];
          if (!open(nx, ny)) { events.push({ t: 'crash', x, y, d, node: node.id }); fin('crash'); return; }
          events.push({ t: 'move', from: { x, y }, to: { x: nx, y: ny }, d, node: node.id }); x = nx; y = ny;
          if (atGoal()) { fin('goal'); return; }
        } else if (node.type === 'turn') {
          d = p.dir === 'left' ? (d + 3) % 4 : (d + 1) % 4; events.push({ t: 'turn', d, node: node.id });
        } else if (node.type === 'repeat') {
          for (let k = 0; k < p.times && !result; k++) { exec(node.kids || []); if (events.length > MAX_EVENTS) fin('loop'); }
        } else if (node.type === 'until') {
          let guard = 0;
          while (!atGoal() && !result) {
            if (++guard > MAX_ITER || events.length > MAX_EVENTS) { fin('loop'); return; }
            events.push({ t: 'loopcheck', node: node.id });
            exec(node.kids || []);
          }
          if (!result && atGoal()) { fin('goal'); return; }
        } else if (node.type === 'if') {
          const v = look(p.cond); events.push({ t: 'check', node: node.id, v });
          if (v) exec(node.kids || []); else if (node.els) exec(node.els);
        }
      }
    }
    exec(program);
    if (!result) result = atGoal() ? 'goal' : 'end';
    events.push({ t: 'end', r: result });
    return { ok: result === 'goal', reason: result, events, blocks: count(program), end: { x, y, d } };
  }

  function stars(level, blocks) {
    const par = count(level.ref());
    return blocks <= par ? 3 : blocks <= par + 1 ? 2 : 1;
  }

  /* ---------- show it as the real robot's code ---------- */
  function toCode(program) {
    const lines = [], vars = ['i', 'j', 'k'];
    function go(list, depth, loopDepth) {
      const pad = '  '.repeat(depth);
      (list || []).forEach((node) => {
        const p = node.p || {};
        if (node.type === 'forward') lines.push(pad + 'moveForward();');
        else if (node.type === 'turn') lines.push(pad + (p.dir === 'right' ? 'turnRight();' : 'turnLeft();'));
        else if (node.type === 'repeat') {
          const v = vars[loopDepth] || 'n' + loopDepth, t = Math.min(12, Math.max(2, Math.round(Number(p.times)) || 3));
          lines.push(pad + 'for (int ' + v + ' = 0; ' + v + ' < ' + t + '; ' + v + '++) {'); go(node.kids, depth + 1, loopDepth + 1); lines.push(pad + '}');
        } else if (node.type === 'until') {
          lines.push(pad + 'while (!atGoal()) {'); go(node.kids, depth + 1, loopDepth); lines.push(pad + '}');
        } else if (node.type === 'if') {
          const c = p.cond || 'ahead', neg = c.charAt(0) === '!', k = neg ? c.slice(1) : c;
          const fn = 'path' + k.charAt(0).toUpperCase() + k.slice(1) + '()';
          lines.push(pad + 'if (' + (neg ? '!' : '') + fn + ') {'); go(node.kids, depth + 1, loopDepth);
          if (node.els) { lines.push(pad + '} else {'); go(node.els, depth + 1, loopDepth); }
          lines.push(pad + '}');
        }
      });
    }
    go(program, 1, 0);
    return 'void loop() {\n' + (lines.length ? lines.join('\n') : '  // add blocks to see code here') + '\n}';
  }

  const fill = (s, skin) => s.replace(/\{hero\}/g, skin.name).replace(/\{goal\}/g, skin.goalName);

  return { SKINS, LEVELS, BLOCKS, CATS, COND_LABEL, DX, DY, n, uid, normParams, count, parseMap, run, stars, toCode, fill, MAX_EVENTS };
});
