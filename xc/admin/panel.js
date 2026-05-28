/* ============================================
   管理面板 — 中文版
   ============================================ */

const $  = s => document.querySelector(s);
const $$ = s => [...document.querySelectorAll(s)];

let resources  = [];
let activeFile = null;

// ── 初始化 ────────────────────────────────
function init() {
  loadResources();
  bindEvents();
  loadGitInfo();
}

// ── 加载资源列表 ───────────────────────────
async function loadResources() {
  try {
    const res = await fetch('/api/resources');
    resources = await res.json();
    renderList(resources);
    const hash = location.hash.replace('#', '');
    if (hash) selectResource(hash);
  } catch (e) {
    showToast('加载资源失败：' + e.message, true);
  }
}

// ── 渲染侧边栏 ─────────────────────────────
function renderList(items) {
  const ul = $('#resourceList');
  if (!items.length) {
    ul.innerHTML = '<li style="padding:16px;color:#999;font-size:12px;">还没有资源，点击「+ 新建」添加</li>';
    return;
  }
  ul.innerHTML = items.map(r => `
    <li class="admin-list-item" data-file="${r.file}">
      <span class="admin-list-icon">${r.icon || '🔗'}</span>
      <span class="admin-list-title">${esc(r.title_zh || r.title_en || r.title || '（未命名）')}</span>
    </li>
  `).join('');
}

// ── 选中资源 ───────────────────────────────
function selectResource(file) {
  activeFile = file;
  $$('.admin-list-item').forEach(el => {
    el.classList.toggle('active', el.dataset.file === file);
  });
  const r = resources.find(x => x.file === file);
  if (!r) return;
  showForm(r);
}

function showForm(r) {
  $('#emptyState').hidden = true;
  const form = $('#editForm');
  form.hidden = false;

  form.elements['file'].value     = r.file || '';
  form.elements['title_en'].value = r.title_en  || '';
  form.elements['desc_en'].value  = r.desc_en   || '';
  form.elements['title_zh'].value = r.title_zh  || '';
  form.elements['desc_zh'].value  = r.desc_zh   || '';
  form.elements['url'].value      = r.url        || '';
  form.elements['category'].value = r.category   || 'tools';
  form.elements['icon'].value     = r.icon       || '';
  form.elements['tags_str'].value = Array.isArray(r.tags) ? r.tags.join(', ') : '';

  $('#btnDelete').hidden = !r.file;
}

function clearForm() {
  activeFile = null;
  $$('.admin-list-item').forEach(el => el.classList.remove('active'));
  const form = $('#editForm');
  form.hidden = false;
  $('#emptyState').hidden = true;
  form.reset();
  form.elements['file'].value = '';
  $('#btnDelete').hidden = true;
}

// ── 保存 ──────────────────────────────────
async function saveResource() {
  const form = $('#editForm');
  const file = form.elements['file'].value;

  const data = {
    title_en:  form.elements['title_en'].value.trim(),
    desc_en:   form.elements['desc_en'].value.trim(),
    title_zh:  form.elements['title_zh'].value.trim(),
    desc_zh:   form.elements['desc_zh'].value.trim(),
    url:       form.elements['url'].value.trim(),
    category:  form.elements['category'].value,
    icon:      form.elements['icon'].value || '🔗',
    tags:      form.elements['tags_str'].value.split(',').map(s => s.trim()).filter(Boolean),
    featured:  false,
  };

  try {
    let res;
    if (file) {
      res = await fetch(`/api/resources/${file}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
    } else {
      res = await fetch('/api/resources', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      const result = await res.json();
      if (result.file) {
        form.elements['file'].value = result.file;
        activeFile = result.file;
      }
    }

    if (!res.ok) throw new Error('保存失败');
    showToast('已保存 ✓');
    await loadResources();
    if (activeFile) {
      setTimeout(() => {
        const el = $(`.admin-list-item[data-file="${activeFile}"]`);
        if (el) el.classList.add('active');
      }, 100);
    }
  } catch (e) {
    showToast('保存出错：' + e.message, true);
  }
}

// ── 删除 ──────────────────────────────────
async function deleteResource() {
  if (!activeFile) return;
  if (!confirm('确定删除该资源？无法撤销。')) return;

  try {
    const res = await fetch(`/api/resources/${activeFile}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('删除失败');
    showToast('已删除');
    activeFile = null;
    $('#editForm').hidden = true;
    $('#emptyState').hidden = false;
    await loadResources();
  } catch (e) {
    showToast('删除出错：' + e.message, true);
  }
}

// ── 一键部署 ──────────────────────────────
async function deploy(message) {
  const overlay = $('#deployOverlay');
  const logEl   = $('#deployLog');
  overlay.hidden = false;
  logEl.textContent = '开始部署…\n';

  try {
    const res  = await fetch('/api/deploy', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: message || '通过后台更新资源' }),
    });
    const data = await res.json();

    logEl.textContent += data.ok
      ? '\n✓ 部署完成！GitHub Pages 即将更新。\n'
      : '\n✗ 部署失败：\n' + (data.error || '未知错误');

    if (data.steps) {
      logEl.textContent += '\n步骤：\n' + data.steps.map(s => '  ' + s).join('\n');
    }

    if (data.ok) {
      setTimeout(loadGitInfo, 2000);
    }
  } catch (e) {
    logEl.textContent += '\n✗ 请求失败：' + e.message;
  }
}

// ── Git 状态 ──────────────────────────────
async function loadGitInfo() {
  try {
    const res  = await fetch('/api/git-info');
    const info = await res.json();
    const el   = $('#gitStatus');
    if (!info || !info.remote) {
      el.textContent = '未检测到 Git 仓库';
      return;
    }
    let text = info.branch;
    if (info.hasChanges) text += ' ● 有未提交的更改';
    el.textContent = text;
    el.title = info.remote;
  } catch {
    $('#gitStatus').textContent = '—';
  }
}

// ── Toast 提示 ────────────────────────────
function showToast(msg, isError = false) {
  const el = $('#toast');
  el.textContent = msg;
  el.className = 'admin-toast' + (isError ? ' error' : ' success') + ' show';
  setTimeout(() => { el.classList.remove('show'); }, 2500);
}

function esc(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── 事件绑定 ──────────────────────────────
function bindEvents() {
  $('#resourceList').addEventListener('click', (e) => {
    const li = e.target.closest('.admin-list-item');
    if (!li) return;
    selectResource(li.dataset.file);
  });

  $('#btnAdd').addEventListener('click', () => {
    clearForm();
  });

  $('#btnSave').addEventListener('click', (e) => {
    e.preventDefault();
    saveResource();
  });

  $('#btnDelete').addEventListener('click', () => {
    deleteResource();
  });

  $('#btnDeploy').addEventListener('click', () => {
    const msg = prompt('请输入提交信息（commit message）：', '通过后台更新资源');
    if (msg !== null) deploy(msg);
  });

  $('#btnCloseOverlay').addEventListener('click', () => {
    $('#deployOverlay').hidden = true;
  });

  $('#editForm').addEventListener('submit', (e) => {
    e.preventDefault();
    saveResource();
  });
}

document.addEventListener('DOMContentLoaded', init);