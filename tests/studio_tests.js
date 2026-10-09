// node tests/studio_tests.js
const assert = require('assert');
const Core = require('../src/core.js');
const Studio = require('../src/studiocore.js');
const Run = require('../src/runtime.js');

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const same = (a, b) => { try { assert.deepStrictEqual(a, b); return true; } catch (e) { return false; } };
const ROBOTS = ['peeko', 'chipbot', 'jarvis'];

// a design that uses as much of the vocabulary as the studio allows
function fullDesign(id) {
  if (id === 'peeko') {
    return { moments: Studio.FACES.concat(['happy']).slice(0, Studio.MAX_STEPS).map((f, i) => ({ face: f, look: ['none', 'left', 'right'][i % 3], words: i % 2 ? 'Hi there ' + i : '', note: Studio.NOTE_IDS[i + 1], wait: 1 + i })) };
  }
  if (id === 'chipbot') {
    const kinds = ['walk', 'turn', 'dance', 'stand', 'dance', 'walk', 'turn', 'dance'];
    return { safe: true, safeCm: 20, moves: kinds.map((k, i) => ({ kind: k, dir: k === 'turn' ? 'right' : 'back', n: 2 + i, move: String(i + 3), beep: Studio.NOTE_IDS[(i % 8) + 1] })) };
  }
  return { dryPct: 55, dryColor: 'purple', dryAlarm: true, darkPct: 20, darkColor: 'cyan', okColor: 'white', checkSecs: 3 };
}
function hostile(id) {
  const evil = '"; evil(); // \\ 😀';
  if (id === 'peeko') return { moments: Array.from({ length: 30 }, () => ({ face: evil, look: evil, words: evil + 'x'.repeat(80), note: evil, wait: 'abc' })).concat([null, 5, 'x']) };
  if (id === 'chipbot') return { safe: 'no', safeCm: 99999, moves: Array.from({ length: 30 }, () => ({ kind: evil, dir: evil, n: -50, move: evil, beep: evil })).concat([null]) };
  return { dryPct: 9999, dryColor: evil, darkPct: -4, darkColor: 7, okColor: null, checkSecs: 'never' };
}

(async function () {
  for (const id of ROBOTS) {
    const P = Core.PROJECTS[id];
    const designs = { default: Studio.defaults(id), full: fullDesign(id), hostile: hostile(id), empty: {}, nothing: undefined };
    for (const [label, design] of Object.entries(designs)) {
      const name = id + ' ' + label;
      const cleaned = Studio.clean(id, design);
      ok(same(Studio.clean(id, cleaned), cleaned), name + ': clean() is not stable');
      const strings = []; JSON.stringify(cleaned, (k, v) => { if (typeof v === 'string') strings.push(v); return v; });
      ok(strings.every((s) => /^[A-Za-z0-9 .,!?'_-]*$/.test(s)), name + ': unsafe characters survived clean()');
      const arr = cleaned.moments || cleaned.moves;
      if (arr) ok(arr.length <= Studio.MAX_STEPS, name + ': too many steps (' + arr.length + ')');

      const st = Studio.toState(id, design, { builder: 'Aarav', robot: 'Zippy', date: '14 Oct 2026', settings: {} });
      ok(st.builder === 'Aarav' && st.robot === 'Zippy', name + ': name lost');
      ok(st.wake.length > 0 && st.forever.length > 0, name + ': empty wake/forever');
      const types = [];
      Core.walk(st.wake, (n) => types.push(n)); Core.walk(st.forever, (n) => types.push(n));
      ok(types.every((n) => P.blockMap[n.type]), name + ': unknown block type');
      ok(types.every((n) => { const def = P.blockMap[n.type]; return same(Core.norm(def, n.p), Object.assign({}, n.p)); }), name + ': a block has an out-of-range value');
      ok(types.every((n) => !(P.blockMap[n.type].shape === 'c') || Array.isArray(n.kids)), name + ': c-block without kids');

      const g = Core.generate(id, st);
      ok(!/@@/.test(g.text) && !/[]/.test(g.text), name + ': leftover markers');
      ok(!/evil\(/.test(g.text), name + ': hostile text leaked into the sketch');
      ok(!/[^\x00-\x7F]/.test(g.text.replace(/·|—/g, '')), name + ': non-ASCII in sketch');

      // runs in the preview without errors
      let t = 0, calls = 0, err = null;
      const proxy = new Proxy({}, { get: (_, k) => (k === 'reset' || k === 'idle') ? () => {} : async () => { calls++; } });
      const sensors = { distance: 30, soil: 20, light: 15, set(k, v) { this[k] = v; }, print() { calls++; } };
      const ctx = { stage: proxy, sensors, settings: Object.assign({}, P.settingsDefault || {}), speedLevel: 1, names: { robot: 'Zippy', builder: 'Aarav' }, stepSeconds: () => 1,
        stopped: () => t > 120, onNode: () => {}, sleep: async (s) => { t += Math.max(s, 0.01); await null; } };
      try { await Run.runProgram(id, st, ctx); } catch (e) { err = e; }
      ok(!err, name + ': preview crashed: ' + (err && err.message));
      ok(calls > 3, name + ': preview barely did anything');
    }

    // each studio choice really reaches the code
    if (id === 'peeko') {
      const d = { moments: [{ face: 'angry', look: 'right', words: 'Grr', note: 'G', wait: 4 }] };
      const text = Core.generate(id, Studio.toState(id, d)).text;
      ok(/runCommand\(F\("angry"\)\)/.test(text) && /runCommand\(F\("right"\)\)/.test(text) && /PSTR\("Grr"\)/.test(text) && /waitSecs\(4\.0\)/.test(text), 'peeko: design choices missing from code');
    }
    if (id === 'chipbot') {
      const d = { safe: false, moves: [{ kind: 'dance', n: 5, move: '6', beep: 'none' }, { kind: 'walk', dir: 'back', n: 7 }] };
      const text = Core.generate(id, Studio.toState(id, d)).text;
      ok(/doDance\(6, 5\)/.test(text) && /doWalk\(1, 7\)/.test(text) && !/readDistance\(\) </.test(text), 'chipbot: design choices missing from code');
      const t2 = Core.generate(id, Studio.toState(id, { safe: true, safeCm: 25, moves: [] })).text;
      ok(/readDistance\(\) < 25/.test(t2), 'chipbot: safety check missing');
    }
    if (id === 'jarvis') {
      const text = Core.generate(id, Studio.toState(id, { dryPct: 65, dryColor: 'yellow', dryAlarm: false, darkPct: 15, darkColor: 'purple', okColor: 'cyan', checkSecs: 5 })).text;
      ok(/soilPercent\(\) < 65/.test(text) && /lightPercent\(\) < 15/.test(text) && /setColor\(1, 1, 0\)/.test(text) && /waitSecs\(5\.0\)/.test(text), 'jarvis: design choices missing from code');
    }
  }
  console.log(`\n${pass} passed, ${fail} failed`);
  process.exit(fail ? 1 : 0);
})();
