// =========================================================
// Universal Open Knowledge Search Engine — API Service Layer
// =========================================================
// Connects to backend at /api/v1/ when available.
// Falls back to realistic mock data for standalone demo.

import { CONFIG } from './config.js';

let useMock = false; // Will auto-detect

// ---------- Health Check ----------

async function checkBackend() {
  if (CONFIG.MOCK_MODE === 'always') {
    useMock = true;
    return false;
  }
  if (CONFIG.MOCK_MODE === 'never') {
    useMock = false;
    return true;
  }
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    if (res.ok) {
      useMock = false;
      console.log('✅ Backend connected');
      return true;
    }
  } catch {
    // Ignore
  }
  useMock = true;
  console.log('⚠️ Backend unavailable — using mock data');
  return false;
}

const resultCache = new Map();

function getHeaders() {
  const headers = { 'Content-Type': 'application/json' };
  if (CONFIG.API_KEY) {
    headers['x-api-key'] = CONFIG.API_KEY;
  }
  return headers;
}

async function handleApiError(res) {
  try {
    const data = await res.json();
    return new Error(data.message || data.error || `HTTP ${res.status}`);
  } catch {
    return new Error(`HTTP ${res.status}`);
  }
}

// Run on load
checkBackend();

// ---------- Search API ----------

export async function search(query, options = {}) {
  if (useMock) return mockSearch(query, options);

  const params = new URLSearchParams();
  if (query) params.set('q', query);
  
  // Map options to SearchQueryDto
  if (options.category && options.category !== 'all') params.set('category', options.category);
  if (options.source) params.set('source', options.source);
  if (options.page) params.set('page', options.page);
  if (options.limit) params.set('limit', options.limit);
  if (options.after) params.set('after', options.after);
  if (options.before) params.set('before', options.before);
  if (options.sort) params.set('sort', options.sort);
  if (options.type) params.set('type', options.type);

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/search?${params}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw await handleApiError(res);
    const data = await res.json();
    if (data.results) {
      data.results.forEach(r => resultCache.set(r.id, r));
    }
    return data;
  } catch (err) {
    console.warn('Search API failed, falling back to mock:', err.message);
    if (CONFIG.MOCK_MODE === 'never') throw err;
    return mockSearch(query, options);
  }
}

// ---------- Autocomplete ----------

export async function autocomplete(query) {
  if (useMock) return mockAutocomplete(query);

  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/search/autocomplete?q=${encodeURIComponent(query)}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw await handleApiError(res);
    return await res.json();
  } catch {
    return mockAutocomplete(query);
  }
}

// ---------- AI Feature APIs ----------

export async function aiSummarize(documentId, options = {}) {
  if (useMock) return mockAiSummarize(documentId, options);
  try {
    const doc = resultCache.get(documentId);
    const documentUrl = doc?.url;
    const res = await fetch(`${CONFIG.API_BASE_URL}/ai/summarize`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ documentUrl, length: options.length, tone: options.tone }),
    });
    if (!res.ok) throw await handleApiError(res);
    return await res.json();
  } catch(err) {
    if (CONFIG.MOCK_MODE === 'never') throw err;
    return mockAiSummarize(documentId, options); 
  }
}

export async function aiEli5(documentId) {
  if (useMock) return mockAiEli5(documentId);
  try {
    const doc = resultCache.get(documentId);
    const documentUrl = doc?.url;
    const res = await fetch(`${CONFIG.API_BASE_URL}/ai/eli5`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ documentUrl }),
    });
    if (!res.ok) throw await handleApiError(res);
    return await res.json();
  } catch(err) { 
    if (CONFIG.MOCK_MODE === 'never') throw err;
    return mockAiEli5(documentId); 
  }
}

export async function aiCite(documentId, format = 'apa') {
  if (useMock) return mockAiCite(documentId, format);
  try {
    const doc = resultCache.get(documentId);
    const metadata = doc?.metadata || { title: doc?.title, authors: doc?.authors, url: doc?.url, publishedDate: doc?.publishedDate, sourceName: doc?.sourceName };
    const res = await fetch(`${CONFIG.API_BASE_URL}/ai/cite`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ metadata, format }),
    });
    if (!res.ok) throw await handleApiError(res);
    return await res.json();
  } catch(err) { 
    if (CONFIG.MOCK_MODE === 'never') throw err;
    return mockAiCite(documentId, format); 
  }
}

export async function aiAsk(documentId, question) {
  if (useMock) return mockAiAsk(documentId, question);
  try {
    const doc = resultCache.get(documentId);
    const documentUrl = doc?.url;
    const res = await fetch(`${CONFIG.API_BASE_URL}/ai/ask`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ documentUrl, question }),
    });
    if (!res.ok) throw await handleApiError(res);
    return await res.json();
  } catch(err) { 
    if (CONFIG.MOCK_MODE === 'never') throw err;
    return mockAiAsk(documentId, question); 
  }
}

