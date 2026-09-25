import {
  SearchResponse,
  DocumentDetail,
  AllCitationsResponse,
  CitationResponse,
  AskRequest,
  AskResponse,
  SourceCitation,
  EntityListResponse,
  EntityDetail,
  GraphResponse,
} from './types';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

export async function searchDocuments(params: {
  q: string;
  source?: string;
  doc_type?: string;
  page?: number;
  page_size?: number;
  enable_rerank?: boolean;
}): Promise<SearchResponse> {
  const query = new URLSearchParams();
  query.set('q', params.q);
  if (params.source) query.set('source', params.source);
  if (params.doc_type) query.set('doc_type', params.doc_type);
  if (params.page) query.set('page', params.page.toString());
  if (params.page_size) query.set('page_size', params.page_size.toString());
  if (params.enable_rerank !== undefined) query.set('enable_rerank', params.enable_rerank.toString());

  const res = await fetch(`${API_BASE}/search?${query.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Search failed: ${res.statusText}`);
  }

  return res.json();
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  const res = await fetch(`${API_BASE}/documents/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load document: ${res.statusText}`);
  }

  return res.json();
}

export async function getDocumentCitations(id: string): Promise<AllCitationsResponse> {
  const res = await fetch(`${API_BASE}/documents/${id}/citations`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load citations: ${res.statusText}`);
  }

  return res.json();
}

export async function getDocumentCitation(id: string, format: string = 'bibtex'): Promise<CitationResponse> {
  const res = await fetch(`${API_BASE}/documents/${id}/citation?format=${encodeURIComponent(format)}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load citation: ${res.statusText}`);
  }

  return res.json();
}

export async function askQuestion(req: AskRequest): Promise<AskResponse> {
  const res = await fetch(`${API_BASE}/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ...req, stream: false }),
  });

  if (!res.ok) {
    throw new Error(`Failed to ask question: ${res.statusText}`);
  }

  return res.json();
}

export async function streamAskQuestion(
  question: string,
  top_k: number = 5,
  callbacks: {
    onSources?: (sources: SourceCitation[]) => void;
    onToken?: (token: string) => void;
    onDone?: () => void;
    onError?: (error: Error) => void;
  }
): Promise<() => void> {
  const controller = new AbortController();

  (async () => {
    try {
      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, top_k, stream: true }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error(`RAG stream failed: ${res.statusText}`);
      }

      if (!res.body) {
        throw new Error('Response body is null');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const dataStr = trimmed.slice(6);
            try {
              const parsed = JSON.parse(dataStr);
              if (parsed.event === 'sources' && callbacks.onSources) {
                callbacks.onSources(parsed.sources || []);
              } else if (parsed.event === 'token' && callbacks.onToken) {
                callbacks.onToken(parsed.token || '');
              } else if (parsed.event === 'done' && callbacks.onDone) {
                callbacks.onDone();
              }
            } catch (err) {
              // Ignore non-json or incomplete lines
            }
          }
        }
      }
      if (callbacks.onDone) callbacks.onDone();
    } catch (err: any) {
      if (err.name !== 'AbortError' && callbacks.onError) {
        callbacks.onError(err);
      }
    }
  })();

  return () => controller.abort();
}

export async function getEntities(params?: {
  q?: string;
  entity_type?: string;
  page?: number;
  page_size?: number;
}): Promise<EntityListResponse> {
  const query = new URLSearchParams();
  if (params?.q) query.set('q', params.q);
  if (params?.entity_type) query.set('entity_type', params.entity_type);
  if (params?.page) query.set('page', params.page.toString());
  if (params?.page_size) query.set('page_size', params.page_size.toString());

  const res = await fetch(`${API_BASE}/entities?${query.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load entities: ${res.statusText}`);
  }

  return res.json();
}

export async function getEntity(id: number): Promise<EntityDetail> {
  const res = await fetch(`${API_BASE}/entities/${id}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load entity: ${res.statusText}`);
  }

  return res.json();
}

export async function getEntityGraph(
  id: number,
  params?: { max_docs?: number; max_co_entities?: number }
): Promise<GraphResponse> {
  const query = new URLSearchParams();
  if (params?.max_docs) query.set('max_docs', params.max_docs.toString());
  if (params?.max_co_entities) query.set('max_co_entities', params.max_co_entities.toString());

  const res = await fetch(`${API_BASE}/entities/${id}/graph?${query.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load entity graph: ${res.statusText}`);
  }

  return res.json();
}

export async function getGraphOverview(params?: {
  limit_entities?: number;
  limit_edges?: number;
}): Promise<GraphResponse> {
  const query = new URLSearchParams();
  if (params?.limit_entities) query.set('limit_entities', params.limit_entities.toString());
  if (params?.limit_edges) query.set('limit_edges', params.limit_edges.toString());

  const res = await fetch(`${API_BASE}/graph/overview?${query.toString()}`, {
    cache: 'no-store',
  });

  if (!res.ok) {
    throw new Error(`Failed to load graph overview: ${res.statusText}`);
  }

  return res.json();
}
