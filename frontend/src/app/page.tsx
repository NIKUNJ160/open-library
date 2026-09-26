'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { BookCard } from '@/components/BookCard';
import { SearchResultItem } from '@/lib/types';
import { 
  Search, 
  BookOpen, 
  ArrowRight, 
  Sparkles, 
  Quote, 
  Layers, 
  Compass, 
  UserCheck, 
  FileText,
  TrendingUp,
  Globe
} from 'lucide-react';

// Curated landmark corpus samples for the editorial homepage presentation
const FEATURED_WORKS: SearchResultItem[] = [
  {
    id: '11111111-1111-1111-1111-111111111111',
    source: 'openlibrary',
    source_id: 'OL45804W',
    title: 'On the Origin of Species',
    snippet: 'On the Origin of Species by Means of Natural Selection, published in 1859, is the foundational work of evolutionary biology.',
    doc_type: 'book',
    url: 'https://openlibrary.org/works/OL45804W',
    license: 'Public Domain',
    score: 99.4,
    published_at: '1859-11-24',
    authors: ['Charles Darwin'],
    has_fulltext: true,
    ia_id: 'originofspecies00darwuoft',
    cover_url: 'https://covers.openlibrary.org/b/id/7153600-L.jpg',
  },
  {
    id: '22222222-2222-2222-2222-222222222222',
    source: 'openlibrary',
    source_id: 'OL27479W',
    title: 'Relativity: The Special and General Theory',
    snippet: 'Albert Einstein\'s landmark explanation of relativity for the general reader, exploring gravitation, spacetime curvature, and the speed of light.',
    doc_type: 'book',
    url: 'https://openlibrary.org/works/OL27479W',
    license: 'Public Domain',
    score: 98.7,
    published_at: '1916-01-01',
    authors: ['Albert Einstein'],
    has_fulltext: true,
    ia_id: 'relativityspecia00einsuoft',
    cover_url: 'https://covers.openlibrary.org/b/id/7414859-L.jpg',
  },
  {
    id: '33333333-3333-3333-3333-333333333333',
    source: 'openalex',
    source_id: 'W2741809807',
    title: 'Attention Is All You Need',
    snippet: 'We propose the Transformer, a model architecture eschewing recurrence and relying on attention mechanisms to draw global dependencies.',
    doc_type: 'paper',
    url: 'https://arxiv.org/abs/1706.03762',
    license: 'CC-BY-4.0',
    score: 98.2,
    published_at: '2017-06-12',
    authors: ['Ashish Vaswani', 'Noam Shazeer', 'Illia Polosukhin'],
    has_fulltext: true,
    cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/87/Transformer_architecture.png/600px-Transformer_architecture.png',
  },
  {
    id: '44444444-4444-4444-4444-444444444444',
    source: 'europepmc',
    source_id: 'PMC6541524',
    title: 'A programmable dual-RNA-guided DNA endonuclease in adaptive bacterial immunity',
    snippet: 'Here, we show that the Cas9 endonuclease is guided by dual-RNA structures to direct site-specific cleavage of target double-stranded DNA.',
    doc_type: 'paper',
    url: 'https://europepmc.org/articles/PMC6541524',
    license: 'Open Access',
    score: 97.9,
    published_at: '2012-06-28',
    authors: ['Jennifer A Doudna', 'Emmanuelle Charpentier'],
    has_fulltext: true,
    cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/7/7b/CRISPR-Cas9.svg/600px-CRISPR-Cas9.svg.png',
  },
  {
    id: '55555555-5555-5555-5555-555555555555',
    source: 'crossref',
    source_id: '10.1038/171737a0',
    title: 'Molecular Structure of Nucleic Acids: A Structure for Deoxyribose Nucleic Acid',
    snippet: 'We wish to suggest a structure for the salt of deoxyribose nucleic acid (D.N.A.). This structure has novel features of considerable biological interest.',
    doc_type: 'paper',
    url: 'https://doi.org/10.1038/171737a0',
    license: 'Open Access',
    score: 96.5,
    published_at: '1953-04-25',
    authors: ['J. D. Watson', 'F. H. C. Crick'],
    has_fulltext: true,
    cover_url: 'https://upload.wikimedia.org/wikipedia/commons/thumb/d/d3/Photo_51_x-ray_diffraction_image.jpg/600px-Photo_51_x-ray_diffraction_image.jpg',
  },
  {
    id: '66666666-6666-6666-6666-666666666666',
    source: 'openlibrary',
    source_id: 'OL847291W',
    title: 'A Brief History of Time',
    snippet: 'A landmark book exploring the origins, nature, and fate of the universe, covering black holes, space-time, and quantum cosmology.',
    doc_type: 'book',
    url: 'https://openlibrary.org/works/OL847291W',
    license: 'CC-BY',
    score: 95.8,
    published_at: '1988-04-01',
    authors: ['Stephen Hawking'],
    has_fulltext: true,
    ia_id: 'briefhistoryofti0000hawk_s1w1',
    cover_url: 'https://archive.org/services/img/briefhistoryofti0000hawk_s1w1',
  }
];

