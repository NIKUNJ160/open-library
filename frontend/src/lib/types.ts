export interface SearchResultItem {
  id: string;
  source: string;
  source_id: string;
  title: string;
  snippet: string;
  doc_type: string;
  url?: string | null;
  license: string;
  score: number;
  published_at?: string | null;
  authors?: string[] | null;
}

export interface SearchResponse {
  query: string;
  page: number;
  page_size: number;
  total: number;
  search_time_ms?: number;
  reranked?: boolean;
  results: SearchResultItem[];
}

export interface ChunkDetail {
  chunk_index: number;
  text: string;
}

export interface EntityMention {
  id: number;
  name: string;
  entity_type: string;
  role: string;
  external_id?: string | null;
}

export interface DocumentDetail {
  id: string;
  source: string;
  source_id: string;
  title: string;
  content?: string | null;
  doc_type: string;
  url?: string | null;
  published_at?: string | null;
  language: string;
  license: string;
  metadata_json?: Record<string, any> | null;
  created_at: string;
  updated_at: string;
  chunks?: ChunkDetail[];
  entities?: EntityMention[];
}

export interface CitationResponse {
  document_id: string;
  format: string;
  citation: string;
}

export interface AllCitationsResponse {
  document_id: string;
  citations: {
    bibtex: string;
    apa: string;
    mla: string;
    chicago: string;
    [key: string]: string;
  };
}

export interface SourceCitation {
  doc_id: string;
  source: string;
  source_id: string;
  title: string;
  url?: string | null;
  license: string;
  snippet: string;
}

export interface AskRequest {
  question: string;
  top_k?: number;
  stream?: boolean;
}

export interface AskResponse {
  question: string;
  answer: string;
  sources: SourceCitation[];
}

export interface LinkedDocumentSummary {
  id: string;
  title: string;
  source: string;
  doc_type: string;
  role: string;
  url?: string | null;
  published_at?: string | null;
}

export interface EntitySummary {
  id: number;
  name: string;
  entity_type: string;
  description?: string | null;
  external_id?: string | null;
  source?: string | null;
  doc_count: number;
}

export interface EntityDetail {
  id: number;
  name: string;
  entity_type: string;
  description?: string | null;
  external_id?: string | null;
  source?: string | null;
  aliases?: string[] | null;
  linked_documents: LinkedDocumentSummary[];
}

export interface EntityListResponse {
  total: number;
  page: number;
  page_size: number;
  items: EntitySummary[];
}

export interface GraphNode {
  id: string;
  label: string;
  category: "entity" | "document" | string;
  type: string;
  entity_id?: number | null;
  document_id?: string | null;
  description?: string | null;
  external_id?: string | null;
  source?: string | null;
  url?: string | null;
  is_root?: boolean;
  size?: number;
  doc_count?: number;
  x?: number;
  y?: number;
  vx?: number;
  vy?: number;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
  weight?: number;
}

export interface GraphResponse {
  root_id?: string | null;
  nodes: GraphNode[];
  edges: GraphEdge[];
}
