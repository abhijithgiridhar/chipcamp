/* The step bar on every tool page: Wire it, Test it, Design it, Build it, Make the code, Pro code. */
(function (root) {
  'use strict';
  const STEPS = [
    { id: 'wire', label: 'Wire it', href: 'circuits.html' },
    { id: 'test', label: 'Test it', href: 'test.html' },
    { id: 'design', label: 'Design it', href: 'studio.html' },
    { id: 'build', label: 'Build it', href: 'blocks.html#build' },
    { id: 'code', label: 'Make the code', href: 'blocks.html#code' },
    { id: 'pro', label: 'Pro code', href: 'blocks.html#pro' }
  ];
  const LOCKED_DESIGN = { chipbot: true, jarvis: true };   // the Studio opens on day 2 for these two robots
  function doneFor(id, r, p) {
    if (id === 'wire') return !!p.circuits[r];
    if (id === 'test') return !!p.tests[r];
    if (id === 'design') return !!ChipCamp.design(r);
    if (id === 'build') return (p.code[r] || 0) > 0;
    if (id === 'code') return !!p.copied[r];
    if (id === 'pro') return ChipCamp.proUnlocked();
    return false;
  }
  function render(current) {
    const nav = document.getElementById('flow'); if (!nav) return;
    const p = ChipCamp.get(), r = p.robot || 'chipbot';
    nav.innerHTML = '';
    STEPS.forEach((s, i) => {
      const a = document.createElement('a');
      const locked = (s.id === 'design' && LOCKED_DESIGN[r] && !ChipCamp.day2());
      a.className = 'fstep' + (s.id === current ? ' cur' : '') + (doneFor(s.id, r, p) ? ' done' : '') + (locked ? ' lock' : '');
      a.href = s.href;
      a.innerHTML = '<i>' + (doneFor(s.id, r, p) && s.id !== current ? '\u2713' : (i + 1)) + '</i>' + s.label + (locked ? ' <small>Day 2</small>' : '') + (s.id === 'pro' && !ChipCamp.proUnlocked() ? ' <small>\ud83d\udd12</small>' : '');
      if (s.id === current) a.setAttribute('aria-current', 'step');
      nav.appendChild(a);
    });
  }
  root.CampFlow = { render, STEPS };
})(typeof self !== 'undefined' ? self : this);
