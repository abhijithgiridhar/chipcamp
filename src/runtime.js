/* Camp Blocks runtime: runs the block tree against a "stage" (the on-screen robot) so students can
   watch their logic before flashing. No DOM here, so Node can test it with a mock stage. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory(require('./core.js'));
  else root.CampRuntime = factory(root.CampCore);
})(typeof self !== 'undefined' ? self : this, function (Core) {
  'use strict';
  const STOP = { stop: true };

  // c = context: { stage, sleep(sec), sensors:{distance,soil,light}, names:{robot,builder}, settings, speedLevel }
  const COMMON = {
    wait: async (p, c) => { await c.sleep(p.secs); },
    note: async (p, c) => { c.stage.note(Core.noteHz(p.note), p.secs); await c.sleep(p.secs); },
    hello: async (p, c) => { c.stage.print("Hi! I'm " + c.names.robot + ', built by ' + c.names.builder); }
  };

  const RUN = {
    peeko: Object.assign({}, COMMON, {
      act: (p, c) => c.stage.react(p.face, c.sleep),
      look: (p, c) => c.stage.react(p.dir, c.sleep),
      say_name: (p, c) => c.stage.say(p.who === 'robot' ? c.names.robot : c.names.builder, p.secs, c.sleep),
      say_text: (p, c) => c.stage.say(p.words, p.secs, c.sleep),
      head: async (p, c) => { c.stage.head(p.deg); },
      cond_if_coin: (p) => (Math.random() < 0.5 ? 'heads' : 'tails') === p.side,
      cond_if_dice: (p) => { const r = 1 + Math.floor(Math.random() * 6); return p.cmp === 'more' ? r > p.n : p.cmp === 'less' ? r < p.n : r === p.n; }
    }),

    chipbot: Object.assign({}, COMMON, {
      walk: async (p, c) => {
        const T = c.stepSeconds();
        for (let i = 0; i < p.steps; i++) {
          c.stage.walk(p.dir, T);
          await c.sleep(T + (i === 0 ? 0.12 : 0));
          c.sensors.set('distance', p.dir === 'fwd' ? Math.max(3, c.sensors.distance - 3) : Math.min(50, c.sensors.distance + 3));
        }
        c.stage.idle();
      },
      turn: async (p, c) => {
        const T = c.stepSeconds();
        for (let i = 0; i < p.steps; i++) { c.stage.turn(p.dir, T); await c.sleep(T + (i === 0 ? 0.12 : 0)); }
        c.stage.idle();
        c.sensors.set('distance', p.steps >= 2 ? 50 : Math.min(50, c.sensors.distance + 15));
      },
      dance: async (p, c) => {
        const T = c.stepSeconds(), m = Number(p.move);
        const per = (m === 7 || m === 8) ? 2.9 : (m === 9 || m === 10) ? 0.9 + T * 0.8 + 0.5 : T;
        for (let i = 0; i < p.reps; i++) { c.stage.dance(m, per); await c.sleep(per); }
        c.stage.idle();
      },
      stand: async (p, c) => { c.stage.idle(); await c.sleep(0.5); },
      speed: async (p, c) => { c.speedLevel = Number(p.level); },
      cond_if_dist: (p, c) => (p.cmp === 'less' ? c.sensors.distance < p.cm : c.sensors.distance > p.cm)
    }),

    jarvis: Object.assign({}, COMMON, {
      light: async (p, c) => { c.stage.led(p.color); },
      print: async (p, c) => {
        const s = c.settings;
        const rawSoil = Math.round(s.soilDry + (s.soilWet - s.soilDry) * c.sensors.soil / 100);
        const rawLight = Math.round((s.lightHigh ? c.sensors.light : 100 - c.sensors.light) * 10.23);
        c.stage.print('Soil: ' + Math.round(c.sensors.soil) + '% (raw ' + rawSoil + ')   Light: ' + Math.round(c.sensors.light) + '% (raw ' + rawLight + ')');
      },
      cond_if_soil: (p, c) => (p.cmp === 'below' ? c.sensors.soil < p.pct : c.sensors.soil > p.pct),
      cond_if_light: (p, c) => (p.cmp === 'below' ? c.sensors.light < p.pct : c.sensors.light > p.pct)
    })
  };

  async function runList(projId, list, c) {
    const P = Core.PROJECTS[projId];
    for (const node of list || []) {
      if (c.stopped()) throw STOP;
      const def = P.blockMap[node.type];
      if (!def) continue;
      const p = Core.norm(def, node.p);
      c.onNode(node.id, true);
      try {
        if (def.type === 'repeat') {
          for (let t = 0; t < p.times; t++) { if (c.stopped()) throw STOP; await runList(projId, node.kids, c); }
        } else if (def.shape === 'c') {
          const yes = RUN[projId]['cond_' + def.type](p, c);
          if (yes) await runList(projId, node.kids, c);
          else if (node.els) await runList(projId, node.els, c);
        } else {
          const fn = RUN[projId][def.type];
          if (!fn) throw new Error('no runtime for block ' + projId + '/' + def.type);
          await fn(p, c);
        }
      } finally { c.onNode(node.id, false); }
    }
  }

  async function runProgram(projId, state, c) {
    try {
      c.stage.reset();
      await runList(projId, state.wake, c);
      for (;;) {
        await runList(projId, state.forever, c);
        await c.sleep(0.03);
      }
    } catch (e) {
      if (e !== STOP) throw e;
    }
  }

  return { RUN, runProgram, runList, STOP };
});
