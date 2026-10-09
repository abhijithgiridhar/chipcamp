// node tests/brain_tests.js
const B = require('../src/braincore.js');
let pass = 0, fail = 0;
const ok = (c, m) => { if (c) pass++; else { fail++; console.log('FAIL:', m); } };
const P = (a, b, c) => [{ className: 'Happy', probability: a }, { className: 'Sad', probability: b }, { className: 'Nobody', probability: c }];
const map = { Happy: 'happy', Sad: 'sad', Nobody: 'nothing' };

// only links from Teachable Machine are accepted
ok(B.modelBase('https://teachablemachine.withgoogle.com/models/AbC_123-x/') === 'https://teachablemachine.withgoogle.com/models/AbC_123-x/', 'good link');
ok(B.modelBase('  https://teachablemachine.withgoogle.com/models/AbC123  ') === 'https://teachablemachine.withgoogle.com/models/AbC123/', 'link without slash');
['http://teachablemachine.withgoogle.com/models/x/', 'https://evil.com/models/x/', 'https://teachablemachine.withgoogle.com.evil.com/models/x/', 'https://teachablemachine.withgoogle.com/models/x/y/', '', null, 'javascript:alert(1)'].forEach((l) => ok(B.modelBase(l) === null, 'rejects ' + l));

// mapping is rebuilt from the labels and only keeps real reactions
const cm = B.cleanMapping(['A', 'B', 'C'], { A: 'happy', B: 'launch_missiles', Z: 'sad' });
ok(cm.A === 'happy' && cm.B === 'nothing' && cm.C === 'nothing' && !('Z' in cm), 'cleanMapping');

// three frames in a row are needed
let st = B.newState(), t = 0;
ok(B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100) === null, 'frame 1 does nothing');
ok(B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100) === null, 'frame 2 does nothing');
ok(B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100) === 'happy', 'frame 3 sends happy');
// holding the same face does not spam
for (let i = 0; i < 20; i++) ok(B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100) === null, 'no spam while holding (' + i + ')');
// ... but it repeats after the repeat time
t += 6000;
ok(B.decide(P(0.95, 0.03, 0.02), map, {}, st, t) === 'happy', 'repeats after 6 seconds');
// a different face after the gap
t += 2000;
B.decide(P(0.02, 0.95, 0.03), map, {}, st, t += 100); B.decide(P(0.02, 0.95, 0.03), map, {}, st, t += 100);
ok(B.decide(P(0.02, 0.95, 0.03), map, {}, st, t += 100) === 'sad', 'sad after three frames');
// not sure enough: nothing
st = B.newState();
for (let i = 0; i < 6; i++) ok(B.decide(P(0.5, 0.3, 0.2), map, {}, st, t += 100) === null, 'low confidence sends nothing');
// a flicker resets the count
st = B.newState();
B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100); B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100);
B.decide(P(0.4, 0.4, 0.2), map, {}, st, t += 100);
ok(B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100) === null, 'a flicker resets the count');
// "do nothing" and unmapped classes send nothing
st = B.newState();
for (let i = 0; i < 5; i++) ok(B.decide(P(0.02, 0.03, 0.95), map, {}, st, t += 100) === null, 'nobody maps to nothing');
st = B.newState();
for (let i = 0; i < 5; i++) ok(B.decide(P(0.95, 0.03, 0.02), {}, {}, st, t += 100) === null, 'unmapped class sends nothing');
// two quick changes: the second waits for the gap so Peeko can finish
st = B.newState(); t = 100000;
for (let i = 0; i < 3; i++) B.decide(P(0.95, 0.03, 0.02), map, {}, st, t += 100);
let early = null;
for (let i = 0; i < 3; i++) early = B.decide(P(0.02, 0.95, 0.03), map, {}, st, t += 100) || early;
ok(early === null, 'a change right after a send waits for the gap');
ok(B.decide(P(0.02, 0.95, 0.03), map, {}, st, t += 2000) === 'sad', '... then goes through');
// bad input never throws
ok(B.decide(null, map, {}, B.newState(), 0) === null && B.decide([], null, null, B.newState(), 0) === null, 'bad input is safe');
// every reaction is something Peeko's sketch understands
const fs = require('fs');
const ino = fs.readFileSync(__dirname + '/../firmware/peeko.base.ino', 'utf8');
B.REACTIONS.filter((r) => r[0] !== 'nothing').forEach((r) => ok(ino.includes('cmd == "' + r[0] + '"'), 'Peeko sketch does not understand ' + r[0]));
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
