// =========================================================
// Universal Open Knowledge Search Engine — Utilities
// =========================================================

/**
 * Debounce a function call
 * @param {Function} fn - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @returns {Function}
 */
export function debounce(fn, delay = 300) {
  let timer;
  return function (...args) {
    clearTimeout(timer);
    timer = setTimeout(() => fn.apply(this, args), delay);
  };
}

/**
 * Throttle a function call
 * @param {Function} fn - Function to throttle
 * @param {number} limit - Minimum interval in ms
 * @returns {Function}
 */
export function throttle(fn, limit = 200) {
  let inThrottle = false;
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

/**
 * Format a date string to a readable format
 * @param {string} dateStr - ISO date string
 * @returns {string}
 */
export function formatDate(dateStr) {
  if (!dateStr) return 'Unknown date';
  try {
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

/**
 * Truncate text to a maximum length
 * @param {string} text
 * @param {number} max
 * @returns {string}
 */
export function truncate(text, max = 200) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max).replace(/\s+\S*$/, '') + '…';
}

/**
 * Get query parameters from URL
 * @returns {URLSearchParams}
 */
export function getQueryParams() {
  return new URLSearchParams(window.location.search);
}

/**
 * Set query parameters without page reload
 * @param {Object} params - key/value pairs
 */
export function setQueryParams(params) {
  const url = new URL(window.location);
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') {
      url.searchParams.delete(key);
    } else {
      url.searchParams.set(key, value);
    }
  });
  window.history.pushState({}, '', url);
}

/**
 * Generate a unique ID
 * @returns {string}
 */
export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str
 * @returns {string}
 */
export function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Copy text to clipboard
 * @param {string} text
 * @returns {Promise<boolean>}
 */
export async function copyToClipboard(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(textarea);
    return ok;
  }
}

/**
 * Map content type to badge class
 * @param {string} type
 * @returns {{ class: string, label: string }}
 */
export function getTypeBadge(type) {
  const map = {
    book: { class: 'badge-emerald', label: 'Book' },
    paper: { class: 'badge-violet', label: 'Paper' },
    dataset: { class: 'badge-gold', label: 'Dataset' },
    patent: { class: 'badge-rose', label: 'Patent' },
    repository: { class: 'badge-cyan', label: 'Code' },
    government: { class: 'badge-blue', label: 'Gov Doc' },
    documentation: { class: 'badge-blue', label: 'Docs' },
  };
  const key = (type || '').toLowerCase();
  return map[key] || { class: 'badge-blue', label: type || 'Unknown' };
}

/**
 * Map source name to a short display label
 * @param {string} source
 * @returns {string}
 */
export function formatSource(source) {
  if (!source) return 'Unknown';
  // Capitalize first letter of each word
  return source
    .replace(/[-_]/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * Create DOM element with attributes and children
 * @param {string} tag
 * @param {Object} attrs
 * @param  {...(string|Node)} children
 * @returns {HTMLElement}
 */
export function el(tag, attrs = {}, ...children) {
  const element = document.createElement(tag);
  Object.entries(attrs).forEach(([key, val]) => {
    if (key === 'className') {
      element.className = val;
    } else if (key === 'dataset') {
      Object.entries(val).forEach(([dk, dv]) => (element.dataset[dk] = dv));
    } else if (key.startsWith('on')) {
      element.addEventListener(key.slice(2).toLowerCase(), val);
    } else {
      element.setAttribute(key, val);
    }
  });
  children.forEach((child) => {
    if (typeof child === 'string') {
      element.appendChild(document.createTextNode(child));
    } else if (child instanceof Node) {
      element.appendChild(child);
    }
  });
  return element;
}

/**
 * Show a toast notification
 * @param {string} message
 * @param {'success'|'error'|'info'} type
 */
export function showToast(message, type = 'info') {
  const toast = el('div', {
    className: `toast toast-${type}`,
    style: `
      position: fixed; bottom: 24px; right: 24px; z-index: 9999;
      padding: 12px 20px; border-radius: 10px; font-size: 14px;
      color: #f1f5f9; backdrop-filter: blur(12px);
      animation: fadeInUp 0.3s ease-out;
      background: ${type === 'success' ? 'rgba(16,185,129,0.9)' : type === 'error' ? 'rgba(244,63,94,0.9)' : 'rgba(59,130,246,0.9)'};
      box-shadow: 0 8px 30px rgba(0,0,0,0.4);
    `,
  }, message);

  document.body.appendChild(toast);
  setTimeout(() => {
    toast.style.animation = 'fadeIn 0.3s ease-out reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
