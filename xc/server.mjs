#!/usr/bin/env node
/**
 * server.mjs — Local admin server + one-click GitHub Pages deploy.
 *
 * Usage:  node server.mjs
 *         node server.mjs --port 3000
 *
 * Admin:  http://localhost:8787/admin/
 * Site:   http://localhost:8787/
 */

import { createServer } from 'node:http';
import { readFile, writeFile, readdir, stat, unlink, rename } from 'node:fs/promises';
import { join, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT       = __dirname;
const RESOURCES  = join(ROOT, 'resources');
const PORT       = parseInt(process.env.PORT || process.argv.find((_,i,a) => a[i-1] === '--port') || '8787', 10);

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.js':   'application/javascript; charset=utf-8',
  '.mjs':  'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.svg':  'image/svg+xml',
  '.ico':  'image/x-icon',
  '.woff2':'font/woff2',
  '.woff': 'font/woff',
};

// ── Helpers ────────────────────────────────
async function sendJson(res, data, status = 200) {
  const body = JSON.stringify(data, null, 2);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(body);
}

async function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data',  c => { body += c; if (body.length > 1_000_000) reject(new Error('too large')); });
    req.on('end',   () => resolve(body));
    req.on('error', reject);
  });
}

async function runBuild() {
  try {
    const { stdout, stderr } = await runCmd('node', [join(ROOT, 'scripts', 'build-data.js')]);
    if (stderr) console.warn('[build] stderr:', stderr);
    console.log('[build]', stdout.trim());
    return true;
  } catch (e) {
    console.error('[build] error:', e.message);
    return false;
  }
}

function runCmd(cmd, args = [], cwd = ROOT) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { cwd, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => stdout += d);
    child.stderr.on('data', d => stderr += d);
    child.on('close', code => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(stderr || `exit ${code}`));
    });
    child.on('error', reject);
  });
}

// ── Resource CRUD ──────────────────────────
async function listResources() {
  try {
    const files = (await readdir(RESOURCES))
      .filter(f => f.endsWith('.json'))
      .sort();
    const items = [];
    for (const file of files) {
      try {
        const raw  = await readFile(join(RESOURCES, file), 'utf8');
        const data = JSON.parse(raw);
        items.push({ file, ...data });
      } catch { /* skip malformed */ }
    }
    return items;
  } catch { return []; }
}

async function saveResource(file, data) {
  const filePath = join(RESOURCES, file);
  await writeFile(filePath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  await runBuild();
}

function slugify(text) {
  return text
    .toString().toLowerCase().trim()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .substring(0, 60) || 'untitled';
}

// ── Static file server ─────────────────────
async function serveStatic(res, urlPath) {
  let filePath = join(ROOT, urlPath === '/' ? 'index.html' : urlPath);

  // Security: prevent directory traversal
  if (!filePath.startsWith(ROOT)) {
    res.writeHead(403); res.end('Forbidden'); return;
  }

  try {
    const s = await stat(filePath);
    if (s.isDirectory()) filePath = join(filePath, 'index.html');
    const ext = extname(filePath).toLowerCase();
    const data = await readFile(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': 'no-cache',
    });
    res.end(data);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
  }
}

