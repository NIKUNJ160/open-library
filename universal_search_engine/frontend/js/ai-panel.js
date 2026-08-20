// =========================================================
// AI Panel Module — Side Drawer for AI Features
// =========================================================

import { aiSummarize, aiEli5, aiCite, aiAsk, aiRecommendations } from './api.js';
import { copyToClipboard, showToast, escapeHtml, getTypeBadge, formatSource } from './utils.js';

let currentDocId = null;
let currentAction = null;

/**
 * Initialize AI panel
 */
export function initAiPanel() {
  const overlay = document.getElementById('ai-panel-overlay');
  const panel = document.getElementById('ai-panel');
  const closeBtn = document.getElementById('ai-panel-close');

  if (!panel) return;

  // Close panel
  if (closeBtn) {
    closeBtn.addEventListener('click', closePanel);
  }
  if (overlay) {
    overlay.addEventListener('click', closePanel);
  }

  // Keyboard close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closePanel();
  });

  // Listen for AI action events from result cards
  window.addEventListener('ai-action', (e) => {
    const { action, docId } = e.detail;
    openPanel(action, docId);
  });
}

/**
 * Open AI panel with specified action
 */
async function openPanel(action, docId) {
  const panel = document.getElementById('ai-panel');
  const overlay = document.getElementById('ai-panel-overlay');
  const title = document.getElementById('ai-panel-title');
  const body = document.getElementById('ai-panel-body');

  if (!panel || !body) return;

  currentDocId = docId;
  currentAction = action;

  // Set title
  const titles = {
    summarize: '✨ AI Summary',
    eli5: '🧒 Explain Like I\'m 5',
    cite: '📝 Citation Generator',
    ask: '💬 Ask a Question',
    similar: '🔗 Similar Content',
  };
  if (title) title.textContent = titles[action] || '✨ AI Assistant';

  // Show panel
  panel.classList.add('active');
  if (overlay) overlay.classList.add('active');
  document.body.style.overflow = 'hidden';

  // Show loading
  body.innerHTML = `
    <div class="ai-panel-loading">
      <div class="spinner"></div>
      <span>Analyzing content...</span>
    </div>
  `;

  // Execute action
  try {
    switch (action) {
      case 'summarize':
        await renderSummarize(body, docId);
        break;
      case 'eli5':
        await renderEli5(body, docId);
        break;
      case 'cite':
        await renderCite(body, docId);
        break;
      case 'ask':
        renderAskForm(body, docId);
        break;
      case 'similar':
        await renderSimilar(body, docId);
        break;
    }
  } catch (err) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">❌</div>
        <div class="empty-state-title">Something went wrong</div>
        <p class="empty-state-text">${escapeHtml(err.message)}</p>
      </div>
    `;
  }
}

/**
 * Close AI panel
 */
function closePanel() {
  const panel = document.getElementById('ai-panel');
  const overlay = document.getElementById('ai-panel-overlay');

  if (panel) panel.classList.remove('active');
  if (overlay) overlay.classList.remove('active');
  document.body.style.overflow = '';
  currentDocId = null;
  currentAction = null;
}

// ---- Summarize ----

async function renderSummarize(body, docId) {
  let currentLength = 'medium';
  let currentTone = 'formal';

  async function loadSummary() {
    const data = await aiSummarize(docId, { length: currentLength, tone: currentTone });
    const summaryContent = document.getElementById('summary-content');
    if (summaryContent) {
      summaryContent.innerHTML = `<p>${escapeHtml(data.summary)}</p>`;
    }
  }

  body.innerHTML = `
    <div class="ai-response">
      <h3>Summary Length</h3>
      <div class="ai-options" id="length-options">
        <button class="ai-option" data-val="short">Short</button>
        <button class="ai-option active" data-val="medium">Medium</button>
        <button class="ai-option" data-val="long">Long</button>
      </div>
      <h3>Tone</h3>
      <div class="ai-options" id="tone-options">
        <button class="ai-option active" data-val="formal">Formal</button>
        <button class="ai-option" data-val="casual">Casual</button>
      </div>
      <div id="summary-content" style="margin-top: var(--space-lg);">
        <div class="ai-panel-loading">
          <div class="spinner"></div>
          <span>Generating summary...</span>
        </div>
      </div>
    </div>
  `;

  // Length option handlers
  body.querySelectorAll('#length-options .ai-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('#length-options .ai-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentLength = btn.dataset.val;
      const sc = document.getElementById('summary-content');
      if (sc) sc.innerHTML = '<div class="ai-panel-loading"><div class="spinner"></div><span>Regenerating...</span></div>';
      loadSummary();
    });
  });

  // Tone option handlers
  body.querySelectorAll('#tone-options .ai-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('#tone-options .ai-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentTone = btn.dataset.val;
      const sc = document.getElementById('summary-content');
      if (sc) sc.innerHTML = '<div class="ai-panel-loading"><div class="spinner"></div><span>Regenerating...</span></div>';
      loadSummary();
    });
  });

  await loadSummary();
}

// ---- ELI5 ----

async function renderEli5(body, docId) {
  const data = await aiEli5(docId);

  body.innerHTML = `
    <div class="ai-response">
      <div class="glass-card" style="border-left: 3px solid var(--accent-emerald);">
        <h3 style="color: var(--accent-emerald); margin-bottom: var(--space-sm);">🧒 Simple Explanation</h3>
        <p style="line-height: 1.8; font-size: var(--text-base);">${escapeHtml(data.explanation)}</p>
      </div>
    </div>
  `;
}

// ---- Cite ----

async function renderCite(body, docId) {
  let currentFormat = 'apa';

  async function loadCitation() {
    const data = await aiCite(docId, currentFormat);
    const citBlock = document.getElementById('citation-block');
    if (citBlock) {
      citBlock.textContent = data.citation;
    }
  }

  body.innerHTML = `
    <div class="ai-response">
      <h3>Citation Format</h3>
      <div class="ai-options" id="format-options">
        <button class="ai-option active" data-val="apa">APA</button>
        <button class="ai-option" data-val="mla">MLA</button>
        <button class="ai-option" data-val="chicago">Chicago</button>
        <button class="ai-option" data-val="bibtex">BibTeX</button>
        <button class="ai-option" data-val="ris">RIS</button>
      </div>
      <div class="citation-block" id="citation-block" style="margin-top: var(--space-lg); white-space: pre-wrap;">
        Loading...
      </div>
      <button class="copy-btn" id="copy-citation-btn" style="margin-top: var(--space-sm);">📋 Copy to Clipboard</button>
    </div>
  `;

  // Format handlers
  body.querySelectorAll('#format-options .ai-option').forEach((btn) => {
    btn.addEventListener('click', () => {
      body.querySelectorAll('#format-options .ai-option').forEach((b) => b.classList.remove('active'));
      btn.classList.add('active');
      currentFormat = btn.dataset.val;
      loadCitation();
    });
  });

  // Copy handler
  const copyBtn = document.getElementById('copy-citation-btn');
  if (copyBtn) {
    copyBtn.addEventListener('click', async () => {
      const citBlock = document.getElementById('citation-block');
      if (citBlock) {
        const ok = await copyToClipboard(citBlock.textContent);
        showToast(ok ? 'Citation copied!' : 'Copy failed', ok ? 'success' : 'error');
      }
    });
  }

  await loadCitation();
}

// ---- Ask ----

function renderAskForm(body, docId) {
  body.innerHTML = `
    <div class="ai-response">
      <h3>Ask a question about this document</h3>
      <div class="ai-ask-input">
        <input type="text" id="ask-input" placeholder="e.g., What method did the authors use?">
        <button class="btn btn-primary btn-sm" id="ask-submit-btn">Ask</button>
      </div>
      <div id="ask-answer"></div>
    </div>
  `;

  const input = document.getElementById('ask-input');
  const submitBtn = document.getElementById('ask-submit-btn');
  const answerEl = document.getElementById('ask-answer');

  async function submitQuestion() {
    const question = input.value.trim();
    if (!question) return;

    answerEl.innerHTML = '<div class="ai-panel-loading"><div class="spinner"></div><span>Thinking...</span></div>';

    const data = await aiAsk(docId, question);

    answerEl.innerHTML = `
      <div class="glass-card" style="border-left: 3px solid var(--accent-cyan); margin-top: var(--space-md);">
        <p style="line-height: 1.8;">${escapeHtml(data.answer)}</p>
        <div style="margin-top: var(--space-md); font-size: var(--text-xs); color: var(--text-muted);">
          <strong>Confidence:</strong> ${Math.round(data.confidence * 100)}% · 
          <strong>Sources:</strong> ${data.sources.map((s) => escapeHtml(s)).join(', ')}
        </div>
      </div>
    `;
  }

  if (submitBtn) submitBtn.addEventListener('click', submitQuestion);
  if (input) {
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') submitQuestion();
    });
    // Auto-focus
    setTimeout(() => input.focus(), 300);
  }
}

// ---- Similar ----

async function renderSimilar(body, docId) {
  const data = await aiRecommendations(docId);

  if (!data.recommendations || data.recommendations.length === 0) {
    body.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🔗</div>
        <div class="empty-state-title">No similar content found</div>
      </div>
    `;
    return;
  }

  body.innerHTML = `
    <div class="ai-response">
      <h3>You Might Also Like</h3>
      <div class="similar-grid">
        ${data.recommendations
          .map((r) => {
            const badge = getTypeBadge(r.contentType);
            return `
              <div class="similar-card">
                <div style="display:flex; align-items:center; gap: var(--space-sm); margin-bottom: var(--space-xs);">
                  <span class="badge ${badge.class}" style="font-size:10px;">${badge.label}</span>
                  <span style="font-size: var(--text-xs); color: var(--text-muted);">${escapeHtml(r.sourceName)}</span>
                  <span style="margin-left:auto; font-family:var(--font-mono); font-size:var(--text-xs); color:var(--accent-emerald);">${(r.similarity * 100).toFixed(0)}% match</span>
                </div>
                <div class="similar-card-title">${escapeHtml(r.title)}</div>
                <div class="similar-card-meta">${(r.authors || []).map(a => typeof a === 'string' ? a : a.name).join(', ')}</div>
              </div>
            `;
          })
          .join('')}
      </div>
    </div>
  `;
}
