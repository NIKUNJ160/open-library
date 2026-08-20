// =========================================================
// Results Module — Rendering, Filtering, Pagination
// =========================================================

import { search as apiSearch } from './api.js';
import { formatDate, escapeHtml, getTypeBadge, formatSource } from './utils.js';

let currentResults = null;
let currentPage = 1;

/**
 * Initialize results page
 */
export function initResults() {
  if (!window.location.pathname.includes('results')) return;

  const params = new URLSearchParams(window.location.search);
  const query = params.get('q') || '';
  const category = params.get('category') || 'all';
  const sort = params.get('sort') || 'relevance';

  // Set sort dropdown
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) {
    sortSelect.value = sort;
    sortSelect.addEventListener('change', () => {
      performSearchFromFilters();
    });
  }

  // Filter toggle for mobile
  const filterToggle = document.getElementById('filter-toggle-btn');
  const sidebar = document.getElementById('sidebar');
  if (filterToggle && sidebar) {
    filterToggle.addEventListener('click', () => {
      sidebar.classList.toggle('open');
    });
  }

  // Filter checkbox events
  document.querySelectorAll('#sidebar input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener('change', () => performSearchFromFilters());
  });

  // Date filter events
  const afterInput = document.getElementById('filter-after');
  const beforeInput = document.getElementById('filter-before');
  if (afterInput) afterInput.addEventListener('change', () => performSearchFromFilters());
  if (beforeInput) beforeInput.addEventListener('change', () => performSearchFromFilters());

  // Listen for search updates from search module
  window.addEventListener('search-update', (e) => {
    const { query, category } = e.detail;
    executeSearch(query, { category });
  });

  // Initial search
  if (query) {
    executeSearch(query, { category, sort });
  }
}

/**
 * Build search options from current filter state
 */
function getFilterOptions() {
  const options = {};

  // Sort
  const sortSelect = document.getElementById('sort-select');
  if (sortSelect) options.sort = sortSelect.value;

  // Content type
  const typeCheckboxes = document.querySelectorAll('#filter-content-type input:checked');
  if (typeCheckboxes.length === 1) {
    options.type = typeCheckboxes[0].value;
  }

  // Date range
  const after = document.getElementById('filter-after');
  const before = document.getElementById('filter-before');
  if (after && after.value) options.after = after.value;
  if (before && before.value) options.before = before.value;

  // Category tab
  const activeTab = document.querySelector('.category-tab.active');
  if (activeTab) options.category = activeTab.dataset.category;

  return options;
}

function performSearchFromFilters() {
  const input = document.getElementById('search-input');
  const query = input ? input.value.trim() : '';
  if (!query) return;
  executeSearch(query, getFilterOptions());
}

/**
 * Execute search and render results
 */
