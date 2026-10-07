(function () {
  'use strict';
  const $ = (s) => document.querySelector(s);
  const NAMES = { chipbot: 'Chip Bot', peeko: 'Peeko', jarvis: 'Jarvis' };

  const nameIn = $('#hubName');
  nameIn.value = ChipCamp.get().name;
  nameIn.oninput = () => ChipCamp.setName(nameIn.value);
  nameIn.onchange = () => { ChipCamp.setName(nameIn.value); nameIn.value = ChipCamp.get().name; };

  function render() {
    const p = ChipCamp.get();
    document.querySelectorAll('.robot').forEach((b) => b.setAttribute('aria-checked', b.dataset.robot === p.robot ? 'true' : 'false'));
    const r = p.robot, label = r ? NAMES[r] : 'your robot';

    const lv = ChipCamp.levelsCompleted();
    const pl = $('#pgLogic'); pl.textContent = lv + ' of 10'; pl.classList.toggle('done', lv >= 10);

    $('#sCircuit').textContent = r ? 'Drag parts together and wire up ' + label + '.' : 'Drag parts together and wire up your robot.';
    const pc = $('#pgCircuit'); const cDone = r && p.circuits[r];
    pc.textContent = cDone ? 'Wired ✓' : 'Not yet'; pc.classList.toggle('done', !!cDone);

    $('#sCode').textContent = r ? 'Build ' + label + "'s logic with blocks, then copy the code." : 'Build the logic with blocks, then copy your code.';
    const pk = $('#pgCode'); const n = r ? p.code[r] || 0 : 0;
    pk.textContent = n ? n + (n === 1 ? ' block' : ' blocks') : 'Not yet'; pk.classList.toggle('done', n >= 5);
  }

  document.querySelectorAll('.robot').forEach((b) => { b.onclick = () => { ChipCamp.setRobot(b.dataset.robot); render(); }; });
  render();
  window.addEventListener('pageshow', render);
})();
