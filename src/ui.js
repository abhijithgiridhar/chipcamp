/* Camp Blocks UI: blocks, drag and drop, stage, code view. */
(function () {
  'use strict';
  const Core = CampCore, Runtime = CampRuntime, Stages = CampStages, Studio = CampStudio;
  const PROJECTS = Core.PROJECTS, ORDER = ['peeko', 'chipbot', 'jarvis'];
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const todayStr = () => new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });

  const S = { proj: 'peeko', view: 'build', states: {}, speed: 1, lastLane: 'forever', activeStory: null, doneBefore: {}, showAll: false, openFolds: new Set() };
  const P = () => PROJECTS[S.proj];
  function state() {
    if (!S.states[S.proj]) { S.states[S.proj] = Core.newState(S.proj); S.states[S.proj].date = todayStr(); }
    const st = S.states[S.proj];
    if (!st.builder) st.builder = ChipCamp.get().name;
    return st;
  }

  /* ---------- persistence ---------- */
  const KEY = 'campblocks.v2', SAVES = 'campblocks.saves.v1';
  function lsGet(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }
  let saveT = 0;
  function persist() { clearTimeout(saveT); saveT = setTimeout(() => lsSet(KEY, { proj: S.proj, states: S.states }), 250); }
  function cleanList(proj, list) {
    const Pj = PROJECTS[proj];
    return (Array.isArray(list) ? list : []).filter((n) => n && Pj.blockMap[n.type]).map((n) => {
      const def = Pj.blockMap[n.type];
      const node = { id: n.id || Core.uid(), type: n.type, p: Object.assign(Core.defaults(def), n.p || {}) };
      if (def.shape === 'c') { node.kids = cleanList(proj, n.kids); if (def.canElse && n.els) node.els = cleanList(proj, n.els); }
      return node;
    });
  }
  function cleanState(proj, st) {
    const base = Core.newState(proj);
    return Object.assign(base, { builder: String((st && st.builder) || ''), robot: String((st && st.robot) || ''), date: (st && st.date) || todayStr(),
      settings: Object.assign(base.settings, (st && st.settings) || {}), wake: cleanList(proj, st && st.wake), forever: cleanList(proj, st && st.forever) });
  }
  (function load() {
    const d = lsGet(KEY);
    if (d && d.states) { ORDER.forEach((id) => { if (d.states[id]) S.states[id] = cleanState(id, d.states[id]); }); if (PROJECTS[d.proj]) S.proj = d.proj; }
    const chosen = ChipCamp.get().robot; if (chosen && PROJECTS[chosen]) S.proj = chosen;
  })();

  /* ---------- small helpers ---------- */
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  function confetti(x, y) {
    const em = ['🎉', '✨', '⭐', '💜', '💙', '🟡', '🟢'];
    for (let i = 0; i < 16; i++) {
      const s = el('span', 'conf', em[i % em.length]);
      s.style.left = x + 'px'; s.style.top = y + 'px';
      s.style.setProperty('--dx', (Math.random() * 260 - 130) + 'px'); s.style.setProperty('--dy', (Math.random() * -220 - 20) + 'px'); s.style.setProperty('--r', (Math.random() * 360 - 180) + 'deg');
      document.body.appendChild(s); setTimeout(() => s.remove(), 1200);
    }
  }
  function twoClick(btn, label, action) {
    let armed = false, t = 0; const orig = btn.innerHTML;
    btn.onclick = () => {
      if (!armed) { armed = true; btn.innerHTML = label; t = setTimeout(() => { armed = false; btn.innerHTML = orig; }, 3000); return; }
      clearTimeout(t); armed = false; btn.innerHTML = orig; action();
    };
  }
  function changed() { persist(); ChipCamp.codeBlocks(S.proj, Core.countBlocks(state())); renderStory(); updateHat(); updateCount(); if (S.view === 'code') renderCode(); }

  /* ---------- header ---------- */
  function renderTabs() {
    const nav = $('#ptabs'); nav.innerHTML = '';
    ORDER.forEach((id) => {
      const p = PROJECTS[id];
      const b = el('button', 'ptab', '<span class="em">' + p.emoji + '</span>' + esc(p.name));
      b.setAttribute('aria-selected', id === S.proj ? 'true' : 'false');
      b.style.setProperty('--pc', p.color);
      b.onclick = () => { if (id === S.proj) return; stopRun(); S.proj = id; ChipCamp.setRobot(id); S.activeStory = null; S.openFolds.clear(); persist(); renderAll(); };
      nav.appendChild(b);
    });
  }
  $$('.vtab').forEach((b) => { b.onclick = () => setView(b.dataset.view); });
  function setView(v) {
    S.view = v; stopRun();
    $$('.vtab').forEach((b) => b.setAttribute('aria-selected', b.dataset.view === v ? 'true' : 'false'));
    $('#buildView').hidden = v !== 'build'; $('#codeView').hidden = v !== 'code';
    if (v === 'code') renderCode();
    window.scrollTo(0, 0);
  }
  $('#makeCode').onclick = (e) => { confetti(e.clientX, e.clientY); setView('code'); };
  $('#backBtn').onclick = () => setView('build');

  /* ---------- palette ---------- */
  function paramEls(def, node, interactive) {
    const out = [];
    def.parts.forEach((part) => {
      if (typeof part === 'string') { const s = el('span'); s.textContent = part; out.push(s); return; }
      if (!interactive) {
        const s = el('span', 'static ' + (part.t === 'choice' ? 'd' : 'p'));
        s.textContent = part.t === 'choice' ? ((part.opts.find((o) => o[0] === part.d) || [])[1] || part.d) : part.d;
        out.push(s); return;
      }
      if (part.t === 'num') {
        const w = el('span', 'pill'), i = el('input'); i.type = 'number'; i.min = part.min; i.max = part.max; i.step = part.step || 1; i.value = node.p[part.id];
        i.setAttribute('aria-label', part.id);
        i.oninput = () => { const v = Number(i.value); if (isFinite(v)) { node.p[part.id] = v; changed(); } };
        i.onchange = () => { const v = Core.norm({ params: [part] }, { [part.id]: i.value })[part.id]; node.p[part.id] = v; i.value = v; changed(); };
        w.appendChild(i); out.push(w);
      } else if (part.t === 'choice') {
        const w = el('span', 'drop'), sel = el('select');
        part.opts.forEach((o) => { const op = el('option'); op.value = o[0]; op.textContent = o[1]; sel.appendChild(op); });
        sel.value = node.p[part.id]; sel.setAttribute('aria-label', part.id);
        sel.onchange = () => { node.p[part.id] = sel.value; changed(); };
        w.appendChild(sel); out.push(w);
      } else if (part.t === 'text') {
        const w = el('span', 'pill'), i = el('input'); i.type = 'text'; i.maxLength = part.max; i.value = node.p[part.id]; i.setAttribute('aria-label', part.id);
        i.oninput = () => { node.p[part.id] = i.value; changed(); };
        i.onchange = () => { const v = Core.cleanText(i.value, part.max, part.d); node.p[part.id] = v; i.value = v; changed(); };
        w.appendChild(i); out.push(w);
      }
    });
    return out;
  }
  function renderPalette() {
    const p = P(), fly = $('#fly'), rail = $('#rail');
    fly.innerHTML = ''; rail.innerHTML = '';
    fly.appendChild(el('p', 'hint', 'Drag a block into the script, or just tap it. Change the numbers and words once it is there.'));
    p.cats.forEach((cat) => {
      const b = el('button', null, '<i></i>' + esc(cat.label)); b.style.setProperty('--c', cat.color);
      b.onclick = () => { const h = $('#cat-' + cat.id); if (h) fly.scrollTo({ top: h.offsetTop - 8, behavior: 'smooth' }); };
      rail.appendChild(b);
      const h = el('h3', null, esc(cat.label)); h.id = 'cat-' + cat.id; h.style.setProperty('--c', cat.color); fly.appendChild(h);
      p.blocks.filter((d) => d.cat === cat.id).forEach((def) => {
        const blk = el('div', 'blk palette-blk' + (def.shape === 'c' ? ' c' : ''));
        blk.style.setProperty('--c', cat.color); blk.dataset.type = def.type;
        const row = el('div', 'row'); paramEls(def, null, false).forEach((x) => row.appendChild(x)); blk.appendChild(row);
        if (def.shape === 'c') blk.appendChild(el('div', 'foot'));
        fly.appendChild(blk);
      });
    });
    fly.appendChild(el('div', 'trash', '🗑 Drag a block here to throw it away'));
  }

  /* ---------- the script ---------- */
  function makeDz(list, lane) {
    const dz = el('div', 'dz' + (list.length ? '' : ' empty')); dz.__list = list; if (lane) dz.dataset.lane = lane;
    list.forEach((n) => { const b = nodeEl(n, list); if (b) dz.appendChild(b); });
    return dz;
  }
  function nodeEl(node, list) {
    const p = P(), def = p.blockMap[node.type]; if (!def) return null;
    const cat = p.catMap[def.cat];
    const blk = el('div', 'blk' + (def.shape === 'c' ? ' c' : '')); blk.style.setProperty('--c', cat.color);
    blk.dataset.nid = node.id; blk.__node = node; blk.__list = list;
    const row = el('div', 'row'); paramEls(def, node, true).forEach((x) => row.appendChild(x));
    const x = el('button', 'x', '✕'); x.title = 'Remove this block'; x.setAttribute('aria-label', 'Remove block');
    x.onclick = (e) => { e.stopPropagation(); const i = list.indexOf(node); if (i > -1) list.splice(i, 1); renderScript(); changed(); };
    row.appendChild(x); blk.appendChild(row);
    if (def.shape === 'c') {
      const slot = el('div', 'cslot'); slot.appendChild(makeDz(node.kids, null)); blk.appendChild(slot);
      if (def.canElse && node.els) {
        blk.appendChild(el('div', 'row else', 'else'));
        const s2 = el('div', 'cslot'); s2.appendChild(makeDz(node.els, null)); blk.appendChild(s2);
      }
      const foot = el('div', 'foot');
      if (def.canElse) {
        const eb = el('button', 'elsebtn', node.els ? '− take away else' : '+ add else');
        eb.onclick = (e) => { e.stopPropagation(); if (node.els) delete node.els; else node.els = []; renderScript(); changed(); };
        foot.appendChild(eb);
      }
      blk.appendChild(foot);
    }
    return blk;
  }
  function updateHat() { const s = $('#hatName'); if (s) s.textContent = Core.cleanText(state().robot, 16, P().robotDefault); }
  function updateCount() { const n = Core.countBlocks(state()); $('#blockCount').textContent = n ? n + (n === 1 ? ' block' : ' blocks') + ' in your program' : ''; }
  function renderScript() {
    const st = state(), root = $('#script'); root.innerHTML = '';
    const hat = el('div', 'hat', '<span class="flag">🏁</span><span>when <strong id="hatName"></strong> wakes up</span><span class="tag">runs once</span>');
    root.appendChild(hat);
    const wake = makeDz(st.wake, 'wake'); wake.classList.add('lane'); root.appendChild(wake);
    const forever = el('div', 'blk c'); forever.style.setProperty('--c', '#FFAB19'); forever.style.marginTop = '4px';
    forever.appendChild(el('div', 'row', '<span>🔁 forever</span><span class="tag">again and again</span>'));
    const slot = el('div', 'cslot'); slot.appendChild(makeDz(st.forever, 'forever')); forever.appendChild(slot);
    forever.appendChild(el('div', 'foot'));
    root.appendChild(forever);
    updateHat(); updateCount();
  }

  /* ---------- drag and drop (pointer events: mouse + touch) ---------- */
  let drag = null;
  document.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    const lane = e.target.closest && e.target.closest('[data-lane]'); if (lane) S.lastLane = lane.dataset.lane;
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
    const dz = stack.find((x) => x.classList && x.classList.contains('dz') && !(drag.kind === 'move' && drag.el.contains(x)));
    const overPal = !dz && stack.some((x) => x.classList && x.classList.contains('palwrap'));
    document.body.classList.toggle('over-trash', !!(overPal && drag.kind === 'move'));
    if (drag.target && drag.target !== dz) drag.target.classList.remove('over');
    if (drag.line) { drag.line.remove(); drag.line = null; }
    drag.target = dz || null;
    if (dz) {
      dz.classList.add('over');
      const kids = Array.from(dz.children).filter((c) => c.classList.contains('blk') && c !== drag.el);
      let idx = kids.length;
      for (let i = 0; i < kids.length; i++) { const r = kids[i].getBoundingClientRect(); if (e.clientY < r.top + r.height / 2) { idx = i; break; } }
      drag.idx = idx;
      drag.line = el('div', 'dropline');
      if (idx < kids.length) dz.insertBefore(drag.line, kids[idx]); else dz.appendChild(drag.line);
    }
  });
  function endDrag(e, cancel) {
    if (!drag) return;
    const d = drag; drag = null;
    document.body.classList.remove('dragging', 'dragging-new', 'dragging-move', 'over-trash');
    if (d.ghost) d.ghost.remove();
    if (d.line) d.line.remove();
    if (d.target) d.target.classList.remove('over');
    d.el.classList.remove('lifting');
    if (cancel) return;
    if (!d.active) { if (d.kind === 'new') addBlock(d.type); return; }
    const st = state();
    if (d.target) {
      const list = d.target.__list;
      if (d.kind === 'new') {
        const n = Core.mkNode(S.proj, d.type); list.splice(d.idx, 0, n); finishDrop(n.id);
      } else {
        const i = d.list.indexOf(d.node); if (i > -1) d.list.splice(i, 1);
        list.splice(Math.min(d.idx, list.length), 0, d.node); finishDrop(d.node.id);
      }
      const lane = d.target.closest('[data-lane]'); if (lane) S.lastLane = lane.dataset.lane;
    } else if (d.kind === 'move') {
      const stack = document.elementsFromPoint(e.clientX, e.clientY);
      if (stack.some((x) => x.classList && x.classList.contains('palwrap'))) { const i = d.list.indexOf(d.node); if (i > -1) d.list.splice(i, 1); renderScript(); changed(); }
    }
  }
  document.addEventListener('pointerup', (e) => endDrag(e, false));
  document.addEventListener('pointercancel', (e) => endDrag(e, true));
  function finishDrop(id) {
    renderScript(); changed();
    const b = $('.blk[data-nid="' + id + '"]'); if (b) { b.classList.add('pop'); b.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); setTimeout(() => b.classList.remove('pop'), 500); }
  }
  function addBlock(type) {
    const st = state(), list = S.lastLane === 'wake' ? st.wake : st.forever;
    const n = Core.mkNode(S.proj, type); list.push(n); finishDrop(n.id);
  }

  /* ---------- name tag, toolbar, story ---------- */
  function renderNamebar() {
    const p = P(), st = state(), bar = $('#namebar');
    bar.innerHTML = '<label>👋 My name <input id="inBuilder" maxlength="16" placeholder="e.g. Aarav" autocomplete="off"></label>' +
      '<label>' + p.emoji + ' ' + esc(p.robotLabel) + ' <input id="inRobot" maxlength="16" placeholder="' + esc(p.robotDefault) + '" autocomplete="off"></label>' +
      '<span class="note">letters &amp; numbers only: they go into the code</span>';
    const a = $('#inBuilder'), b = $('#inRobot');
    a.value = st.builder; b.value = st.robot;
    a.oninput = () => { st.builder = a.value; changed(); };
    b.oninput = () => { st.robot = b.value; changed(); };
    a.onchange = () => { a.value = st.builder = Core.cleanText(a.value, 16, ''); changed(); };
    b.onchange = () => { b.value = st.robot = Core.cleanText(b.value, 16, ''); changed(); };
  }
  function renderToolbar() {
    const bar = $('#toolbar'); bar.innerHTML = '';
    const mk = (html, fn, cls) => { const b = el('button', 'btn small ' + (cls || ''), html); b.onclick = fn; bar.appendChild(b); return b; };
    const ex = mk('✨ Show me an example', () => {}); twoClick(ex, 'Replace my blocks? Click again', () => { const old = state(); const e = Core.exampleState(S.proj); e.builder = old.builder; e.robot = old.robot; e.date = old.date; e.settings = old.settings; S.states[S.proj] = e; renderScript(); renderNamebar(); changed(); toast('Here is an example. Change anything you like!'); });
    const cl = mk('🧹 Clear', () => {}); twoClick(cl, 'Clear everything? Click again', () => { const st = state(); st.wake = []; st.forever = []; renderScript(); changed(); });
    if (ChipCamp.design(S.proj)) { const dg = mk('🎨 Load my design', () => {}); twoClick(dg, 'Replace my blocks? Click again', () => { applyDesign(); }); }
    const st = el('a', 'btn small', '🎨 ' + ({ peeko: 'Face', chipbot: 'Dance', jarvis: 'Light' }[S.proj]) + ' Studio'); st.href = 'studio.html'; bar.appendChild(st);
    mk('💾 Save', saveSlot);
    mk('📂 My saves', openSaves);
    mk('🔗 Share', openShare);
  }
  function applyDesign() {
    const old = state();
    S.states[S.proj] = Studio.toState(S.proj, ChipCamp.design(S.proj) || Studio.defaults(S.proj), old);
    renderScript(); renderNamebar(); changed(); toast('Your design is in the blocks. Change anything you like!');
  }
  function saveSlot() {
    const st = state(), saves = lsGet(SAVES) || [];
    const who = Core.cleanText(st.builder, 16, '') || '(no name yet)';
    const id = S.proj + ':' + who.toLowerCase();
    const rec = { id, proj: S.proj, who, robot: Core.cleanText(st.robot, 16, P().robotDefault), ts: Date.now(), state: JSON.parse(JSON.stringify(st)) };
    const i = saves.findIndex((s) => s.id === id); if (i > -1) saves[i] = rec; else saves.push(rec);
    toast(lsSet(SAVES, saves) ? 'Saved ' + who + "'s " + P().name + ' ✔' : 'Could not save in this browser');
  }
  function modal(html, mount) {
    const back = el('div', 'modalback'), m = el('div', 'modal', html); back.appendChild(m); document.body.appendChild(back);
    const close = () => back.remove(); back.onclick = (e) => { if (e.target === back) close(); };
    mount && mount(m, close); return close;
  }
  function openSaves() {
    const saves = (lsGet(SAVES) || []).sort((a, b) => b.ts - a.ts);
    modal('<h2>📂 My saves</h2><p style="color:#69709a;margin:0 0 8px">Your latest work is also kept automatically on this laptop. Saves are handy when a friend uses the laptop next.</p><div id="saveList"></div><div style="margin-top:12px"><button class="btn" id="closeM">Close</button></div>', (m, close) => {
      const list = $('#saveList', m);
      if (!saves.length) list.innerHTML = '<p>Nothing saved yet. Press <b>💾 Save</b> to keep your program.</p>';
      saves.forEach((s) => {
        const row = el('div', 'saverow', '<div class="who">' + PROJECTS[s.proj].emoji + ' ' + esc(s.who) + '<small>' + esc(PROJECTS[s.proj].name) + ' · ' + esc(s.robot) + ' · ' + new Date(s.ts).toLocaleString([], { hour: 'numeric', minute: '2-digit', day: 'numeric', month: 'short' }) + '</small></div>');
        const open = el('button', 'btn small go', 'Open'); open.onclick = () => { stopRun(); S.proj = s.proj; S.states[s.proj] = cleanState(s.proj, s.state); S.activeStory = null; persist(); close(); renderAll(); toast('Opened ' + s.who + "'s " + PROJECTS[s.proj].name); };
        const del = el('button', 'btn small', '🗑'); del.title = 'Delete this save'; del.onclick = () => { lsSet(SAVES, (lsGet(SAVES) || []).filter((x) => x.id !== s.id)); close(); openSaves(); };
        row.appendChild(open); row.appendChild(del); list.appendChild(row);
      });
      $('#closeM', m).onclick = close;
    });
  }
  function openShare() {
    const payload = JSON.stringify({ camp: 1, proj: S.proj, state: state() });
    modal('<h2>🔗 Share my program</h2><p style="margin:0 0 6px;color:#69709a">Copy this text to move your program to another laptop, or paste a friend\'s text below.</p><textarea id="shareTx" spellcheck="false"></textarea><div style="display:flex;gap:8px;margin-top:10px;flex-wrap:wrap"><button class="btn" id="copyShare">📋 Copy</button><button class="btn go" id="loadShare">📥 Load pasted program</button><button class="btn" id="closeM">Close</button></div>', (m, close) => {
      const tx = $('#shareTx', m); tx.value = payload;
      $('#copyShare', m).onclick = () => { tx.select(); copyText(tx.value).then(() => toast('Copied!')); };
      $('#loadShare', m).onclick = () => {
        try { const d = JSON.parse(tx.value); if (!d || !PROJECTS[d.proj]) throw 0; stopRun(); S.proj = d.proj; S.states[d.proj] = cleanState(d.proj, d.state); persist(); close(); renderAll(); toast('Program loaded'); }
        catch (e) { toast("That text didn't look like a program"); }
      };
      $('#closeM', m).onclick = close;
    });
  }
  function copyText(text) {
    const fallback = () => { const ta = el('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback);
    fallback(); return Promise.resolve();
  }

  function renderStory() {
    const p = P(), st = state(), box = $('#story');
    const steps = p.story.map((s) => ({ s, done: !!s.done(st) }));
    const first = steps.find((x) => !x.done);
    const active = S.activeStory && steps.find((x) => x.s.id === S.activeStory) ? S.activeStory : (first ? first.s.id : steps[steps.length - 1].s.id);
    const prev = S.doneBefore[S.proj] || {};
    box.innerHTML = '';
    const row = el('div', 'steps');
    steps.forEach((x, i) => {
      const b = el('button', 'step' + (x.done ? ' done' : '') + (x.s.id === active ? ' active' : ''), '<i>' + (x.done ? '✓' : (i + 1)) + '</i>' + esc(x.s.title));
      if (x.done && prev[x.s.id] === false) { b.classList.add('just'); const r = b.getBoundingClientRect(); setTimeout(() => confetti(r.left + 20, r.top + 10), 30); }
      b.onclick = () => { S.activeStory = x.s.id; renderStory(); };
      row.appendChild(b);
    });
    box.appendChild(row);
    const cur = steps.find((x) => x.s.id === active);
    box.appendChild(el('div', 'say', '<span style="font-size:22px">🎤</span><div><b>Step ' + (steps.indexOf(cur) + 1) + ': ' + esc(cur.s.title) + '.</b> ' + esc(cur.s.say) + '</div>'));
    const rec = {}; steps.forEach((x) => { rec[x.s.id] = x.done; }); S.doneBefore[S.proj] = rec;
  }

  /* ---------- stage ---------- */
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
  async function runIt() {
    if (running) return;
    running = true; stopFlag = false;
    $('#runBtn').hidden = true; $('#stopBtn').hidden = false;
    const st = state(), settings = Object.assign({}, P().settingsDefault || {}, st.settings || {});
    $('#serial').innerHTML = '<b>Serial Monitor</b>';
    const ctx = {
      stage: stageApi, sensors, settings, speedLevel: 1,
      names: { robot: Core.cleanText(st.robot, 16, P().robotDefault), builder: Core.cleanText(st.builder, 16, 'Friend') },
      stepSeconds() { return [1.4, 1.0, 0.7][this.speedLevel] || 1; },
      stopped: () => stopFlag,
      onNode: (id, on) => { const b = $('.blk[data-nid="' + id + '"]'); if (b) b.classList.toggle('running', on); },
      sleep: async (sec) => { let left = sec * 1000 / S.speed; while (left > 0) { if (stopFlag) throw Runtime.STOP; const dt = Math.min(left, 40); await new Promise((r) => setTimeout(r, dt)); left -= dt; } }
    };
    try { await Runtime.runProgram(S.proj, st, ctx); }
    catch (e) { console.error(e); toast('The preview hit a problem'); }
    $$('.blk.running').forEach((b) => b.classList.remove('running'));
    running = false; $('#runBtn').hidden = false; $('#stopBtn').hidden = true;
  }
  $('#runBtn').onclick = runIt;
  $('#stopBtn').onclick = () => { stopFlag = true; };
  $$('#speedsel button').forEach((b) => { b.onclick = () => { S.speed = Number(b.dataset.sp); $$('#speedsel button').forEach((x) => x.setAttribute('aria-pressed', x === b ? 'true' : 'false')); }; });
  $('#soundBtn').onclick = () => { Stages.Sound.on = !Stages.Sound.on; $('#soundBtn').textContent = Stages.Sound.on ? '🔊' : '🔇'; $('#soundBtn').setAttribute('aria-pressed', Stages.Sound.on); if (Stages.Sound.on) Stages.Sound.beep(660, 0.12); };

  /* ---------- code view ---------- */
  const TYPES = new Set(['void', 'int', 'float', 'long', 'unsigned', 'bool', 'boolean', 'char', 'String', 'uint8_t', 'uint16_t', 'int8_t', 'byte', 'double', 'short', 'Servo', 'Adafruit_SH1106G', 'size_t']);
  const KW = new Set(['if', 'else', 'for', 'while', 'return', 'const', 'static', 'true', 'false', 'switch', 'case', 'break', 'default', 'PROGMEM', 'HIGH', 'LOW', 'OUTPUT', 'INPUT', 'PI']);
  const TOK = /(\/\/[^\n]*)|("(?:[^"\\]|\\.)*")|(#\s*\w+)|(\b\d+(?:\.\d+)?\b)|([A-Za-z_]\w*)/g;
  function hl(line) {
    let out = '', last = 0, m; TOK.lastIndex = 0;
    while ((m = TOK.exec(line))) {
      out += esc(line.slice(last, m.index));
      const t = m[0]; let cls = null;
      if (m[1]) cls = 'c'; else if (m[2]) cls = 's'; else if (m[3]) cls = 'p'; else if (m[4]) cls = 'n';
      else cls = TYPES.has(t) ? 't' : KW.has(t) ? 'k' : (line.charAt(TOK.lastIndex) === '(' ? 'f' : null);
      out += cls ? '<span class="tk-' + cls + '">' + esc(t) + '</span>' : esc(t);
      last = TOK.lastIndex;
    }
    out += esc(line.slice(last));
    return out.split(Core.MARK_S).join('<mark class="v">').split(Core.MARK_E).join('</mark>');
  }
  const NAME_COLOR = '#FFBF00';
  function renderCode() {
    const p = P(), gen = Core.generate(S.proj, state());
    $('#codeTitle').textContent = p.emoji + ' ' + (gen.robot) + "'s sketch";
    const legend = $('#legend'); legend.innerHTML = '<span>Colour = the block that made the line:</span>';
    const used = new Set(gen.lines.filter((l) => l.src === 'student').map((l) => l.cat));
    p.cats.filter((c) => used.has(c.id)).forEach((c) => { const s = el('span', null, '<i></i>' + esc(c.label)); s.style.setProperty('--c', c.color); legend.appendChild(s); });
    legend.appendChild(el('span', null, '<mark class="v">your words &amp; numbers</mark>'));
    const pane = $('#codePane'); pane.innerHTML = '';
    let i = 0;
    const line = (l, n) => {
      const color = l.src === 'student' ? (l.cat === 'name' ? NAME_COLOR : ((p.catMap[l.cat] || { color: '#FFAB19' }).color)) : null;
      const row = el('div', 'ln' + (color ? ' mine' : '')); if (color) row.style.setProperty('--c', color);
      row.innerHTML = '<span class="no">' + n + '</span><span class="tx">' + hl(l.t || ' ') + '</span>'; return row;
    };
    while (i < gen.lines.length) {
      const l = gen.lines[i];
      const fold = l.src === 'base' && !l.keep && !S.showAll;
      if (!fold) { pane.appendChild(line(l, i + 1)); i++; continue; }
      let j = i; while (j < gen.lines.length && gen.lines[j].src === 'base' && !gen.lines[j].keep) j++;
      const count = j - i, key = i;
      if (S.openFolds.has(key)) {
        const head = el('div', 'fold', '<span class="chev">▾</span><span>✓ ' + count + ' lines of tested ' + esc(p.name) + ' code (click to hide)</span>'); head.onclick = () => { S.openFolds.delete(key); renderCode(); }; pane.appendChild(head);
        for (let k = i; k < j; k++) pane.appendChild(line(gen.lines[k], k + 1));
      } else if (count <= 3) {
        for (let k = i; k < j; k++) pane.appendChild(line(gen.lines[k], k + 1));
      } else {
        const head = el('div', 'fold', '<span class="chev">▸</span><span>✓ ' + count + ' lines of tested ' + esc(p.name) + ' code: ' + esc(p.foldBlurb) + ' (click to show)</span>'); head.onclick = () => { S.openFolds.add(key); renderCode(); }; pane.appendChild(head);
      }
      i = j;
    }
    const libs = { peeko: 'Libraries needed (Tools → Manage Libraries): <b>Adafruit GFX Library</b> and <b>Adafruit SH110X</b> (say yes to installing BusIO too). Servo is already built in.', chipbot: 'Servo is built into the Arduino IDE, so there is nothing extra to install.', jarvis: 'No extra libraries needed.' };
    $('#libNote').innerHTML = libs[S.proj];
    $('#boardStep').innerHTML = S.proj === 'chipbot' ? '<b>Tools → Board → Arduino Nano.</b> If the upload fails, set <b>Processor → ATmega328P (Old Bootloader)</b>.' : '<b>Tools → Board → Arduino Uno.</b>';
    renderFacil();
  }
  function renderFacil() {
    const card = $('#facilCard');
    if (S.proj !== 'jarvis') { card.hidden = true; return; }
    const st = state(); card.hidden = false;
    card.innerHTML = '<h3>🔧 Facilitator: bench settings</h3><p class="small" style="margin:0 0 8px">Set these once per board. Print the sensor readings with the probe in dry air, then in a glass of water, and copy the raw numbers here.</p><div class="facil">' +
      '<label>Soil raw reading when dry <input type="number" id="fDry" min="0" max="1023"></label><label>Soil raw reading when wet <input type="number" id="fWet" min="0" max="1023"></label>' +
      '<label>Brighter light gives a bigger number <input type="checkbox" id="fLight"></label><label>RGB LED long leg goes to 5V (common anode) <input type="checkbox" id="fAnode"></label></div>';
    $('#fDry').value = st.settings.soilDry; $('#fWet').value = st.settings.soilWet; $('#fLight').checked = !!st.settings.lightHigh; $('#fAnode').checked = !!st.settings.ledAnode;
    const clamp = (v, d) => { v = Math.round(Number(v)); return isFinite(v) ? Math.min(1023, Math.max(0, v)) : d; };
    $('#fDry').onchange = (e) => { st.settings.soilDry = clamp(e.target.value, 520); persist(); renderCode(); };
    $('#fWet').onchange = (e) => { st.settings.soilWet = clamp(e.target.value, 280); persist(); renderCode(); };
    $('#fLight').onchange = (e) => { st.settings.lightHigh = e.target.checked; persist(); renderCode(); };
    $('#fAnode').onchange = (e) => { st.settings.ledAnode = e.target.checked; persist(); renderCode(); };
  }
  $('#showAll').onchange = (e) => { S.showAll = e.target.checked; renderCode(); };
  $('#copyBtn').onclick = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    copyText(Core.generate(S.proj, state()).text).then(() => { confetti(r.left + r.width / 2, r.top); toast('Copied! Now paste it into the Arduino IDE 🎉'); });
  };

  /* ---------- boot ---------- */
  function renderAll() { renderTabs(); renderPalette(); renderNamebar(); renderToolbar(); renderScript(); renderStory(); mountStage(); if (S.view === 'code') renderCode(); }
  renderAll();
  if (location.hash === '#design') { try { history.replaceState(null, '', location.pathname + location.search); } catch (e) { /* fine */ } applyDesign(); }
  window.__camp = { S, state, Core, renderAll, setView, sensors, runIt };
})();