async function executeSearch(query, options = {}) {
  const resultsList = document.getElementById('results-list');
  const emptyState = document.getElementById('empty-state');
  const pagination = document.getElementById('pagination');

  if (!resultsList) return;

  // Show loading skeletons
  resultsList.innerHTML = renderSkeletons(5);
  if (emptyState) emptyState.style.display = 'none';
  if (pagination) pagination.innerHTML = '';

  try {
    const data = await apiSearch(query, { ...options, page: currentPage });
    currentResults = data;

    // Update result count
    const countEl = document.getElementById('results-count');
    if (countEl) {
      countEl.innerHTML = `About <strong>${data.total}</strong> results for "<strong>${escapeHtml(data.query)}</strong>"`;
    }

    // Spell correction
    const spellBanner = document.getElementById('spell-banner');
    const spellLink = document.getElementById('spell-link');
    if (spellBanner && spellLink && data.spellCorrection) {
      spellLink.textContent = data.spellCorrection;
      spellLink.onclick = (e) => {
        e.preventDefault();
        const input = document.getElementById('search-input');
        if (input) input.value = data.spellCorrection;
        executeSearch(data.spellCorrection, options);
      };
      spellBanner.classList.add('visible');
    } else if (spellBanner) {
      spellBanner.classList.remove('visible');
    }

    // Warnings
    const warningsBanner = document.getElementById('warnings-banner');
    const warningsText = document.getElementById('warnings-text');
    if (warningsBanner && warningsText && data.warnings && data.warnings.length > 0) {
      warningsText.textContent = data.warnings.join(' ');
      warningsBanner.classList.add('visible');
    } else if (warningsBanner) {
      warningsBanner.classList.remove('visible');
    }

    // Update facet counts in sidebar
    if (data.facets && data.facets.contentType) {
      Object.entries(data.facets.contentType).forEach(([type, count]) => {
        const el = document.querySelector(`.filter-count[data-type="${type}"]`);
        if (el) el.textContent = count;
      });
    }

    // Populate source filters
    if (data.facets && data.facets.sources) {
      const sourceContainer = document.getElementById('filter-source');
      if (sourceContainer && sourceContainer.children.length === 0) {
        data.facets.sources.forEach((src) => {
          const label = document.createElement('label');
          label.className = 'filter-option';
          label.innerHTML = `<input type="checkbox" name="source" value="${escapeHtml(src)}"> ${escapeHtml(src)}`;
          label.querySelector('input').addEventListener('change', () => performSearchFromFilters());
          sourceContainer.appendChild(label);
        });
      }
    }

    // Render results
    if (data.results.length === 0) {
      resultsList.innerHTML = '';
      if (emptyState) emptyState.style.display = 'block';
    } else {
      resultsList.innerHTML = data.results.map((r, i) => renderResultCard(r, i)).join('');
      if (emptyState) emptyState.style.display = 'none';

      // Attach AI action handlers
      resultsList.querySelectorAll('.ai-action-btn').forEach((btn) => {
        btn.addEventListener('click', () => {
          const action = btn.dataset.action;
          const docId = btn.dataset.docId;
          window.dispatchEvent(new CustomEvent('ai-action', { detail: { action, docId } }));
        });
      });

      // Staggered animation
      resultsList.querySelectorAll('.result-card').forEach((card, idx) => {
        card.style.animationDelay = `${idx * 0.05}s`;
      });
    }

    // Render pagination
    renderPagination(data.total, data.page, data.limit, query, options);

  } catch (err) {
    console.error('Search failed:', err);
    resultsList.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div class="empty-state-title">Search failed</div>
        <p class="empty-state-text">Something went wrong. Please try again.</p>
      </div>
    `;
  }
}

/**
 * Render a single result card
 */
function renderResultCard(result, index) {
  const badge = getTypeBadge(result.contentType);
  const authors = (result.authors || []).map(a => typeof a === 'string' ? a : a.name).join(', ') || 'Unknown Author';
  const date = formatDate(result.publishedDate);
  const desc = escapeHtml(result.description || '');

  return `
    <article class="result-card animate-fade-in-up" data-id="${result.id}" style="animation-fill-mode: both;">
      <div class="result-card-header">
        <div style="flex:1;">
          <div class="result-card-meta">
            <span class="badge ${badge.class}">${badge.label}</span>
            <span class="badge badge-blue" style="font-weight:400; text-transform:none; letter-spacing:0;">${escapeHtml(result.sourceName)}</span>
          </div>
          <h2 class="result-card-title" onclick="window.open('${result.url}', '_blank')">
            ${escapeHtml(result.title)}
          </h2>
        </div>
      </div>
      <p class="result-card-authors">${escapeHtml(authors)}</p>
      <p class="result-card-description">${desc}</p>
      <div class="result-card-footer">
        <div class="result-card-info">
          <span>📅 ${date}</span>
          <span>🔗 <a href="${result.url}" target="_blank" rel="noopener">View source</a></span>
        </div>
        <div class="result-card-actions">
          <button class="ai-action-btn" data-action="summarize" data-doc-id="${result.id}" title="AI Summary">✨ Summarize</button>
          <button class="ai-action-btn" data-action="eli5" data-doc-id="${result.id}" title="Explain Like I'm 5">🧒 ELI5</button>
          <button class="ai-action-btn" data-action="cite" data-doc-id="${result.id}" title="Generate Citation">📝 Cite</button>
          <button class="ai-action-btn" data-action="ask" data-doc-id="${result.id}" title="Ask a Question">💬 Ask</button>
          <button class="ai-action-btn" data-action="similar" data-doc-id="${result.id}" title="Find Similar">🔗 Similar</button>
        </div>
      </div>
    </article>
  `;
}

/**
 * Render loading skeletons
 */
function renderSkeletons(count) {
  return Array(count)
    .fill('')
    .map(() => `
      <div class="result-card" style="pointer-events:none;">
        <div class="result-card-header">
          <div style="flex:1;">
            <div class="skeleton skeleton-text" style="width:80px; height:18px; margin-bottom:8px;"></div>
            <div class="skeleton skeleton-title"></div>
          </div>
        </div>
        <div class="skeleton skeleton-text" style="width:200px;"></div>
        <div class="skeleton skeleton-text" style="margin-top:8px;"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-text short" style="margin-top:4px;"></div>
      </div>
    `)
    .join('');
}

/**
 * Render pagination controls
 */
function renderPagination(total, page, pageSize, query, options) {
  const paginationEl = document.getElementById('pagination');
  if (!paginationEl) return;

  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) {
    paginationEl.innerHTML = '';
    return;
  }

  let html = '';

  // Previous button
  html += `<button class="page-btn" ${page <= 1 ? 'disabled' : ''} data-page="${page - 1}">←</button>`;

  // Page numbers
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);

  if (start > 1) {
    html += `<button class="page-btn" data-page="1">1</button>`;
    if (start > 2) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
  }

  for (let i = start; i <= end; i++) {
    html += `<button class="page-btn ${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }

  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span style="color:var(--text-muted);padding:0 4px;">…</span>`;
    html += `<button class="page-btn" data-page="${totalPages}">${totalPages}</button>`;
  }

  // Next button
  html += `<button class="page-btn" ${page >= totalPages ? 'disabled' : ''} data-page="${page + 1}">→</button>`;

  paginationEl.innerHTML = html;

  // Click handlers
  paginationEl.querySelectorAll('.page-btn:not([disabled])').forEach((btn) => {
    btn.addEventListener('click', () => {
      currentPage = parseInt(btn.dataset.page);
      executeSearch(query, { ...options, page: currentPage });
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });
}
