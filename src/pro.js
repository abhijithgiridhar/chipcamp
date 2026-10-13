/* Pro code: the final, more complex program for each robot. The page only holds it encrypted; a facilitator unlocks it with the camp password. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const KEY = 'chipcamp.prokey', SALT = 'chipcamp-pro-v1', ITER = 250000;
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  const enc = (s) => new TextEncoder().encode(s);
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let data = null;

  async function keyFromPin(pin) {
    const km = await crypto.subtle.importKey('raw', enc(pin + ':pro'), 'PBKDF2', false, ['deriveBits']);
    const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc(SALT), iterations: ITER, hash: 'SHA-256' }, km, 256);
    return btoa(String.fromCharCode.apply(null, new Uint8Array(bits)));
  }
  async function decryptWith(keyB64) {
    const P = window.PRO_PAYLOAD;
    const key = await crypto.subtle.importKey('raw', b64(keyB64), { name: 'AES-GCM' }, false, ['decrypt']);
    return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(P.i) }, key, b64(P.c))));
  }
  const storedKey = () => { try { return localStorage.getItem(KEY); } catch (e) { return null; } };

  const ID_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let deskIds = null;
  function newIds() {
    const out = new Set();
    while (out.size < 5) {
      const b = new Uint8Array(4); crypto.getRandomValues(b);
      out.add('CB-' + Array.from(b, (x) => ID_CHARS[x % ID_CHARS.length]).join(''));
    }
    deskIds = Array.from(out).map((id) => ({ id, used: false }));
  }
  function renderDesk() {
    const C = window.__camp, pro = data.chipbot;
    $('#proBody').hidden = true; $('#deskBody').hidden = false;
    if (!deskIds) newIds();
    const box = $('#deskIds'); box.innerHTML = '';
    deskIds.forEach((d) => {
      const b = document.createElement('button'); b.className = 'deskid' + (d.used ? ' used' : ''); b.textContent = d.id;
      b.onclick = () => {
        C.download('ChipBot_' + d.id.replace('-', '_') + '.ino', pro.desk.split('@@ID@@').join(d.id));
        d.used = true; b.classList.add('used'); C.toast('Downloaded ' + d.id + '. Open it in the Arduino IDE and upload.');
      };
      box.appendChild(b);
    });
    $('#deskNew').onclick = () => { newIds(); renderDesk(); };
    $('#deskBack').onclick = () => { location.hash = '#build'; };
  }

  function renderBody() {
    const C = window.__camp, proj = C.S.proj, pro = data[proj];
    if (proj === 'chipbot' && pro.desk) { renderDesk(); return; }
    $('#deskBody').hidden = true;
    const gen = C.Core.generate(proj, C.state(), { pro });
    $('#proTitle').textContent = pro.title;
    $('#proBlurb').textContent = pro.blurb;
    $('#proFeat').innerHTML = pro.features.map((f) => '<li>' + esc(f) + '</li>').join('');
    $('#proBoard').innerHTML = proj === 'chipbot' ? '<b>Tools → Board → Arduino Nano</b> (if the upload fails, Processor → ATmega328P (Old Bootloader)).' : '<b>Tools → Board → Arduino Uno</b>' + (proj === 'peeko' ? ' (the Adafruit GFX and SH110X libraries are needed).' : '.');
    const pane = $('#proPane'); pane.innerHTML = '';
    gen.text.split('\n').forEach((t, i) => {
      const row = document.createElement('div'); row.className = 'ln';
      row.innerHTML = '<span class="no">' + (i + 1) + '</span><span class="tx">' + C.hl(t || ' ') + '</span>'; pane.appendChild(row);
    });
    const name = C.sketchName().replace(/\.ino$/, '') + '_Pro';
    $('#proCopy').onclick = (e) => { const r = e.currentTarget.getBoundingClientRect(); C.copyText(gen.text).then(() => { C.confetti(r.left + r.width / 2, r.top); C.toast('Copied the whole Pro sketch! Paste it into the Arduino IDE.'); }); };
    $('#proDl').onclick = () => { C.download(name + '.ino', gen.text); C.toast('Downloaded. Open it with the Arduino IDE.'); };
    $('#proBack').onclick = () => { location.hash = '#build'; };
  }

  async function show() {
    const lock = $('#proLock'), body = $('#proBody'); $('#deskBody').hidden = true;
    const cb = window.__camp && window.__camp.S.proj === 'chipbot';
    lock.querySelector('h2').textContent = cb ? 'The Upload desk' : 'The Pro code';
    lock.querySelector('p').textContent = cb ? 'This is where your facilitator puts the tested program on your robot. Finish your own program first, then ask your facilitator to unlock it.' : 'This is the final, more complex program for your robot. It is the same robot with a much cleverer brain. Finish your own program first, then ask your facilitator to unlock it.';
    if (!window.PRO_PAYLOAD) { lock.hidden = false; body.hidden = true; $('#proMsg').textContent = 'The Pro code is not part of this copy of the site.'; $('#proForm').hidden = true; return; }
    if (!data && storedKey()) { try { data = await decryptWith(storedKey()); } catch (e) { try { localStorage.removeItem(KEY); } catch (e2) { /* fine */ } } }
    if (data) { lock.hidden = true; body.hidden = false; renderBody(); } else { lock.hidden = false; body.hidden = true; }
  }

  $('#proForm').onsubmit = async (e) => {
    e.preventDefault();
    const msg = $('#proMsg'); msg.textContent = '';
    if (!window.crypto || !crypto.subtle) { msg.textContent = 'This browser cannot unlock the page here. Use a current Chrome, Edge or Safari.'; return; }
    try {
      const k = await keyFromPin($('#proPin').value.trim());
      data = await decryptWith(k);
      try { localStorage.setItem(KEY, k); } catch (e2) { /* fine */ }
      $('#proPin').value = ''; show(); if (window.CampFlow) CampFlow.render('pro');
    } catch (err) { msg.textContent = 'That is not the password. Ask your facilitator.'; }
  };

  window.CampPro = { show };
})();
