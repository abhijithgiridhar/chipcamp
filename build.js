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
  { out: 'blocks.html', title: 'Code Builder · Chip Camp', fonts: 'tool', css: ['shared.css', 'blocks.css'], body: 'index.src.html', templates: true, js: ['progress.js', 'core.js', 'runtime.js', 'stages.js', 'ui.js'] },
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
