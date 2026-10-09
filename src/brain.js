/* Peeko's Brain: a Teachable Machine model watches the camera and Peeko reacts. */
(function () {
  'use strict';
  const Brain = CampBrain;
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const TF = 'https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@1.3.1/dist/tf.min.js';
  const TM = 'https://cdn.jsdelivr.net/npm/@teachablemachine/image@0.8/dist/teachablemachine-image.min.js';

  const S = { model: null, webcam: null, labels: [], mapping: {}, writer: null, port: null, running: false, st: Brain.newState() };
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2400); }
  function say(id, msg, kind) { const n = $(id); n.textContent = msg; n.className = 'status' + (kind ? ' ' + kind : ''); }

  /* ---------- the on-screen Peeko ---------- */
  const sensors = { print(t) { const s = $('#serial'), d = el('div'); d.textContent = t; s.appendChild(d); while (s.children.length > 30) s.children[1].remove(); s.scrollTop = s.scrollHeight; } };
  const stage = CampStages.make.peeko($('#scene'), sensors).stage;
  stage.reset();
  const sleep = (sec) => new Promise((r) => setTimeout(r, sec * 1000));
  $('#soundBtn').onclick = () => { CampStages.Sound.on = !CampStages.Sound.on; $('#soundBtn').textContent = CampStages.Sound.on ? '🔊' : '🔇'; $('#soundBtn').setAttribute('aria-pressed', CampStages.Sound.on); };

  /* ---------- the libraries load only when they are needed ---------- */
  function loadScript(src) {
    return new Promise((res, rej) => { const s = document.createElement('script'); s.src = src; s.onload = res; s.onerror = () => rej(new Error('Could not load ' + src)); document.head.appendChild(s); });
  }
  async function ensureLibs() {
    if (window.tmImage) return;
    say('#modelStatus', 'Getting the AI tools ready (needs the internet)...');
    await loadScript(TF); await loadScript(TM);
  }

  /* ---------- step 2: load the model ---------- */
  function gotModel(model) {
    S.model = model; S.labels = model.getClassLabels(); S.mapping = Brain.cleanMapping(S.labels, {}); S.st = Brain.newState();
    renderMapping(); renderBars(S.labels.map((l) => ({ className: l, probability: 0 })));
    say('#modelStatus', 'Loaded: ' + S.labels.length + ' classes (' + S.labels.join(', ') + ')', 'good');
    $('#start').disabled = false;
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
    try { await ensureLibs(); gotModel(await tmImage.loadFromFiles(m, w, md)); }
    catch (err) { console.error(err); say('#modelStatus', 'Could not read those files.', 'bad'); }
  };

  /* ---------- step 3: Peeko over USB ---------- */
  $('#connect').onclick = async () => {
    if (!('serial' in navigator)) { say('#serialStatus', 'This browser cannot talk to Peeko. Use Chrome or Edge.', 'bad'); return; }
    try {
      S.port = await navigator.serial.requestPort();
      await S.port.open({ baudRate: 9600 });
      S.writer = S.port.writable.getWriter();
      say('#serialStatus', 'Connected. Give Peeko two seconds to wake up.', 'good');
    } catch (e) { say('#serialStatus', 'Could not connect: ' + (e && e.name === 'NotFoundError' ? 'no port was chosen.' : 'is the Arduino IDE or another tab using it?'), 'bad'); }
  };
  async function send(cmd) {
    if (!S.writer) return;
    try { await S.writer.write(new TextEncoder().encode(cmd + '\n')); } catch (e) { say('#serialStatus', 'Lost the connection to Peeko.', 'bad'); S.writer = null; }
  }

  /* ---------- step 4: what Peeko does ---------- */
  function renderMapping() {
    const box = $('#mapping'); box.innerHTML = '';
    S.labels.forEach((l) => {
      const row = el('div', 'maprow'), name = el('b'); name.textContent = l;
      const sel = el('select'); Brain.REACTIONS.forEach((r) => { const o = el('option'); o.value = r[0]; o.textContent = r[1]; sel.appendChild(o); });
      sel.value = S.mapping[l]; sel.setAttribute('aria-label', 'What Peeko does for ' + l);
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
  function react(cmd) {
    say('#runStatus', 'Peeko: ' + cmd, 'good');
    stage.react(cmd, sleep);
    send(cmd);
  }
  function step(preds) {
    renderBars(preds);
    const cmd = Brain.decide(preds, S.mapping, { threshold: Number($('#sure').value) / 100 }, S.st, performance.now());
    if (cmd) react(cmd);
  }
  async function loop() {
    if (!S.running) return;
    S.webcam.update();
    try { step(await S.model.predict(S.webcam.canvas)); } catch (e) { console.error(e); }
    requestAnimationFrame(loop);
  }
  $('#start').onclick = async () => {
    if (S.running) { S.running = false; if (S.webcam) S.webcam.stop(); $('#cam').innerHTML = '<span class="camhint">Your camera shows here</span>'; $('#start').textContent = "▶ Start Peeko's brain"; say('#runStatus', 'Stopped.'); return; }
    try {
      say('#runStatus', 'Starting the camera...');
      S.webcam = new tmImage.Webcam(224, 224, true);
      await S.webcam.setup(); await S.webcam.play();
      $('#cam').innerHTML = ''; $('#cam').appendChild(S.webcam.canvas);
      S.st = Brain.newState(); S.running = true; $('#start').textContent = '■ Stop'; say('#runStatus', 'Watching...', 'good');
      requestAnimationFrame(loop);
    } catch (e) { console.error(e); say('#runStatus', 'Could not start the camera. Allow camera access and try again.', 'bad'); }
  };

  window.__brain = { S, step, gotModel };
})();
