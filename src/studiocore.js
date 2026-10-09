/* Studio core: what students design in the Face, Dance and Light studios, and how a design becomes Code Builder blocks.
   A design only picks faces, moves, colours and notes the base sketches already have, so it always compiles. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.CampStudio = factory(root.CampCore);
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';
  const PR = Core.PROJECTS;
  const MAX_STEPS = 8;
  const NOTE_IDS = ['none'].concat(Core.NOTES.map((n) => n[0]));

  const optIds = (proj, type, param) => PR[proj].blockMap[type].params.find((p) => p.id === param).opts.map((o) => o[0]);
  const FACES = optIds('peeko', 'act', 'face');
  const MOVES = optIds('chipbot', 'dance', 'move');
  const COLORS = optIds('jarvis', 'light', 'color');
  const pick = (v, list, d) => (list.indexOf(v) >= 0 ? v : d);
  const val = (proj, type, id, v) => Core.norm(PR[proj].blockMap[type], { [id]: v })[id];

  /* ---------- what each studio designs ---------- */
  const KINDS = ['walk', 'turn', 'dance', 'stand'];
  function defaults(proj) {
    if (proj === 'peeko') {
      return { moments: [
        { face: 'happy', look: 'none', words: '', note: 'none', wait: 2 },
        { face: 'surprised', look: 'left', words: '', note: 'none', wait: 2 },
        { face: 'sleepy', look: 'none', words: '', note: 'none', wait: 2 }
      ] };
    }
    if (proj === 'chipbot') {
      return { safe: true, safeCm: 15, moves: [
        { kind: 'walk', dir: 'fwd', n: 4, move: '0', beep: 'none' },
        { kind: 'dance', dir: 'fwd', n: 2, move: '0', beep: 'C' },
        { kind: 'turn', dir: 'left', n: 3, move: '0', beep: 'none' }
      ] };
    }
    return { dryPct: 40, dryColor: 'red', dryAlarm: true, darkPct: 30, darkColor: 'blue', okColor: 'green', checkSecs: 2 };
  }

  // Rebuild stored or pasted designs from scratch: valid choices only, numbers in range.
  function clean(proj, d) {
    d = d && typeof d === 'object' ? d : {};
    if (proj === 'peeko') {
      const src = Array.isArray(d.moments) ? d.moments : defaults('peeko').moments;
      return { moments: src.slice(0, MAX_STEPS).map((m) => {
        m = m || {};
        return {
          face: pick(m.face, FACES, 'happy'), look: pick(m.look, ['none', 'left', 'right'], 'none'),
          words: Core.cleanText(m.words, 20, ''), note: pick(m.note, NOTE_IDS, 'none'), wait: val('peeko', 'wait', 'secs', m.wait)
        };
      }) };
    }
    if (proj === 'chipbot') {
      const src = Array.isArray(d.moves) ? d.moves : defaults('chipbot').moves;
      return {
        safe: d.safe !== false, safeCm: val('chipbot', 'if_dist', 'cm', d.safeCm),
        moves: src.slice(0, MAX_STEPS).map((m) => {
          m = m || {};
          const kind = pick(m.kind, KINDS, 'walk');
          const n = kind === 'dance' ? val('chipbot', 'dance', 'reps', m.n) : kind === 'turn' ? val('chipbot', 'turn', 'steps', m.n) : val('chipbot', 'walk', 'steps', m.n);
          return { kind, dir: kind === 'turn' ? pick(m.dir, ['left', 'right'], 'left') : pick(m.dir, ['fwd', 'back'], 'fwd'), n, move: pick(String(m.move), MOVES, '0'), beep: pick(m.beep, NOTE_IDS, 'none') };
        })
      };
    }
    return {
      dryPct: val('jarvis', 'if_soil', 'pct', d.dryPct), dryColor: pick(d.dryColor, COLORS, 'red'), dryAlarm: d.dryAlarm !== false,
      darkPct: val('jarvis', 'if_light', 'pct', d.darkPct), darkColor: pick(d.darkColor, COLORS, 'blue'), okColor: pick(d.okColor, COLORS, 'green'),
      checkSecs: val('jarvis', 'wait', 'secs', d.checkSecs)
    };
  }

  /* ---------- design -> Code Builder blocks ---------- */
  function toBlocks(proj, design) {
    const d = clean(proj, design);
    const mk = (type, p, kids, els) => Core.mkNode(proj, type, p, kids, els);
    const beep = (note, secs) => (note === 'none' ? [] : [mk('note', { note, secs: secs || 0.2 })]);

    if (proj === 'peeko') {
      const forever = [];
      d.moments.forEach((m) => {
        forever.push(mk('act', { face: m.face }));
        if (m.look !== 'none') forever.push(mk('look', { dir: m.look }));
        if (m.words) forever.push(mk('say_text', { words: m.words, secs: 2 }));
        beep(m.note, 0.3).forEach((n) => forever.push(n));
        forever.push(mk('wait', { secs: m.wait }));
      });
      if (!forever.length) forever.push(mk('wait', { secs: 1 }));
      return { wake: [mk('say_name', { who: 'robot', secs: 2 })], forever };
    }

    if (proj === 'chipbot') {
      const routine = [];
      d.moves.forEach((m) => {
        if (m.kind === 'walk') routine.push(mk('walk', { dir: m.dir, steps: m.n }));
        else if (m.kind === 'turn') routine.push(mk('turn', { dir: m.dir, steps: m.n }));
        else if (m.kind === 'dance') routine.push(mk('dance', { move: m.move, reps: m.n }));
        else routine.push(mk('stand'));
        beep(m.beep, 0.2).forEach((n) => routine.push(n));
      });
      const forever = [];
      if (d.safe) forever.push(mk('if_dist', { cmp: 'less', cm: d.safeCm }, [mk('turn', { dir: 'left', steps: 3 }), mk('note', { note: 'G', secs: 0.2 })], routine));
      else routine.forEach((n) => forever.push(n));
      forever.push(mk('wait', { secs: 0.5 }));
      return { wake: [mk('hello'), mk('note', { note: 'C2', secs: 0.2 })], forever };
    }

    const dryKids = [mk('light', { color: d.dryColor })];
    if (d.dryAlarm) dryKids.push(mk('repeat', { times: 3 }, [mk('note', { note: 'C', secs: 0.2 }), mk('wait', { secs: 0.2 })]));
    const darkIf = mk('if_light', { cmp: 'below', pct: d.darkPct }, [mk('light', { color: d.darkColor })], [mk('light', { color: d.okColor })]);
    return {
      wake: [mk('hello'), mk('light', { color: d.okColor })],
      forever: [mk('if_soil', { cmp: 'below', pct: d.dryPct }, dryKids, [darkIf]), mk('print'), mk('wait', { secs: d.checkSecs })]
    };
  }

  // Puts a design into a Code Builder state, keeping the student's name, robot name, date and settings.
  function toState(proj, design, base) {
    const st = Core.newState(proj);
    if (base) { st.builder = base.builder || ''; st.robot = base.robot || ''; st.date = base.date || ''; st.settings = Object.assign(st.settings, base.settings || {}); }
    const b = toBlocks(proj, design);
    st.wake = b.wake; st.forever = b.forever;
    return st;
  }

  return { MAX_STEPS, NOTE_IDS, FACES, MOVES, COLORS, KINDS, defaults, clean, toBlocks, toState };
});
