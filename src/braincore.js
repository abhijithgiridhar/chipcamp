/* Peeko's Brain: turns what the Teachable Machine model sees into a Peeko command. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.CampBrain = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';
  // the words Peeko's sketch already understands over USB
  const REACTIONS = [
    ['happy', '😊 happy'], ['sad', '😢 sad'], ['surprised', '😲 surprised'], ['angry', '😠 angry'], ['sleepy', '😴 sleepy'],
    ['celebrate', '🎉 celebrate'], ['neutral', '😐 neutral'], ['left', '⬅️ look left'], ['right', '➡️ look right'], ['nothing', '🚫 do nothing']
  ];
  const IDS = REACTIONS.map((r) => r[0]);
  const MODEL_URL = /^https:\/\/teachablemachine\.withgoogle\.com\/models\/([A-Za-z0-9_-]+)\/?$/;

  function modelBase(link) {
    const m = String(link || '').trim().match(MODEL_URL);
    return m ? 'https://teachablemachine.withgoogle.com/models/' + m[1] + '/' : null;
  }
  function cleanMapping(labels, mapping) {
    const out = {};
    labels.forEach((l) => { out[l] = mapping && IDS.indexOf(mapping[l]) >= 0 ? mapping[l] : 'nothing'; });
    return out;
  }
  function newState() { return { candidate: null, count: 0, current: null, lastTime: -1e9, lastSent: -1e9 }; }

  // preds: [{className, probability}]. Returns a command to send, or null.
  // A class has to win a few frames in a row, so one blurry frame doesn't trigger Peeko.
  function decide(preds, mapping, opts, st, now) {
    const o = Object.assign({ threshold: 0.85, frames: 3, repeatMs: 6000, gapMs: 1800 }, opts);
    let top = null;
    (preds || []).forEach((p) => { if (!top || p.probability > top.probability) top = p; });
    if (!top || top.probability < o.threshold) { st.candidate = null; st.count = 0; st.current = null; return null; }
    if (top.className === st.candidate) st.count++; else { st.candidate = top.className; st.count = 1; }
    if (st.count < o.frames) return null;
    const changed = st.current !== top.className, due = now - st.lastTime >= o.repeatMs;
    if (!changed && !due) return null;
    if (now - st.lastSent < o.gapMs) return null;
    st.current = top.className; st.lastTime = now;
    const react = mapping && mapping[top.className];
    if (!react || react === 'nothing' || IDS.indexOf(react) < 0) return null;
    st.lastSent = now;
    return react;
  }

  return { REACTIONS, modelBase, cleanMapping, newState, decide };
});
