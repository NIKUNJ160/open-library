"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Search,
  Book,
  FileText,
  Database,
  Cpu,
  Landmark,
  BookOpen,
  Sparkles,
  Share2,
  Bookmark,
  ExternalLink,
  ChevronDown,
  CheckCircle2,
} from "lucide-react";

export default function Home() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("all");
  const [activeSourceFilter, setActiveSourceFilter] = useState("all");
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?q=${encodeURIComponent(query.trim())}&category=${category}`);
  };

  const categories = [
    { id: "all", label: "All", icon: Search },
    { id: "books", label: "Books", icon: Book },
    { id: "papers", label: "Research Papers", icon: FileText },
    { id: "datasets", label: "Datasets", icon: Database },
    { id: "patents", label: "Patents", icon: Cpu },
    { id: "repos", label: "Repositories", icon: BookOpen },
    { id: "gov", label: "Gov Pubs", icon: Landmark },
  ];

  const sourcesList = [
    // Books
    { name: "Open Library", cat: "books", desc: "Millions of cataloged books and public domain scans" },
    { name: "Project Gutenberg", cat: "books", desc: "Over 70,000 free digital classic books" },
    { name: "Standard Ebooks", cat: "books", desc: "Carefully typeset public domain editions" },
    { name: "Wikisource", cat: "books", desc: "Free-content library of primary source texts" },
    { name: "HathiTrust", cat: "books", desc: "Research library digital repository" },
    { name: "Google Books", cat: "books", desc: "Comprehensive global book metadata index" },
    
    // Research Papers
    { name: "arXiv", cat: "papers", desc: "Open access to 2M+ physics, math, and CS preprints" },
    { name: "PubMed", cat: "papers", desc: "Biomedical literature from MEDLINE and life sciences" },
    { name: "Europe PMC", cat: "papers", desc: "Worldwide life sciences academic articles" },
    { name: "DOAJ", cat: "papers", desc: "Directory of Open Access peer-reviewed journals" },
    { name: "OpenAlex", cat: "papers", desc: "Catalog of 250M+ scientific scholarly papers" },
    { name: "CORE", cat: "papers", desc: "Aggregator of world open access research papers" },
    { name: "Semantic Scholar", cat: "papers", desc: "AI-powered academic research literature" },
    { name: "PLOS ONE", cat: "papers", desc: "Peer-reviewed multidisciplinary open-access science" },
    { name: "bioRxiv", cat: "papers", desc: "Preprint server for biology and genetics" },
    { name: "medRxiv", cat: "papers", desc: "Preprint server for clinical and health sciences" },
    { name: "SSRN", cat: "papers", desc: "Preprints for social science and economics" },

    // Datasets
    { name: "Kaggle", cat: "datasets", desc: "Machine learning and data science community datasets" },
    { name: "Hugging Face", cat: "datasets", desc: "AI model training and benchmarking datasets" },
    { name: "Zenodo", cat: "datasets", desc: "CERN open-science research data repository" },
    { name: "Dryad", cat: "datasets", desc: "Curated general research scientific data" },
    { name: "Data.gov", cat: "datasets", desc: "U.S. government open public datasets" },
    { name: "Our World In Data", cat: "datasets", desc: "Global statistics and research on world challenges" },

    // Patents
    { name: "Google Patents", cat: "patents", desc: "Over 120M patent publications worldwide" },
    { name: "USPTO", cat: "patents", desc: "United States Patent and Trademark Office" },
    { name: "WIPO PATENTSCOPE", cat: "patents", desc: "International patent applications repository" },
    { name: "EPO Espacenet", cat: "patents", desc: "European Patent Office database" },

    // Repos & Gov
    { name: "GitHub", cat: "repos", desc: "Open-source research code and software repositories" },
    { name: "GitLab", cat: "repos", desc: "Public scientific algorithms and software repositories" },
    { name: "NASA Open Data", cat: "gov", desc: "Aerospace, astronomy, and planetary science records" },
    { name: "World Bank Data", cat: "gov", desc: "Global economic and human development indicators" },

    // Technical Docs
    { name: "MDN Web Docs", cat: "docs", desc: "Authoritative web standards and technology documentation" },
    { name: "Python Docs", cat: "docs", desc: "Official language specifications and libraries" },
  ];

  const filteredSources = activeSourceFilter === "all"
    ? sourcesList
    : sourcesList.filter((s) => s.cat === activeSourceFilter);

  const faqs = [
    {
      q: "Are the search results and full texts completely free and open-access?",
      a: "Yes. OpenKnowledge indexes only public domain, creative commons, and open-access materials from authoritative repositories (such as arXiv, PubMed, Project Gutenberg, Open Library, and OpenAlex). You can freely read, download, or cite them without paywalls.",
    },
    {
      q: "How does the AI RAG Assistant work?",
      a: "The assistant uses Retrieval-Augmented Generation. When you ask a question or ingest research content, text is chunked and vectorized using Nvidia Llama Nemotron embeddings (1024 dimensions) into a PostgreSQL pgvector database. A high-parameter Llama 3.2 model then generates grounded answers backed by direct citations.",
    },
    {
      q: "Can I export academic citations for my bibliography?",
      a: "Yes! Every research result includes one-click export support for BibTeX, APA, MLA, and Chicago citation formats, which you can save to custom collections.",
    },
    {
      q: "How does OpenKnowledge ensure high performance across 33 APIs?",
      a: "All connectors run concurrently in parallel using Node.js asynchronous I/O with circuit breakers, timeouts, and Redis caching. Results are deduplicated and normalized into a unified schema in sub-second response times.",
    },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": "https://openlibrary.pages.dev/#website",
        "url": "https://openlibrary.pages.dev/",
        "name": "Universal Open Knowledge Search Engine",
        "description": "Federated search engine querying 33 open-access knowledge sources in parallel.",
        "potentialAction": {
          "@type": "SearchAction",
          "target": {
            "@type": "EntryPoint",
            "urlTemplate": "https://openlibrary.pages.dev/search?q={search_term_string}",
          },
          "query-input": "required name=search_term_string",
        },
      },
      {
        "@type": "SoftwareApplication",
        "@id": "https://openlibrary.pages.dev/#software",
        "name": "OpenKnowledge Platform",
        "applicationCategory": "EducationalApplication",
        "operatingSystem": "All",
        "offers": {
          "@type": "Offer",
          "price": "0",
          "priceCurrency": "USD",
        },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="flex flex-1 flex-col items-center justify-center py-8 md:py-16 text-center">
        {/* Hero Badge */}
        <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold text-indigo-400 ring-1 ring-inset ring-indigo-500/20 mb-6">
          <Sparkles className="h-3.5 w-3.5" />
          Federated Across 33 Verified Open Knowledge Sources
        </span>

        {/* Hero Header */}
        <h1 className="text-4xl font-extrabold tracking-tight text-slate-100 sm:text-6xl max-w-4xl leading-tight">
          Federated Search Engine for <span className="text-indigo-400">Open Knowledge</span>
        </h1>
        <p className="mt-4 text-base text-slate-400 max-w-2xl">
          Discover academic papers, public domain books, open datasets, and patents via a unified, AI-powered interface with pgvector RAG and semantic entity exploration.
        </p>

        {/* Search Form */}
        <form onSubmit={handleSearch} className="mt-8 w-full max-w-2xl px-4">
          <div className="relative flex items-center">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search 'quantum computing', 'crispr', 'relativity'..."
              className="w-full rounded-2xl border border-slate-800 bg-slate-900/60 pl-6 pr-32 py-4.5 text-base text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 backdrop-blur-md transition-all shadow-xl"
              required
              autoFocus
            />
            <button
              type="submit"
              className="absolute right-2.5 rounded-xl bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white hover:bg-indigo-500 transition-colors shadow-md shadow-indigo-600/10 flex items-center gap-2"
            >
              <Search className="h-4 w-4" />
              Search
            </button>
          </div>

          {/* Category Filter Pills */}
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            {categories.map((cat) => {
              const Icon = cat.icon;
              const isSelected = category === cat.id;
              return (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategory(cat.id)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-semibold border transition-all ${
                    isSelected
                      ? "bg-indigo-600 border-indigo-500 text-white shadow-lg shadow-indigo-600/20"
                      : "bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {cat.label}
                </button>
              );
            })}
          </div>
        </form>

        {/* Features Showcase Grid */}
        <section className="mt-20 w-full max-w-6xl px-4 text-left">
          <h2 className="text-xl font-bold text-slate-100 text-center mb-2">
            Engineered for Deep Academic & Open Research
          </h2>
          <p className="text-sm text-slate-400 text-center mb-10 max-w-xl mx-auto">
            Combining multi-source parallel federation with local vector indexing and generative AI.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-indigo-500/30 transition-all">
              <div className="inline-flex p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 mb-4">
                <Search className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm mb-1.5">33 Federated Connectors</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Parallel async dispatch across arXiv, PubMed, OpenAlex, Gutenberg, and NASA with Redis caching and deduplication.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-indigo-500/30 transition-all">
              <div className="inline-flex p-2.5 rounded-xl bg-purple-500/10 text-purple-400 mb-4">
                <Sparkles className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm mb-1.5">pgvector RAG Assistant</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Ingest research papers into 1024-dimensional semantic vectors and ask natural language questions grounded in source facts.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-indigo-500/30 transition-all">
              <div className="inline-flex p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 mb-4">
                <Share2 className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm mb-1.5">Knowledge Graph Triples</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Extract Subject-Predicate-Object entity relationships from complex abstracts to visualize concept connections.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-slate-900/40 p-5 hover:border-indigo-500/30 transition-all">
              <div className="inline-flex p-2.5 rounded-xl bg-amber-500/10 text-amber-400 mb-4">
                <Bookmark className="h-5 w-5" />
              </div>
              <h3 className="font-semibold text-slate-200 text-sm mb-1.5">Citations & Collections</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Organize papers into saved reading lists and export citations in BibTeX, APA, MLA, and Chicago styles instantly.
              </p>
            </div>
          </div>
        </section>

        {/* 33 Knowledge Sources Directory */}
        <section className="mt-20 w-full max-w-6xl px-4 text-left">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold text-slate-100">
                Directory of 33 Verified Sources
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Authoritative public repositories queried in real time without paywalls.
              </p>
            </div>

            {/* Filter Pills */}
            <div className="flex flex-wrap gap-1.5">
              {["all", "books", "papers", "datasets", "patents", "repos", "gov", "docs"].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveSourceFilter(tab)}
                  className={`capitalize px-3 py-1 rounded-lg text-xs font-medium border transition-colors ${
                    activeSourceFilter === tab
                      ? "bg-slate-800 border-slate-700 text-indigo-300"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredSources.map((source) => (
              <div
                key={source.name}
                className="flex flex-col justify-between rounded-xl border border-slate-800/80 bg-slate-900/30 p-3.5 hover:border-slate-700 hover:bg-slate-900/60 transition-all"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm text-slate-200">{source.name}</span>
                    <span className="rounded-md bg-slate-800/80 px-2 py-0.5 text-[10px] uppercase font-semibold text-slate-400">
                      {source.cat}
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-400 line-clamp-2">{source.desc}</p>
                </div>
                <div className="mt-3 pt-2 border-t border-slate-800/40 flex items-center justify-between text-[11px] text-slate-500">
                  <span className="inline-flex items-center gap-1 text-emerald-400/90 font-medium">
                    <CheckCircle2 className="h-3 w-3" /> Open Access
                  </span>
                  <Link
                    href={`/search?q=${encodeURIComponent(source.name)}&category=${source.cat}`}
                    className="text-indigo-400 hover:text-indigo-300 transition-colors inline-flex items-center gap-0.5"
                  >
                    Query <ExternalLink className="h-2.5 w-2.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Academic & Open Access FAQ Accordion */}
        <section className="mt-20 w-full max-w-4xl px-4 text-left">
          <h2 className="text-xl font-bold text-slate-100 text-center mb-2">
            Frequently Asked Questions
          </h2>
          <p className="text-xs text-slate-400 text-center mb-8">
            Clear facts on open licensing, AI retrieval grounding, and data freshness.
          </p>

          <div className="space-y-3">
            {faqs.map((faq, index) => {
              const isOpen = openFaq === index;
              return (
                <div
                  key={index}
                  className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden transition-colors"
                >
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : index)}
                    className="w-full flex items-center justify-between p-4 text-left text-sm font-semibold text-slate-200 hover:text-white"
                  >
                    <span>{faq.q}</span>
                    <ChevronDown
                      className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${
                        isOpen ? "rotate-180 text-indigo-400" : ""
                      }`}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-4 text-xs text-slate-400 leading-relaxed border-t border-slate-800/60 pt-3">
                      {faq.a}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </>
  );
}
