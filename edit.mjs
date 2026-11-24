// Edit your site's text in the browser.
//
//   node edit.mjs          then open http://localhost:4190/edit
//
// Click any text, type, and press Save. Saving rewrites the words in index.html and keeps
// the previous version as index.backup.html. Only this computer can reach this server, and
// none of the editor is part of the published page. Needs Node 18 or newer, no packages.
import { createServer } from 'node:http';
import { readFile, writeFile, copyFile, stat } from 'node:fs/promises';
import { dirname, extname, join, normalize, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || Number(process.argv[2]) || 4190;
const PAGE = join(ROOT, 'index.html');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.svg': 'image/svg+xml', '.pdf': 'application/pdf' };
const HOSTS = new Set([`localhost:${PORT}`, `127.0.0.1:${PORT}`]);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const tidy = (s) => String(s).replace(/\s+/g, ' ').trim();

/** Replaces the text inside elements marked data-edit="key". Every editable element holds text only. */
function applyEdits(html, edits) {
  const missing = [];
  for (const [key, value] of Object.entries(edits)) {
    if (!/^[\w.-]+$/.test(key)) { missing.push(key); continue; }
    const re = new RegExp(`(<[a-z0-9]+ data-edit="${key.replace(/\./g, '\\.')}"[^>]*>)[^<]*(</)`);
    if (!re.test(html)) { missing.push(key); continue; }
    html = html.replace(re, (_, open, close) => open + esc(tidy(value)) + close);
  }
  return { html, missing };
}

const EDITOR = `
<style>
  .editing [data-edit] { outline: 1px dashed rgb(216 173 107 / .55); outline-offset: 2px; cursor: text; min-width: 1ch; }
  .editing [data-edit]:hover { outline-color: #d8ad6b; }
  .editing [data-edit]:focus { outline: 2px solid #d8ad6b; background: rgb(216 173 107 / .14); }
  .editing [data-edit].changed { outline: 2px solid #8fc27a; }
  .editing dialog { display: block; position: static; width: 100%; max-height: none; margin: 1rem 0; }
  .editing .role-view[hidden] { display: block !important; margin-top: 1rem; }
  .editing .roles input { pointer-events: none; }
  .editing .card { transform: none !important; cursor: default; }
  .editing .tools { grid-template-columns: repeat(auto-fill, minmax(7.5rem, 1fr)); gap: 1rem; }
  .editing .icon { width: auto; min-width: 7rem; height: auto; padding: .6rem; background: none; color: #d8ad6b; }
  .editing .tip { position: static !important; transform: none !important; opacity: 1; pointer-events: auto; margin-top: .4rem; }
  #edit-bar { position: fixed; z-index: 99; top: 0; left: 0; right: 0; display: flex; flex-wrap: wrap; align-items: center; justify-content: center; gap: .5rem 1rem; padding: .6rem 1rem; background: #d8ad6b; color: #17110c; font: 500 15px/1.4 "Segoe UI", Arial, sans-serif; }
  #edit-bar button { padding: .4rem 1.1rem; border: 0; border-radius: 99px; background: #17110c; color: #fff; font: inherit; cursor: pointer; }
  #edit-bar button.plain { background: none; color: inherit; text-decoration: underline; }
  #edit-bar button:disabled { opacity: .45; cursor: default; }
  .editing body { padding-top: 3.25rem; }
</style>
<div id="edit-bar" role="region" aria-label="Editing"><span id="edit-status" role="status">Click any text to change it.</span><button id="edit-save" disabled>Save</button><button id="edit-undo" class="plain" disabled>Undo all</button><button id="edit-view" class="plain">View site</button></div>
<script>
(() => {
  document.documentElement.classList.add('editing');
  const fields = [...document.querySelectorAll('[data-edit]')];
  const tidy = (s) => s.replace(/\\s+/g, ' ').trim();
  const start = new Map(fields.map((f) => [f, tidy(f.textContent)]));
  const status = document.getElementById('edit-status'), save = document.getElementById('edit-save'), undo = document.getElementById('edit-undo');
  const changed = () => fields.filter((f) => tidy(f.textContent) !== start.get(f));
  function refresh() {
    const n = changed().length;
    fields.forEach((f) => f.classList.toggle('changed', tidy(f.textContent) !== start.get(f)));
    save.disabled = undo.disabled = n === 0;
    status.textContent = n ? n + (n === 1 ? ' change' : ' changes') + ' not saved yet.' : 'Click any text to change it.';
  }
  document.querySelectorAll('details').forEach((d) => { d.open = true; });
  for (const f of fields) {
    f.contentEditable = 'plaintext-only';
    if (f.contentEditable !== 'plaintext-only') f.contentEditable = 'true';
    f.spellcheck = true;
    f.addEventListener('input', refresh);
    f.addEventListener('keydown', (e) => {
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); f.blur(); }
      if (e.key === 'Escape') { f.textContent = start.get(f); f.blur(); refresh(); }
      if (e.key === ' ' && f.closest('button, summary')) { e.preventDefault(); document.execCommand('insertText', false, ' '); }
    });
    f.addEventListener('keyup', (e) => { if (e.key === ' ') e.preventDefault(); });
    f.addEventListener('paste', (e) => { e.preventDefault(); document.execCommand('insertText', false, tidy(e.clipboardData.getData('text/plain'))); });
  }
  addEventListener('click', (e) => {
    if (e.target.closest('#edit-bar')) return;
    if (e.target.closest('a, button, summary, label')) { e.preventDefault(); e.stopPropagation(); e.target.closest('[data-edit]')?.focus(); }
  }, true);
  addEventListener('submit', (e) => e.preventDefault(), true);
  undo.onclick = () => { for (const f of changed()) f.textContent = start.get(f); refresh(); };
  async function doSave() {
    const list = changed();
    if (!list.length) return;
    if (list.some((f) => !tidy(f.textContent))) { status.textContent = 'A text is empty. Type something, or press Undo all.'; return; }
    save.disabled = true; status.textContent = 'Saving...';
    try {
      const res = await fetch('/__save', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(Object.fromEntries(list.map((f) => [f.dataset.edit, tidy(f.textContent)]))) });
      const out = await res.json();
      if (!res.ok) throw new Error(out.error || res.status);
      for (const f of list) start.set(f, tidy(f.textContent));
      refresh(); status.textContent = 'Saved ' + out.saved + (out.saved === 1 ? ' change' : ' changes') + ' to index.html.';
    } catch (err) { refresh(); status.textContent = 'Could not save: ' + err.message + '. Check that edit.mjs is still running.'; }
  }
  save.onclick = doSave;
  addEventListener('keydown', (e) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); doSave(); } }, true);
  document.getElementById('edit-view').onclick = () => { location.href = '/'; };
  addEventListener('beforeunload', (e) => { if (changed().length) e.preventDefault(); });
})();
</script>
`;

const send = (res, code, type, body) => { res.writeHead(code, { 'content-type': type, 'cache-control': 'no-store' }); res.end(body); };
const json = (res, code, data) => send(res, code, 'application/json', JSON.stringify(data));

createServer(async (req, res) => {
  try {
    if (!HOSTS.has(req.headers.host)) return send(res, 403, 'text/plain', 'Local use only');
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);

    if (req.method === 'POST' && path === '/__save') {
      const origin = req.headers.origin;
      if (!origin || !HOSTS.has(new URL(origin).host) || !(req.headers['content-type'] || '').startsWith('application/json')) return json(res, 403, { error: 'Not allowed' });
      let body = '';
      for await (const chunk of req) { body += chunk; if (body.length > 200_000) return json(res, 413, { error: 'Too much text' }); }
      const edits = JSON.parse(body);
      if (!edits || typeof edits !== 'object' || Array.isArray(edits) || Object.values(edits).some((v) => typeof v !== 'string' || !tidy(v))) return json(res, 400, { error: 'Every text needs some words' });
      const { html, missing } = applyEdits(await readFile(PAGE, 'utf8'), edits);
      if (missing.length) return json(res, 400, { error: 'Not found on the page: ' + missing.join(', ') });
      await copyFile(PAGE, join(ROOT, 'index.backup.html'));
      await writeFile(PAGE, html);
      return json(res, 200, { saved: Object.keys(edits).length });
    }
    if (req.method !== 'GET' && req.method !== 'HEAD') return send(res, 405, 'text/plain', 'Not allowed');
    if (path === '/edit/') { res.writeHead(301, { location: '/edit' }); return res.end(); }
    if (path === '/edit') return send(res, 200, TYPES['.html'], (await readFile(PAGE, 'utf8')).replace('</body>', () => EDITOR + '</body>'));

    let file = normalize(join(ROOT, path));
    if (file !== ROOT && !file.startsWith(ROOT + sep)) return send(res, 403, 'text/plain', 'Not allowed');
    if ((await stat(file)).isDirectory()) {
      if (!path.endsWith('/')) { res.writeHead(301, { location: path + '/' }); return res.end(); }
      file = join(file, 'index.html');
    }
    send(res, 200, TYPES[extname(file)] || 'application/octet-stream', await readFile(file));
  } catch (err) {
    if (err.code === 'ENOENT') return send(res, 404, 'text/plain', 'Not found');
    json(res, 500, { error: 'Something went wrong on this server' });
  }
}).listen(PORT, '127.0.0.1', () => console.log(`View your site:  http://localhost:${PORT}/\nEdit the text:   http://localhost:${PORT}/edit`));