// ── Deploy (git push) ───────────────────────
async function handleDeploy(req, res) {
  // Check git status first
  try {
    execSync('git status --porcelain', { cwd: ROOT, stdio: 'pipe' });
  } catch {
    return sendJson(res, { ok: false, error: 'Not a git repository. Run "git init" and set remote first.' }, 400);
  }

  const body = await readBody(req);
  let message = 'Update resources';
  try { const d = JSON.parse(body); if (d.message) message = d.message; } catch {}

  const steps = [];

  try {
    // git add .
    steps.push('git add .');
    execSync('git add .', { cwd: ROOT, stdio: 'pipe' });

    // git commit
    steps.push(`git commit -m "${message}"`);
    try {
      execSync(`git commit -m "${message}"`, { cwd: ROOT, stdio: 'pipe' });
    } catch (e) {
      const msg = e.stderr?.toString() || e.message || '';
      if (!msg.includes('nothing to commit') && !msg.includes('no changes added')) {
        throw new Error(msg);
      }
      // No changes — still try push in case there's a previous unpushed commit
      steps.push('(nothing to commit)');
    }

    // Get current branch
    const branch = execSync('git branch --show-current', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
    steps.push(`git push origin ${branch}`);

    execSync(`git push origin ${branch}`, { cwd: ROOT, stdio: 'pipe' });
    steps.push('push OK');

    sendJson(res, { ok: true, steps, message });
  } catch (e) {
    const errMsg = e.stderr?.toString() || e.message || 'Push failed';
    steps.push(`ERROR: ${errMsg}`);
    sendJson(res, { ok: false, error: errMsg, steps }, 500);
  }
}

// ── Git info ────────────────────────────────
function getGitInfo() {
  try {
    const remote = execSync('git remote get-url origin', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
    const branch = execSync('git branch --show-current', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
    const status = execSync('git status --porcelain', { cwd: ROOT, stdio: 'pipe' }).toString().trim();
    const hasChanges = status.length > 0;
    return { remote, branch, hasChanges, status };
  } catch { return null; }
}

// ── Router ─────────────────────────────────
async function handle(req, res) {
  const url      = new URL(req.url, `http://localhost:${PORT}`);
  const pathname = url.pathname;
  const method   = req.method;

  try {
    // ── API Routes ──

    // GET /api/resources — list all
    if (pathname === '/api/resources' && method === 'GET') {
      const items = await listResources();
      return sendJson(res, items);
    }

    // POST /api/resources — create
    if (pathname === '/api/resources' && method === 'POST') {
      const body  = await readBody(req);
      const data  = JSON.parse(body);
      const base  = slugify(data.title_en || data.title_zh || data.title || 'new');
      let file = `${base}.json`;
      let i = 1;
      while (existsSync(join(RESOURCES, file))) file = `${base}-${i++}.json`;
      // Generate a numeric prefix to match existing naming
      const files = (await readdir(RESOURCES)).filter(f => f.endsWith('.json'));
      const maxN  = files.reduce((m, f) => { const n = parseInt(f); return n > m ? n : m; }, 0);
      file = `${String(maxN + 1).padStart(2, '0')}-${base}.json`;
      await saveResource(file, data);
      return sendJson(res, { ok: true, file }, 201);
    }

    // PUT /api/resources/:file — update
    if (method === 'PUT' && pathname.startsWith('/api/resources/')) {
      const file = pathname.replace('/api/resources/', '');
      if (!file || file.includes('..')) return sendJson(res, { error: 'Invalid file' }, 400);
      const body = await readBody(req);
      const data = JSON.parse(body);
      await saveResource(file, data);
      return sendJson(res, { ok: true });
    }

    // DELETE /api/resources/:file — delete
    if (method === 'DELETE' && pathname.startsWith('/api/resources/')) {
      const file = pathname.replace('/api/resources/', '');
      if (!file || file.includes('..')) return sendJson(res, { error: 'Invalid file' }, 400);
      await unlink(join(RESOURCES, file));
      await runBuild();
      return sendJson(res, { ok: true });
    }

    // POST /api/reorder — reorder resources (rename with numeric prefixes)
    if (pathname === '/api/reorder' && method === 'POST') {
      const body  = await readBody(req);
      const { order } = JSON.parse(body); // array of filenames in new order
      if (!Array.isArray(order)) return sendJson(res, { error: 'order must be array' }, 400);
      // Step 1: rename all to tmp
      const tmpFiles = [];
      for (let i = 0; i < order.length; i++) {
        const tmp = `.tmp-${i}-${order[i]}`;
        await rename(join(RESOURCES, order[i]), join(RESOURCES, tmp));
        tmpFiles.push({ tmp, orig: order[i], idx: i });
      }
      // Step 2: rename to final names
      for (const { tmp, idx } of tmpFiles) {
        const suffix = tmp.replace(/^\.tmp-\d+-/, '');
        const final = `${String(idx + 1).padStart(2, '0')}-${suffix}`;
        await rename(join(RESOURCES, tmp), join(RESOURCES, final));
      }
      await runBuild();
      return sendJson(res, { ok: true });
    }

    // POST /api/deploy — git push to deploy
    if (pathname === '/api/deploy' && method === 'POST') {
      return handleDeploy(req, res);
    }

    // GET /api/git-info — git status
    if (pathname === '/api/git-info' && method === 'GET') {
      return sendJson(res, getGitInfo());
    }

    // ── Static files ──
    return serveStatic(res, pathname);

  } catch (e) {
    console.error('[error]', e);
    sendJson(res, { error: e.message }, 500);
  }
}

// ── Start ───────────────────────────────────
const server = createServer(handle);
server.listen(PORT, () => {
  console.log('');
  console.log('  ✦ Resource Hub — Local Admin');
  console.log(`  ├─ Site:   http://localhost:${PORT}/`);
  console.log(`  └─ Admin:  http://localhost:${PORT}/admin/panel.html`);
  console.log('');
});
