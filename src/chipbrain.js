/* Chip Bot's Brain: the camera (colour cards, or a Teachable Machine model) decides, and the SAME numbers you can type in the
   Serial Monitor (1 to 4) are sent to Chip Bot over USB. */
(function () {
  'use strict';
  const Brain = CampBrain;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const TF = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js';
  const TM = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js';
  const OPTS = { robot: 'chipbot' };
  const SERVO_NAMES = ['left hip', 'right hip', 'left foot', 'right foot'];
  const COLOUR_CSS = { red: '#e03b3b', yellow: '#f2c200', green: '#2fb04a', blue: '#2f6fe0' };
  const DEFAULT_COLOUR_MAP = { blue: '1', green: '2', yellow: '3', red: '4' };

  const S = {
    mode: 'colour', model: null, webcam: null, labels: [], mapping: {}, writer: null, port: null, running: false, st: Brain.newState(),
    video: null, stream: null, canvas: null
  };
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  function say(id, msg, kind) { const n = $(id); if (n) { n.textContent = msg; n.className = 'status' + (kind ? ' ' + kind : ''); } }
  function log(t) { const s = $('#serial'), d = el('div'); d.textContent = t; s.appendChild(d); while (s.children.length > 30) s.children[1].remove(); s.scrollTop = s.scrollHeight; }

  /* ---------- the four servos on screen ---------- */
  const servoBox = $('#servos');
  SERVO_NAMES.forEach((n, i) => servoBox.appendChild(el('div', 'sv', '<small>servo ' + (i + 1) + '</small><div class="dial"><div class="arm"></div></div><b>' + (i + 1) + '</b><small>' + n + '</small>')));
  function moveOnScreen(cmd) {
    const i = Number(cmd) - 1, box = servoBox.children[i]; if (!box) return;
    box.classList.remove('on'); void box.offsetWidth; box.classList.add('on');
    clearTimeout(box._t); box._t = setTimeout(() => box.classList.remove('on'), 1800);
  }

  /* ---------- Chip Bot over USB ---------- */
  async function readLoop(port) {
    try {
      const dec = new TextDecoderStream(); port.readable.pipeTo(dec.writable).catch(() => {});
      const rd = dec.readable.getReader(); let buf = '';
      for (;;) {
        const { value, done } = await rd.read(); if (done) break;
        buf += value; let k;
        while ((k = buf.indexOf('\n')) >= 0) { const line = buf.slice(0, k).trim(); buf = buf.slice(k + 1); if (line) log(line); }
      }
    } catch (e) { /* the cable was unplugged: fine */ }
  }
  $('#connect').onclick = async () => {
    if (!('serial' in navigator)) { say('#serialStatus', 'This browser cannot talk to Chip Bot. Use Chrome or Edge.', 'bad'); return; }
    try {
      S.port = await navigator.serial.requestPort();
      await S.port.open({ baudRate: 9600 });
      S.writer = S.port.writable.getWriter();
      say('#serialStatus', 'Connected. Give Chip Bot two seconds to wake up.', 'good'); $('#testSend').hidden = false;
      readLoop(S.port);
    } catch (e) { say('#serialStatus', 'Could not connect: ' + (e && e.name === 'NotFoundError' ? 'no port was chosen.' : 'is the Serial Monitor in the Arduino IDE still open? Close it and try again.'), 'bad'); }
  };
  async function send(cmd) {
    if (!S.writer) return;
    try { await S.writer.write(new TextEncoder().encode(cmd + '\n')); } catch (e) { say('#serialStatus', 'Lost the connection to Chip Bot.', 'bad'); S.writer = null; }
  }
  function fire(cmd, why) {
    const box = $('.msgbox'); $('#sent').textContent = cmd; box.classList.remove('pop'); void box.offsetWidth; box.classList.add('pop');
    log('→ sent "' + cmd + '"' + (why ? ' (' + why + ')' : '')); moveOnScreen(cmd); send(cmd);
  }
  $('#testSend').onclick = () => fire('1', 'test');

  /* ---------- the two ways of seeing ---------- */
  function setMode(m) {
    stop(); S.mode = m;
    $('#modeColour').classList.toggle('on', m === 'colour'); $('#modeTM').classList.toggle('on', m === 'tm');
    $('#modeColour').setAttribute('aria-selected', m === 'colour'); $('#modeTM').setAttribute('aria-selected', m === 'tm');
    $('#paneColour').hidden = m !== 'colour'; $('#paneTM').hidden = m !== 'tm';
    if (m === 'colour') { S.labels = Brain.COLOURS.slice(); S.mapping = Object.assign({}, DEFAULT_COLOUR_MAP); S.labels.forEach((l) => { if (!S.mapping[l]) S.mapping[l] = 'nothing'; }); renderMapping(); $('#start').disabled = false; }
    else { S.labels = S.model ? S.model.getClassLabels() : []; S.mapping = Brain.cleanMapping(S.labels, S.mapping, 'chipbot'); renderMapping(); $('#start').disabled = !S.model; }
  }
  $('#modeColour').onclick = () => setMode('colour'); $('#modeTM').onclick = () => setMode('tm');

  function loadScript(src) { return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); }); }
  async function ensureLibs() { if (window.tmImage) return; say('#modelStatus', 'Getting the AI tools ready (needs the internet)...'); await loadScript(TF); await loadScript(TM); }
  function gotModel(model) {
    S.model = model; S.labels = model.getClassLabels(); S.mapping = Brain.cleanMapping(S.labels, {}, 'chipbot'); S.st = Brain.newState();
    renderMapping(); say('#modelStatus', 'Loaded: ' + S.labels.length + ' classes (' + S.labels.join(', ') + ')', 'good'); $('#start').disabled = false;
  }
  $('#loadLink').onclick = async () => {
    const base = Brain.modelBase($('#link').value);
    if (!base) { say('#modelStatus', 'That is not a Teachable Machine link. It starts with https://teachablemachine.withgoogle.com/models/', 'bad'); return; }
    try { await ensureLibs(); say('#modelStatus', 'Loading your model...'); gotModel(await tmImage.load(base + 'model.json', base + 'metadata.json')); }
    catch (e) { console.error(e); say('#modelStatus', 'Could not load that model. Check the link and the internet, then try again.', 'bad'); }
  };
  $('#files').onchange = async (e) => {
    const f = Array.from(e.target.files), by = (re) => f.find((x) => re.test(x.name));
    const m = by(/^model.*\.json$/i), md = by(/^metadata.*\.json$/i), w = by(/\.bin$/i);
    if (!m || !md || !w) { say('#modelStatus', 'Choose all three files: model.json, metadata.json and weights.bin', 'bad'); return; }
    try { await ensureLibs(); gotModel(await tmImage.loadFromFiles(m, w, md)); } catch (err) { console.error(err); say('#modelStatus', 'Could not read those files.', 'bad'); }
  };

  /* ---------- what each one does ---------- */
  function renderMapping() {
    const box = $('#mapping'); box.innerHTML = '';
    if (!S.labels.length) { box.appendChild(el('p', 'empty', 'Load your model first.')); return; }
    S.labels.forEach((l) => {
      const row = el('div', 'maprow'), name = el('b');
      if (S.mode === 'colour') { name.innerHTML = '<span class="swatch" style="background:' + COLOUR_CSS[l] + '"></span>' + l + ' card'; } else name.textContent = l;
      const sel = el('select'); Brain.CHIPBOT_REACTIONS.forEach((r) => { const o = el('option'); o.value = r[0]; o.textContent = r[1]; sel.appendChild(o); });
      sel.value = S.mapping[l] || 'nothing'; sel.setAttribute('aria-label', 'What Chip Bot does for ' + l);
      sel.onchange = () => { S.mapping[l] = sel.value; };
      const bar = el('div', 'bar', '<i></i>'); bar.dataset.label = l;
      row.appendChild(name); row.appendChild(sel); row.appendChild(bar); box.appendChild(row);
    });
  }
  function renderBars(preds) {
    preds.forEach((p) => { const b = document.querySelector('.bar[data-label="' + CSS.escape(p.className) + '"] i'); if (b) b.style.width = Math.round(p.probability * 100) + '%'; });
    const box = $('#bars'); box.innerHTML = '';
    preds.forEach((p) => { const d = el('div'); d.innerHTML = '<span></span><i></i><span class="p"></span>'; d.children[0].textContent = p.className; d.children[1].style.width = Math.round(p.probability * 100) + '%'; d.children[2].textContent = Math.round(p.probability * 100) + '%'; box.appendChild(d); });
  }
  $('#sure').oninput = () => { $('#sureOut').textContent = $('#sure').value + '%'; };

  /* ---------- the loop ---------- */
  function step(preds) {
    renderBars(preds);
    const cmd = Brain.decide(preds, S.mapping, Object.assign({ threshold: Number($('#sure').value) / 100 }, OPTS), S.st, performance.now());
    if (cmd) { say('#runStatus', 'Sent ' + cmd + ': servo ' + cmd + ' moves.', 'good'); fire(cmd, S.mode === 'colour' ? 'colour card' : 'AI model'); }
  }
  async function frame() {
    if (!S.running) return;
    try {
      if (S.mode === 'tm') { S.webcam.update(); step(await S.model.predict(S.webcam.canvas)); }
      else {
        const v = S.video, c = S.canvas, w = 160, h = 120; c.width = w; c.height = h;
        const ctx = c.getContext('2d', { willReadFrequently: true }); ctx.drawImage(v, 0, 0, w, h);
        const d = Brain.dominantColour(ctx.getImageData(0, 0, w, h).data, w, h);
        ctx.strokeStyle = d.colour ? COLOUR_CSS[d.colour] : '#fff'; ctx.lineWidth = 3; ctx.strokeRect(w * 0.3, h * 0.3, w * 0.4, h * 0.4);
        step(Brain.COLOURS.map((n) => ({ className: n, probability: d.colour === n ? 1 : 0 })));
        $('#runStatus').className = 'status'; if (!d.colour) say('#runStatus', 'Watching... hold a colour card in the middle box.');
      }
    } catch (e) { console.error(e); }
    requestAnimationFrame(frame);
  }
  function stop() {
    if (!S.running) return;
    S.running = false; if (S.webcam) { try { S.webcam.stop(); } catch (e) { /* fine */ } }
    if (S.stream) S.stream.getTracks().forEach((t) => t.stop());
    $('#cam').innerHTML = '<span class="camhint">Your camera shows here</span>'; $('#start').textContent = "▶ Start Chip Bot's brain"; say('#runStatus', 'Stopped.');
  }
  $('#start').onclick = async () => {
    if (S.running) { stop(); return; }
    try {
      say('#runStatus', 'Starting the camera...');
      if (S.mode === 'tm') {
        S.webcam = new tmImage.Webcam(224, 224, true); await S.webcam.setup(); await S.webcam.play();
        $('#cam').innerHTML = ''; $('#cam').appendChild(S.webcam.canvas);
      } else {
        S.stream = await navigator.mediaDevices.getUserMedia({ video: { width: 320, height: 240 } });
        S.video = document.createElement('video'); S.video.srcObject = S.stream; S.video.muted = true; S.video.playsInline = true; await S.video.play();
        S.canvas = document.createElement('canvas'); $('#cam').innerHTML = ''; $('#cam').appendChild(S.canvas);
      }
      S.st = Brain.newState(); S.running = true; $('#start').textContent = '■ Stop'; say('#runStatus', 'Watching...', 'good'); requestAnimationFrame(frame);
    } catch (e) { console.error(e); say('#runStatus', 'Could not start the camera. Allow camera access and try again.', 'bad'); }
  };

  setMode('colour');
  window.__chipbrain = { S, step, fire, setMode };
})();
