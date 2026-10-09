(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const NAMES = { chipbot: 'Chip Bot', peeko: 'Peeko', jarvis: 'Jarvis' };

  const nameIn = $('#hubName');
  nameIn.value = ChipCamp.get().name;
  nameIn.oninput = () => ChipCamp.setName(nameIn.value);
  nameIn.onchange = () => { ChipCamp.setName(nameIn.value); nameIn.value = ChipCamp.get().name; };

  const BOTS = {
    chipbot: { name: 'Chip Bot', tag: 'The mover', em: '🤖', color: '#2bb3a3' },
    peeko: { name: 'Peeko', tag: 'The face', em: '👀', color: '#ff6b5e' },
    jarvis: { name: 'Jarvis', tag: 'The living world', em: '🌱', color: '#8b7fe8' }
  };

  // tools that wait for day 2 (a facilitator unlocks them from the Facilitators page)
  const DAY2 = { chipbot: ['tStudio'], jarvis: ['tStudio'], peeko: ['tBrain'] };

  function render() {
    const p = ChipCamp.get(), r = BOTS[location.hash.slice(1)] ? location.hash.slice(1) : null;
    $('#viewHome').hidden = !!r; $('#viewRobot').hidden = !r;
    document.title = r ? BOTS[r].name + ' · Micron Chip Camp' : 'Micron Chip Camp';
    if (!r) { window.scrollTo(0, 0); return; }
    ChipCamp.setRobot(r);
    const b = BOTS[r], label = b.name;
    $('#botHead').style.setProperty('--rc', b.color);
    $('#botEm').textContent = b.em; $('#botName').textContent = b.name; $('#botTag').textContent = b.tag;
    nameIn.value = p.name;

    const lv = ChipCamp.levelsCompleted();
    const pl = $('#pgLogic'); pl.textContent = lv + ' of 10'; pl.classList.toggle('done', lv >= 10);

    $('#sCircuit').textContent = 'Drag parts together and wire up ' + label + '.';
    const pc = $('#pgCircuit'); const cDone = p.circuits[r];
    pc.textContent = cDone ? 'Wired ✓' : 'Not yet'; pc.classList.toggle('done', !!cDone);

    const SN = { chipbot: ['Dance Studio', 'Choose the moves for ' + label + '.'], peeko: ['Face Studio', 'Choose the faces for ' + label + '.'], jarvis: ['Light Studio', 'Choose the lights for ' + label + '.'] };
    $('#nStudio').textContent = SN[r][0]; $('#sStudio').textContent = SN[r][1];
    $('#tBrain').hidden = r !== 'peeko';
    const dz = ChipCamp.design(r); const ps = $('#pgStudio'); ps.textContent = dz ? 'Designed ✓' : 'Not yet'; ps.classList.toggle('done', !!dz);

    $('#sCode').textContent = 'Build ' + label + "'s logic with blocks, then copy the code.";
    const pk = $('#pgCode'); const n = p.code[r] || 0;
    pk.textContent = n ? n + (n === 1 ? ' block' : ' blocks') : 'Not yet'; pk.classList.toggle('done', n >= 5);
    const lockedIds = ChipCamp.day2() ? [] : DAY2[r];
    document.querySelectorAll('.tile').forEach((t) => {
      const lock = lockedIds.indexOf(t.id) >= 0, pg = t.querySelector('.prog');
      t.classList.toggle('locked', lock);
      if (lock) { t.setAttribute('aria-disabled', 'true'); pg.textContent = 'Day 2'; pg.classList.remove('done'); }
      else t.removeAttribute('aria-disabled');
    });
    $('#lockNote').hidden = true;
    window.scrollTo(0, 0);
  }

  document.querySelectorAll('.tile').forEach((t) => {
    t.addEventListener('click', (e) => { if (t.classList.contains('locked')) { e.preventDefault(); $('#lockNote').hidden = false; } });
  });
  window.addEventListener('hashchange', render);
  window.addEventListener('pageshow', render);
  render();
})();
