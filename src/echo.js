/* Echo Lab: the screen. The engine is in echocore.js. */
(function () {
  'use strict';
  const E = EchoCore, $ = (s) => document.querySelector(s);
  const KEY = 'chipcamp.echo'; let CS = 52;
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ARROW = ['⬆', '➡', '⬇', '⬅'], NAME = ['up', 'right', 'down', 'left'];
  let prog = { levels: {}, muted: true };
  try { prog = Object.assign(prog, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { /* fine */ }
  const save = () => { try { localStorage.setItem(KEY, JSON.stringify(prog)); } catch (e) { /* fine */ } };

  let idx = 0, g = null, helped = false;

  /* ---------- sound ---------- */
  let ac = null;
  function tone(f0, f1, dur, type, vol, delay) {
    if (prog.muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const t = ac.currentTime + (delay || 0), o = ac.createOscillator(), v = ac.createGain();
      o.type = type || 'sine'; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + dur);
      v.gain.setValueAtTime(vol || 0.12, t); v.gain.exponentialRampToValueAtTime(0.001, t + dur);
      o.connect(v); v.connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
    } catch (e) { /* no sound is fine */ }
  }
  const sPing = () => { tone(1800, 900, 0.18, 'sine', 0.14); tone(900, 700, 0.25, 'sine', 0.07, 0.35); };
  const sBump = () => tone(160, 70, 0.2, 'square', 0.1);
  const sOk = () => { tone(660, 880, 0.12, 'triangle'); };
  const sBad = () => tone(200, 140, 0.25, 'sawtooth', 0.08);
  const sWin = () => [523, 659, 784, 1047].forEach((f, i) => tone(f, f * 1.01, 0.2, 'triangle', 0.13, i * 0.12));
  function setMute(m) { prog.muted = m; save(); const b = $('#muteBtn'); b.setAttribute('aria-pressed', String(!m)); b.textContent = m ? '🔇 Sound off' : '🔊 Sound on'; }

  function toast(t) { const el = $('#toast'); el.textContent = t; el.classList.add('show'); clearTimeout(toast.t); toast.t = setTimeout(() => el.classList.remove('show'), 2200); }
  function say(text, kind) { const m = $('#msg'); m.textContent = text; m.className = 'msg' + (kind ? ' ' + kind : ''); }

  /* ---------- drawing ---------- */
  function draw() {
    const m = g.m, svg = $('#board'); CS = Math.min(76, Math.floor(620 / m.w)); const W = m.w * CS, H = m.h * CS;
    svg.setAttribute('viewBox', '0 0 ' + W + ' ' + H); svg.setAttribute('width', W); svg.setAttribute('height', H);
    let s = '<defs><pattern id="foamp" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="10" height="10" fill="#ffd966"/><rect width="5" height="10" fill="#f2b92f"/></pattern>' +
      '<pattern id="fogp" width="16" height="16" patternUnits="userSpaceOnUse"><rect width="16" height="16" fill="#dfe7fb"/><circle cx="8" cy="8" r="1.4" fill="#b8c6ec"/></pattern></defs>';
    for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
      const k = g.known[y][x], px = x * CS, py = y * CS;
      const fill = k === 1 ? '#dff5e7' : k === 2 ? '#1f3a52' : k === 3 ? 'url(#foamp)' : 'url(#fogp)';
      s += '<rect class="cell" x="' + (px + 1) + '" y="' + (py + 1) + '" width="' + (CS - 2) + '" height="' + (CS - 2) + '" rx="8" fill="' + fill + '"' + (k === 0 ? ' stroke="#c9d6f2"' : '') + '/>';
      if (k === 0) s += '<text x="' + (px + CS / 2) + '" y="' + (py + CS / 2 + 6) + '" text-anchor="middle" font-size="18" fill="#9fb0dd" font-family="Fredoka,sans-serif">?</text>';
    }
    const gx = m.goal.x * CS + CS / 2, gy = m.goal.y * CS + CS / 2;
    s += '<text x="' + gx + '" y="' + (gy + 9) + '" text-anchor="middle" font-size="' + Math.round(CS * 0.54) + '">🚩</text>';
    const cx = g.x * CS + CS / 2, cy = g.y * CS + CS / 2, ang = g.d * 90;
    s += '<g transform="translate(' + cx + ' ' + cy + ') scale(' + (CS / 52) + ')"><circle r="21" fill="#2bb3a3" stroke="#fff" stroke-width="3"/><text y="8" text-anchor="middle" font-size="24">🤖</text>' +
      '<g transform="rotate(' + ang + ')"><path d="M-8 -24 L0 -37 L8 -24 Z" fill="#ffbf00" stroke="#7a5a00" stroke-width="2" stroke-linejoin="round"/></g></g>';
    svg.innerHTML = s;
  }
  function pulse() {
    const svg = $('#board'), cx = g.x * CS + CS / 2 + E.DX[g.d] * (CS * 0.4), cy = g.y * CS + CS / 2 + E.DY[g.d] * (CS * 0.4);
    const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    c.setAttribute('class', 'pulse'); c.setAttribute('cx', cx); c.setAttribute('cy', cy); c.setAttribute('r', 22); c.style.transformOrigin = cx + 'px ' + cy + 'px';
    svg.appendChild(c); setTimeout(() => c.remove(), 1000);
  }

  /* ---------- panels ---------- */
  function renderStats() {
    const lv = g.level, el = $('#sPings');
    el.textContent = g.pingsLeft + ' / ' + E.budget(lv); el.className = g.pingsLeft <= 1 ? 'low' : '';
    $('#sBumps').textContent = g.bumps; $('#sPar').textContent = E.par(lv);
  }
  function renderLevels() {
    const nav = $('#lvls'); nav.innerHTML = '';
    E.LEVELS.forEach((lv, i) => {
      const b = document.createElement('button'); b.className = 'lvl' + (prog.levels[lv.id] ? ' done' : ''); b.textContent = lv.id;
      b.setAttribute('aria-current', i === idx ? 'true' : 'false'); b.title = lv.title; b.onclick = () => start(i); nav.appendChild(b);
    });
  }
  function renderLog() {
    const box = $('#log');
    if (!g.log.length) { box.innerHTML = '<span class="muted">Your pings will be written here.</span>'; return; }
    box.innerHTML = g.log.map((l, i) => '<div>#' + (i + 1) + ' facing ' + ARROW[l.d] + ' ' + (l.echo == null ? 'NO ECHO' : Number(l.echo).toLocaleString('en') + ' µs') + (l.steps != null ? ' → ' + l.steps + ' steps' : '') + '</div>').join('');
    box.scrollTop = box.scrollHeight;
  }
  function renderEcho() {
    const p = g.pending, box = $('#echoBox');
    box.hidden = !p; if (!p) return;
    $('#echoT').textContent = p.us.toLocaleString('en') + ' µs';
    $('#how').hidden = true; helped = false; $('#ans').value = ''; $('#ans').classList.remove('shake');
    setTimeout(() => $('#ans').focus(), 30);
  }
  function howText(us) {
    const cm = (us / E.US_PER_CM), net = cm - E.FRONT_CM;
    return '1. Sound goes there <i>and back</i>: <b>' + us.toLocaleString('en') + ' ÷ 58 = ' + cm.toFixed(1) + ' cm</b><br>2. The sensor starts 10 cm from the wall of its own square: <b>' + cm.toFixed(1) + ' − 10 = ' + net.toFixed(1) + ' cm</b><br>3. One step is 20 cm: <b>' + net.toFixed(1) + ' ÷ 20 = ' + (net / E.STEP_CM).toFixed(2) + '</b>, so round to the nearest whole step.';
  }
  function renderAll() { draw(); renderStats(); renderLog(); renderEcho(); renderLevels(); }

  /* ---------- the game ---------- */
  function start(i) {
    idx = i; const lv = E.LEVELS[i]; g = E.newGame(lv); helped = false;
    $('#mNum').textContent = 'Level ' + lv.id; $('#mConcept').textContent = lv.concept; $('#mTitle').textContent = lv.title; $('#mSay').textContent = lv.say;
    const w = $('#mWorked'); w.hidden = !lv.worked; w.textContent = lv.worked || '';
    const h = $('#mHint'); h.hidden = !lv.hint; h.textContent = lv.hint ? '💡 ' + lv.hint : '';
    $('#over').hidden = true;
    say('Chip Bot is facing ' + NAME[g.d] + '. Press 📡 Ping to listen.');
    renderAll();
  }
  function afterMove(r) {
    if (r.won) return win();
    if (g.stuck()) say('No pings left. You can still walk using what you already know, or press Restart and plan the legs first.', 'bad');
  }
  function doPing() {
    if (g.status !== 'play') return;
    if (g.pending) { say('Answer the echo first: how many steps? (Or walk or turn to ignore it.)', 'bad'); $('#ans').focus(); return; }
    const r = g.ping();
    if (!r.ok) { say(r.why === 'empty' ? 'No pings left!' : '', 'bad'); return; }
    sPing(); pulse();
    if (!r.echo) { say('Silence… NO echo. A wall always bounces sound back. So something soft is soaking it up. Careful!', 'bad'); renderStats(); renderLog(); afterMove({}); return; }
    say('Echo received. Work out the steps and type the number.'); renderStats(); renderLog(); renderEcho();
  }
  function doAnswer() {
    const p = g.pending; if (!p) return;
    const v = $('#ans').value; if (v === '') { $('#ans').focus(); return; }
    const r = g.answer(v);
    if (r.ok) {
      g.log[g.log.length - 1].steps = r.steps; sOk(); say(r.steps === 0 ? 'A wall right in front. Zero free steps. Turn!' : 'Yes! ' + r.steps + ' free step' + (r.steps === 1 ? '' : 's') + '. The squares light up.', 'good');
      draw(); renderLog(); renderEcho(); renderStats();
    } else {
      sBad(); const a = $('#ans'); a.classList.remove('shake'); void a.offsetWidth; a.classList.add('shake');
      say(g.wrong >= 2 ? 'Not quite. Here is the working:' : 'Not quite. Check the steps: ÷ 58, then − 10, then ÷ 20.', 'bad');
      if (g.wrong >= 2) { const how = $('#how'); how.innerHTML = howText(p.us); how.hidden = false; }
    }
  }
  function doTurn(dir) { if (g.status !== 'play') return; g.turn(dir); say('Chip Bot is now facing ' + NAME[g.d] + '.'); draw(); renderEcho(); }
  function doWalk() {
    if (g.status !== 'play') return;
    const r = g.forward();
    if (!r.moved) {
      sBump(); say(r.bump === '~' ? 'Squish! That is foam. You bumped into it. It is now marked on the map.' : 'Bonk! A wall. It is now marked on the map.', 'bad');
      draw(); renderStats(); renderEcho(); afterMove(r); return;
    }
    say(''); draw(); renderEcho(); afterMove(r);
  }

  function showOver(won) {
    const o = $('#over'); o.hidden = false;
    const st = won ? g.stars() : 0;
    $('#oStars').innerHTML = [1, 2, 3].map((n) => '<span class="' + (n <= st ? '' : 'off') + '">★</span>').join('');
    $('#oTitle').textContent = won ? (st === 3 ? 'Perfect run!' : 'You found the flag!') : 'Out of pings';
    const par = E.par(g.level);
    $('#oText').textContent = won
      ? 'You used ' + g.pingsUsed + ' ping' + (g.pingsUsed === 1 ? '' : 's') + ' and ' + g.bumps + ' bump' + (g.bumps === 1 ? '' : 's') + '. The best possible is ' + par + ' ping' + (par === 1 ? '' : 's') + (st < 3 ? ', with no bumps. Can you beat it?' : '. You matched it.')
      : 'Chip Bot ran out of battery for pings. Think about where each straight stretch ends before you press the button.';
    $('#oNext').textContent = idx < E.LEVELS.length - 1 ? 'Next level ➜' : 'You did them all!';
    $('#oNext').hidden = !won; $('#oNext').disabled = idx >= E.LEVELS.length - 1;
  }
  function win() {
    const st = g.stars(); prog.levels[g.level.id] = Math.max(prog.levels[g.level.id] || 0, st); save(); sWin();
    say('🎉 Chip Bot reached the flag!', 'good'); renderLevels(); setTimeout(() => showOver(true), 450);
  }

  /* ---------- wiring ---------- */
  $('#pingBtn').onclick = doPing; $('#walkBtn').onclick = doWalk; $('#leftBtn').onclick = () => doTurn('left'); $('#rightBtn').onclick = () => doTurn('right');
  $('#ansBtn').onclick = doAnswer; $('#ans').onkeydown = (e) => { if (e.key === 'Enter') { e.preventDefault(); doAnswer(); } };
  $('#helpBtn').onclick = () => { if (!g.pending) return; const how = $('#how'); how.innerHTML = howText(g.pending.us); how.hidden = false; helped = true; };
  $('#oAgain').onclick = () => start(idx); $('#restartBtn').onclick = () => start(idx);
  $('#oNext').onclick = () => { if (idx < E.LEVELS.length - 1) start(idx + 1); };
  $('#muteBtn').onclick = () => setMute(!prog.muted);
  document.addEventListener('keydown', (e) => {
    if (e.target && e.target.tagName === 'INPUT') return;
    if (!$('#over').hidden) return;
    if (e.key === 'p' || e.key === 'P') doPing();
    else if (e.key === 'ArrowLeft') { e.preventDefault(); doTurn('left'); }
    else if (e.key === 'ArrowRight') { e.preventDefault(); doTurn('right'); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); doWalk(); }
  });

  setMute(prog.muted !== false);
  let first = 0; while (first < E.LEVELS.length - 1 && prog.levels[E.LEVELS[first].id]) first++;
  start(first);
  window.__echo = { get g() { return g; }, start, doPing, doAnswer, doWalk, doTurn };
})();
