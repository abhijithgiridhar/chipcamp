/* Camp Studio UI: Face Studio (Peeko), Dance Studio (Chip Bot), Light Studio (Jarvis). */
(function () {
  'use strict';
  const Core = CampCore, Studio = CampStudio, Runtime = CampRuntime, Stages = CampStages;
  const PROJECTS = Core.PROJECTS, ORDER = ['peeko', 'chipbot', 'jarvis'];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };

  const META = {
    peeko: { studio: 'Face Studio', title: "Design Peeko's face show", say: 'Each card is one moment. Pick a face, a head move, some words, a sound, and how long to hold it. Peeko plays your moments in order, forever.', add: '+ Add a moment', noun: 'moment' },
    chipbot: { studio: 'Dance Studio', title: "Design Chip Bot's routine", say: 'Each card is one move. Chip Bot does them in order, forever. Switch on the safety check and it turns away when something gets close.', add: '+ Add a move', noun: 'move' },
    jarvis: { studio: 'Light Studio', title: "Design Jarvis's plant light", say: 'Jarvis checks the soil and the light over and over. Pick a colour for each situation, then move the sliders on the right to test your rules.', add: '', noun: 'rule' }
  };
  const COLORCSS = { red: '#ff3b3b', green: '#35d07f', blue: '#3b82ff', yellow: '#ffd93b', cyan: '#2de2e6', purple: '#b06bff', white: '#ffffff', off: '#59606e' };
  const colorOpts = PROJECTS.jarvis.blockMap.light.params[0].opts;
  const faceOpts = PROJECTS.peeko.blockMap.act.params[0].opts;
  const moveOpts = PROJECTS.chipbot.blockMap.dance.params[0].opts;
  const noteOpts = [['none', 'no sound']].concat(Core.NOTES.map((n) => [n[0], 'note ' + n[1]]));
  const KIND_LABEL = { walk: ['🚶', 'Walk'], turn: ['↩️', 'Turn'], dance: ['💃', 'Dance'], stand: ['🧍', 'Stand still'] };
  const num = (proj, type, id, v) => Core.norm(PROJECTS[proj].blockMap[type], { [id]: v })[id];

  const S = { proj: ChipCamp.robotOrDefault(), design: null, speed: 1 };
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }

  /* ---------- design storage ---------- */
  function loadDesign() { S.design = Studio.clean(S.proj, ChipCamp.design(S.proj) || Studio.defaults(S.proj)); }
  function save() { ChipCamp.setDesign(S.proj, Studio.clean(S.proj, S.design)); }
  function changed(rerender) { save(); if (rerender) renderEditor(); }

  /* ---------- small builders ---------- */
  function field(label, node) { const l = el('label'); l.appendChild(document.createTextNode(label)); l.appendChild(node); return l; }
  function select(opts, value, onchange) {
    const s = el('select'); opts.forEach((o) => { const op = el('option'); op.value = o[0]; op.textContent = o[1]; s.appendChild(op); });
    s.value = value; s.onchange = () => onchange(s.value); return s;
  }
  function numberIn(value, min, max, step, onchange) {
    const i = el('input'); i.type = 'number'; i.min = min; i.max = max; i.step = step; i.value = value;
    i.onchange = () => onchange(i.value); return i;
  }
  function chip(html, pressed, onclick, cls) { const b = el('button', cls || 'chip', html); b.type = 'button'; b.setAttribute('aria-pressed', pressed ? 'true' : 'false'); b.onclick = onclick; return b; }
  function cardHead(num, label, list, i, onPlay) {
    const h = el('div', 'momhead', '<span class="num">' + num + '</span><b>' + esc(label) + '</b><span class="sp"></span>');
    if (onPlay) { const p = el('button', null, '▶'); p.title = 'Try just this ' + META[S.proj].noun; p.onclick = onPlay; h.appendChild(p); }
    if (list) {
      const up = el('button', null, '↑'), dn = el('button', null, '↓'), rm = el('button', null, '✕');
      up.title = 'Move up'; dn.title = 'Move down'; rm.title = 'Remove';
      up.disabled = i === 0; dn.disabled = i === list.length - 1;
      up.onclick = () => { list.splice(i - 1, 0, list.splice(i, 1)[0]); changed(true); };
      dn.onclick = () => { list.splice(i + 1, 0, list.splice(i, 1)[0]); changed(true); };
      rm.onclick = () => { list.splice(i, 1); changed(true); };
      h.appendChild(up); h.appendChild(dn); h.appendChild(rm);
    }
    return h;
  }
  function addRow(list, make) {
    const r = el('div', 'addrow'), max = Studio.MAX_STEPS;
    const b = el('button', 'btn', META[S.proj].add); b.disabled = list.length >= max;
    b.onclick = () => { list.push(make()); changed(true); };
    r.appendChild(b);
    r.appendChild(el('span', 'note', list.length >= max ? 'That is the most (' + max + ').' : list.length + ' of ' + max));
    return r;
  }

  /* ---------- Face Studio (Peeko) ---------- */
  function editPeeko(root) {
    const list = S.design.moments, stack = el('div', 'stack');
    if (!list.length) stack.appendChild(el('p', 'note', 'No moments yet. Add one to start your show.'));
    list.forEach((m, i) => {
      const card = el('div', 'mom'); card.style.setProperty('--c', '#9966FF');
      card.appendChild(cardHead(i + 1, 'Moment', list, i, () => playPart(i)));
      const body = el('div', 'mombody');
      const faces = el('div', 'chips');
      faceOpts.forEach((o) => { const [emoji, ...rest] = o[1].split(' '); faces.appendChild(chip('<span class="e">' + emoji + '</span>' + esc(rest.join(' ')), m.face === o[0], () => { m.face = o[0]; changed(true); })); });
      body.appendChild(faces);
      const f = el('div', 'fields');
      f.appendChild(field('Head', select([['none', 'stays still'], ['left', '⬅️ looks left'], ['right', '➡️ looks right']], m.look, (v) => { m.look = v; changed(); })));
      const words = el('input'); words.type = 'text'; words.maxLength = 20; words.placeholder = 'optional'; words.value = m.words;
      words.oninput = () => { m.words = words.value; save(); };
      words.onchange = () => { m.words = Core.cleanText(words.value, 20, ''); words.value = m.words; changed(); };
      f.appendChild(field('Words on screen', words));
      f.appendChild(field('Sound', select(noteOpts, m.note, (v) => { m.note = v; changed(); })));
      f.appendChild(field('Then wait (sec)', numberIn(m.wait, 0.1, 30, 0.1, (v) => { m.wait = num('peeko', 'wait', 'secs', v); changed(true); })));
      body.appendChild(f); card.appendChild(body); stack.appendChild(card);
    });
    root.appendChild(stack);
    root.appendChild(addRow(list, () => ({ face: 'happy', look: 'none', words: '', note: 'none', wait: 2 })));
  }

  /* ---------- Dance Studio (Chip Bot) ---------- */
  function editChipbot(root) {
    const d = S.design, list = d.moves;
    const guard = el('div', 'mom guard');
    guard.appendChild(el('div', 'momhead', '<span class="num">🛡</span><b>Safety check</b>'));
    const gb = el('div', 'mombody'), row = el('label', 'check');
    const cb = el('input'); cb.type = 'checkbox'; cb.checked = d.safe; cb.onchange = () => { d.safe = cb.checked; changed(true); };
    row.appendChild(cb); row.appendChild(document.createTextNode('If something is closer than'));
    const cm = numberIn(d.safeCm, 3, 50, 1, (v) => { d.safeCm = num('chipbot', 'if_dist', 'cm', v); changed(true); }); cm.disabled = !d.safe;
    row.appendChild(cm); row.appendChild(document.createTextNode('cm, turn away instead of doing the routine'));
    gb.appendChild(row); guard.appendChild(gb); root.appendChild(guard);
    root.appendChild(el('div', 'flow', d.safe ? '↓ otherwise, Chip Bot does this routine ↓' : '↓ Chip Bot does this routine ↓'));

    const stack = el('div', 'stack');
    if (!list.length) stack.appendChild(el('p', 'note', 'No moves yet. Add one to start your routine.'));
    list.forEach((m, i) => {
      const card = el('div', 'mom'); card.style.setProperty('--c', '#4C97FF');
      card.appendChild(cardHead(i + 1, KIND_LABEL[m.kind][1], list, i, () => playPart(i)));
      const body = el('div', 'mombody'), kinds = el('div', 'chips');
      Studio.KINDS.forEach((k) => kinds.appendChild(chip('<span class="e">' + KIND_LABEL[k][0] + '</span>' + KIND_LABEL[k][1], m.kind === k, () => {
        m.kind = k; m.dir = k === 'turn' ? 'left' : 'fwd'; m.n = k === 'dance' ? 2 : k === 'turn' ? 3 : 4; changed(true);
      })));
      body.appendChild(kinds);
      const f = el('div', 'fields');
      if (m.kind === 'walk') {
        f.appendChild(field('Direction', select([['fwd', 'forward'], ['back', 'backward']], m.dir, (v) => { m.dir = v; changed(); })));
        f.appendChild(field('Steps', numberIn(m.n, 1, 10, 1, (v) => { m.n = num('chipbot', 'walk', 'steps', v); changed(true); })));
      } else if (m.kind === 'turn') {
        f.appendChild(field('Direction', select([['left', 'left'], ['right', 'right']], m.dir, (v) => { m.dir = v; changed(); })));
        f.appendChild(field('Steps', numberIn(m.n, 1, 10, 1, (v) => { m.n = num('chipbot', 'turn', 'steps', v); changed(true); })));
      } else if (m.kind === 'dance') {
        f.appendChild(field('Dance move', select(moveOpts, m.move, (v) => { m.move = v; changed(); })));
        f.appendChild(field('Times', numberIn(m.n, 1, 8, 1, (v) => { m.n = num('chipbot', 'dance', 'reps', v); changed(true); })));
      }
      f.appendChild(field('Beep after', select(noteOpts, m.beep, (v) => { m.beep = v; changed(); })));
      body.appendChild(f); card.appendChild(body); stack.appendChild(card);
    });
    root.appendChild(stack);
    root.appendChild(addRow(list, () => ({ kind: 'walk', dir: 'fwd', n: 4, move: '0', beep: 'none' })));
  }

  /* ---------- Light Studio (Jarvis) ---------- */
  function swatches(current, onpick) {
    const wrap = el('div', 'swatches');
    colorOpts.forEach((o) => {
      const b = el('button', 'swatch' + (o[0] === 'off' ? ' off' : '')); b.type = 'button';
      if (o[0] !== 'off') b.style.background = COLORCSS[o[0]];
      b.title = o[1].replace(/^\S+\s/, ''); b.setAttribute('aria-label', b.title); b.setAttribute('aria-pressed', o[0] === current ? 'true' : 'false');
      b.onclick = () => { onpick(o[0]); changed(true); };
      wrap.appendChild(b);
    });
    return wrap;
  }
  function editJarvis(root) {
    const d = S.design;
    const rule = (cls, num, title, color, onpick, extra) => {
      const card = el('div', 'mom rule ' + cls);
      const head = el('div', 'momhead', '<span class="num">' + num + '</span><b>' + title + '</b>'); card.appendChild(head);
      const body = el('div', 'mombody'); body.appendChild(swatches(color, onpick));
      body.appendChild(el('div', 'swlabel', 'LED colour: ' + (colorOpts.find((o) => o[0] === color) || ['', color])[1].replace(/^\S+\s/, '')));
      if (extra) body.appendChild(extra);
      card.appendChild(body); return card;
    };
    const dryExtra = el('div', 'fields');
    dryExtra.appendChild(field('Dry means below (%)', numberIn(d.dryPct, 0, 100, 5, (v) => { d.dryPct = num('jarvis', 'if_soil', 'pct', v); changed(true); })));
    const al = el('label', 'check'); const acb = el('input'); acb.type = 'checkbox'; acb.checked = d.dryAlarm; acb.onchange = () => { d.dryAlarm = acb.checked; changed(); };
    al.appendChild(acb); al.appendChild(document.createTextNode('🔔 Beep 3 times to ask for water')); dryExtra.appendChild(al);
    root.appendChild(rule('r1', 1, 'If the soil is dry', d.dryColor, (c) => { d.dryColor = c; }, dryExtra));
    root.appendChild(el('div', 'flow', '↓ if not ↓'));
    const darkExtra = el('div', 'fields');
    darkExtra.appendChild(field('Dark means below (%)', numberIn(d.darkPct, 0, 100, 5, (v) => { d.darkPct = num('jarvis', 'if_light', 'pct', v); changed(true); })));
    root.appendChild(rule('r2', 2, 'Else, if it is dark', d.darkColor, (c) => { d.darkColor = c; }, darkExtra));
    root.appendChild(el('div', 'flow', '↓ if not ↓'));
    root.appendChild(rule('r3', 3, 'Otherwise, all is well', d.okColor, (c) => { d.okColor = c; }));
    const f = el('div', 'fields'); f.style.marginTop = '14px';
    f.appendChild(field('Check the plant every (sec)', numberIn(d.checkSecs, 0.1, 30, 0.1, (v) => { d.checkSecs = num('jarvis', 'wait', 'secs', v); changed(true); })));
    root.appendChild(f);
  }

  function renderEditor() {
    const m = META[S.proj], root = $('#editor'); root.innerHTML = '';
    $('#brandName').textContent = m.studio; $('#edTitle').textContent = m.title; $('#edSay').textContent = m.say;
    document.title = m.studio + ' · Chip Camp';
    if (S.proj === 'peeko') editPeeko(root); else if (S.proj === 'chipbot') editChipbot(root); else editJarvis(root);
    $('#edNote').textContent = 'Your design is saved on this laptop as you go.';
  }

  /* ---------- tabs ---------- */
  function renderTabs() {
    const nav = $('#ptabs'); nav.innerHTML = '';
    ORDER.forEach((id) => {
      const p = PROJECTS[id];
      const b = el('button', 'ptab', '<span class="em">' + p.emoji + '</span>' + esc(p.name));
      b.setAttribute('aria-selected', id === S.proj ? 'true' : 'false'); b.style.setProperty('--pc', p.color);
      b.onclick = () => { if (id === S.proj) return; stopRun(); S.proj = id; ChipCamp.setRobot(id); loadDesign(); renderAll(); };
      nav.appendChild(b);
    });
  }

  /* ---------- the stage (same on-screen robots as the Code Builder) ---------- */
  const sensors = {
    distance: 50, soil: 35, light: 70, _l: {},
    on(k, f) { (this._l[k] = this._l[k] || []).push(f); },
    set(k, v) { this[k] = v; (this._l[k] || []).forEach((f) => f()); const i = $('#sliders input[data-s="' + k + '"]'); if (i) { i.value = v; const o = i.parentElement.querySelector('output'); if (o) o.textContent = Math.round(v); } },
    print(t) { const s = $('#serial'), d = el('div'); d.textContent = t; s.appendChild(d); while (s.children.length > 40) s.children[1].remove(); s.scrollTop = s.scrollHeight; }
  };
  let stageApi = null, running = false, stopFlag = false;
  function mountStage() {
    sensors._l = {};
    const made = Stages.make[S.proj]($('#scene'), sensors);
    stageApi = made.stage;
    const sl = $('#sliders'); sl.innerHTML = made.controls; sl.hidden = !made.controls;
    $$('input[data-s]', sl).forEach((i) => {
      const k = i.dataset.s, o = i.parentElement.querySelector('output');
      i.value = sensors[k]; o.textContent = Math.round(sensors[k]);
      i.oninput = () => { sensors.set(k, Number(i.value)); };
    });
    $('#serial').innerHTML = '<b>Serial Monitor</b>';
  }
  function stopRun() { if (running) stopFlag = true; }
  function makeCtx() {
    const P = PROJECTS[S.proj], name = ChipCamp.get().name;
    return {
      stage: stageApi, sensors, settings: Object.assign({}, P.settingsDefault || {}), speedLevel: 1,
      names: { robot: P.robotDefault, builder: Core.cleanText(name, 16, 'Friend') },
      stepSeconds() { return [1.4, 1.0, 0.7][this.speedLevel] || 1; },
      stopped: () => stopFlag,
      onNode: () => {},
      sleep: async (sec) => { let left = sec * 1000 / S.speed; while (left > 0) { if (stopFlag) throw Runtime.STOP; const dt = Math.min(left, 40); await new Promise((r) => setTimeout(r, dt)); left -= dt; } }
    };
  }
  async function exec(fn) {
    if (running) { stopFlag = true; await new Promise((r) => setTimeout(r, 120)); }
    running = true; stopFlag = false;
    $('#runBtn').hidden = true; $('#stopBtn').hidden = false; $('#serial').innerHTML = '<b>Serial Monitor</b>';
    try { await fn(makeCtx()); }
    catch (e) { if (e !== Runtime.STOP) { console.error(e); toast('Oops, the preview hit a problem'); } }
    running = false; $('#runBtn').hidden = false; $('#stopBtn').hidden = true;
  }
  function currentState() { return Studio.toState(S.proj, S.design, { builder: ChipCamp.get().name, robot: '' }); }
  $('#runBtn').onclick = () => { save(); exec((c) => Runtime.runProgram(S.proj, currentState(), c)); };
  $('#stopBtn').onclick = () => { stopFlag = true; };
  // try just one card: the same blocks the Code Builder will get, run once
  function playPart(i) {
    const d = JSON.parse(JSON.stringify(S.design));
    if (S.proj === 'peeko') d.moments = [d.moments[i]]; else d.moves = [d.moves[i]], d.safe = false;
    const b = Studio.toBlocks(S.proj, d);
    exec((c) => { c.stage.reset(); return Runtime.runList(S.proj, b.forever, c); });
  }
  $$('#speedsel button').forEach((b) => { b.onclick = () => { S.speed = Number(b.dataset.sp); $$('#speedsel button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); }; });
  $('#soundBtn').onclick = () => { Stages.Sound.on = !Stages.Sound.on; $('#soundBtn').textContent = Stages.Sound.on ? '🔊' : '🔇'; $('#soundBtn').setAttribute('aria-pressed', Stages.Sound.on); if (Stages.Sound.on) Stages.Sound.beep(660, 0.12); };

  $('#toBuilder').onclick = () => { stopRun(); save(); location.href = 'blocks.html#design'; };

  function renderAll() { renderTabs(); renderEditor(); mountStage(); }
  loadDesign(); renderAll();
  window.__studio = { S, Studio, renderAll };
})();
