/* Chip Camp: what each student has chosen and finished, shared by every page (kept in this browser only). */
(function (root) {
  'use strict';
  const KEY = 'chipcamp.v1';
  const ROBOTS = ['chipbot', 'peeko', 'jarvis'];
  function read() { try { return JSON.parse(localStorage.getItem(KEY)) || {}; } catch (e) { return {}; } }
  function write(d) { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) { /* private window: just don't remember */ } }
  function clean(s) { return String(s == null ? '' : s).replace(/[^A-Za-z0-9 .,!?'_-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16); }

  root.ChipCamp = {
    ROBOTS,
    get() {
      const d = read();
      return { name: clean(d.name), robot: ROBOTS.indexOf(d.robot) >= 0 ? d.robot : null, levels: d.levels || {}, circuits: d.circuits || {}, code: d.code || {} };
    },
    design(robot) { const d = read(); return (d.designs && d.designs[robot]) || null; },
    setDesign(robot, design) { if (ROBOTS.indexOf(robot) < 0) return; const d = read(); d.designs = d.designs || {}; d.designs[robot] = design; write(d); },
    robotOrDefault() { return this.get().robot || 'chipbot'; },
    setName(n) { const d = read(); d.name = clean(n); write(d); },
    setRobot(r) { if (ROBOTS.indexOf(r) < 0) return; const d = read(); d.robot = r; write(d); },
    levelDone(level, stars) { const d = read(); d.levels = d.levels || {}; d.levels[level] = Math.max(d.levels[level] || 0, stars || 1); write(d); },
    circuitDone(robot) { const d = read(); d.circuits = d.circuits || {}; d.circuits[robot] = true; write(d); },
    codeBlocks(robot, n) { const d = read(); d.code = d.code || {}; d.code[robot] = n; write(d); },
    levelsCompleted() { const l = this.get().levels; return Object.keys(l).filter((k) => l[k] > 0).length; }
  };
})(typeof self !== 'undefined' ? self : this);
