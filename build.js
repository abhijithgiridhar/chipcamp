// node build.js  ->  one offline HTML file per page (open index.html; the others are linked from it)
const fs = require('fs');
const path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(__dirname, p));
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

const templates = {};
['peeko', 'chipbot', 'jarvis'].forEach((id) => { templates[id] = R('firmware/' + id + '.base.ino'); });

const FONTS = {
  hub: '@import url("https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&display=swap");\n',
  tool: '@import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Nunito:wght@600;800;900&family=JetBrains+Mono:wght@400;700&display=swap");\n'
};

const pages = [
  { out: 'index.html', title: 'Micron Chip Camp', fonts: 'hub', css: ['hub.css'], body: 'hub.html', js: ['progress.js', 'hub.js'] },
  { out: 'blocks.html', title: 'Code Builder · Chip Camp', fonts: 'tool', css: ['shared.css', 'stage.css', 'blocks.css'], body: 'index.src.html', templates: true, js: ['progress.js', 'core.js', 'studiocore.js', 'runtime.js', 'stages.js', 'ui.js'] },
  { out: 'studio.html', title: 'Studio · Chip Camp', fonts: 'tool', css: ['shared.css', 'stage.css', 'studio.css'], body: 'studio.html', js: ['progress.js', 'core.js', 'studiocore.js', 'runtime.js', 'stages.js', 'studio.js'] },
  { out: 'brain.html', title: "Peeko's Brain · Chip Camp", fonts: 'tool', css: ['shared.css', 'stage.css', 'brain.css'], body: 'brain.html', js: ['progress.js', 'stages.js', 'braincore.js', 'brain.js'] },
  { out: 'logic.html', title: 'The CHIP Challenge · Chip Camp', fonts: 'tool', css: ['shared.css', 'logic.css'], body: 'logic.html', js: ['progress.js', 'logiccore.js', 'logic.js'] },
  { out: 'circuits.html', title: 'Circuit Lab · Chip Camp', fonts: 'tool', css: ['shared.css', 'lab.css'], body: 'lab.html', js: ['progress.js', 'labcore.js', 'lab.js'] }
];

pages.forEach((p) => {
  const need = ['src/' + p.body].concat(p.css.map((c) => 'src/' + c), p.js.map((j) => 'src/' + j));
  const missing = need.filter((f) => !exists(f));
  if (missing.length) { console.log('skip ' + p.out + ' (missing ' + missing.join(', ') + ')'); return; }
  const css = FONTS[p.fonts] + p.css.map((c) => R('src/' + c)).join('\n');
  const scripts = (p.templates ? '<script>var CAMP_TEMPLATES = ' + safe(JSON.stringify(templates)) + ';</script>\n' : '') +
    p.js.map((j) => '<script>\n' + safe(R('src/' + j)) + '\n</script>').join('\n');
  const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>' + p.title + '</title>\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + R('src/' + p.body) + '\n' + scripts + '\n</body>\n</html>\n';
  fs.writeFileSync(path.join(__dirname, p.out), html);
  console.log('built ' + p.out + ' (' + Math.round(html.length / 1024) + ' KB)');
});

// ---- Facilitator area: the session plans, encrypted with the password so the public site never holds them in plain text.
// The password comes from the PLANS_PIN environment variable or a local .plans-pin file (never committed).
(function buildPlans() {
  const crypto = require('crypto');
  const md = require('./tools/md.js');
  const dir = path.join(__dirname, 'session-plan');
  let pin = process.env.PLANS_PIN || '';
  if (!pin && exists('.plans-pin')) pin = R('.plans-pin').trim();
  if (!exists('session-plan') || !pin) { console.log('skip plans.html (needs session-plan/ and PLANS_PIN or .plans-pin)'); return; }
  const files = fs.readdirSync(dir).filter((f) => /\.md$/.test(f)).sort();
  const docs = files.map((f) => {
    const src = fs.readFileSync(path.join(dir, f), 'utf8');
    const title = (src.match(/^#\s+(.+)$/m) || [null, f])[1].replace(/^Room \d+:\s*/, '');
    return { id: f.replace(/\.md$/, ''), title, html: md.render(src) };
  });
  const salt = crypto.randomBytes(16), iv = crypto.randomBytes(12), ITER = 250000;
  const key = crypto.pbkdf2Sync(pin, salt, ITER, 32, 'sha256');
  const c = crypto.createCipheriv('aes-256-gcm', key, iv);
  const enc = Buffer.concat([c.update(JSON.stringify(docs), 'utf8'), c.final(), c.getAuthTag()]);   // WebCrypto expects the tag at the end
  const payload = { s: salt.toString('base64'), i: iv.toString('base64'), n: ITER, c: enc.toString('base64') };
  const css = FONTS.tool + R('src/shared.css') + '\n' + R('src/plans.css');
  const html = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<meta name="robots" content="noindex,nofollow">\n<title>Facilitators · Chip Camp</title>\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + R('src/plans.html') +
    '\n<script>window.PLANS_PAYLOAD = ' + JSON.stringify(payload) + ';</script>\n<script>\n' + safe(R('src/progress.js')) + '\n</script>\n<script>\n' + safe(R('src/plans.js')) + '\n</script>\n</body>\n</html>\n';
  fs.writeFileSync(path.join(__dirname, 'plans.html'), html);
  console.log('built plans.html (' + Math.round(html.length / 1024) + ' KB, ' + docs.length + ' documents, encrypted)');
})();