const SUBJECTS_MATRIX = [
  { name: 'Physics & Relativity', count: '14,200+ works', slug: 'Physics' },
  { name: 'Evolutionary Biology', count: '9,800+ works', slug: 'Biology' },
  { name: 'Artificial Intelligence', count: '24,500+ works', slug: 'Artificial Intelligence' },
  { name: 'Quantum Mechanics', count: '11,400+ works', slug: 'Quantum Mechanics' },
  { name: 'Philosophy & Ethics', count: '8,600+ works', slug: 'Philosophy' },
  { name: 'Biomedicine & Genetics', count: '18,300+ works', slug: 'Genetics' },
  { name: 'Economics & Society', count: '7,400+ works', slug: 'Economics' },
  { name: 'World History', count: '12,900+ works', slug: 'History' },
];

const TRENDING_SCHOLARS = [
  { name: 'Albert Einstein', field: 'Theoretical Physics', id: 1, orcid: 'Wikidata Q937', works: '12 Works' },
  { name: 'Charles Darwin', field: 'Natural History & Biology', id: 2, orcid: 'Wikidata Q1035', works: '8 Works' },
  { name: 'Jennifer A Doudna', field: 'CRISPR & Biochemistry', id: 3, orcid: '0000-0001-9161-999X', works: '14 Works' },
  { name: 'Ashish Vaswani', field: 'Machine Learning', id: 4, orcid: '0000-0001-9266-5647', works: '6 Works' },
];

