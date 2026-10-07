// node build.js  ->  index.html (one offline file) + artifact.html (same page for claude.ai artifacts)
const fs = require('fs');
const path = require('path');
const R = (p) => fs.readFileSync(path.join(__dirname, p), 'utf8');

const templates = {};
['peeko', 'chipbot', 'jarvis'].forEach((id) => { templates[id] = R('firmware/' + id + '.base.ino'); });
const safe = (s) => s.replace(/<\/script/gi, '<\\/script');

const fonts = '@import url("https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600&family=Nunito:wght@600;800;900&family=JetBrains+Mono:wght@400;700&display=swap");\n';
const css = fonts + R('src/ui.css');
const body = R('src/index.src.html');
const scripts =
  '<script>var CAMP_TEMPLATES = ' + safe(JSON.stringify(templates)) + ';</script>\n' +
  ['src/core.js', 'src/runtime.js', 'src/stages.js', 'src/ui.js'].map((f) => '<script>\n' + safe(R(f)) + '\n</script>').join('\n');

const full = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n<title>Camp Blocks</title>\n<style>\n' + css + '\n</style>\n</head>\n<body>\n' + body + '\n' + scripts + '\n</body>\n</html>\n';
fs.writeFileSync(path.join(__dirname, 'index.html'), full);

const frag = '<title>Camp Blocks</title>\n<style>\n' + css + '\n</style>\n' + body + '\n' + scripts + '\n';
fs.writeFileSync(path.join(__dirname, 'artifact.html'), frag);
console.log('built index.html (' + Math.round(full.length / 1024) + ' KB) and artifact.html');
