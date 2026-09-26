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
import {
  searchPublicCatalog,
  getPublicDocumentDetail,
  getPublicCitations,
  getPublicAskResponse,
} from './publicCatalogSearch';
import {
  getCuratedEntitiesList,
  getCuratedEntityDetail,
  getCuratedGraphData,
} from './curatedCatalog';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api/v1';

// Detect if running in browser under HTTPS while backend is insecure localhost (Mixed Content)
function shouldBypassLocalBackend(): boolean {
  if (typeof window === 'undefined') return false;
  return window.location.protocol === 'https:' && API_BASE.startsWith('http://localhost');
}

export async function searchDocuments(params: {
  q: string;
  source?: string;
  doc_type?: string;
  page?: number;
  page_size?: number;
  enable_rerank?: boolean;
}): Promise<SearchResponse> {
  // If in browser on HTTPS pointing to localhost, bypass to prevent browser mixed-content blockage
  if (!shouldBypassLocalBackend()) {
    try {
      const query = new URLSearchParams();
      query.set('q', params.q);
      if (params.source) query.set('source', params.source);
      if (params.doc_type) query.set('doc_type', params.doc_type);
      if (params.page) query.set('page', params.page.toString());
      if (params.page_size) query.set('page_size', params.page_size.toString());
      if (params.enable_rerank !== undefined) query.set('enable_rerank', params.enable_rerank.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/search?${query.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data = await res.json();
        // If local backend returned records, return them
        if (data && data.results && data.results.length > 0) {
          return data;
        }
      }
    } catch (err) {
      // Backend offline or unreachable
    }
  }

  // Live federated search across Open Library, Wikipedia, and OpenAlex
  return await searchPublicCatalog(params);
}

export async function getDocument(id: string): Promise<DocumentDetail> {
  if (!shouldBypassLocalBackend()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/documents/${id}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Backend unreachable
    }
  }

  // Fetch live document details from Open Library, Wikipedia, or OpenAlex
  return await getPublicDocumentDetail(id);
}

export async function getDocumentCitations(id: string): Promise<AllCitationsResponse> {
  if (!shouldBypassLocalBackend()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/documents/${id}/citations`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Backend unreachable
    }
  }

  return await getPublicCitations(id);
}

export async function getDocumentCitation(id: string, format: string = 'bibtex'): Promise<CitationResponse> {
  const all = await getDocumentCitations(id);
  const key = format.toLowerCase();
  const citation = all.citations[key] || all.citations['bibtex'] || '';
  return {
    document_id: id,
    format,
    citation,
  };
}

export async function askQuestion(req: AskRequest): Promise<AskResponse> {
  if (!shouldBypassLocalBackend()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${API_BASE}/ask`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...req, stream: false }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Backend unreachable
    }
  }

  return await getPublicAskResponse(req.question);
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
  let isCancelled = false;
  const abortController = new AbortController();

  (async () => {
    if (!shouldBypassLocalBackend()) {
      try {
        const res = await fetch(`${API_BASE}/ask`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question, top_k, stream: true }),
          signal: abortController.signal,
        });

        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder('utf-8');
          let buffer = '';

          while (true) {
            if (isCancelled) break;
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
                  // Ignore non-json lines
                }
              }
            }
          }
          if (callbacks.onDone) callbacks.onDone();
          return;
        }
      } catch (err: any) {
        if (err.name === 'AbortError' || isCancelled) return;
      }
    }

    // Live public synthesis using Open Library and Wikipedia
    try {
      const synth = await getPublicAskResponse(question);
      if (isCancelled) return;

      if (callbacks.onSources) {
        callbacks.onSources(synth.sources);
      }

      const words = synth.answer.split(' ');
      let i = 0;
      const interval = setInterval(() => {
        if (isCancelled) {
          clearInterval(interval);
          return;
        }

        if (i < words.length) {
          const wordToken = (i === 0 ? '' : ' ') + words[i];
          if (callbacks.onToken) callbacks.onToken(wordToken);
          i++;
        } else {
          clearInterval(interval);
          if (callbacks.onDone) callbacks.onDone();
        }
      }, 25);
    } catch (e: any) {
      if (callbacks.onError) callbacks.onError(e);
    }
  })();

  return () => {
    isCancelled = true;
    abortController.abort();
  };
}

export async function getEntities(params?: {
  q?: string;
  entity_type?: string;
  page?: number;
  page_size?: number;
}): Promise<EntityListResponse> {
  if (!shouldBypassLocalBackend()) {
    try {
      const query = new URLSearchParams();
      if (params?.q) query.set('q', params.q);
      if (params?.entity_type) query.set('entity_type', params.entity_type);
      if (params?.page) query.set('page', params.page.toString());
      if (params?.page_size) query.set('page_size', params.page_size.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/entities?${query.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Backend unreachable
    }
  }

  return getCuratedEntitiesList(params);
}

export async function getEntity(id: number): Promise<EntityDetail> {
  if (!shouldBypassLocalBackend()) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/entities/${id}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Backend unreachable
    }
  }

  return getCuratedEntityDetail(id);
}

export async function getEntityGraph(
  id: number,
  params?: { max_docs?: number; max_co_entities?: number }
): Promise<GraphResponse> {
  if (!shouldBypassLocalBackend()) {
    try {
      const query = new URLSearchParams();
      if (params?.max_docs) query.set('max_docs', params.max_docs.toString());
      if (params?.max_co_entities) query.set('max_co_entities', params.max_co_entities.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/entities/${id}/graph?${query.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Backend unreachable
    }
  }

  const fullGraph = getCuratedGraphData();
  const entityNodeId = `ent-${id}`;
  const relevantEdges = fullGraph.edges.filter(
    (e) => e.source === entityNodeId || e.target === entityNodeId
  );
  const nodeIds = new Set<string>([entityNodeId]);
  relevantEdges.forEach((e) => {
    nodeIds.add(e.source);
    nodeIds.add(e.target);
  });
  const relevantNodes = fullGraph.nodes.filter((n) => nodeIds.has(n.id));
  return {
    root_id: entityNodeId,
    nodes: relevantNodes.length > 0 ? relevantNodes : fullGraph.nodes.slice(0, 8),
    edges: relevantEdges,
  };
}

export async function getGraphOverview(params?: {
  limit_entities?: number;
  limit_edges?: number;
}): Promise<GraphResponse> {
  if (!shouldBypassLocalBackend()) {
    try {
      const query = new URLSearchParams();
      if (params?.limit_entities) query.set('limit_entities', params.limit_entities.toString());
      if (params?.limit_edges) query.set('limit_edges', params.limit_edges.toString());

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3500);

      const res = await fetch(`${API_BASE}/graph/overview?${query.toString()}`, {
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      // Backend unreachable
    }
  }

  return getCuratedGraphData();
}
