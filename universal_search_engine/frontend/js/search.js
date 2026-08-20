// =========================================================
// Search Module — Autocomplete, Search Operators, Submission
// =========================================================

import { autocomplete as apiAutocomplete } from './api.js';
import { debounce, escapeHtml } from './utils.js';

let selectedIndex = -1;
let suggestions = [];

/**
 * Initialize search functionality
 */
export function initSearch() {
  const input = document.getElementById('search-input');
  const btn = document.getElementById('search-btn');
  const dropdown = document.getElementById('autocomplete-dropdown');

  if (!input) return;

  // Debounced autocomplete
  const handleInput = debounce(async () => {
    const query = input.value.trim();
    if (query.length < 2) {
      hideAutocomplete();
      return;
    }
    suggestions = await apiAutocomplete(query);
    renderAutocomplete(suggestions, dropdown, query);
  }, 200);

  input.addEventListener('input', handleInput);

  // Keyboard navigation
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        input.value = suggestions[selectedIndex].text;
      }
      hideAutocomplete();
      performSearch(input.value);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      selectedIndex = Math.min(selectedIndex + 1, suggestions.length - 1);
      updateSelection(dropdown);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      selectedIndex = Math.max(selectedIndex - 1, -1);
      updateSelection(dropdown);
    } else if (e.key === 'Escape') {
      hideAutocomplete();
    }
  });

  // Search button click
  if (btn) {
    btn.addEventListener('click', () => {
      hideAutocomplete();
      performSearch(input.value);
    });
  }

  // Click outside to close
  document.addEventListener('click', (e) => {
    if (!e.target.closest('#search-container')) {
      hideAutocomplete();
    }
  });

  // Pre-fill from URL
  const params = new URLSearchParams(window.location.search);
  const q = params.get('q');
  if (q) {
    input.value = q;
  }
}

/**
 * Render autocomplete dropdown
 */
function renderAutocomplete(items, dropdown, query) {
  if (!dropdown || items.length === 0) {
    hideAutocomplete();
    return;
  }

  selectedIndex = -1;
  const typeIcons = {
    topic: '🔍',
    book: '📚',
    paper: '📄',
    dataset: '📊',
    patent: '📋',
    docs: '📖',
    code: '💻',
  };

  dropdown.innerHTML = items
    .map((item, i) => {
      const icon = typeIcons[item.type] || '🔍';
      // Highlight matching text
      const regex = new RegExp(`(${escapeRegex(query)})`, 'gi');
      const highlighted = escapeHtml(item.text).replace(
        regex,
        '<strong style="color: var(--text-primary)">$1</strong>'
      );
      return `
        <div class="autocomplete-item" data-index="${i}">
          <span class="ac-icon">${icon}</span>
          <span class="ac-text">${highlighted}</span>
          <span class="ac-type">${item.type}</span>
        </div>
      `;
    })
    .join('');

  // Click on suggestion
  dropdown.querySelectorAll('.autocomplete-item').forEach((el) => {
    el.addEventListener('click', () => {
      const idx = parseInt(el.dataset.index);
      const input = document.getElementById('search-input');
      input.value = items[idx].text;
      hideAutocomplete();
      performSearch(items[idx].text);
    });

    el.addEventListener('mouseenter', () => {
      selectedIndex = parseInt(el.dataset.index);
      updateSelection(dropdown);
    });
  });

  dropdown.classList.add('active');
}

function updateSelection(dropdown) {
  if (!dropdown) return;
  dropdown.querySelectorAll('.autocomplete-item').forEach((el, i) => {
    el.classList.toggle('active', i === selectedIndex);
  });
}

function hideAutocomplete() {
  const dropdown = document.getElementById('autocomplete-dropdown');
  if (dropdown) {
    dropdown.classList.remove('active');
    dropdown.innerHTML = '';
  }
  selectedIndex = -1;
  suggestions = [];
}

/**
 * Navigate to results page with query
 */
function performSearch(query) {
  const trimmed = (query || '').trim();
  if (!trimmed) return;

  const activeCategory = document.querySelector('.category-tab.active');
  const category = activeCategory ? activeCategory.dataset.category : 'all';

  // If on landing page, navigate to results
  if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || !window.location.pathname.includes('results')) {
    window.location.href = `results.html?q=${encodeURIComponent(trimmed)}&category=${category}`;
  } else {
    // On results page, update URL and trigger search event
    const url = new URL(window.location);
    url.searchParams.set('q', trimmed);
    if (category !== 'all') {
      url.searchParams.set('category', category);
    } else {
      url.searchParams.delete('category');
    }
    window.history.pushState({}, '', url);
    window.dispatchEvent(new CustomEvent('search-update', { detail: { query: trimmed, category } }));
  }
}

/**
 * Initialize category tab clicks
 */
export function initCategoryTabs() {
  const tabs = document.getElementById('category-tabs');
  if (!tabs) return;

  tabs.addEventListener('click', (e) => {
    const tab = e.target.closest('.category-tab');
    if (!tab) return;

    // Update active state
    tabs.querySelectorAll('.category-tab').forEach((t) => t.classList.remove('active'));
    tab.classList.add('active');

    // On results page, trigger search
    const input = document.getElementById('search-input');
    const query = input ? input.value.trim() : '';
    if (query && window.location.pathname.includes('results')) {
      performSearch(query);
    }
  });

  // Set active tab from URL
  const params = new URLSearchParams(window.location.search);
  const cat = params.get('category');
  if (cat) {
    tabs.querySelectorAll('.category-tab').forEach((t) => {
      t.classList.toggle('active', t.dataset.category === cat);
    });
  }
}

/**
 * Initialize trending tag clicks (landing page only)
 */
export function initTrendingTags() {
  const container = document.getElementById('trending-tags');
  if (!container) return;

  container.addEventListener('click', (e) => {
    const tag = e.target.closest('.trending-tag');
    if (!tag) return;

    const input = document.getElementById('search-input');
    if (input) {
      input.value = tag.textContent.trim();
      performSearch(tag.textContent.trim());
    }
  });
}

// Utility
function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