export async function aiRecommendations(documentId) {
  if (useMock) return mockAiRecommendations(documentId);
  try {
    const res = await fetch(`${CONFIG.API_BASE_URL}/ai/recommendations?documentId=${encodeURIComponent(documentId)}`, {
      headers: getHeaders()
    });
    if (!res.ok) throw await handleApiError(res);
    return await res.json();
  } catch(err) { 
    if (CONFIG.MOCK_MODE === 'never') throw err;
    return mockAiRecommendations(documentId); 
  }
}


// =========================================================
// MOCK DATA — Realistic demo data
// =========================================================

const MOCK_RESULTS = [
  {
    id: 'ol-001',
    title: 'Deep Learning',
    authors: ['Ian Goodfellow', 'Yoshua Bengio', 'Aaron Courville'],
    description: 'An introduction to a broad range of topics in deep learning, covering mathematical and conceptual background, deep learning techniques used in industry, and research perspectives.',
    url: 'https://openlibrary.org/works/OL17930368W',
    publishedDate: '2016-11-18',
    contentType: 'book',
    sourceName: 'Open Library',
  },
  {
    id: 'arxiv-001',
    title: 'Attention Is All You Need',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Niki Parmar', 'Jakob Uszkoreit'],
    description: 'The dominant sequence transduction models are based on complex recurrent or convolutional neural networks. We propose a new simple network architecture, the Transformer, based solely on attention mechanisms.',
    url: 'https://arxiv.org/abs/1706.03762',
    publishedDate: '2017-06-12',
    contentType: 'paper',
    sourceName: 'arXiv',
  },
  {
    id: 'pm-001',
    title: 'BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding',
    authors: ['Jacob Devlin', 'Ming-Wei Chang', 'Kenton Lee', 'Kristina Toutanova'],
    description: 'We introduce a new language representation model called BERT, which stands for Bidirectional Encoder Representations from Transformers. BERT is designed to pre-train deep bidirectional representations.',
    url: 'https://pubmed.ncbi.nlm.nih.gov/33523125/',
    publishedDate: '2019-05-24',
    contentType: 'paper',
    sourceName: 'PubMed',
  },
  {
    id: 'hf-001',
    title: 'Common Crawl Dataset',
    authors: ['Common Crawl Foundation'],
    description: 'A corpus of web crawl data composed of over 250 billion pages collected over 16 years. Widely used for training large language models and NLP research.',
    url: 'https://huggingface.co/datasets/commoncrawl',
    publishedDate: '2023-08-01',
    contentType: 'dataset',
    sourceName: 'Hugging Face',
  },
  {
    id: 'gp-001',
    title: 'Method and system for machine learning model training and inference',
    authors: ['Google LLC'],
    description: 'A system and method for distributed machine learning that enables efficient training of neural networks across multiple computing nodes using gradient compression and asynchronous updates.',
    url: 'https://patents.google.com/patent/US11341234B2',
    publishedDate: '2022-05-24',
    contentType: 'patent',
    sourceName: 'Google Patents',
  },
  {
    id: 'gh-001',
    title: 'pytorch/pytorch',
    authors: ['Meta AI', 'PyTorch Contributors'],
    description: 'Tensors and Dynamic neural networks in Python with strong GPU acceleration. PyTorch is an open source machine learning framework used by researchers and developers worldwide.',
    url: 'https://github.com/pytorch/pytorch',
    publishedDate: '2024-01-15',
    contentType: 'repository',
    sourceName: 'GitHub',
  },
  {
    id: 'nasa-001',
    title: 'Machine Learning for Space Weather Prediction',
    authors: ['NASA Goddard Space Flight Center'],
    description: 'Technical report on the application of deep learning and ensemble methods for predicting solar flares and geomagnetic storms using satellite data.',
    url: 'https://ntrs.nasa.gov/citations/20220001234',
    publishedDate: '2022-09-14',
    contentType: 'government',
    sourceName: 'NASA Technical Reports',
  },
  {
    id: 'mdn-001',
    title: 'Web APIs: Using the Fetch API',
    authors: ['MDN Contributors'],
    description: 'The Fetch API provides a JavaScript interface for making HTTP requests and processing the responses. Learn about Request, Response, Headers, and streaming.',
    url: 'https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API',
    publishedDate: '2024-06-20',
    contentType: 'documentation',
    sourceName: 'MDN Web Docs',
  },
  {
    id: 'zenodo-001',
    title: 'ImageNet Large Scale Visual Recognition Challenge Dataset',
    authors: ['Olga Russakovsky', 'Jia Deng', 'Hao Su', 'Jonathan Krause'],
    description: 'A benchmark dataset for object category classification and detection on hundreds of categories and millions of images. Used extensively in computer vision research.',
    url: 'https://zenodo.org/records/1234567',
    publishedDate: '2015-01-30',
    contentType: 'dataset',
    sourceName: 'Zenodo',
  },
  {
    id: 'oalex-001',
    title: 'Generative Adversarial Networks',
    authors: ['Ian J. Goodfellow', 'Jean Pouget-Abadie', 'Mehdi Mirza'],
    description: 'We propose a new framework for estimating generative models via an adversarial process. We simultaneously train two models: a generative model G and a discriminative model D.',
    url: 'https://openalex.org/W2100895617',
    publishedDate: '2014-06-10',
    contentType: 'paper',
    sourceName: 'OpenAlex',
  },
  {
    id: 'core-001',
    title: 'Reinforcement Learning: An Introduction',
    authors: ['Richard S. Sutton', 'Andrew G. Barto'],
    description: 'The most comprehensive and up-to-date textbook on reinforcement learning. Covers multi-armed bandits, Markov decision processes, temporal-difference learning, and policy gradient methods.',
    url: 'https://core.ac.uk/outputs/12345678',
    publishedDate: '2018-11-13',
    contentType: 'book',
    sourceName: 'CORE',
  },
  {
    id: 'datagov-001',
    title: 'U.S. Federal AI Use Cases Inventory',
    authors: [{ name: 'U.S. Government Accountability Office' }],
    description: 'A comprehensive dataset of artificial intelligence use cases reported by federal agencies. Includes information on AI applications in healthcare, defense, transportation, and public safety.',
    url: 'https://catalog.data.gov/dataset/ai-use-cases',
    publishedDate: '2024-03-01',
    contentType: 'dataset',
    sourceName: 'Data.gov',
  },
];

