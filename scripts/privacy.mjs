// Renders store/privacy-policy.md into site/privacy.html (published on GitHub Pages).
//
//   npm run privacy

import fs from 'node:fs';

const md = fs.readFileSync('store/privacy-policy.md', 'utf8');
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/`(.+?)`/g, '<code>$1</code>');

let html = '';
let list = false;
for (const line of md.split(/\r?\n/)) {
  if (line.startsWith('- ')) {
    if (!list) html += '<ul>';
    list = true;
    html += `<li>${inline(line.slice(2))}</li>`;
    continue;
  }
  if (list) html += '</ul>';
  list = false;
  if (!line.trim()) continue;
  const h = line.match(/^(#{1,3}) (.*)/);
  html += h ? `<h${h[1].length}>${inline(h[2])}</h${h[1].length}>` : `<p>${inline(line)}</p>`;
}
if (list) html += '</ul>';

const page = `<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Baku — privacy policy</title>
<link rel="icon" href="icon.png">
<meta name="theme-color" content="#f4f5f7" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#111214" media="(prefers-color-scheme: dark)">
<style>
:root { --bg: #f4f5f7; --surface: #fff; --text: #0e0f11; --muted: #737880; --accent: #0d7d68; color-scheme: light dark; }
@media (prefers-color-scheme: dark) { :root { --bg: #111214; --surface: #17181b; --text: #f1f2f4; --muted: #8d939b; --accent: #34d1a8; } }
body { margin: 0; background: var(--bg); color: var(--text); font: 16px/1.6 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif; }
main { max-width: 720px; margin: 0 auto; padding: 40px 16px 64px; }
article { background: var(--surface); border-radius: 16px; padding: 28px 28px 20px; }
h1 { margin: 0 0 4px; font-size: 26px; line-height: 1.25; }
h2 { margin: 36px 0 8px; font-size: 21px; color: var(--accent); }
h3 { margin: 22px 0 6px; font-size: 17px; }
p, li { margin: 0 0 10px; }
ul { padding-left: 20px; margin: 0 0 10px; }
em { color: var(--muted); font-style: normal; font-size: 14px; }
code { font-size: 14px; padding: 1px 5px; border-radius: 5px; background: color-mix(in srgb, var(--text) 8%, transparent); }
</style>
</head>
<body><main><article>
${html}
</article></main></body>
</html>
`;
fs.mkdirSync('site', { recursive: true });
fs.writeFileSync('site/privacy.html', page);
console.log('site/privacy.html');
