/* Facilitator area: decrypts the session plans with the password (the page itself only holds the encrypted text). */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const P = window.PLANS_PAYLOAD;
  const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
  let docs = null;

  async function decrypt(pin) {
    const km = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(P.s), iterations: P.n, hash: 'SHA-256' }, km, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
    const buf = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(P.i) }, key, b64(P.c));
    return JSON.parse(new TextDecoder().decode(buf));
  }
  function show() {
    const ids = docs.map((d) => d.id);
    const m = location.hash.match(/^#doc=([\w-]+)/);
    const cur = m && ids.indexOf(m[1]) >= 0 ? m[1] : ids[0];
    const nav = $('#planNav'); nav.innerHTML = '';
    docs.forEach((d) => {
      const a = document.createElement('a'); a.href = '#doc=' + d.id; a.textContent = d.title; a.setAttribute('aria-current', d.id === cur ? 'true' : 'false'); nav.appendChild(a);
    });
    $('#planBody').innerHTML = docs.find((d) => d.id === cur).html;
    document.title = docs.find((d) => d.id === cur).title + ' · Chip Camp facilitators';
    window.scrollTo(0, 0);
  }
  function open(d) {
    docs = d; $('#lockView').hidden = true; $('#plansView').hidden = false; $('#lockBtn').hidden = false; show();
  }
  async function attempt(pin, quiet) {
    const msg = $('#lockMsg');
    if (!window.crypto || !crypto.subtle) { msg.textContent = 'This browser cannot unlock the page here. Open it over https or in a current Chrome, Edge or Safari.'; return; }
    try {
      open(await decrypt(pin));
      try { sessionStorage.setItem('chipcamp.plans', pin); } catch (e) { /* fine */ }
    } catch (e) {
      try { sessionStorage.removeItem('chipcamp.plans'); } catch (e2) { /* fine */ }
      if (quiet) return;
      msg.textContent = 'That is not the password.';
      const card = $('#lockForm'); card.classList.remove('shake'); void card.offsetWidth; card.classList.add('shake');
      $('#pin').select();
    }
  }
  $('#lockForm').onsubmit = (e) => { e.preventDefault(); $('#lockMsg').textContent = ''; attempt($('#pin').value.trim()); };
  $('#lockBtn').onclick = () => { docs = null; try { sessionStorage.removeItem('chipcamp.plans'); } catch (e) { /* fine */ } $('#plansView').hidden = true; $('#lockView').hidden = false; $('#lockBtn').hidden = true; $('#planBody').innerHTML = ''; $('#pin').value = ''; $('#pin').focus(); };
  window.addEventListener('hashchange', () => { if (docs) show(); });
  let saved = null; try { saved = sessionStorage.getItem('chipcamp.plans'); } catch (e) { /* fine */ }
  if (saved) attempt(saved, true);
})();
