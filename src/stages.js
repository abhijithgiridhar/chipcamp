/* The on-screen robots. Peeko's faces are drawn the same way as in the Peeko sketch. */
(function (root, factory) {
  root.CampStages = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  const $ = (el, sel) => el.querySelector(sel);

  /* ---------- shared: tiny sound + floating notes ---------- */
  const Sound = {
    on: false, ctx: null,
    beep(hz, secs) {
      if (!this.on) return;
      try {
        this.ctx = this.ctx || new (window.AudioContext || window.webkitAudioContext)();
        const o = this.ctx.createOscillator(), g = this.ctx.createGain(), t = this.ctx.currentTime;
        o.type = 'square'; o.frequency.value = hz;
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t + Math.max(0.05, secs));
        o.connect(g); g.connect(this.ctx.destination); o.start(t); o.stop(t + secs + 0.05);
      } catch (e) { /* no audio, no problem */ }
    }
  };
  function floatNote(layer, hz) {
    const n = document.createElement('span');
    n.className = 'fnote'; n.textContent = ['♪', '♫', '♩'][Math.floor(Math.random() * 3)];
    n.style.left = (30 + Math.random() * 40) + '%';
    n.style.color = 'hsl(' + Math.round((hz % 500) / 500 * 300) + ',80%,55%)';
    layer.appendChild(n);
    setTimeout(() => n.remove(), 1400);
  }

  /* ---------- Peeko ---------- */
  function peeko(mount, sensors) {
    mount.innerHTML =
      '<div class="pk-scene"><div class="pk-bot"><div class="pk-antenna"></div><div class="pk-head">' +
      '<div class="pk-screen"><canvas width="256" height="128"></canvas></div></div></div><div class="notes"></div></div>';
    const bot = $(mount, '.pk-bot'), cv = $(mount, 'canvas'), notes = $(mount, '.notes');
    const g = cv.getContext('2d');
    const FG = '#e8f6ff', BG = '#050b14';
    const d = {
      clear() { g.setTransform(2, 0, 0, 2, 0, 0); g.fillStyle = BG; g.fillRect(0, 0, 128, 64); },
      fillCircle(cx, cy, r) { g.fillStyle = FG; g.beginPath(); g.arc(cx + 0.5, cy + 0.5, r + 0.5, 0, 6.2832); g.fill(); },
      drawCircle(cx, cy, r) { g.strokeStyle = FG; g.lineWidth = 1; g.beginPath(); g.arc(cx + 0.5, cy + 0.5, r, 0, 6.2832); g.stroke(); },
      line(x0, y0, x1, y1) { g.strokeStyle = FG; g.lineWidth = 1.1; g.beginPath(); g.moveTo(x0 + 0.5, y0 + 0.5); g.lineTo(x1 + 0.5, y1 + 0.5); g.stroke(); },
      pixel(x, y) { g.fillStyle = FG; g.fillRect(x, y, 1, 1); },
      rect(x, y, w, h) { g.fillStyle = FG; g.fillRect(x, y, w, h); },
      text(str) {
        const size = str.length <= 10 ? 2 : 1;
        g.fillStyle = FG; g.font = 'bold ' + (10 * size) + 'px "Courier New", monospace'; g.textBaseline = 'top';
        g.fillText(str, (128 - str.length * 6 * size) / 2, (64 - 8 * size) / 2 - size);
      }
    };
    // --- the same shapes as the tested sketch (drawRoundEye, drawHappyEye, ...)
    const eyes = (r) => { d.fillCircle(40, 28, r); d.fillCircle(88, 28, r); };
    const happyEye = (cx, cy) => { d.line(cx - 9, cy + 5, cx, cy - 5); d.line(cx - 9, cy + 6, cx, cy - 4); d.line(cx, cy - 5, cx + 9, cy + 5); d.line(cx, cy - 4, cx + 9, cy + 6); };
    const sadEye = (cx, cy) => { d.line(cx - 9, cy - 3, cx, cy + 6); d.line(cx - 9, cy - 2, cx, cy + 7); d.line(cx, cy + 6, cx + 9, cy - 3); d.line(cx, cy + 7, cx + 9, cy - 2); };
    const angryEye = (cx, cy) => { d.rect(cx - 8, cy - 2, 16, 6); if (cx < 64) d.line(cx - 9, cy - 12, cx + 9, cy - 6); else d.line(cx + 9, cy - 12, cx - 9, cy - 6); };
    const smile = (yb, w) => { for (let x = 64 - w; x <= 64 + w; x += 2) { const y = yb + Math.trunc(((x - 64) * (x - 64)) / 55); d.pixel(x, y); d.pixel(x, y + 1); } };
    const frown = (yb, w) => { for (let x = 64 - w; x <= 64 + w; x += 2) { const y = yb - Math.trunc(((x - 64) * (x - 64)) / 55); d.pixel(x, y); d.pixel(x, y + 1); } };
    const oMouth = (cx, cy, r) => { d.drawCircle(cx, cy, r); d.drawCircle(cx, cy, r - 1); };
    const F = {
      neutral() { d.clear(); eyes(9); },
      closed() { d.clear(); d.rect(31, 26, 18, 4); d.rect(79, 26, 18, 4); },
      happy1() { d.clear(); eyes(9); },
      happy2() { d.clear(); happyEye(40, 28); happyEye(88, 28); smile(46, 12); },
      happy3() { d.clear(); happyEye(40, 28); happyEye(88, 28); smile(44, 20); },
      sad2() { d.clear(); sadEye(40, 28); sadEye(88, 28); frown(54, 18); },
      sad3() { d.clear(); sadEye(40, 28); sadEye(88, 28); frown(54, 18); d.fillCircle(34, 40, 3); },
      surprised2() { d.clear(); eyes(15); oMouth(64, 50, 6); },
      angry2() { d.clear(); angryEye(40, 28); angryEye(88, 28); frown(52, 14); }
    };

    let busy = 0, lastActive = performance.now(), stage;
    const tilt = (angle) => { bot.style.setProperty('--tilt', ((angle - 90) * 0.4) + 'deg'); };
    const note = (hz, secs) => { floatNote(notes, hz); Sound.beep(hz, secs); };
    const happyFace = async (sleep) => { F.happy1(); await sleep(0.15); F.happy2(); await sleep(0.15); F.happy3(); };

    stage = {
      reset() { busy = 0; F.neutral(); tilt(90); notes.innerHTML = ''; lastActive = performance.now(); },
      note, print: (t) => sensors.print(t),
      head(angle) { tilt(angle); },
      async say(text, secs, sleep) {
        busy++;
        try { d.clear(); d.text(text); await sleep(secs); F.neutral(); } finally { busy--; lastActive = performance.now(); }
      },
      async react(cmd, sleep) {
        busy++;
        try {
          const C = 90, L = 50, R = 130;
          switch (cmd) {
            case 'happy': await happyFace(sleep); tilt(C + 15); note(523, 0.15); await sleep(0.16); note(659, 0.15); await sleep(0.16); note(784, 0.25); await sleep(0.26); tilt(C); break;
            case 'sad': F.happy1(); await sleep(0.15); F.sad2(); await sleep(0.2); F.sad3(); tilt(C - 20); note(400, 0.3); await sleep(0.32); note(300, 0.3); await sleep(0.32); note(200, 0.5); await sleep(0.52); tilt(C); break;
            case 'surprised': F.happy1(); await sleep(0.1); F.surprised2(); tilt(C - 25); note(1200, 0.12); await sleep(0.13); await sleep(0.2); tilt(C); break;
            case 'angry': F.happy1(); await sleep(0.1); F.angry2(); for (let i = 0; i < 3; i++) { tilt(L + 20); await sleep(0.08); tilt(R - 20); await sleep(0.08); } tilt(C); note(150, 0.4); await sleep(0.42); break;
            case 'sleepy': F.closed(); await sleep(0.6); F.neutral(); break;
            case 'left': tilt(L); await sleep(0.4); tilt(C); break;
            case 'right': tilt(R); await sleep(0.4); tilt(C); break;
            case 'neutral': F.neutral(); tilt(C); break;
            case 'celebrate':
              for (let i = 0; i < 2; i++) { await happyFace(sleep); tilt(L + 20); note(784, 0.1); await sleep(0.12); tilt(R - 20); note(988, 0.1); await sleep(0.12); }
              tilt(C); break;
          }
        } finally { busy--; lastActive = performance.now(); }
      }
    };
    F.neutral(); tilt(90);
    const blink = setInterval(() => {
      if (!mount.isConnected) { clearInterval(blink); return; }
      if (busy === 0 && performance.now() - lastActive > 4000) { F.closed(); setTimeout(() => { if (busy === 0) F.neutral(); }, 150); lastActive = performance.now(); }
    }, 500);
    return { stage, controls: '' };
  }

  /* ---------- Chip Bot ---------- */
  function chipbot(mount, sensors) {
    mount.innerHTML =
      '<div class="cb-scene"><div class="cb-sun"></div><div class="cb-ground"><div class="cb-track"></div></div>' +
      '<div class="cb-obstacle"><span>📦</span></div>' +
      '<div class="cb-bot"><div class="cb-body"><div class="cb-eyes"><i></i><i></i></div><div class="cb-mouth"></div></div>' +
      '<div class="cb-legs"><b class="cb-leg l"></b><b class="cb-leg r"></b></div></div>' +
      '<div class="cb-dist">📏 <b>50</b> cm</div><div class="notes"></div></div>';
    const scene = $(mount, '.cb-scene'), bot = $(mount, '.cb-bot'), notes = $(mount, '.notes');
    const obs = $(mount, '.cb-obstacle'), distEl = $(mount, '.cb-dist b');
    const apply = () => {
      const dcm = sensors.distance;
      distEl.textContent = Math.round(dcm);
      obs.style.left = (30 + (dcm / 50) * 52) + '%';
    };
    sensors.on('distance', apply); apply();
    const clear = () => { scene.className = 'cb-scene'; bot.className = 'cb-bot'; };
    const stage = {
      reset() { clear(); notes.innerHTML = ''; scene.style.setProperty('--T', '1s'); },
      idle() { clear(); },
      walk(dir, T) { clear(); scene.style.setProperty('--T', T + 's'); scene.classList.add(dir === 'fwd' ? 'moving-f' : 'moving-b'); bot.classList.add('walking'); },
      turn(dir, T) { clear(); scene.style.setProperty('--T', T + 's'); bot.classList.add(dir === 'left' ? 'turn-l' : 'turn-r'); },
      dance(m, per) { clear(); scene.style.setProperty('--T', Math.max(0.5, per) + 's'); bot.classList.add('dancing', 'dance-' + (Number(m) % 4)); },
      note(hz, secs) { floatNote(notes, hz); Sound.beep(hz, secs); },
      print: (t) => sensors.print(t)
    };
    const controls = '<label class="slider"><span>📏 Something in front of Chip Bot</span><input type="range" min="3" max="50" step="1" data-s="distance"><output></output></label>';
    return { stage, controls };
  }

  /* ---------- Jarvis ---------- */
  const LED = { red: '#ff3b3b', green: '#35d07f', blue: '#3b82ff', yellow: '#ffd93b', cyan: '#2de2e6', purple: '#b06bff', white: '#ffffff', off: '#59606e' };
  function jarvis(mount, sensors) {
    mount.innerHTML =
      '<div class="jv-scene"><svg viewBox="0 0 320 280" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Terrarium">' +
      '<defs><filter id="jvglow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="9"/></filter></defs>' +
      '<g class="jv-sun"><circle cx="58" cy="52" r="26" fill="#ffd93b"/><g stroke="#ffd93b" stroke-width="5" stroke-linecap="round">' +
      '<path d="M58 8v10M58 86v10M14 52h10M92 52h10M27 21l7 7M82 76l7 7M89 21l-7 7M34 76l-7 7"/></g></g>' +
      '<g class="jv-lamp"><rect x="244" y="26" width="10" height="30" rx="4" fill="#b8bfd0"/><circle class="glow" cx="249" cy="30" r="26" fill="#59606e" filter="url(#jvglow)" opacity="0"/>' +
      '<circle class="bulb" cx="249" cy="30" r="15" fill="#59606e" stroke="#fff" stroke-width="3"/></g>' +
      '<path d="M70 120h180c8 0 12 5 12 12v112c0 14-10 24-24 24H82c-14 0-24-10-24-24V132c0-7 4-12 12-12z" fill="#e6f6ff" fill-opacity=".55" stroke="#9cc4e4" stroke-width="5"/>' +
      '<rect class="soil" x="62" y="204" width="196" height="60" rx="14" fill="#8a5a2b"/>' +
      '<g class="plant"><path class="stem" d="M160 210 C160 180 160 160 160 140" stroke="#3aa85c" stroke-width="7" fill="none" stroke-linecap="round"/>' +
      '<g class="leafL"><ellipse cx="136" cy="152" rx="26" ry="12" fill="#43c06b"/></g><g class="leafR"><ellipse cx="184" cy="148" rx="26" ry="12" fill="#43c06b"/></g>' +
      '<ellipse class="leafT" cx="160" cy="132" rx="12" ry="22" fill="#4fd079"/></g>' +
      '<text class="jv-buzz" x="286" y="152" font-size="26" opacity="0">🔔</text></svg><div class="notes"></div></div>';
    const q = (s) => mount.querySelector(s), notes = $(mount, '.notes');
    const soilEl = q('.soil'), plant = q('.plant'), sun = q('.jv-sun'), bulb = q('.bulb'), glow = q('.glow');
    const leaves = mount.querySelectorAll('.leafL ellipse,.leafR ellipse,.leafT');
    const lerp = (a, b, t) => Math.round(a + (b - a) * t);
    const mix = (c1, c2, t) => 'rgb(' + c1.map((v, i) => lerp(v, c2[i], t)).join(',') + ')';
    const update = () => {
      const w = sensors.soil / 100, l = sensors.light / 100;
      soilEl.setAttribute('fill', mix([201, 162, 106], [96, 60, 30], w));
      const leafCol = mix([196, 172, 70], [67, 192, 107], Math.min(1, w * 1.4));
      leaves.forEach((e) => e.setAttribute('fill', leafCol));
      plant.style.transformOrigin = '160px 210px';
      plant.style.transform = 'rotate(' + ((1 - w) * 12) + 'deg) scaleY(' + (0.8 + w * 0.2) + ')';
      sun.style.opacity = 0.2 + l * 0.8;
      sun.style.transformOrigin = '58px 52px';
      sun.style.transform = 'scale(' + (0.8 + l * 0.35) + ')';
    };
    sensors.on('soil', update); sensors.on('light', update); update();
    let buzzT = 0;
    const stage = {
      reset() { stage.led('off'); notes.innerHTML = ''; },
      led(color) { const c = LED[color] || LED.off; bulb.setAttribute('fill', c); glow.setAttribute('fill', c); glow.setAttribute('opacity', color === 'off' ? 0 : 0.85); },
      note(hz, secs) {
        floatNote(notes, hz); Sound.beep(hz, secs);
        const b = q('.jv-buzz'); b.setAttribute('opacity', 1); clearTimeout(buzzT); buzzT = setTimeout(() => b.setAttribute('opacity', 0), secs * 1000 + 100);
      },
      print: (t) => sensors.print(t)
    };
    stage.led('off');
    const controls =
      '<label class="slider"><span>🌱 Soil wetness</span><input type="range" min="0" max="100" step="1" data-s="soil"><output></output></label>' +
      '<label class="slider"><span>☀️ Light</span><input type="range" min="0" max="100" step="1" data-s="light"><output></output></label>';
    return { stage, controls };
  }

  return { make: { peeko, chipbot, jarvis }, Sound };
});