MOCK_RESULTS.forEach(r => resultCache.set(r.id, r));

function mockSearch(query, options = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      let results = [...MOCK_RESULTS];

      // Filter by query (simple text match)
      if (query) {
        const q = query.toLowerCase();
        results = results.filter(
          (r) =>
            r.title.toLowerCase().includes(q) ||
            r.description.toLowerCase().includes(q) ||
            r.authors.some((a) => a.toLowerCase().includes(q))
        );
      }

      // Filter by type/category
      if (options.type) {
        results = results.filter((r) => r.contentType === options.type);
      }
      if (options.category && options.category !== 'all') {
        const catMap = {
          books: 'book',
          papers: 'paper',
          datasets: 'dataset',
          patents: 'patent',
          code: 'repository',
          govdocs: 'government',
          docs: 'documentation',
        };
        const mapped = catMap[options.category];
        if (mapped) results = results.filter((r) => r.contentType === mapped);
      }

      // Filter by source
      if (options.source) {
        results = results.filter(
          (r) => r.sourceName.toLowerCase().includes(options.source.toLowerCase())
        );
      }

      // Sort
      if (options.sort === 'date') {
        results.sort((a, b) => new Date(b.publishedDate) - new Date(a.publishedDate));
      }

      // If no query and no filters, return all
      if (!query && !options.type && !options.category) {
        results = MOCK_RESULTS;
      }

      // Build warnings if "few" results
      const warnings = [];
      if (results.length < 3) {
        warnings.push('Some data sources returned no results for this query.');
      }

      // Spell correction mock
      let spellCorrection = null;
      if (query && query.includes('learng')) {
        spellCorrection = query.replace('learng', 'learning');
      }
      if (query && query.includes('machin ')) {
        spellCorrection = query.replace('machin ', 'machine ');
      }

      resolve({
        query,
        total: results.length,
        page: options.page || 1,
        limit: 10,
        results,
        warnings,
        spellCorrection,
        facets: {
          contentType: {
            book: MOCK_RESULTS.filter((r) => r.contentType === 'book').length,
            paper: MOCK_RESULTS.filter((r) => r.contentType === 'paper').length,
            dataset: MOCK_RESULTS.filter((r) => r.contentType === 'dataset').length,
            patent: MOCK_RESULTS.filter((r) => r.contentType === 'patent').length,
            repository: MOCK_RESULTS.filter((r) => r.contentType === 'repository').length,
            government: MOCK_RESULTS.filter((r) => r.contentType === 'government').length,
            documentation: MOCK_RESULTS.filter((r) => r.contentType === 'documentation').length,
          },
          sources: [...new Set(MOCK_RESULTS.map((r) => r.sourceName))],
        },
      });
    }, 400 + Math.random() * 300); // Simulate latency
  });
}