export default function EditorialHomePage() {
  const router = useRouter();
  const [heroQuery, setHeroQuery] = useState('');

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (heroQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(heroQuery.trim())}`);
    }
  };

  return (
    <div className="space-y-16 sm:space-y-24">
      {/* 1. Hero & Central Search Section */}
      <section className="pt-12 sm:pt-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center space-y-8">
        <div className="space-y-4">
          <span className="text-[11px] uppercase tracking-[0.25em] font-bold text-library-accent">
            Curated Public Domain & Scholarly Literature
          </span>
          <h1 className="font-editorial text-4xl sm:text-6xl md:text-7xl font-bold tracking-tight text-library-dark leading-[1.08]">
            THE WORLD&apos;S KNOWLEDGE,<br />AT YOUR FINGERTIPS
          </h1>
          <p className="text-base sm:text-lg text-library-secondary max-w-2xl mx-auto leading-relaxed">
            Discover books, authors, subjects, and foundational ideas from a growing open digital
            library spanning classic literature, encyclopedias, and peer-reviewed science.
          </p>
        </div>

        {/* Hero Search Field */}
        <div className="max-w-2xl mx-auto">
          <form onSubmit={handleHeroSearch} className="relative shadow-sm">
            <Search className="w-5 h-5 text-library-muted absolute left-4 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              id="hero-search-input"
              name="q"
              type="search"
              value={heroQuery}
              onChange={(e) => setHeroQuery(e.target.value)}
              placeholder="Search books, authors, subjects, ISBNs, or DOIs..."
              aria-label="Search books, authors, subjects, ISBNs, or DOIs"
              autoComplete="off"
              className="w-full bg-white border-2 border-library-border rounded-md pl-12 pr-32 py-4 text-sm sm:text-base text-library-dark placeholder-library-muted focus:outline-none focus:border-library-accent transition"
            />
            <button
              type="submit"
              className="absolute right-2 top-1/2 -translate-y-1/2 px-5 py-2.5 rounded-md bg-library-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-library-accent-hover transition"
            >
              Search
            </button>
          </form>

          {/* Search Suggestion Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-4 text-xs text-library-secondary">
            <span className="font-semibold text-library-muted">Popular Inquiries:</span>
            {['Origin of Species', 'Theory of Relativity', 'Attention Is All You Need', 'Quantum mechanics', 'CRISPR Cas9'].map((tag) => (
              <Link
                key={tag}
                href={`/search?q=${encodeURIComponent(tag)}`}
                className="px-2.5 py-1 rounded bg-library-card border border-library-border/80 hover:border-library-accent hover:text-library-accent transition"
              >
                {tag}
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* 2. Library Statistics Strip */}
      <section className="border-y border-library-border bg-library-card">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center divide-x-0 md:divide-x divide-library-border">
            <div className="space-y-1 px-4">
              <span className="font-editorial text-3xl sm:text-4xl font-black text-library-dark">2.4M+</span>
              <p className="text-xs uppercase tracking-wider font-semibold text-library-secondary">Books & Works</p>
            </div>
            <div className="space-y-1 px-4">
              <span className="font-editorial text-3xl sm:text-4xl font-black text-library-dark">180K+</span>
              <p className="text-xs uppercase tracking-wider font-semibold text-library-secondary">Scholars & Authors</p>
            </div>
            <div className="space-y-1 px-4">
              <span className="font-editorial text-3xl sm:text-4xl font-black text-library-dark">120+</span>
              <p className="text-xs uppercase tracking-wider font-semibold text-library-secondary">Languages Indexed</p>
            </div>
            <div className="space-y-1 px-4">
              <span className="font-editorial text-3xl sm:text-4xl font-black text-library-accent">100%</span>
              <p className="text-xs uppercase tracking-wider font-semibold text-library-secondary">Open Access & Transparent</p>
            </div>
          </div>
        </div>
      </section>

      {/* 3. Featured Collection & Editor's Showcase */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-library-border pb-4 mb-8 flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-library-accent">
              Curated Selection
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark">
              Featured Collection: Foundations of Modern Science
            </h2>
          </div>
          <Link
            href="/search?q=physics biology"
            className="text-xs uppercase font-bold tracking-wider text-library-accent hover:underline flex items-center gap-1"
          >
            <span>View Collection</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        {/* Large Editorial Card + Supporting Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Main Hero Book Card */}
          <div className="lg:col-span-6 bg-white border border-library-border rounded-md p-6 sm:p-8 flex flex-col sm:flex-row gap-6 justify-between items-start">
            <Link
              href="/document/11111111-1111-1111-1111-111111111111"
              className="w-32 sm:w-44 aspect-[2/3] shrink-0 rounded bg-stone-900 border border-stone-800 shadow-md relative overflow-hidden group hover:scale-[1.02] transition-transform hidden sm:block"
            >
              <img
                src="https://covers.openlibrary.org/b/id/7153600-L.jpg"
                alt="On the Origin of Species original cover"
                className="w-full h-full object-cover"
              />
              <div className="absolute left-0 top-0 bottom-0 w-3 bg-gradient-to-r from-black/60 to-transparent pointer-events-none" />
            </Link>
            <div className="flex flex-col justify-between h-full space-y-4 flex-1">
              <div>
                <div className="flex items-center justify-between text-xs text-library-muted mb-2">
                  <span className="uppercase tracking-widest font-semibold text-library-accent">
                    Editor&apos;s Landmark Pick
                  </span>
                  <span className="font-mono">1859 • Classic</span>
                </div>
                <h3 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark leading-snug">
                  On the Origin of Species by Means of Natural Selection
                </h3>
                <p className="text-sm text-library-secondary font-medium italic pt-1">
                  By Charles Darwin
                </p>
                <p className="text-sm text-library-secondary leading-relaxed pt-2">
                  Published on 24 November 1859, Darwin&apos;s masterwork introduced the scientific
                  theory that biological populations evolve over generations through natural
                  selection, fundamentally reshaping humanity&apos;s understanding of life on Earth.
                </p>
              </div>

              <div className="pt-6 border-t border-library-border/80 flex items-center gap-4 flex-wrap">
                <Link
                  href="/read/11111111-1111-1111-1111-111111111111"
                  className="px-5 py-2.5 rounded-md bg-library-accent text-white text-xs font-bold uppercase tracking-wider hover:bg-library-accent-hover transition flex items-center gap-2"
                >
                  <BookOpen className="w-4 h-4" />
                  <span>Read Online</span>
                </Link>
                <Link
                  href="/document/11111111-1111-1111-1111-111111111111"
                  className="px-4 py-2.5 rounded-md border border-library-border hover:bg-library-card text-xs font-semibold text-library-dark transition"
                >
                  Bibliographic Record
                </Link>
              </div>
            </div>
          </div>

          {/* Supporting 2 Books */}
          <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
            {FEATURED_WORKS.slice(1, 3).map((work) => (
              <BookCard key={work.id} item={work} />
            ))}
          </div>
        </div>
      </section>

      {/* 4. Popular Books & Works Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-library-border pb-4 mb-8 flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-library-muted">
              Most Discovered
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark">
              Popular in the Library
            </h2>
          </div>
          <Link
            href="/search"
            className="text-xs uppercase font-bold tracking-wider text-library-accent hover:underline flex items-center gap-1"
          >
            <span>Explore All</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {FEATURED_WORKS.map((work) => (
            <BookCard key={work.id} item={work} />
          ))}
        </div>
      </section>

      {/* 5. Explore by Subject (Text-First Matrix) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-library-border pb-4 mb-8">
          <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-library-muted">
            Thematic Classification
          </span>
          <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark">
            Explore by Subject
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {SUBJECTS_MATRIX.map((subj) => (
            <Link
              key={subj.name}
              href={`/search?q=${encodeURIComponent(subj.slug)}`}
              className="p-5 rounded-md bg-white border border-library-border hover:border-library-accent transition group"
            >
              <h3 className="font-editorial text-base font-bold text-library-dark group-hover:text-library-accent transition">
                {subj.name}
              </h3>
              <p className="text-xs text-library-muted mt-1 font-mono">{subj.count}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* 6. Editorial Section: Bloomberg-Style Split View */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Left: Magazine-style Essay */}
          <div className="lg:col-span-7 bg-white border border-library-border rounded-md p-6 sm:p-8 space-y-4">
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-library-accent">
              From the Library
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark leading-snug">
              Preserving Public Knowledge in the Era of Machine Intelligence
            </h2>
            <p className="text-sm text-library-secondary leading-relaxed">
              Archival libraries have served as civilizational anchors for millennia. In the age of
              generative language models, providing verifiable provenance, cryptographic DOI
              citations, and unconstrained public domain access is more crucial than ever before.
            </p>
            <p className="text-sm text-library-secondary leading-relaxed">
              The Open Library Knowledge Engine combines the rigor of classical bibliographic
              cataloging with dense semantic vector search, neural rerankers, and citation-grounded
              reasoning to make humanity&apos;s scholarship freely accessible to all.
            </p>
            <div className="pt-4 border-t border-library-border/80 flex items-center justify-between text-xs text-library-muted">
              <span>Published by Library Editorial Board</span>
              <Link href="/ask" className="text-library-accent font-bold hover:underline flex items-center gap-1">
                <span>Ask AI Assistant</span>
                <Sparkles className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>

          {/* Right: Trending Scholars & Authors */}
          <div className="lg:col-span-5 bg-library-card border border-library-border rounded-md p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-library-border">
              <span className="text-xs uppercase font-bold text-library-dark tracking-wider">
                Trending Scholars
              </span>
              <Link href="/graph" className="text-xs text-library-accent font-bold hover:underline">
                View Graph →
              </Link>
            </div>

            <div className="divide-y divide-library-border/60">
              {TRENDING_SCHOLARS.map((author) => (
                <div key={author.id} className="py-3.5 first:pt-0 last:pb-0 flex items-center justify-between">
                  <div>
                    <Link
                      href={`/entity/${author.id}`}
                      className="font-editorial font-bold text-sm text-library-dark hover:text-library-accent transition block"
                    >
                      {author.name}
                    </Link>
                    <p className="text-xs text-library-secondary">{author.field}</p>
                    <span className="text-[10px] font-mono text-library-muted">
                      {author.orcid}
                    </span>
                  </div>
                  <span className="text-xs font-semibold px-2 py-1 rounded bg-white border border-library-border text-library-dark">
                    {author.works}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* 7. Latest Additions Dense Table (Section 11) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="border-b border-library-border pb-4 mb-6 flex items-baseline justify-between">
          <div>
            <span className="text-[10px] uppercase font-bold tracking-[0.2em] text-library-muted">
              Catalog Additions
            </span>
            <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark">
              Latest Additions & Scholarly Preprints
            </h2>
          </div>
          <span className="text-xs text-library-muted font-mono">Updated Daily</span>
        </div>

        <div className="overflow-x-auto border border-library-border rounded-md bg-white">
          <table className="w-full text-left text-sm text-library-dark">
            <thead className="bg-library-card border-b border-library-border text-[11px] uppercase tracking-wider text-library-secondary font-semibold">
              <tr>
                <th className="py-3.5 px-4 sm:px-6">Work Title</th>
                <th className="py-3.5 px-4">Author(s)</th>
                <th className="py-3.5 px-4">Year</th>
                <th className="py-3.5 px-4">Source</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-library-border/70 text-xs">
              {FEATURED_WORKS.map((work) => (
                <tr key={work.id} className="hover:bg-library-bg/60 transition">
                  <td className="py-3.5 px-4 sm:px-6 font-bold text-library-dark max-w-xs truncate">
                    <Link href={`/document/${work.id}`} className="hover:text-library-accent">
                      {work.title}
                    </Link>
                  </td>
                  <td className="py-3.5 px-4 text-library-secondary">
                    {work.authors?.join(', ') || 'Various'}
                  </td>
                  <td className="py-3.5 px-4 font-mono text-library-muted">
                    {work.published_at ? new Date(work.published_at).getFullYear() : '—'}
                  </td>
                  <td className="py-3.5 px-4">
                    <span className="uppercase text-[10px] font-bold px-2 py-0.5 rounded bg-library-card border border-library-border">
                      {work.source}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-right space-x-3">
                    <Link
                      href={`/read/${work.id}`}
                      className="text-library-accent font-semibold hover:underline"
                    >
                      Read
                    </Link>
                    <Link
                      href={`/document/${work.id}`}
                      className="text-library-muted hover:text-library-dark"
                    >
                      Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
