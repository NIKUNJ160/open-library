'use client';

import React, { useState, useEffect } from 'react';
import { getDocumentCitations } from '@/lib/api';
import { X, Copy, Check, Quote, Loader2, AlertCircle } from 'lucide-react';

interface CitationModalProps {
  documentId: string;
  documentTitle: string;
  isOpen: boolean;
  onClose: () => void;
}

type CitationStyle = 'bibtex' | 'apa' | 'mla' | 'chicago';

export const CitationModal: React.FC<CitationModalProps> = ({
  documentId,
  documentTitle,
  isOpen,
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
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <Quote className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Export Academic Citation</h3>
              <p className="text-xs text-slate-500 max-w-md truncate">{documentTitle}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Style Tabs */}
        <div className="flex border-b border-slate-200 bg-slate-100/60 px-6 pt-3 gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => {
                setActiveTab(tab.key);
                setCopied(false);
              }}
              className={`px-4 py-2 text-xs font-semibold rounded-t-lg transition border-b-2 -mb-[2px] ${
                activeTab === tab.key
                  ? 'bg-white text-indigo-600 border-indigo-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 border-transparent'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Content Body */}
        <div className="p-6">
          {loading && (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-indigo-600 mb-2" />
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
                <pre className="p-4 rounded-xl bg-slate-900 text-slate-100 font-mono text-xs overflow-x-auto whitespace-pre-wrap leading-relaxed max-h-64 border border-slate-800 select-all">
                  {currentCitation || 'Citation not available for this format.'}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-slate-50 border-t border-slate-100">
          <span className="text-[11px] text-slate-400">
            Open Library Scholarly Engine • Standards Compliant
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 rounded-lg transition"
            >
              Close
            </button>
            <button
              onClick={handleCopy}
              disabled={loading || !currentCitation}
              className={`inline-flex items-center gap-1.5 px-4 py-1.5 text-xs font-semibold rounded-lg shadow-sm transition ${
                copied
                  ? 'bg-emerald-600 text-white'
                  : 'bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50'
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
