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
  // Chip Bot answers to the numbers 1 to 4 (the same ones you can type in the Serial Monitor)
  const CHIPBOT_REACTIONS = [
    ['1', '⚙️ move servo 1 (left hip)'], ['2', '⚙️ move servo 2 (right hip)'], ['3', '⚙️ move servo 3 (left foot)'], ['4', '⚙️ move servo 4 (right foot)'], ['nothing', '🚫 do nothing']
  ];
  const SETS = { peeko: REACTIONS, chipbot: CHIPBOT_REACTIONS };
  const idsOf = (robot) => (SETS[robot] || REACTIONS).map((r) => r[0]);
  const IDS = idsOf('peeko');
  const MODEL_URL = /^https:\/\/teachablemachine\.withgoogle\.com\/models\/([A-Za-z0-9_-]+)\/?$/;

  function modelBase(link) {
    const m = String(link || '').trim().match(MODEL_URL);
    return m ? 'https://teachablemachine.withgoogle.com/models/' + m[1] + '/' : null;
  }
  function cleanMapping(labels, mapping, robot) {
    const out = {}, ids = idsOf(robot);
    labels.forEach((l) => { out[l] = mapping && ids.indexOf(mapping[l]) >= 0 ? mapping[l] : 'nothing'; });
    return out;
  }

  // A colour card held up to the camera: red, yellow, green or blue (or null when it is not a clear colour).
  function classifyColour(r, g, b) {
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
    const v = mx / 255, s = mx === 0 ? 0 : d / mx;
    if (v < 0.22 || s < 0.38) return null;
    let h = 0;
    if (mx === r) h = ((g - b) / d) % 6; else if (mx === g) h = (b - r) / d + 2; else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
    if (h < 15 || h >= 335) return 'red';
    if (h >= 40 && h < 72) return 'yellow';
    if (h >= 85 && h < 165) return 'green';
    if (h >= 190 && h < 265) return 'blue';
    return null;
  }
  const COLOURS = ['red', 'yellow', 'green', 'blue'];
  // the average colour of the pixels in the middle of the picture that are clearly coloured
  function dominantColour(rgba, w, h) {
    const x0 = Math.floor(w * 0.3), x1 = Math.floor(w * 0.7), y0 = Math.floor(h * 0.3), y1 = Math.floor(h * 0.7), votes = { red: 0, yellow: 0, green: 0, blue: 0 };
    let n = 0;
    for (let y = y0; y < y1; y += 2) for (let x = x0; x < x1; x += 2) {
      const i = (y * w + x) * 4, c = classifyColour(rgba[i], rgba[i + 1], rgba[i + 2]); n++;
      if (c) votes[c]++;
    }
    let best = null, bv = 0; COLOURS.forEach((c) => { if (votes[c] > bv) { bv = votes[c]; best = c; } });
    return { colour: bv / Math.max(1, n) >= 0.3 ? best : null, share: bv / Math.max(1, n) };
  }
  function newState() { return { candidate: null, count: 0, current: null, lastTime: -1e9, lastSent: -1e9 }; }

  // preds: [{className, probability}]. Returns a command to send, or null.
  // A class has to win a few frames in a row, so one blurry frame doesn't trigger Peeko.
  function decide(preds, mapping, opts, st, now) {
    const o = Object.assign({ threshold: 0.85, frames: 3, repeatMs: 6000, gapMs: 1800, robot: 'peeko' }, opts), ids = idsOf(o.robot);
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
    if (!react || react === 'nothing' || ids.indexOf(react) < 0) return null;
    st.lastSent = now;
    return react;
  }

  return { REACTIONS, CHIPBOT_REACTIONS, COLOURS, modelBase, cleanMapping, newState, decide, classifyColour, dominantColour };
});
