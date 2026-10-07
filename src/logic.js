/* The CHIP Challenge UI */
(function () {
  'use strict';
  const LC = LogicCore, $ = (s, r) => (r || document).querySelector(s), $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const SKEY = 'chipcamp.logic.v1';
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* ignore */ } };

  const saved = lsGet(SKEY) || {};
  const S = {
    level: Math.min(10, Math.max(1, saved.level || (ChipCamp.levelsCompleted() + 1))),
    programs: saved.programs || {}, program: [], skin: ChipCamp.robotOrDefault(),
    speed: 1, running: false, stop: false, fails: 0, usedSolution: false, rot: 0
  };
  const level = () => LC.LEVELS[S.level - 1];
  const skin = () => LC.SKINS[S.skin];
  const persist = () => { S.programs[S.level] = S.program; lsSet(SKEY, { level: S.level, programs: S.programs }); };
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

  let toastT = 0;
  function toast(m) { const t = $('#toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  function confetti(x, y) {
    const em = ['🎉', '✨', '⭐', '💜', '💙', '🟡', '🟢'];
    for (let i = 0; i < 18; i++) {
      const s = el('span', 'conf', em[i % em.length]); s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--dx', (Math.random() * 300 - 150) + 'px'); s.style.setProperty('--dy', (Math.random() * -240 - 20) + 'px'); s.style.setProperty('--r', (Math.random() * 360 - 180) + 'deg');
      document.body.appendChild(s); setTimeout(() => s.remove(), 1200);
    }
  }
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /* ---------- header: level bubbles + robot skin ---------- */
  function renderHeader() {
    const lv = $('#lvls'); lv.innerHTML = '';
    const done = ChipCamp.get().levels;
    LC.LEVELS.forEach((L) => {
      const b = el('button', 'lvl' + (done[L.id] ? ' done' : ''), String(L.id));
      b.setAttribute('aria-label', 'Level ' + L.id + ': ' + L.title + (done[L.id] ? ', completed' : ''));
      if (L.id === S.level) b.setAttribute('aria-current', 'true');
      b.onclick = () => { stopRun(); S.level = L.id; loadLevel(); };
      lv.appendChild(b);
    });
    const sk = $('#skinsel'); sk.innerHTML = '';
    Object.keys(LC.SKINS).forEach((id) => {
      const s = LC.SKINS[id], b = el('button', null, '<span>' + s.hero + '</span>' + esc(s.name));
      b.style.setProperty('--sk', s.color); b.setAttribute('aria-pressed', id === S.skin ? 'true' : 'false');
      b.onclick = () => { S.skin = id; ChipCamp.setRobot(id); renderHeader(); renderAll(); };
      sk.appendChild(b);
    });
  }

  /* ---------- blocks ---------- */
  function paramEls(def, node, interactive) {
    const out = [], L = level();
    def.parts.forEach((part) => {
      if (typeof part === 'string') { const s = el('span'); s.textContent = part; out.push(s); return; }
      if (part.t === 'goal') { const s = el('span', 'static p', goalGlyph(true) + ' ' + esc(skin().goalName)); out.push(s); return; }
      if (!interactive) {
        const s = el('span', 'static ' + (part.t === 'choice' ? 'd' : 'p'));
        const d = part.t === 'choice' && def.type === 'if' ? L.conds[0] : part.d;
        s.textContent = part.t === 'choice' ? ((part.opts.find((o) => o[0] === d) || [])[1] || d) : part.d;
        out.push(s); return;
      }
      if (part.t === 'num') {
        const w = el('span', 'pill'), i = el('input'); i.type = 'number'; i.min = part.min; i.max = part.max; i.step = 1; i.value = node.p[part.id];
        i.setAttribute('aria-label', 'times');
        i.oninput = () => { const v = Number(i.value); if (isFinite(v)) { node.p[part.id] = v; changed(); } };
        i.onchange = () => { const v = LC.normParams(def.type, { [part.id]: i.value }, L)[part.id]; node.p[part.id] = v; i.value = v; changed(); };
        w.appendChild(i); out.push(w);
      } else {
        const w = el('span', 'drop'), sel = el('select');
        const opts = def.type === 'if' ? part.opts.filter((o) => L.conds.indexOf(o[0]) >= 0) : part.opts;
        opts.forEach((o) => { const op = el('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
        sel.value = node.p[part.id]; sel.setAttribute('aria-label', part.id);
        sel.onchange = () => { node.p[part.id] = sel.value; changed(); };
        w.appendChild(sel); out.push(w);
      }
    });
    return out;
  }
  const goalGlyph = (small) => ({ chip: '🔲', smile: '🙂', plant: '🌱' }[skin().goal]);

  function renderToolbox() {
    const tb = $('#toolbox'); tb.innerHTML = '';
    const L = level();
    ['move', 'loops', 'logic'].forEach((cid) => {
      const types = L.blocks.filter((t) => LC.BLOCKS[t].cat === cid);
      if (!types.length) return;
      const cat = LC.CATS[cid];
      const h = el('div', 'cat-h', esc(cat.label)); h.style.cssText = 'font-family:var(--font-d);font-size:15px;margin:10px 0 6px;color:' + cat.color + ';display:flex;align-items:center;gap:6px';
      h.innerHTML = '<span style="width:11px;height:11px;border-radius:50%;background:' + cat.color + ';display:inline-block"></span>' + esc(cat.label);
      tb.appendChild(h);
      types.forEach((t) => {
        const def = LC.BLOCKS[t], blk = el('div', 'blk palette-blk' + (def.shape === 'c' ? ' c' : '')); blk.style.setProperty('--c', cat.color); blk.dataset.type = t;
        const row = el('div', 'row'); paramEls(def, null, false).forEach((x) => row.appendChild(x)); blk.appendChild(row);
        if (def.shape === 'c') blk.appendChild(el('div', 'foot'));
        tb.appendChild(blk);
      });
    });
  }
  function makeDz(list, isRoot) {
    const dz = el('div', 'dz' + (list.length ? '' : ' empty')); dz.__list = list; if (isRoot) dz.classList.add('lane');
    list.forEach((n) => { const b = nodeEl(n, list); if (b) dz.appendChild(b); });
    return dz;
  }
  function nodeEl(node, list) {
    const def = LC.BLOCKS[node.type]; if (!def) return null;
    const cat = LC.CATS[def.cat];
    const blk = el('div', 'blk' + (def.shape === 'c' ? ' c' : '')); blk.style.setProperty('--c', cat.color);
    blk.dataset.nid = node.id; blk.__node = node; blk.__list = list;
    const row = el('div', 'row'); paramEls(def, node, true).forEach((x) => row.appendChild(x));
    const x = el('button', 'x', '✕'); x.title = 'Remove this block'; x.setAttribute('aria-label', 'Remove block');
    x.onclick = (e) => { e.stopPropagation(); const i = list.indexOf(node); if (i > -1) list.splice(i, 1); renderProgram(); changed(); };
    row.appendChild(x); blk.appendChild(row);
    if (def.shape === 'c') {
      const slot = el('div', 'cslot'); slot.appendChild(makeDz(node.kids, false)); blk.appendChild(slot);
      if (def.canElse && node.els) { blk.appendChild(el('div', 'row else', 'else')); const s2 = el('div', 'cslot'); s2.appendChild(makeDz(node.els, false)); blk.appendChild(s2); }
      const foot = el('div', 'foot');
      if (def.canElse) {
        const eb = el('button', 'elsebtn', node.els ? '− take away else' : '+ add else');
        eb.onclick = (e) => { e.stopPropagation(); if (node.els) delete node.els; else node.els = []; renderProgram(); changed(); };
        foot.appendChild(eb);
      }
      blk.appendChild(foot);
    }
    return blk;
  }
  function renderProgram() {
    const box = $('#program'); const fresh = makeDz(S.program, true); fresh.id = 'program';
    box.replaceWith(fresh);
  }

  /* ---------- drag and drop ---------- */
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    if (S.running) return;
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (e.target.closest('input,select,textarea,button,.pill,.drop')) return;
    const pal = e.target.closest('.palette-blk');
    const blk = !pal && e.target.closest('.blk[data-nid]');
    if (!pal && !blk) return;
    if (blk && !e.target.closest('.blk[data-nid] > .row')) return;
    const src = pal || blk, r = src.getBoundingClientRect();
    drag = { kind: pal ? 'new' : 'move', type: pal && pal.dataset.type, el: src, node: blk && blk.__node, list: blk && blk.__list, sx: e.clientX, sy: e.clientY, ox: e.clientX - r.left, oy: e.clientY - r.top, w: r.width, active: false, ghost: null, target: null, idx: 0, line: null };
    e.preventDefault();
  });
  document.addEventListener('pointermove', (e) => {
    if (!drag) return;
    if (!drag.active) {
      if (Math.hypot(e.clientX - drag.sx, e.clientY - drag.sy) < 6) return;
      drag.active = true;
      const g = drag.el.cloneNode(true); g.classList.add('ghost'); g.classList.remove('lifting', 'pop'); g.style.width = drag.w + 'px'; document.body.appendChild(g); drag.ghost = g;
      document.body.classList.add('dragging', 'dragging-' + drag.kind);
      if (drag.kind === 'move') drag.el.classList.add('lifting');
    }
    drag.ghost.style.left = (e.clientX - drag.ox) + 'px'; drag.ghost.style.top = (e.clientY - drag.oy) + 'px';
    const stack = document.elementsFromPoint(e.clientX, e.clientY);
    let dz = stack.find((x) => x.classList && x.classList.contains('dz') && !(drag.kind === 'move' && drag.el.contains(x)));
    if (!dz && stack.some((x) => x.classList && x.classList.contains('workcard'))) dz = $('#program');
    const overTool = !dz && stack.some((x) => x.classList && x.classList.contains('toolcard'));
    document.body.classList.toggle('over-trash', !!(overTool && drag.kind === 'move'));
    if (drag.target && drag.target !== dz) drag.target.classList.remove('over');
    if (drag.line) { drag.line.remove(); drag.line = null; }
    drag.target = dz || null;
    if (dz) {
      dz.classList.add('over');
      const kids = Array.from(dz.children).filter((c) => c.classList.contains('blk') && c !== drag.el);
      let idx = kids.length;
      for (let i = 0; i < kids.length; i++) { const r = kids[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { idx = i; break; } }
      drag.idx = idx; drag.line = el('div', 'dropline');
      if (idx < kids.length) dz.insertBefore(drag.line, kids[idx]); else dz.appendChild(drag.line);
    }
  });
  function endDrag(e, cancel) {
    if (!drag) return;
    const d = drag; drag = null;
    document.body.classList.remove('dragging', 'dragging-new', 'dragging-move', 'over-trash');
    if (d.ghost) d.ghost.remove(); if (d.line) d.line.remove(); if (d.target) d.target.classList.remove('over'); d.el.classList.remove('lifting');
    if (cancel) return;
    if (!d.active) { if (d.kind === 'new') { const n = newNode(d.type); S.program.push(n); afterDrop(n.id); } return; }
    if (d.target) {
      const list = d.target.__list;
      if (d.kind === 'new') { const n = newNode(d.type); list.splice(d.idx, 0, n); afterDrop(n.id); }
      else { const i = d.list.indexOf(d.node); if (i > -1) d.list.splice(i, 1); list.splice(Math.min(d.idx, list.length), 0, d.node); afterDrop(d.node.id); }
    } else if (d.kind === 'move' && document.elementsFromPoint(e.clientX, e.clientY).some((x) => x.classList && x.classList.contains('toolcard'))) {
      const i = d.list.indexOf(d.node); if (i > -1) d.list.splice(i, 1); renderProgram(); changed();
    }
  }
  document.addEventListener('pointerup', (e) => endDrag(e, false));
  document.addEventListener('pointercancel', (e) => endDrag(e, true));
  function newNode(type) {
    const L = level(), n = LC.n(type, type === 'if' ? { cond: L.conds[0] } : type === 'repeat' ? { times: 3 } : type === 'turn' ? { dir: 'left' } : {});
    return n;
  }
  function afterDrop(id) {
    renderProgram(); changed();
    const b = $('.blk[data-nid="' + id + '"]'); if (b) { b.classList.add('pop'); setTimeout(() => b.classList.remove('pop'), 500); }
  }

  /* ---------- level + maze ---------- */
  function changed() { persist(); updateCounter(); updateCode(); }
  function updateCounter() {
    const n = LC.count(S.program), max = level().max, c = $('#counter');
    c.textContent = 'Blocks: ' + n + ' / ' + max; c.classList.toggle('over', n > max);
  }
  function updateCode() { $('#codePre').textContent = LC.toCode(S.program); }

  function renderIntro() {
    const L = level(), sk = skin();
    $('#intro').innerHTML = '<div class="top"><span class="num">Level ' + L.id + '</span><h1>' + esc(L.title) + '</h1><span class="concept">' + esc(L.concept) + '</span></div><p>' + esc(LC.fill(L.mission, sk)) + '</p>';
    const hb = $('#hintbox'); hb.hidden = true; hb.textContent = '💡 ' + LC.fill(L.hint, sk);
  }
  let heroEl = null, mazeInfo = null;
  function renderMaze() {
    const L = level(), sk = skin(), m = LC.parseMap(L), maze = $('#maze');
    const cell = Math.max(26, Math.min(58, Math.floor(430 / m.w), Math.floor(430 / m.h)));
    maze.className = 'maze skin-' + sk.id; maze.style.setProperty('--w', m.w); maze.style.setProperty('--cell', cell + 'px'); maze.innerHTML = '';
    $('.mazewrap').className = 'mazewrap skin-' + sk.id;
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const isGoal = x === m.goal.x && y === m.goal.y, wall = m.cells[y][x] === '#';
      const c = el('div', 'cell ' + (wall ? 'wall' : isGoal ? 'goal' : 'floor'));
      if (isGoal) c.innerHTML = '<span class="goalico">' + (sk.goal === 'chip' ? chipSvg() : goalGlyph()) + '</span>';
      maze.appendChild(c);
    }
    heroEl = el('div', 'hero', '<div class="rot"><i class="nub"></i><span class="face">' + sk.hero + '</span></div>');
    maze.appendChild(heroEl); mazeInfo = { m, cell };
    placeHero(m.start.x, m.start.y, L.dir, true);
  }
  const chipSvg = () => '<svg class="chipsvg" viewBox="0 0 40 40"><g stroke="#e2b93b" stroke-width="3" stroke-linecap="round"><path d="M12 4v6M20 4v6M28 4v6M12 30v6M20 30v6M28 30v6M4 12h6M4 20h6M4 28h6M30 12h6M30 20h6M30 28h6"/></g><rect x="9" y="9" width="22" height="22" rx="4" fill="#243b53"/><circle cx="15" cy="15" r="2.2" fill="#e2b93b"/><text x="20" y="27" font-size="9" font-family="monospace" fill="#9fd8c6" text-anchor="middle">CHIP</text></svg>';
  function placeHero(x, y, d, instant) {
    const { cell } = mazeInfo; S.hx = x; S.hy = y;
    if (instant) { heroEl.style.transition = 'none'; heroEl.querySelector('.rot').style.transition = 'none'; heroEl.querySelector('.face').style.transition = 'none'; S.rot = d * 90; }
    heroEl.style.transform = 'translate(' + (x * cell) + 'px,' + (y * cell) + 'px)';
    heroEl.querySelector('.rot').style.transform = 'rotate(' + S.rot + 'deg)';
    heroEl.querySelector('.face').style.transform = 'rotate(' + (-S.rot) + 'deg)';
    if (instant) { void heroEl.offsetWidth; heroEl.style.transition = ''; heroEl.querySelector('.rot').style.transition = ''; heroEl.querySelector('.face').style.transition = ''; }
  }
  function turnTo(d) { const cur = ((Math.round(S.rot / 90) % 4) + 4) % 4; let delta = ((d - cur + 2 + 4) % 4) - 2; S.rot += delta * 90; }

  function setMsg(kind, text) { const m = $('#msg'); m.className = 'msg' + (kind ? ' ' + kind : ''); m.textContent = text; }
  function loadLevel() {
    const L = level();
    S.fails = 0; S.usedSolution = false; $('#nextrow').hidden = true; $('#codeDetails').open = false;
    S.program = S.programs[S.level] ? cloneProg(S.programs[S.level]) : (L.preset ? L.preset() : []);
    renderHeader(); renderIntro(); renderToolbox(); renderProgram(); renderMaze(); updateCounter(); updateCode();
    setMsg('', 'Drag blocks into the workspace, then press Run. ' + (L.preset ? 'This program already exists: find the bug!' : ''));
    persist();
  }
  const cloneProg = (p) => JSON.parse(JSON.stringify(p));
  function renderAll() { renderIntro(); renderToolbox(); renderMaze(); updateCode(); setMsg('', 'Drag blocks into the workspace, then press Run.'); $('#nextrow').hidden = true; renderProgram(); updateCounter(); }

  /* ---------- running ---------- */
  function clearHighlights() { $$('.blk.running').forEach((b) => b.classList.remove('running')); $$('.badge').forEach((b) => b.remove()); }
  function stopRun() { if (S.running) S.stop = true; }
  async function resetRun() {
    if (S.running) { S.stop = true; while (S.running) await sleep(20); S.stop = false; }
    clearHighlights(); renderMaze(); $('#maze').classList.remove('win'); $('#nextrow').hidden = true;
    setMsg('', 'Ready. Press Run when you want to try it.');
  }
  function badge(nodeId, v) {
    const b = $('.blk[data-nid="' + nodeId + '"] > .row'); if (!b) return;
    $$('.badge', b).forEach((x) => x.remove());
    const t = el('span', 'tag badge', v ? '✓ yes' : '✗ no'); t.style.background = v ? '#2c8f3b' : '#c1304a'; t.style.color = '#fff'; b.insertBefore(t, b.querySelector('.x')); setTimeout(() => t.remove(), 900);
  }
  async function run() {
    if (S.running) { S.stop = true; return; }
    const L = level(), sk = skin(), n = LC.count(S.program);
    $('#nextrow').hidden = true; clearHighlights();
    if (n === 0) { setMsg('bad', '🤔 Nothing to run yet! Drag some blocks under “when Run is clicked”.'); return; }
    if (n > L.max) { setMsg('warn', '📏 You used ' + n + ' blocks but this level allows ' + L.max + '. ' + (L.id >= 3 ? 'A loop can do the repeating for you.' : 'Try fewer blocks.')); fail(); return; }
    renderMaze(); $('#maze').classList.remove('win');
    const res = LC.run(L, S.program);
    S.running = true; S.stop = false; $('#runBtn').textContent = '■ Stop'; $('#runBtn').classList.add('stop'); $('#runBtn').classList.remove('go');
    setMsg('', '🏃 Running your instructions exactly as written…');
    const sp = S.speed, T = (ms) => sleep(ms / sp);
    let lastNode = null;
    for (const ev of res.events) {
      if (S.stop) break;
      if (ev.t === 'enter') { if (lastNode) lastNode.classList.remove('running'); lastNode = $('.blk[data-nid="' + ev.node + '"]'); if (lastNode) lastNode.classList.add('running'); await T(140); }
      else if (ev.t === 'move') { placeHero(ev.to.x, ev.to.y, ev.d); await T(360); }
      else if (ev.t === 'turn') { turnTo(ev.d); placeHero(S.hx, S.hy, ev.d); await T(300); }
      else if (ev.t === 'check') { badge(ev.node, ev.v); await T(300); }
      else if (ev.t === 'loopcheck') { await T(60); }
      else if (ev.t === 'crash') { heroEl.classList.add('crash'); await T(520); heroEl.classList.remove('crash'); }
    }
    if (lastNode) lastNode.classList.remove('running');
    S.running = false; $('#runBtn').textContent = '▶ Run'; $('#runBtn').classList.remove('stop'); $('#runBtn').classList.add('go');
    if (S.stop) { S.stop = false; setMsg('', 'Stopped. Press Reset to start over.'); return; }
    if (res.ok) win(res); else { setMsg('bad', pick(sk[res.reason === 'goal' ? 'end' : res.reason])); fail(); }
  }
  function fail() {
    S.fails++;
    if (S.fails >= 2 && !$('#showSol')) {
      const row = $('#nextrow'); row.hidden = false; row.innerHTML = '<span style="font-weight:800;color:#69709a">Stuck?</span>';
      const b = el('button', 'btn small', '🧩 Show me a solution'); b.id = 'showSol';
      b.onclick = () => { S.usedSolution = true; S.program = level().ref(); renderProgram(); changed(); resetMazeOnly(); setMsg('', 'Here is one way to do it. Study it, then press Run.'); row.hidden = true; };
      row.appendChild(b);
    }
  }
  function resetMazeOnly() { clearHighlights(); renderMaze(); }
  function win(res) {
    const L = level(), sk = skin();
    let st = LC.stars(L, res.blocks); if (S.usedSolution) st = 1;
    ChipCamp.levelDone(L.id, st);
    $('#maze').classList.add('win');
    setMsg('win', pick(sk.win) + (S.usedSolution ? '' : ''));
    const r = $('#runBtn').getBoundingClientRect(); confetti(r.left + 40, r.top);
    const row = $('#nextrow'); row.hidden = false; row.innerHTML = '';
    row.appendChild(el('span', 'stars', '★'.repeat(st) + '<span class="off">' + '★'.repeat(3 - st) + '</span>'));
    if (L.id < 10) { const nb = el('button', 'btn go big', 'Next level ▶'); nb.onclick = () => { S.level = L.id + 1; loadLevel(); window.scrollTo(0, 0); }; row.appendChild(nb); }
    else {
      const all = ChipCamp.levelsCompleted() >= 10;
      row.appendChild(el('span', null, '<b style="font-family:var(--font-d);font-size:18px">' + (all ? '🎉 You finished all 10 levels!' : '🎉 Level 10 done! Go back and try the levels you skipped.') + '</b>'));
      if (all) { const a = el('a', 'btn go big', 'Go wire your robot ➜'); a.href = 'circuits.html'; a.style.textDecoration = 'none'; row.appendChild(a); }
    }
    if (S.usedSolution) row.appendChild(el('span', null, '<small style="color:#69709a;font-weight:700">You peeked at a solution, so try this level again on your own for 3 stars!</small>'));
    renderHeader();
  }

  /* ---------- buttons ---------- */
  $('#runBtn').onclick = run;
  $('#resetBtn').onclick = resetRun;
  $('#hintBtn').onclick = () => { const h = $('#hintbox'); h.hidden = !h.hidden; };
  (function () { const b = $('#clearBtn'); let armed = false, t = 0; b.onclick = () => { if (!armed) { armed = true; b.textContent = 'Clear all? Click again'; t = setTimeout(() => { armed = false; b.textContent = '🧹 Clear'; }, 2500); return; } clearTimeout(t); armed = false; b.textContent = '🧹 Clear'; S.program = []; S.usedSolution = false; renderProgram(); changed(); resetMazeOnly(); }; })();
  $$('#speedsel button').forEach((b) => { b.onclick = () => { S.speed = Number(b.dataset.sp); $$('#speedsel button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); }; });

  loadLevel();
  window.__logic = { S, LC, loadLevel, run };
})();
