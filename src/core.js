/* Code Builder core: block definitions and the sketch generator.
   The base sketches are in ../firmware/*.base.ino. This file only fills in the student parts. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('fs'), require('path'));
  else root.CampCore = factory(null, null);
})(typeof self !== 'undefined' ? self : this, function (fs, path) {
  'use strict';

  const MARK_S = '', MARK_E = '';           // wraps every value a student chose
  const V = (x) => MARK_S + x + MARK_E;
  const stripMarks = (s) => s.split(MARK_S).join('').split(MARK_E).join('');

  const TEMPLATES = (typeof CAMP_TEMPLATES !== 'undefined') ? CAMP_TEMPLATES : (function () {
    const out = {};
    if (!fs) return out;   // pages that never generate code (the Studio) don't carry the base sketches
    ['peeko', 'chipbot', 'jarvis'].forEach(function (id) {
      out[id] = fs.readFileSync(path.join(__dirname, '..', 'firmware', id + '.base.ino'), 'utf8');
    });
    return out;
  })();

  /* ---------- parameter helpers ---------- */
  const num = (id, d, min, max, step) => ({ id, t: 'num', d, min, max, step });
  const choice = (id, d, opts) => ({ id, t: 'choice', d, opts });
  const text = (id, d, max) => ({ id, t: 'text', d, max });

  function cleanText(s, max, fallback) {
    let t = String(s == null ? '' : s).replace(/[^A-Za-z0-9 .,!?'_-]/g, '').replace(/\s+/g, ' ').trim();
    if (max) t = t.slice(0, max).trim();
    return t || fallback || '';
  }
  function norm(def, p) {
    const o = {};
    def.params.forEach(function (prm) {
      let v = p ? p[prm.id] : undefined;
      if (prm.t === 'num') {
        v = Number(v);
        if (!isFinite(v)) v = prm.d;
        v = Math.min(prm.max, Math.max(prm.min, v));
        if (prm.step) v = Math.round(v / prm.step) * prm.step;
        v = Math.round(v * 1000) / 1000;
      } else if (prm.t === 'choice') {
        if (!prm.opts.some((x) => x[0] === v)) v = prm.d;
      } else if (prm.t === 'text') {
        v = cleanText(v, prm.max, prm.d);
      }
      o[prm.id] = v;
    });
    return o;
  }
  const fmtF = (n) => { const s = String(Math.round(n * 100) / 100); return s.indexOf('.') >= 0 ? s : s + '.0'; };
  const optLabel = (prm, v) => { const o = prm.opts.find((x) => x[0] === v); return o ? o[1] : v; };
  const LOOP_VARS = ['i', 'j', 'k', 'm', 'n'];

  function B(type, cat, parts, extra) {
    const def = Object.assign({ type, cat, shape: 'stack', parts }, extra);
    def.params = parts.filter((x) => typeof x === 'object');
    return def;
  }

  /* ---------- shared blocks ---------- */
  const NOTES = [['C', 'C', 262], ['D', 'D', 294], ['E', 'E', 330], ['F', 'F', 349], ['G', 'G', 392], ['A', 'A', 440], ['B', 'B', 494], ['C2', 'high C', 523]];
  const noteHz = (n) => (NOTES.find((x) => x[0] === n) || NOTES[0])[2];
  const noteName = (n) => (NOTES.find((x) => x[0] === n) || NOTES[0])[1];

  const WAIT = B('wait', 'control', ['wait ', num('secs', 1, 0.1, 30, 0.1), ' seconds'], {
    code: (p) => ['waitSecs(' + V(fmtF(p.secs)) + ');']
  });
  const REPEAT = B('repeat', 'control', ['repeat ', num('times', 3, 1, 20, 1), ' times'], {
    shape: 'c',
    head: (p, c) => 'for (int ' + c.v + ' = 0; ' + c.v + ' < ' + V(p.times) + '; ' + c.v + '++) {'
  });
  const noteBlock = (fn, who) => B('note', 'sound', [who, choice('note', 'C', NOTES.map((n) => [n[0], n[1]])), ' for ', num('secs', 0.3, 0.1, 3, 0.1), ' seconds'], {
    code: (p) => [fn + '(' + noteHz(p.note) + ', ' + V(fmtF(p.secs)) + ');  // ' + V(noteName(p.note))]
  });
  // flash = true when the name constants live in PROGMEM (Peeko), which needs the cast to print
  const helloBlock = (cat, flash) => {
    const nm = (x) => (flash ? '(const __FlashStringHelper*)' + x : x);
    return B('hello', cat, ['say hello in the Serial Monitor'], {
      code: () => ['Serial.print(F("Hi! I\'m "));', 'Serial.print(' + nm('ROBOT_NAME') + ');', 'Serial.print(F(", built by "));', 'Serial.println(' + nm('BUILDER_NAME') + ');']
    });
  };

  /* ---------- the three projects ---------- */
  const PROJECTS = {
    peeko: {
      id: 'peeko', name: 'Peeko', emoji: '👀', color: '#ff6b5e',
      tagline: 'The robot with expressive eyes',
      robotLabel: "Peeko's name", robotDefault: 'Peeko',
      foldBlurb: 'faces, sounds, head moves and listening to the computer',
      cats: [
        { id: 'looks', label: 'Looks', color: '#9966FF' },
        { id: 'sound', label: 'Sound', color: '#CF63CF' },
        { id: 'control', label: 'Control', color: '#FFAB19' },
        { id: 'chance', label: 'Chance', color: '#59C059' }
      ],
      blocks: [
        B('act', 'looks', ['Peeko feels ', choice('face', 'happy', [['happy', '😊 happy'], ['sad', '😢 sad'], ['surprised', '😲 surprised'], ['angry', '😠 angry'], ['sleepy', '😴 sleepy'], ['neutral', '😐 neutral'], ['celebrate', '🎉 celebrate']])], {
          code: (p) => ['runCommand(F("' + V(p.face) + '"));']
        }),
        B('look', 'looks', ['Peeko looks ', choice('dir', 'left', [['left', '⬅️ left'], ['right', '➡️ right']])], {
          code: (p) => ['runCommand(F("' + V(p.dir) + '"));']
        }),
        B('say_name', 'looks', ['say ', choice('who', 'robot', [['robot', "my robot's name"], ['me', 'my name']]), ' for ', num('secs', 2, 0.5, 10, 0.5), ' seconds'], {
          code: (p) => ['sayText(' + V(p.who === 'robot' ? 'ROBOT_NAME' : 'BUILDER_NAME') + ', ' + V(fmtF(p.secs)) + ');']
        }),
        B('say_text', 'looks', ['write ', text('words', 'Hello!', 20), ' for ', num('secs', 2, 0.5, 10, 0.5), ' seconds'], {
          code: (p) => ['sayText(PSTR("' + V(p.words) + '"), ' + V(fmtF(p.secs)) + ');']
        }),
        B('head', 'looks', ['turn head to ', num('deg', 90, 40, 140, 5), ' degrees'], {
          code: (p) => ['headServo.write(' + V(p.deg) + ');']
        }),
        noteBlock('playNote', 'play note '),
        helloBlock('looks', true),
        WAIT, REPEAT,
        B('if_coin', 'chance', ['if coin flip lands ', choice('side', 'heads', [['heads', 'heads'], ['tails', 'tails']])], {
          shape: 'c', canElse: true,
          head: (p) => 'if (random(2) == ' + V(p.side === 'heads' ? 0 : 1) + ') {'
        }),
        B('if_dice', 'chance', ['if dice roll is ', choice('cmp', 'more', [['more', 'more than'], ['less', 'less than'], ['exactly', 'exactly']]), ' ', num('n', 3, 1, 6, 1)], {
          shape: 'c', canElse: true,
          head: (p) => 'if (random(1, 7) ' + V(p.cmp === 'more' ? '>' : p.cmp === 'less' ? '<' : '==') + ' ' + V(p.n) + ') {'
        })
      ],
      story: [
        { id: 'name', title: 'Name it', say: 'Every robot needs a name! Type yours in the name tag, and watch it appear in the code.', done: (s) => !!s.robot.trim() },
        { id: 'wake', title: 'Wake up', say: 'What is the very first thing Peeko does when it switches on? Put it under "when Peeko wakes up". This runs once.', done: (s) => s.wake.length > 0 },
        { id: 'forever', title: 'Forever', say: 'Robots keep going. Everything inside "forever" runs again and again. What should Peeko keep doing?', done: (s) => s.forever.length > 0 },
        { id: 'wait', title: 'Add time', say: 'Without waiting, Peeko would flicker through everything instantly. Add a wait so we can see each thing.', done: (s) => countType(s, 'wait') > 0 },
        { id: 'choice', title: 'Make a choice', say: 'Robots decide! Flip a coin: heads Peeko is happy, tails Peeko is sad. That is an "if / else".', done: (s) => countType(s, /^if_/) > 0 },
        { id: 'repeat', title: 'Repeat', say: 'Want Peeko to do something 3 times? Use "repeat" instead of copying blocks.', done: (s) => countType(s, 'repeat') > 0 }
      ],
      example: function (n) {
        return {
          wake: [n('say_name', { who: 'robot', secs: 2 }), n('act', { face: 'happy' })],
          forever: [
            n('if_coin', { side: 'heads' }, [n('act', { face: 'happy' }), n('repeat', { times: 2 }, [n('note', { note: 'E', secs: 0.2 }), n('note', { note: 'G', secs: 0.2 })])], [n('act', { face: 'sad' })]),
            n('wait', { secs: 3 })
          ]
        };
      }
    },

    chipbot: {
      id: 'chipbot', name: 'Chip Bot', emoji: '🤖', color: '#2bb3a3',
      tagline: 'The walking, dancing biped',
      robotLabel: "Chip Bot's name", robotDefault: 'Chip Bot',
      foldBlurb: 'walking, turning, dancing, servo control and the distance sensor',
      cats: [
        { id: 'motion', label: 'Motion', color: '#4C97FF' },
        { id: 'sound', label: 'Sound', color: '#CF63CF' },
        { id: 'talk', label: 'Talk', color: '#9966FF' },
        { id: 'control', label: 'Control', color: '#FFAB19' },
        { id: 'sensing', label: 'Sensing', color: '#3FB8DE' }
      ],
      blocks: [
        B('walk', 'motion', ['walk ', choice('dir', 'fwd', [['fwd', 'forward'], ['back', 'backward']]), ' ', num('steps', 4, 1, 10, 1), ' steps'], {
          code: (p) => ['doWalk(' + V(p.dir === 'fwd' ? 0 : 1) + ', ' + V(p.steps) + ');']
        }),
        B('turn', 'motion', ['turn ', choice('dir', 'left', [['left', 'left'], ['right', 'right']]), ' ', num('steps', 3, 1, 10, 1), ' steps'], {
          code: (p) => ['doTurn(' + V(p.dir === 'left' ? 0 : 1) + ', ' + V(p.steps) + ');']
        }),
        B('dance', 'motion', ['dance ', choice('move', '0', [['0', 'swing'], ['1', 'tiptoe swing'], ['2', 'up and down'], ['3', 'jitter'], ['4', 'moonwalk left'], ['5', 'moonwalk right'], ['6', 'flapping'], ['7', 'shake right leg'], ['8', 'shake left leg'], ['9', 'bend right'], ['10', 'bend left']]), ' ', num('reps', 2, 1, 8, 1), ' times'], {
          code: (p) => ['doDance(' + V(p.move) + ', ' + V(p.reps) + ');']
        }),
        B('centre', 'motion', ['hold the legs at 90° for ', num('secs', 20, 5, 60, 5), ' seconds'], { code: (p) => ['centreServos(' + V(p.secs) + ');   // fit the servo horns now'] }),
        B('stand', 'motion', ['stand still'], { code: () => ['doRest();'] }),
        B('speed', 'motion', ['walk speed ', choice('level', '1', [['0', 'slow'], ['1', 'normal'], ['2', 'fast']])], {
          code: (p) => ['doSpeed(' + V(p.level) + ');']
        }),
        noteBlock('beepNote', 'beep note '),
        helloBlock('talk'),
        WAIT, REPEAT,
        B('if_dist', 'sensing', ['if distance is ', choice('cmp', 'less', [['less', 'less than'], ['more', 'more than']]), ' ', num('cm', 15, 3, 50, 1), ' cm'], {
          shape: 'c', canElse: true,
          head: (p) => 'if (readDistance() ' + V(p.cmp === 'less' ? '<' : '>') + ' ' + V(p.cm) + ') {'
        })
      ],
      story: [
        { id: 'name', title: 'Name it', say: 'Give your Chip Bot a name and put your own name on it. Watch both appear in the code.', done: (s) => !!s.robot.trim() },
        { id: 'wake', title: 'Wake up', say: 'What does Chip Bot do the moment it switches on? Say hello? Beep? Put it under "when Chip Bot wakes up".', done: (s) => s.wake.length > 0 },
        { id: 'forever', title: 'Forever', say: 'Now the main behaviour. Everything inside "forever" repeats again and again.', done: (s) => s.forever.length > 0 },
        { id: 'wait', title: 'Add time', say: 'Robots need rests. Add a wait so Chip Bot does not rush from one move to the next.', done: (s) => countType(s, 'wait') > 0 },
        { id: 'choice', title: 'Make a choice', say: 'Chip Bot has eyes (the distance sensor). If something is close, turn away. Otherwise keep walking. That is an "if / else".', done: (s) => countType(s, /^if_/) > 0 },
        { id: 'repeat', title: 'Repeat', say: 'A dance with 3 wiggles? Use "repeat" instead of copying blocks.', done: (s) => countType(s, 'repeat') > 0 }
      ],
      example: function (n) {
        return {
          wake: [n('hello'), n('repeat', { times: 2 }, [n('note', { note: 'C2', secs: 0.2 }), n('wait', { secs: 0.1 })])],
          forever: [
            n('if_dist', { cmp: 'less', cm: 15 }, [n('turn', { dir: 'left', steps: 3 }), n('note', { note: 'G', secs: 0.2 })], [n('walk', { dir: 'fwd', steps: 4 })]),
            n('wait', { secs: 0.5 })
          ]
        };
      }
    },

    jarvis: {
      id: 'jarvis', name: 'Jarvis', emoji: '🌱', color: '#8b7fe8',
      tagline: 'The terrarium buddy that senses soil and light',
      robotLabel: "Plant buddy's name", robotDefault: 'Jarvis',
      foldBlurb: 'sensor readings, the LED and the buzzer',
      settingsDefault: { soilDry: 520, soilWet: 280, ledAnode: false, lightHigh: true },
      cats: [
        { id: 'looks', label: 'Looks', color: '#9966FF' },
        { id: 'sound', label: 'Sound', color: '#CF63CF' },
        { id: 'control', label: 'Control', color: '#FFAB19' },
        { id: 'sensing', label: 'Sensing', color: '#3FB8DE' }
      ],
      blocks: [
        B('light', 'looks', ['set light to ', choice('color', 'green', [['red', '🔴 red'], ['green', '🟢 green'], ['blue', '🔵 blue'], ['yellow', '🟡 yellow'], ['cyan', '🩵 cyan'], ['purple', '🟣 purple'], ['white', '⚪ white'], ['off', '⚫ off']])], {
          code: (p) => {
            const rgb = { red: '1, 0, 0', green: '0, 1, 0', blue: '0, 0, 1', yellow: '1, 1, 0', cyan: '0, 1, 1', purple: '1, 0, 1', white: '1, 1, 1', off: '0, 0, 0' }[p.color];
            return ['setColor(' + rgb + ');  // ' + V(p.color)];
          }
        }),
        helloBlock('looks'),
        noteBlock('playNote', 'play note '),
        WAIT, REPEAT,
        B('print', 'sensing', ['print sensor readings'], { code: () => ['printSensors();'] }),
        B('if_soil', 'sensing', ['if soil wetness is ', choice('cmp', 'below', [['below', 'below'], ['above', 'above']]), ' ', num('pct', 40, 0, 100, 5), ' %'], {
          shape: 'c', canElse: true,
          head: (p) => 'if (soilPercent() ' + V(p.cmp === 'below' ? '<' : '>') + ' ' + V(p.pct) + ') {'
        }),
        B('if_light', 'sensing', ['if brightness is ', choice('cmp', 'below', [['below', 'below'], ['above', 'above']]), ' ', num('pct', 30, 0, 100, 5), ' %'], {
          shape: 'c', canElse: true,
          head: (p) => 'if (lightPercent() ' + V(p.cmp === 'below' ? '<' : '>') + ' ' + V(p.pct) + ') {'
        })
      ],
      story: [
        { id: 'name', title: 'Name it', say: 'Name your plant buddy and put your own name on it. Both appear in the code.', done: (s) => !!s.robot.trim() },
        { id: 'wake', title: 'Wake up', say: 'What does Jarvis do the moment it switches on? Say hello? Show a colour? Put it under "when Jarvis wakes up".', done: (s) => s.wake.length > 0 },
        { id: 'forever', title: 'Forever', say: 'A plant buddy never stops watching. Everything inside "forever" repeats again and again.', done: (s) => s.forever.length > 0 },
        { id: 'wait', title: 'Add time', say: 'Soil does not change every millisecond. Add a wait so Jarvis checks every couple of seconds.', done: (s) => countType(s, 'wait') > 0 },
        { id: 'choice', title: 'Make a choice', say: 'If the soil is dry, show red. Otherwise show green. That is an "if / else", and it is how every smart device decides.', done: (s) => countType(s, /^if_/) > 0 },
        { id: 'repeat', title: 'Repeat', say: 'Make an alarm that beeps 3 times. Use "repeat" instead of copying blocks.', done: (s) => countType(s, 'repeat') > 0 }
      ],
      example: function (n) {
        return {
          wake: [n('hello'), n('light', { color: 'green' })],
          forever: [
            n('if_soil', { cmp: 'below', pct: 40 }, [n('light', { color: 'red' }), n('repeat', { times: 3 }, [n('note', { note: 'C', secs: 0.2 }), n('wait', { secs: 0.2 })])], [n('light', { color: 'green' })]),
            n('print'),
            n('wait', { secs: 2 })
          ]
        };
      }
    }
  };
  Object.keys(PROJECTS).forEach(function (id) {
    const P = PROJECTS[id];
    P.blockMap = {};
    P.blocks.forEach((b) => { P.blockMap[b.type] = b; });
    P.catMap = {};
    P.cats.forEach((c) => { P.catMap[c.id] = c; });
  });

  /* ---------- state + tree helpers ---------- */
  let uidN = 0;
  const uid = () => 'n' + (++uidN) + Math.random().toString(36).slice(2, 6);

  function defaults(def) { const p = {}; def.params.forEach((x) => { p[x.id] = x.d; }); return p; }
  function mkNode(projId, type, p, kids, els) {
    const def = PROJECTS[projId].blockMap[type];
    const node = { id: uid(), type, p: Object.assign(defaults(def), p || {}) };
    if (def.shape === 'c') { node.kids = kids || []; if (def.canElse && els) node.els = els; }
    return node;
  }
  function newState(projId) {
    const P = PROJECTS[projId];
    return { builder: '', robot: '', date: '', settings: Object.assign({}, P.settingsDefault || {}), wake: [], forever: [] };
  }
  function exampleState(projId) {
    const st = newState(projId);
    const ex = PROJECTS[projId].example((type, p, kids, els) => mkNode(projId, type, p, kids, els));
    st.wake = ex.wake; st.forever = ex.forever;
    return st;
  }
  function walk(list, fn) {
    (list || []).forEach(function (n) { fn(n); walk(n.kids, fn); walk(n.els, fn); });
  }
  function countType(state, t) {
    let c = 0;
    const test = (type) => (t instanceof RegExp ? t.test(type) : type === t);
    walk(state.wake, (n) => { if (test(n.type)) c++; });
    walk(state.forever, (n) => { if (test(n.type)) c++; });
    return c;
  }
  function countBlocks(state) { let c = 0; walk(state.wake, () => c++); walk(state.forever, () => c++); return c; }

  /* ---------- code generation ---------- */
  function genList(P, list, depth, out, indent, keep) {
    (list || []).forEach(function (node) {
      const def = P.blockMap[node.type];
      if (!def) return;
      const p = norm(def, node.p);
      const pad = indent + '  '.repeat(depth);
      const push = (t) => out.push({ t: pad + t, src: 'student', cat: def.cat, keep: true, node: node.id });
      if (def.shape === 'c') {
        const v = LOOP_VARS[depth] || 'r' + depth;
        push(def.head(p, { v }));
        const before = out.length;
        genList(P, node.kids, depth + 1, out, indent);
        if (out.length === before) out.push({ t: pad + '  // (nothing in here yet)', src: 'student', cat: def.cat, keep: true, node: node.id });
        if (def.canElse && node.els) {
          push('} else {');
          const b2 = out.length;
          genList(P, node.els, depth + 1, out, indent);
          if (out.length === b2) out.push({ t: pad + '  // (nothing in here yet)', src: 'student', cat: def.cat, keep: true, node: node.id });
        }
        push('}');
      } else {
        def.code(p).forEach(push);
      }
    });
  }

  function generate(projId, state, opts) {
    const P = PROJECTS[projId];
    const robot = cleanText(state.robot, 16, P.robotDefault);
    const builder = cleanText(state.builder, 16, 'a CHIP Camp student');
    const builderConst = cleanText(state.builder, 16, 'Friend');
    const date = cleanText(state.date, 24, '');
    const settings = Object.assign({}, P.settingsDefault || {}, state.settings || {});
    const wakeOut = [], foreverOut = [];
    genList(P, state.wake, 0, wakeOut, '  ');
    genList(P, state.forever, 0, foreverOut, '  ');
    const empty = (t) => [{ t: '  // (nothing here yet: drag blocks into the ' + t + ' part)', src: 'student', cat: 'control', keep: true }];
    const rule = '// ============================================================';
    const header = [
      rule,
      '//  ' + P.name.toUpperCase() + ' - built by ' + V(builder),
      '//  Robot name: ' + V(robot),
      '//  Made with Camp Blocks' + (date ? ' · ' + V(date) : ''),
      rule
    ];
    const constants = P.id === 'peeko'
      ? ['const char BUILDER_NAME[] PROGMEM = "' + V(builderConst) + '";   // who built this robot', 'const char ROBOT_NAME[]   PROGMEM = "' + V(robot) + '";   // what this robot is called']
      : ['const char BUILDER_NAME[] = "' + V(builderConst) + '";   // who built this robot', 'const char ROBOT_NAME[]   = "' + V(robot) + '";   // what this robot is called'];
    const settingsLines = P.id === 'jarvis' ? [
      'const bool LED_COMMON_ANODE      = ' + (settings.ledAnode ? 'true' : 'false') + ';   // true if the RGB LED\'s long leg goes to 5V',
      'const int  SOIL_DRY              = ' + Math.round(settings.soilDry) + ';   // raw reading with the probe in dry air',
      'const int  SOIL_WET              = ' + Math.round(settings.soilWet) + ';   // raw reading with the probe in a glass of water',
      'const bool LIGHT_BRIGHT_IS_HIGH  = ' + (settings.lightHigh ? 'true' : 'false') + ';   // false if brighter light gives a smaller number'
    ] : [];

    const lines = [];
    let keep = false;
    TEMPLATES[projId].split('\n').forEach(function (ln) {
      const m = ln.trim();
      if (m === '//@@KEEP+') { keep = true; return; }
      if (m === '//@@KEEP-') { keep = false; return; }
      if (m === '//@@HEADER@@') { header.forEach((t) => lines.push({ t, src: 'student', cat: 'name', keep: true })); return; }
      if (m === '//@@CONSTANTS@@') { constants.forEach((t) => lines.push({ t, src: 'student', cat: 'name', keep: true })); return; }
      if (m === '//@@SETTINGS@@') { settingsLines.forEach((t) => lines.push({ t, src: 'settings', keep: false })); return; }
      if (m === '//@@WAKE@@') { (wakeOut.length ? wakeOut : empty('wake-up')).forEach((l) => lines.push(l)); return; }
      if (m === '//@@FOREVER@@') { (foreverOut.length ? foreverOut : empty('forever')).forEach((l) => lines.push(l)); return; }
      lines.push({ t: ln, src: 'base', keep });
    });
    const textOut = stripMarks(lines.map((l) => l.t).join('\n'));
    return { lines, text: textOut, robot, builder: builderConst };
  }

  return {
    PROJECTS, TEMPLATES, MARK_S, MARK_E, stripMarks,
    norm, cleanText, fmtF, noteHz, NOTES,
    newState, exampleState, mkNode, defaults, walk, countType, countBlocks, generate, uid, LOOP_VARS
  };
});
