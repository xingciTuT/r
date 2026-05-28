/* ============================================
   Resource Hub — Main Logic  v3
   Glass-aware scroll, back-to-top, counter pulse.
   ============================================ */

const state = {
  activeCategory: 'all',
  searchQuery:    '',
  lang:           localStorage.getItem('lang') || 'zh',
  theme:          localStorage.getItem('theme') || 'dark',
};

// Track previous count for pulse animation
let prevCount = 0;

// ── Modal ──────────────────────────────────
let currentResource = null;

function showDetail(r) {
  currentResource = r;
  const body   = document.getElementById('modalBody');
  const { title, desc } = rText(r, state.lang);
  let host;
  try { host = new URL(r.url).hostname.replace('www.', ''); } catch { host = r.url; }

  body.innerHTML = `
    <span class="modal-icon">${esc(r.icon)}</span>
    <div class="modal-title">${esc(title)}</div>
    <div class="modal-subtitle">${host}</div>
    <div class="modal-desc">${esc(desc)}</div>
    <div class="modal-meta">
      <span class="modal-badge">${catLabel(r.category)}</span>
    </div>
    <div class="modal-tags">
      ${(r.tags || []).map(t => `<span class="modal-tag">${esc(t)}</span>`).join('')}
    </div>
    <div class="modal-link-row">
      <a class="modal-visit" href="${esc(r.url)}" target="_blank" rel="noopener noreferrer">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        ${t('visit')}
      </a>
      <span class="modal-host">${esc(host)}</span>
    </div>
  `;

  document.getElementById('detailModal').hidden = false;
  document.body.style.overflow = 'hidden';
}

function hideDetail() {
  document.getElementById('detailModal').hidden = true;
  document.body.style.overflow = '';
  currentResource = null;
}

// ── Init ───────────────────────────────────
function init() {
  applyLang(state.lang);
  applyTheme(state.theme);
  buildFilters();
  render();
  injectBackToTop();
  bindEvents();
  initScrollEffects();
}

// ── Theme ──────────────────────────────────
function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  state.theme = theme;
}

function toggleTheme() {
  applyTheme(state.theme === 'dark' ? 'light' : 'dark');
}

// ── Language ───────────────────────────────
function applyLang(lang) {
  document.documentElement.lang = lang;
  localStorage.setItem('lang', lang);
  state.lang = lang;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    el.title = t(el.dataset.i18nTitle);
  });

  const btn = document.getElementById('langToggle');
  if (btn) {
    if (lang === 'zh') { btn.textContent = 'EN'; btn.title = 'Switch to English'; }
    else               { btn.textContent = '中'; btn.title = '切换到中文'; }
  }
}

function toggleLang() {
  applyLang(state.lang === 'zh' ? 'en' : 'zh');
  buildFilters();
  render();
}