function mockAutocomplete(query) {
  const suggestions = [
    { text: 'machine learning', type: 'topic' },
    { text: 'machine learning algorithms', type: 'topic' },
    { text: 'machine learning with python', type: 'book' },
    { text: 'deep learning', type: 'topic' },
    { text: 'deep learning architectures', type: 'paper' },
    { text: 'natural language processing', type: 'topic' },
    { text: 'neural networks from scratch', type: 'book' },
    { text: 'reinforcement learning', type: 'topic' },
    { text: 'computer vision datasets', type: 'dataset' },
    { text: 'transformer models', type: 'paper' },
    { text: 'pytorch tutorials', type: 'docs' },
    { text: 'tensorflow documentation', type: 'docs' },
    { text: 'artificial intelligence patent', type: 'patent' },
    { text: 'convolutional neural networks', type: 'topic' },
    { text: 'GPT architecture', type: 'paper' },
  ];

  return new Promise((resolve) => {
    setTimeout(() => {
      if (!query || query.length < 2) {
        resolve([]);
        return;
      }
      const q = query.toLowerCase();
      const matches = suggestions
        .filter((s) => s.text.toLowerCase().includes(q))
        .slice(0, 7);
      resolve(matches);
    }, 100);
  });
}

function mockAiSummarize(documentId, options = {}) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        documentId,
        length: options.length || 'medium',
        tone: options.tone || 'formal',
        summary:
          'This work presents a novel approach to the field by introducing a framework that combines multiple techniques for improved performance. The authors demonstrate significant improvements over baseline methods through extensive experimentation on benchmark datasets. Key contributions include: (1) a new architecture that reduces computational complexity, (2) a training methodology that improves convergence, and (3) comprehensive ablation studies validating each design choice. The results show state-of-the-art performance across multiple evaluation metrics.',
      });
    }, 800);
  });
}

function mockAiEli5(documentId) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        documentId,
        explanation:
          "Imagine you have a really smart helper that can learn from examples. You show it thousands of pictures of cats and dogs, and eventually it learns to tell them apart on its own. That's basically what this paper is about — but instead of just cats and dogs, it's about teaching computers to understand really complicated things like language, images, and even scientific data. The cool part is that the method they use is much faster and works better than the old ways of doing it!",
      });
    }, 800);
  });
}

function mockAiCite(documentId, format = 'apa') {
  const item = MOCK_RESULTS.find((r) => r.id === documentId) || MOCK_RESULTS[0];
  const authorStr = item.authors.join(', ');
  const year = new Date(item.publishedDate).getFullYear();

  const citations = {
    apa: `${authorStr} (${year}). ${item.title}. Retrieved from ${item.url}`,
    mla: `${authorStr}. "${item.title}." ${item.sourceName}, ${year}. Web. ${item.url}`,
    chicago: `${authorStr}. "${item.title}." ${item.sourceName} (${year}). ${item.url}.`,
    bibtex: `@article{${item.id},\n  title={${item.title}},\n  author={${authorStr}},\n  year={${year}},\n  url={${item.url}}\n}`,
    ris: `TY  - JOUR\nTI  - ${item.title}\nAU  - ${item.authors.join('\nAU  - ')}\nPY  - ${year}\nUR  - ${item.url}\nER  -`,
  };

  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        documentId,
        format,
        citation: citations[format] || citations.apa,
        availableFormats: ['apa', 'mla', 'chicago', 'bibtex', 'ris'],
      });
    }, 500);
  });
}

function mockAiAsk(documentId, question) {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        documentId,
        question,
        answer:
          'Based on the document, the authors used a combination of supervised and self-supervised learning techniques. Specifically, they employed a pre-training phase on a large unlabeled corpus followed by fine-tuning on task-specific labeled data. The key innovation was using a masked language modeling objective during pre-training, which allowed the model to learn deep bidirectional representations of text.',
        confidence: 0.87,
        sources: ['Section 3.1 — Methodology', 'Section 4.2 — Experimental Setup'],
      });
    }, 1000);
  });
}

function mockAiRecommendations(documentId) {
  const shuffled = [...MOCK_RESULTS].sort(() => Math.random() - 0.5);
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        documentId,
        recommendations: shuffled.slice(0, 5).map((r) => ({
          id: r.id,
          title: r.title,
          authors: r.authors,
          contentType: r.contentType,
          sourceName: r.sourceName,
          similarity: (0.7 + Math.random() * 0.25).toFixed(2),
        })),
      });
    }, 600);
  });
}
