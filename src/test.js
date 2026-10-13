/* Test it: a test sketch for each robot, and a checklist of what you should see and hear. */
(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const el = (tag, cls, html) => { const e = document.createElement(tag); if (cls) e.className = cls; if (html != null) e.innerHTML = html; return e; };
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const ROBOTS = { chipbot: { name: 'Chip Bot', emoji: '🤖', color: '#2bb3a3' }, peeko: { name: 'Peeko', emoji: '👀', color: '#ff6b5e' }, jarvis: { name: 'Jarvis', emoji: '🌱', color: '#8b7fe8' } };
  const BOARD = { chipbot: 'Tools → Board → <u>Arduino Nano</u> (if the upload fails: Processor → ATmega328P (Old Bootloader))', peeko: 'Tools → Board → <u>Arduino Uno</u>', jarvis: 'Tools → Board → <u>Arduino Uno</u>' };
  const LIBS = { chipbot: 'No extra libraries needed.', peeko: 'Libraries needed (Tools → Manage Libraries): Adafruit GFX Library and Adafruit SH110X (say yes to BusIO too).', jarvis: 'Libraries needed (Tools → Manage Libraries): Adafruit GFX Library and Adafruit SH110X (say yes to BusIO too).' };
  const SAY = {
    chipbot: 'Chip Bot checks its buzzer, its four servos and its distance sensor, one after the other.',
    peeko: 'Peeko checks its screen, its head servo and its buzzer, one after the other.',
    jarvis: 'Jarvis checks its LED, its soil sensor, its light sensor, its buzzer and its screen, one after the other.'
  };
  const CHECKS = {
    chipbot: [
      { id: 'buzzer', title: 'Buzzer on D13', see: 'Three beeps: one plain, then two different pitches. (An always-beep buzzer makes the same pitch each time. That is fine.)', fix: 'Silent? Flip the two legs: the long leg (+) goes to D13 and the short leg (−) to ground.' },
      { id: 'servo', title: 'All four servos', see: 'Each servo swings left and right, one at a time: left hip, right hip, left foot, right foot.', fix: 'One does nothing? Check its plug: the yellow wire goes on the S pin. All four dead? Try another USB cable or charger.' },
      { id: 'dist', title: 'Distance sensor', see: 'The Serial Monitor prints "distance ... cm", and the buzzer beeps when your hand is closer than 15 cm.', fix: 'It says "no echo"? Check VCC, GND, TRIG (D8) and ECHO (D9).' }
    ],
    peeko: [
      { id: 'screen', title: 'OLED screen', see: 'The screen says HELLO and shows two round eyes. The Serial Monitor says [PASS] OLED answered.', fix: 'Blank, and [CHECK]? SDA goes to A4 and SCL goes to A5 (swapped is the most common mistake). Then check VCC to 5V and GND.' },
      { id: 'head', title: 'Head servo', see: 'The head turns left, then right, then back to the middle.', fix: 'Nothing? Check the signal wire on D9, power on 5V and ground on GND.' },
      { id: 'buzzer', title: 'Buzzer on D8', see: 'Three beeps: one plain, then two different pitches.', fix: 'Silent? Flip the two legs: the long leg (+) goes to D8 and the short leg (−) to ground.' }
    ],
    jarvis: [
      { id: 'led', title: 'RGB LED', see: 'Red, then green, then blue, then white (all three), each for about a second and a half.', fix: 'A colour is missing? That colour\'s 220 Ω resistor or wire is wrong. Nothing lights? The long leg of the LED must go to ground.' },
      { id: 'soil', title: 'Soil sensor', see: 'The soil number changes, and it drops when you dip the probe in water. The Serial Monitor says [PASS].', fix: '[CHECK]? Check the signal wire on A0, and the power and ground wires.' },
      { id: 'light', title: 'Light sensor', see: 'The light number changes when you cover the sensor with your hand. The Serial Monitor says [PASS].', fix: '[CHECK]? The LDR goes between 5V and A1, and the 10 kΩ resistor goes between A1 and ground.' },
      { id: 'buzzer', title: 'Buzzer on D8', see: 'Three beeps: one plain, then two different pitches.', fix: 'Silent? Flip the two legs: the long leg (+) goes to D8 and the short leg (−) to ground.' },
      { id: 'screen', title: 'OLED screen', see: 'The screen shows SOIL and LIGHT with a percentage and a raw number for each. The numbers change when you dip the probe or cover the sensor.', fix: 'Blank, and [CHECK]? SDA goes to A4 and SCL goes to A5 (swapped is the most common mistake). Then check VCC to 5V and GND to ground.' }
    ]
  };
  const PIN = { chipbot: 'D13', peeko: 'D8', jarvis: 'D8' };

  const S = { proj: ChipCamp.robotOrDefault() };
  let toastT = 0;
  function toast(msg) { const t = $('#toast'); t.textContent = msg; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(() => t.classList.remove('show'), 2200); }
  const key = () => 'chipcamp.testchecks.' + S.proj;
  function loadChecks() { try { return JSON.parse(localStorage.getItem(key())) || {}; } catch (e) { return {}; } }
  function saveChecks(o) { try { localStorage.setItem(key(), JSON.stringify(o)); } catch (e) { /* fine */ } }

  /* ---------- syntax colours for the sketch ---------- */
  const TYPES = new Set(['void', 'int', 'long', 'unsigned', 'bool', 'char', 'uint8_t', 'byte', 'const', 'Servo', 'Adafruit_SH1106G']);
  const KW = new Set(['if', 'else', 'for', 'while', 'return', 'true', 'false', 'HIGH', 'LOW', 'OUTPUT', 'INPUT']);
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
    return out + esc(line.slice(last));
  }

  /* ---------- helpers ---------- */
  function buzzerHelp() {
    const pin = PIN[S.proj], chip = S.proj === 'chipbot';
    const sig = chip ? 'the <b>S</b> pin of the <b>' + pin + '</b> header on the shield' : 'pin <b>' + pin + '</b>';
    const gnd = chip ? 'the <b>G</b> pin of the same ' + pin + ' header' : 'any <b>GND</b> pin (or the ground rail of the breadboard)';
    return '<p>Your buzzer is small with <b>two legs</b>. The <b>longer leg is +</b> and the shorter leg is −. It has no power pin, so we only need two wires:</p>' +
      '<ul><li><b>+ (long leg)</b> goes to ' + sig + '.</li><li><b>− (short leg)</b> goes to ' + gnd + '.</li></ul>' +
      '<div class="tip"><b>How to hold the legs:</b><ol><li><b>With a breadboard:</b> push each leg into a different column. Run one jumper wire from the + column to the signal pin, and one from the − column to ground.</li><li><b>No breadboard:</b> push each leg into the end of a jumper wire, wrap a little tape round the join, and plug the other ends into the pins. The tape stops the leg from wiggling out.</li></ol></div>' +
      '<p>The Circuit Lab shows the buzzer as a part with two legs, so you can wire it there first.</p>';
  }
  function ledHelp() {
    return '<ol>' +
      '<li><b>Know your LED.</b> It has four legs. The <b>longest leg (K)</b> is the shared ground. The other three are red, green and blue.</li>' +
      '<li><b>Know your resistors.</b> A resistor stops the LED from burning out. The three for the LED are <b>220 Ω</b>: bands <i>red, red, brown</i>. The one for the light sensor is <b>10 kΩ</b>: bands <i>brown, black, orange</i>. Your kit in the Circuit Lab has both kinds. Match the bands.</li>' +
      '<li><b>Build one colour at a time.</b> Do red first: pin D9, then a 220 Ω resistor, then the LED\'s red leg. Upload the test sketch and check red comes on. Then add green (D10), then blue (D11). If a colour is wrong, you only have one wire to look at.</li>' +
      '<li><b>Last: the long leg to ground.</b> Connect the long leg (K) to the ground rail (the blue − line). Nothing lights without this step.</li></ol>' +
      '<div class="tip">The finished layout is in the Circuit Lab. Your facilitator can press <b>Show finished circuit</b> to compare.</div>';
  }

  /* ---------- the page ---------- */
  function renderTabs() {
    const nav = $('#ptabs'); nav.innerHTML = '';
    Object.keys(ROBOTS).forEach((id) => {
      const r = ROBOTS[id], b = el('button', 'ptab', '<span class="em">' + r.emoji + '</span>' + esc(r.name));
      b.setAttribute('aria-selected', id === S.proj ? 'true' : 'false'); b.style.setProperty('--pc', r.color);
      b.onclick = () => { if (id === S.proj) return; S.proj = id; ChipCamp.setRobot(id); renderAll(); };
      nav.appendChild(b);
    });
  }
  function renderChecks() {
    const box = $('#checks'), saved = loadChecks(); box.innerHTML = '';
    CHECKS[S.proj].forEach((c) => {
      const row = el('label', 'check' + (saved[c.id] ? ' on' : ''));
      const cb = el('input'); cb.type = 'checkbox'; cb.checked = !!saved[c.id];
      cb.onchange = () => { const s = loadChecks(); s[c.id] = cb.checked; saveChecks(s); renderChecks(); };
      row.appendChild(cb);
      row.appendChild(el('div', null, '<b>' + esc(c.title) + '</b><div class="see">' + esc(c.see) + '</div>'));
      row.appendChild(el('div', 'fix', '💡 ' + esc(c.fix)));
      box.appendChild(row);
    });
    const all = CHECKS[S.proj].every((c) => saved[c.id]);
    $('#doneBtn').disabled = !all;
    $('#doneNote').textContent = all ? 'Everything works. Great!' : 'Tick every part to carry on.';
    ChipCamp.testDone(S.proj, all);
    CampFlow.render('test');
  }
  function renderCode() {
    const text = (window.TEST_SKETCHES || {})[S.proj] || '';
    const pane = $('#tPane'); pane.innerHTML = '';
    text.split('\n').forEach((t, i) => { const row = el('div', 'ln'); row.innerHTML = '<span class="no">' + (i + 1) + '</span><span class="tx">' + hl(t || ' ') + '</span>'; pane.appendChild(row); });
    $('#copyTest').onclick = () => { copy(text).then(() => toast('Copied the whole test sketch! Paste it into the Arduino IDE.')); };
    $('#dlTest').onclick = () => { const a = el('a'); a.href = URL.createObjectURL(new Blob([text], { type: 'text/plain' })); a.download = ROBOTS[S.proj].name.replace(/ /g, '') + '_test.ino'; document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 400); toast('Downloaded. Open it with the Arduino IDE.'); };
  }
  function copy(text) {
    const fallback = () => { const ta = el('textarea'); ta.value = text; ta.style.cssText = 'position:fixed;opacity:0'; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); } catch (e) { /* ignore */ } ta.remove(); };
    if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(text).catch(fallback);
    fallback(); return Promise.resolve();
  }
  function renderAll() {
    const r = ROBOTS[S.proj];
    document.title = 'Test it · ' + r.name + ' · Chip Camp';
    $('#tTitle').textContent = 'Test ' + r.name;
    $('#tSay').textContent = SAY[S.proj];
    $('#buzzBody').innerHTML = buzzerHelp();
    const lh = $('#ledHelper'); lh.hidden = S.proj !== 'jarvis'; $('#ledBody').innerHTML = S.proj === 'jarvis' ? ledHelp() : '';
    $('#tBoard').innerHTML = BOARD[S.proj];
    $('#tLibs').textContent = LIBS[S.proj];
    const done = ChipCamp.get().circuits[S.proj];
    const ls = $('#labState'); ls.textContent = done ? '✓ Your Circuit Lab is complete.' : 'Not finished yet. Do that first.'; ls.className = 'labstate ' + (done ? 'ok' : 'no');
    renderTabs(); renderChecks(); renderCode();
  }
  $('#doneBtn').onclick = () => {
    const next = (S.proj !== 'peeko' && !ChipCamp.day2()) ? 'blocks.html#build' : 'studio.html';
    location.href = next;
  };
  renderAll();
})();
