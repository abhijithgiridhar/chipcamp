/* Presentations: the decks are encrypted in this page and open with the facilitator password. */
(function () {
  'use strict';
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const esc = (s) => String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fmt = (s) => esc(s).replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>');
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const Art = CampArt;
  const PIN_KEY = 'chipcamp.plans';

  let data = null, deck = null, idx = 0, playToken = 0, timerId = 0;

  /* ---------- little sound effects (off until switched on with M) ---------- */
  const Sfx = {
    on: false, ctx: null,
    tone(hz, at, dur, type, vol) {
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime + at;
        o.type = type || 'triangle'; o.frequency.setValueAtTime(hz, t);
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol || 0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
        o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + dur + 0.05);
      } catch (e) { /* no audio, no problem */ }
    },
    play(kind) {
      if (!this.on) return;
      if (kind === 'pop') { this.tone(520, 0, 0.1); this.tone(780, 0.07, 0.12); }
      else if (kind === 'good') { [523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.09, 0.2)); }
      else if (kind === 'bad') { this.tone(220, 0, 0.18, 'sawtooth', 0.08); this.tone(165, 0.14, 0.28, 'sawtooth', 0.08); }
      else if (kind === 'star') { this.tone(880, 0, 0.1); this.tone(1320, 0.08, 0.2); }
      else if (kind === 'tada') { [392, 523, 659, 784, 1046].forEach((f, i) => this.tone(f, i * 0.08, 0.3)); }
    }
  };

  /* ---------- unlock ---------- */
  async function decrypt(pin) {
    const P = window.DECKS_PAYLOAD;
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(P.s), iterations: P.n, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(P.i) }, key, b64(P.c))));
  }
  async function attempt(pin, quiet) {
    const msg = $('#lockMsg');
    if (!window.crypto || !crypto.subtle) { msg.textContent = 'This browser cannot unlock the page here. Open it over https or in a current Chrome, Edge or Safari.'; return; }
    try {
      data = await decrypt(pin);
      try { sessionStorage.setItem(PIN_KEY, pin); } catch (e) { /* fine */ }
      $('#lockView').hidden = true; route();
    } catch (e) {
      try { sessionStorage.removeItem(PIN_KEY); } catch (e2) { /* fine */ }
      if (!quiet) msg.textContent = 'That is not the password.';
    }
  }
  $('#lockForm').onsubmit = (e) => { e.preventDefault(); $('#lockMsg').textContent = ''; attempt($('#pin').value.trim()); };

  /* ---------- the deck list ---------- */
  function downloadPptx(id) {
    const d = data.decks.find((x) => x.id === id), raw = data.pptx && data.pptx[id];
    if (!raw) { return; }
    const blob = new Blob([b64(raw)], { type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = 'Chip Camp - ' + d.title + '.pptx';
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }
  function renderIndex() {
    stopAll(); document.title = 'Presentations · Chip Camp';
    $('#showView').hidden = true; $('#indexView').hidden = false;
    const g = $('#dgrid'); g.innerHTML = '';
    data.decks.forEach((d) => {
      const c = document.createElement('div'); c.className = 'dcard'; c.style.setProperty('--c', d.color);
      c.innerHTML = '<div class="dart">' + Art.splash() + Art.html(d.id === 'kickoff' ? 'chip' : d.id) + '</div><div class="dbody"><h2>' + esc(d.title) + '</h2><div class="dsub">' + esc(d.sub) + '</div>' +
        '<div class="dmeta">' + d.slides.length + ' slides · ' + d.acts.map((a) => esc(a.name)).join(' / ') + '</div><div class="dact"></div></div>';
      const act = $('.dact', c);
      const open = document.createElement('a'); open.className = 'btn go'; open.href = '#' + d.id; open.textContent = '▶ Open slides'; act.appendChild(open);
      if (data.pptx && data.pptx[d.id]) { const p = document.createElement('button'); p.className = 'btn'; p.textContent = '⬇ PowerPoint'; p.onclick = () => downloadPptx(d.id); act.appendChild(p); }
      g.appendChild(c);
    });
  }

  /* ---------- slide builders ---------- */
  const delay = (i, step) => ' style="animation-delay:' + (0.08 + i * (step || 0.12)) + 's"';
  const art = (s, cls) => (s.art ? Art.html(s.art, cls) : '');
  const eyebrow = (s) => { const a = deck.acts.slice().reverse().find((x) => idx >= x.from); return '<div class="eyebrow">' + esc(s.eyebrow || (a ? a.name : deck.title)) + '</div>'; };
  const ttl = (s) => '<h1 class="ttl">' + fmt(s.title) + '</h1>';
  const B = {
    title: (s) => '<div class="badge-top"><i></i>Micron Chip Camp</div>' + Art.splash() + '<div class="row"><div class="grow"><div class="eyebrow">' + fmt(s.kicker || '') + '</div><h1 class="ttl">' + fmt(s.title) + '</h1><div class="sub">' + fmt(s.sub || '') + '</div></div>' + art(s, 'hero') + '</div>',
    end: (s) => Art.splash() + eyebrow(s) + ttl(s) + '<div class="sub">' + fmt(s.sub || '') + '</div><div class="group">' + Art.raw('kids').replace('<svg ', '<svg class="kids" ') + '</div>',
    big: (s) => (s.eyebrow ? eyebrow(s) : '') + '<div class="big">' + fmt(s.big) + '</div><div class="small">' + fmt(s.small || '') + '</div>' + art(s),
    comic: (s) => eyebrow(s) + (s.title ? '<h1 class="ttl">' + fmt(s.title) + '</h1>' : '') + '<div class="panels n' + s.panels.length + '">' + s.panels.map((p, i) =>
      '<div class="panel"' + delay(i, 0.45) + '><div class="bubble">' + fmt(p.say) + '</div>' + Art.html(p.art) + (p.name ? '<div class="who">' + esc(p.name) + '</div>' : '') + '</div>').join('') + '</div>',
    list: (s) => eyebrow(s) + ttl(s) + '<div class="row"><div class="grow items">' + s.items.map((it, i) => {
      const lead = it[0], one = lead.length <= 2 && /^[A-Z0-9]$/.test(lead), em = one ? '' : (lead.length <= 4 && !/[A-Za-z0-9]{3}/.test(lead) ? ' emo' : ' sm');
      return '<div class="item"' + delay(i) + '><div class="em' + em + '">' + esc(lead) + '</div><div><h3>' + fmt(it[1]) + '</h3><p>' + fmt(it[2] || '') + '</p></div></div>';
    }).join('') + '</div>' + (s.items.length <= 3 ? art(s) : '') + '</div>',
    levels: (s) => {
      const n = s.items.length + 1, W = 1088, M = 105, step = (W - 2 * M) / (n - 1);
      const pts = s.items.map((it, i) => ({ x: M + step * i, y: i % 2 ? 190 : 100, it, goal: false })).concat([{ x: M + step * (n - 1), y: 140, goal: true }]);
      const path = 'M' + pts.map((p) => p.x + ' ' + (p.y + 43)).join(' L');
      return eyebrow(s) + ttl(s) + '<div class="lmap"><svg class="path" viewBox="0 0 1088 360" preserveAspectRatio="none"><path d="' + path + '" stroke="#5b5b9f" stroke-opacity=".35" stroke-width="7" stroke-dasharray="4 16" stroke-linecap="round" fill="none"/></svg>' +
        pts.map((p, i) => p.goal
          ? '<div class="lnode goal" style="left:' + p.x + 'px;top:' + p.y + 'px"' + delay(i, 0.15) + '><div class="dot">🏆</div><h4>Robot alive</h4></div>'
          : '<button class="lnode" style="left:' + p.x + 'px;top:' + p.y + 'px"' + delay(i, 0.15) + '><div class="dot">' + esc(p.it[0]) + '</div><h4>' + fmt(p.it[1]) + '</h4><p>' + fmt(p.it[2] || '') + '</p></button>').join('') + '</div>';
    },
    steps: (s) => eyebrow(s) + ttl(s) + '<div class="row"><ol class="grow stepsl">' + s.steps.map((t, i) => '<li' + delay(i) + '>' + fmt(t) + '</li>').join('') + '</ol>' + (s.steps.length <= 4 ? art(s) : '') + '</div>',
    parts: (s) => eyebrow(s) + ttl(s) + '<div class="pgrid">' + s.parts.map((p, i) => '<div class="pcard"' + delay(i, 0.09) + '><div class="pe">' + p[0] + '</div><h3>' + fmt(p[1]) + '</h3><p>' + fmt(p[2]) + '</p></div>').join('') + '</div>',
    activity: (s) => '<button class="badge" id="timer" title="Start or pause the timer">⏱ ' + s.minutes + ':00</button>' + eyebrow(s) + ttl(s) + '<div class="row"><ol class="grow stepsl">' + s.steps.map((t, i) => '<li' + delay(i) + '>' + fmt(t) + '</li>').join('') + '</ol>' + (s.steps.length <= 4 ? art(s) : '') + '</div>',
    demo: (s) => eyebrow(s) + ttl(s) + '<div class="row"><div class="grow"><p class="lead">' + fmt(s.text) + '</p>' +
      (s.link ? '<a class="open" href="' + esc(s.link.href) + '" target="_blank" rel="noopener">' + esc(s.link.label) + ' ↗</a>' : '') + '</div>' +
      (s.stage ? '<div class="demo"><div class="scene" id="dscene"></div><div class="sliders" id="dsliders"></div></div>' : art(s)) + '</div>',
    question: (s) => eyebrow(s) + '<div class="row"><div class="grow"><div class="q">' + fmt(s.title) + '</div><div class="opts">' + s.options.map((o, i) => '<button class="opt" data-i="' + i + '"' + delay(i, 0.15) + '><i>' + 'ABCD'[i] + '</i>' + fmt(o) + '</button>').join('') + '</div><div class="punch" id="punch"></div></div>' + art(s) + '</div>',
    code: (s) => eyebrow(s) + ttl(s) + '<pre>' + esc(s.code) + '</pre><p>' + fmt(s.text || '') + '</p>',
    crew: (s) => eyebrow(s) + ttl(s) + '<div class="cgrid">' + s.crew.map((c, i) => '<div class="ccard"' + delay(i, 0.25) + '>' + Art.html(c[0]) + '<h3>' + fmt(c[1]) + '</h3><p>' + fmt(c[2]) + '</p></div>').join('') + '</div>',
    wanted: (s) => eyebrow(s) + ttl(s) + '<div class="wgrid">' + s.bugs.map((b, i) => '<div class="wposter" style="--rot:' + [-1.8, 1.2, -0.8][i % 3] + 'deg"' + delay(i, 0.25) + '><div class="w">WANTED</div>' + Art.html('bug') + '<h3>' + fmt(b[0]) + '</h3><div class="l"><b>Seen:</b> ' + fmt(b[1]) + '</div><div class="reward">Reward: ' + fmt(b[2]) + '</div></div>').join('') + '</div>'
  };

  /* ---------- the live robot on demo slides ---------- */
  const sensors = {
    distance: 50, soil: 35, light: 70, _l: {},
    on(k, f) { (this._l[k] = this._l[k] || []).push(f); },
    set(k, v) { this[k] = v; (this._l[k] || []).forEach((f) => f()); },
    print() {}
  };
  const wait = (ms, tok) => new Promise((r) => setTimeout(() => r(tok === playToken), ms));
  async function playDemo(kind, stage, tok) {
    const ok = (v) => v && tok === playToken;
    if (kind === 'peeko') {
      const faces = ['happy', 'surprised', 'sad', 'celebrate', 'angry', 'sleepy'];
      for (let i = 0; ; i++) { if (!ok(await wait(600, tok))) return; await stage.react(faces[i % faces.length], (sec) => new Promise((r) => setTimeout(r, sec * 1000))); if (!ok(await wait(900, tok))) return; }
    } else if (kind === 'chipbot') {
      for (;;) {
        stage.walk('fwd', 0.9); if (!ok(await wait(2600, tok))) return;
        stage.idle(); if (!ok(await wait(500, tok))) return;
        stage.dance(0, 1); if (!ok(await wait(2400, tok))) return;
        stage.turn('left', 0.9); if (!ok(await wait(1800, tok))) return;
        stage.idle(); if (!ok(await wait(600, tok))) return;
      }
    } else if (kind === 'jarvis') {
      const cols = ['green', 'yellow', 'red', 'blue'];
      for (let i = 0; ; i++) { stage.led(cols[i % cols.length]); if (i % 4 === 2) stage.note(262, 0.2); if (!ok(await wait(1500, tok))) return; }
    }
  }
  function mountDemo() {
    const mount = $('#dscene'); if (!mount || !deck.stage) return;
    sensors._l = {};
    const made = CampStages.make[deck.stage](mount, sensors);
    const sl = $('#dsliders'); sl.innerHTML = made.controls; sl.hidden = !made.controls;
    $$('input[data-s]', sl).forEach((i) => {
      const k = i.dataset.s, o = i.parentElement.querySelector('output');
      i.value = sensors[k]; o.textContent = Math.round(sensors[k]);
      i.oninput = () => { sensors.set(k, Number(i.value)); o.textContent = Math.round(sensors[k]); };
    });
    made.stage.reset && made.stage.reset();
    playDemo(deck.stage, made.stage, playToken);
  }

  /* ---------- showing a slide ---------- */
  function stopAll() { playToken++; clearInterval(timerId); }
  function slideTitle(s) { return s.title || s.big || s.kicker || s.t; }
  function render() {
    stopAll();
    const s = deck.slides[idx], st = $('#stage');
    const cls = 's-' + s.t + (s.t === 'steps' && s.steps.length > 4 ? ' long' : '') + (s.t === 'title' && (s.title || '').length > 20 ? ' long' : '') + (s.t === 'big' && s.art ? ' has-art' : '') + (s.quip ? ' has-quip' : '');
    const quip = s.quip ? '<div class="quip">' + Art.html('bug') + '<div class="qb">' + fmt(s.quip) + '</div></div>' : '';
    st.innerHTML = '<div class="slide ' + cls + '" style="--c:' + deck.color + ';--d:' + deck.dark + '">' + B[s.t](s) + quip + (s.t === 'title' || s.t === 'end' ? '' : '<div class="pnum">' + (idx + 1) + '</div>') + '</div>';
    document.title = deck.title + ' · ' + slideTitle(s) + ' · Chip Camp';
    $('#count').textContent = (idx + 1) + ' / ' + deck.slides.length;
    $('#bar').style.width = ((idx + 1) / deck.slides.length * 100) + '%';
    const act = deck.acts.slice().reverse().find((a) => idx >= a.from);
    $$('#acts .hbtn').forEach((b) => b.classList.toggle('on', b.textContent === (act && act.name)));
    $('#notes').innerHTML = '<small>Speaker notes</small>' + fmt(s.notes || 'No notes for this slide.');
    try { history.replaceState(null, '', '#' + deck.id + '/' + (idx + 1)); } catch (e) { /* fine */ }
    if (s.t === 'demo') mountDemo();
    if (s.t === 'end') { confetti(); Sfx.play('tada'); } else Sfx.play('pop');
    if (s.t === 'question') question(s, st);
    if (s.t === 'levels') $$('.lnode:not(.goal)', st).forEach((n) => { n.onclick = () => { n.classList.toggle('done'); Sfx.play('star'); if ($$('.lnode.done', st).length === s.items.length) { confetti(); Sfx.play('tada'); } }; });
    if (s.t === 'activity') timer(s.minutes);
  }
  function question(s, st) {
    const punch = $('#punch', st);
    $$('.opt', st).forEach((o) => {
      o.onclick = () => {
        const i = Number(o.dataset.i);
        if (s.answer == null) { o.classList.toggle('right'); Sfx.play('pop'); return; }
        if (i === s.answer) { o.classList.add('right'); punch.textContent = s.punch || 'Yes!'; confetti(); Sfx.play('good'); }
        else { o.classList.remove('wrong'); void o.offsetWidth; o.classList.add('wrong'); punch.textContent = 'Bug spotted! Try another one.'; Sfx.play('bad'); }
      };
    });
  }
  function confetti() {
    const st = $('#stage'), em = ['🎉', '✨', '⭐', '💜', '🟡', '🟢', '🔵'];
    for (let i = 0; i < 28; i++) { const e = document.createElement('span'); e.className = 'conf'; e.textContent = em[i % em.length]; e.style.left = (Math.random() * 96) + '%'; e.style.animationDelay = (Math.random() * 1.2) + 's'; st.appendChild(e); setTimeout(() => e.remove(), 4200); }
  }
  function timer(mins) {
    const b = $('#timer'); if (!b) return;
    let left = mins * 60, on = false;
    const show = () => { b.textContent = '⏱ ' + Math.floor(left / 60) + ':' + String(left % 60).padStart(2, '0'); };
    b.onclick = () => {
      if (left <= 0) { left = mins * 60; b.classList.remove('done'); show(); return; }
      on = !on; b.classList.toggle('run', on); clearInterval(timerId);
      if (on) timerId = setInterval(() => { left--; show(); if (left <= 0) { clearInterval(timerId); on = false; b.classList.remove('run'); b.classList.add('done'); Sfx.play('bad'); } }, 1000);
    };
  }
  function go(n) { idx = Math.max(0, Math.min(deck.slides.length - 1, n)); render(); }

  /* ---------- scale the 1280x720 stage to the window ---------- */
  function fit() {
    const st = $('#stage'); if (!st) return;
    const s = Math.min(window.innerWidth / 1280, window.innerHeight / 720);
    st.style.left = '50%'; st.style.top = '50%'; st.style.transform = 'translate(-50%,-50%) scale(' + s + ')';
  }
  window.addEventListener('resize', fit);

  /* ---------- chrome ---------- */
  function buildHud() {
    const a = $('#acts'); a.innerHTML = '';
    deck.acts.forEach((x) => { const b = document.createElement('button'); b.className = 'hbtn'; b.textContent = x.name; b.onclick = () => go(x.from); a.appendChild(b); });
  }
  function buildGrid() {
    const g = $('#grid'); g.innerHTML = '';
    deck.slides.forEach((s, i) => {
      const b = document.createElement('button'); b.className = i === idx ? 'cur' : '';
      b.innerHTML = '<small>' + (i + 1) + ' · ' + esc(s.t) + '</small>' + fmt(slideTitle(s)); b.onclick = () => { g.hidden = true; go(i); }; g.appendChild(b);
    });
  }
  function toggle(id, btn) { const n = $(id); n.hidden = !n.hidden; if (btn) btn.classList.toggle('on', !n.hidden); }
  $('#hNotes').onclick = () => toggle('#notes', $('#hNotes'));
  $('#hGrid').onclick = () => { buildGrid(); toggle('#grid'); };
  $('#hFull').onclick = () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen && document.documentElement.requestFullscreen(); };
  $('#hSound').onclick = () => { Sfx.on = !Sfx.on; $('#hSound').textContent = Sfx.on ? '🔊' : '🔇'; $('#hSound').classList.toggle('on', Sfx.on); Sfx.play('pop'); };
  document.addEventListener('keydown', (e) => {
    if ($('#showView').hidden || e.target.matches('input,textarea')) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'PageDown' || k === ' ' || k === 'Enter') { e.preventDefault(); go(idx + 1); }
    else if (k === 'ArrowLeft' || k === 'PageUp' || k === 'Backspace') { e.preventDefault(); go(idx - 1); }
    else if (k === 'Home') go(0);
    else if (k === 'End') go(deck.slides.length - 1);
    else if (k === 'n' || k === 'N') $('#hNotes').click();
    else if (k === 'g' || k === 'G') $('#hGrid').click();
    else if (k === 'f' || k === 'F') $('#hFull').click();
    else if (k === 'm' || k === 'M') $('#hSound').click();
    else if (k === 'Escape') { $('#grid').hidden = true; }
  });
  let tx = 0;
  $('#viewport').addEventListener('pointerdown', (e) => { tx = e.clientX; });
  $('#viewport').addEventListener('pointerup', (e) => {
    if (e.target.closest('a,button,input,.demo,.opt,.lnode,.badge')) return;
    const dx = e.clientX - tx;
    if (Math.abs(dx) > 60) go(idx + (dx < 0 ? 1 : -1));
    else go(idx + (e.clientX > window.innerWidth / 2 ? 1 : -1));
  });

  /* ---------- routing ---------- */
  function route() {
    if (!data) return;
    const m = location.hash.match(/^#([\w-]+)(?:\/(\d+))?$/), d = m && data.decks.find((x) => x.id === m[1]);
    if (!d) { renderIndex(); return; }
    deck = d; idx = Math.max(0, Math.min(d.slides.length - 1, (Number(m[2]) || 1) - 1));
    $('#indexView').hidden = true; $('#showView').hidden = false;
    $('#notes').hidden = true; $('#grid').hidden = true; $('#hNotes').classList.remove('on');
    buildHud(); fit(); render();
  }
  window.addEventListener('hashchange', route);
  if (window.DECKS_PLAIN) { data = window.DECKS_PLAIN; $('#lockView').hidden = true; route(); return; }   // used to take screenshots of slides
  let saved = null; try { saved = sessionStorage.getItem(PIN_KEY); } catch (e) { /* fine */ }
  if (saved) attempt(saved, true);
})();