// ── Escape ─────────────────────────────────
function esc(str) {
  const d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

// ── Inject back-to-top button ──────────────
function injectBackToTop() {
  const btn = document.createElement('button');
  btn.className = 'back-to-top';
  btn.setAttribute('aria-label', 'Back to top');
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M18 15l-6-6-6 6"/></svg>';
  btn.addEventListener('click', () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
  document.body.appendChild(btn);
}

// ── Scroll effects ─────────────────────────
function initScrollEffects() {
  const nav = document.querySelector('.nav');
  const btt = document.querySelector('.back-to-top');
  let ticking = false;

  function onScroll() {
    if (ticking) return;
    ticking = true;
    requestAnimationFrame(() => {
      const y = window.scrollY;

      // Nav glass — more opaque when scrolled
      if (y > 20) {
        nav.classList.add('scrolled');
      } else {
        nav.classList.remove('scrolled');
      }

      // Back-to-top visibility
      if (btt) {
        if (y > 400) {
          btt.classList.add('visible');
        } else {
          btt.classList.remove('visible');
        }
      }

      ticking = false;
    });
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  // Initial check
  onScroll();
}

// ── Build filter tabs ──────────────────────
function buildFilters() {
  const categories = ['all', ...new Set(RESOURCES.map(r => r.category))];
  const container = document.getElementById('filterTags');

  container.innerHTML = categories.map(cat => {
    const label = cat === 'all' ? t('filter_all') : catLabel(cat);
    const cls = cat === state.activeCategory ? 'filter-tab active' : 'filter-tab';
    return `<button class="${cls}" data-category="${cat}">${label}</button>`;
  }).join('');
}

// ── Render ─────────────────────────────────
function render() {
  const filtered = RESOURCES.filter(r => {
    if (state.activeCategory !== 'all' && r.category !== state.activeCategory) return false;
    if (!state.searchQuery) return true;
    const q = state.searchQuery.toLowerCase();
    const text = rText(r, state.lang);
    return text.title.toLowerCase().includes(q) ||
           text.desc.toLowerCase().includes(q) ||
           r.tags.some(t => t.toLowerCase().includes(q));
  });

  const countEl = document.getElementById('itemCount');
  const newCount = filtered.length;

  // Pulse animation on count change
  const metaEl = document.querySelector('.bar-meta');
  if (metaEl && newCount !== prevCount) {
    metaEl.classList.remove('pulse');
    void metaEl.offsetWidth;
    metaEl.classList.add('pulse');
    setTimeout(() => metaEl.classList.remove('pulse'), 400);
  }
  prevCount = newCount;
  countEl.textContent = newCount;

  document.querySelectorAll('[data-i18n]').forEach(el => {
    el.textContent = t(el.dataset.i18n);
  });

  const list  = document.getElementById('resourceList');
  const empty = document.getElementById('listEmpty');

  if (filtered.length === 0) {
    list.innerHTML = '';
    empty.hidden = false;
    empty.textContent = t('empty_text');
    return;
  }

  empty.hidden = true;

  // Render rows — each gets a staggered animation-delay via inline style.
  // Using translate3d + will-change for GPU compositing.
  list.innerHTML = filtered.map((r, i) => {
    const { title, desc } = rText(r, state.lang);
    const badge = catLabel(r.category);
    let host;
    try { host = new URL(r.url).hostname.replace('www.', ''); } catch { host = r.url; }

    return `
      <div class="resource-row" data-id="${r.id}" style="animation-delay:${i * 0.04}s" role="button" tabindex="0">
        <div class="row-title">
          <span class="row-icon">${r.icon}</span>${esc(title)}
        </div>
        <div class="row-desc">${esc(desc)}</div>
        <div class="row-meta">
          <span class="row-url">${esc(host)}</span>
          <span class="row-tags">
            ${r.tags.slice(0, 4).map(t => `<span class="row-tag">${esc(t)}</span>`).join(' ')}
          </span>
        </div>
        <span class="row-badge">${badge}</span>
      </div>
    `;
  }).join('');

  // After animation completes, mark rows as "entered"&mdash;this
  // frees the transform property so hover can use it freely.
  const maxDelay = (filtered.length - 1) * 0.04 + 0.42; // stagger + animation duration
  setTimeout(() => {
    list.querySelectorAll('.resource-row').forEach(r => {
      r.classList.add('entered');
      r.style.removeProperty('animation-delay');
    });
  }, maxDelay * 1000);
}

// ── Events ─────────────────────────────────
function bindEvents() {
  document.getElementById('themeToggle').addEventListener('click', toggleTheme);
  document.getElementById('langToggle').addEventListener('click', toggleLang);

  const searchInput = document.getElementById('searchInput');
  searchInput.addEventListener('input', () => {
    state.searchQuery = searchInput.value.trim();
    render();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
      e.preventDefault();
      searchInput.focus();
      searchInput.select();
    }
    if (e.key === 'Escape') {
      if (currentResource) {
        hideDetail();
      } else if (document.activeElement === searchInput) {
        searchInput.blur();
        searchInput.value = '';
        state.searchQuery = '';
        render();
      }
    }
  });

  // Row click → detail modal
  document.getElementById('resourceList').addEventListener('click', (e) => {
    const row = e.target.closest('.resource-row');
    if (!row) return;
    const id = parseInt(row.dataset.id);
    const r = RESOURCES.find(x => x.id === id);
    if (r) showDetail(r);
  });

  // Keyboard: Enter on focused row
  document.getElementById('resourceList').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const row = e.target.closest('.resource-row');
      if (!row) return;
      const id = parseInt(row.dataset.id);
      const r = RESOURCES.find(x => x.id === id);
      if (r) showDetail(r);
    }
  });

  // Modal close
  document.getElementById('modalClose').addEventListener('click', hideDetail);
  document.getElementById('detailModal').addEventListener('click', (e) => {
    if (e.target === e.currentTarget) hideDetail();
  });

  document.getElementById('filterTags').addEventListener('click', (e) => {
    const tab = e.target.closest('.filter-tab');
    if (!tab) return;
    state.activeCategory = tab.dataset.category;
    buildFilters();
    render();
    // Scroll to top smoothly on filter change
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

// ── Boot ───────────────────────────────────
document.addEventListener('DOMContentLoaded', init);
