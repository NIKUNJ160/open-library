'use client';

import React, { useState, useEffect } from 'react';
import { getDocumentCitations } from '@/lib/api';
import { X, Copy, Check, Quote, Loader2, AlertCircle } from 'lucide-react';

interface CitationModalProps {
  documentId: string;
  documentTitle: string;
  isOpen?: boolean;
  onClose: () => void;
}

type CitationStyle = 'bibtex' | 'apa' | 'mla' | 'chicago';

export const CitationModal: React.FC<CitationModalProps> = ({
  documentId,
  documentTitle,
  isOpen = true,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<CitationStyle>('bibtex');
  const [citations, setCitations] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen || !documentId) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setCopied(false);

    getDocumentCitations(documentId)
      .then((res) => {
        if (isMounted) {
          setCitations(res.citations || {});
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || 'Failed to fetch citations');
        }
      })
      .finally(() => {
        if (isMounted) setLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [isOpen, documentId]);

  // Handle ESC key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentCitation = citations[activeTab] || '';

  const handleCopy = async () => {
    if (!currentCitation) return;
    try {
      await navigator.clipboard.writeText(currentCitation);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.error('Failed to copy citation:', e);
    }
  };

  const tabs: { key: CitationStyle; label: string }[] = [
    { key: 'bibtex', label: 'BibTeX' },
    { key: 'apa', label: 'APA (7th)' },
    { key: 'mla', label: 'MLA (9th)' },
    { key: 'chicago', label: 'Chicago' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-library-dark/60 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-library-bg rounded-xl shadow-2xl border border-library-border overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-library-border bg-library-card">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-library-accent/10 text-library-accent">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-editorial text-lg font-bold text-library-dark">Export Citation</h3>
              <p className="text-xs text-library-secondary max-w-md truncate">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-library-muted hover:text-library-dark hover:bg-library-border/50 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Tabs */}
        <div className="flex border-b border-library-border bg-library-card/50 px-6 pt-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCopied(false);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-[2px] ${
                activeTab === tab.key
                  ? 'bg-library-bg text-library-accent border-library-accent shadow-xs'
                  : 'text-library-secondary hover:text-library-dark border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-library-muted">
              <Loader2 className="w-6 h-6 animate-spin text-library-accent mb-2" />
              <p className="text-xs">Generating citation...</p>
            </div>
          )}

          {error && (
            <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 flex items-start gap-3 text-amber-800 text-xs">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5 text-amber-600" />
              <div>
                <p className="font-semibold">Unable to generate citation</p>
                <p className="mt-0.5 text-amber-700">{error}</p>
              </div>
            </div>
          )}

          {!loading && !error && (
            <div>
              <div className="relative">
                <pre className="p-4 rounded-xl bg-library-dark text-[#F7F5F0] font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 border border-stone-800 select-all">
                  {currentCitation || 'Citation not available for this format.'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-library-card border-t border-library-border">
          <span className="text-[11px] text-library-muted">
            Open Library Scholarly Engine • Standards Compliant
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-library-secondary hover:text-library-dark hover:bg-library-border/50 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || !currentCitation}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-library-accent hover:bg-library-accent-hover text-white disabled:opacity-50'
              }`}
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Copied to Clipboard</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Citation</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
