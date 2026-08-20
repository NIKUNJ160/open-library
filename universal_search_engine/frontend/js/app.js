// =========================================================
// App Entry Point — Initializes all modules
// =========================================================

import { initSearch, initCategoryTabs, initTrendingTags } from './search.js';
import { initResults } from './results.js';
import { initAiPanel } from './ai-panel.js';
import { CONFIG, saveConfig } from './config.js';

/**
 * Initialize the application
 */
function init() {
  // Search functionality (works on both pages)
  initSearch();
  initCategoryTabs();

  // Landing page specific
  initTrendingTags();

  // Results page specific
  initResults();
  initAiPanel();
  
  // Settings
  initSettings();

  // Filter group collapsible
  document.querySelectorAll('.filter-group-title').forEach((title) => {
    title.addEventListener('click', () => {
      title.classList.toggle('collapsed');
      const options = title.nextElementSibling;
      if (options) {
        options.style.display = title.classList.contains('collapsed') ? 'none' : '';
      }
    });
  });

  console.log('🚀 OpenKnowledge initialized');
}

function initSettings() {
  const btn = document.getElementById('settings-btn');
  const modal = document.getElementById('settings-modal');
  const closeBtn = document.getElementById('settings-close');
  const saveBtn = document.getElementById('settings-save');
  
  if (!btn || !modal) return;

  const urlInput = document.getElementById('settings-api-url');
  const keyInput = document.getElementById('settings-api-key');
  const modeSelect = document.getElementById('settings-mock-mode');

  btn.addEventListener('click', () => {
    urlInput.value = CONFIG.API_BASE_URL;
    keyInput.value = CONFIG.API_KEY;
    modeSelect.value = CONFIG.MOCK_MODE;
    modal.style.display = 'flex';
  });

  closeBtn.addEventListener('click', () => {
    modal.style.display = 'none';
  });

  saveBtn.addEventListener('click', () => {
    saveConfig({
      API_BASE_URL: urlInput.value,
      API_KEY: keyInput.value,
      MOCK_MODE: modeSelect.value
    });
    modal.style.display = 'none';
    window.location.reload(); // Reload to apply settings
  });

  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.style.display = 'none';
  });
}

// Start when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
