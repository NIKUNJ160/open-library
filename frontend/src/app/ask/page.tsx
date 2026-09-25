'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { streamAskQuestion } from '@/lib/api';
import { SourceCitation } from '@/lib/types';
import { CitationPill } from '@/components/CitationPill';
import {
  Sparkles,
  Send,
  Loader2,
  Trash2,
  BookOpen,
  FileText,
  Globe,
  Layers,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  sources?: SourceCitation[];
  isStreaming?: boolean;
}

const SUGGESTED_QUESTIONS = [
  'What is the Transformer architecture and attention mechanism?',
  'How does CRISPR-Cas9 directed genome editing work?',
  'Explain Albert Einstein\'s General Theory of Relativity.',
  'What are the biological hallmarks of cancer?'
];

export default function AskPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeSources, setActiveSources] = useState<SourceCitation[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<(() => void) | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (questionText?: string) => {
    const q = (questionText || input).trim();
    if (!q || isStreaming) return;

    setInput('');

    const userMsgId = `user-${Date.now()}`;
    const assistantMsgId = `assistant-${Date.now()}`;

    const userMsg: ChatMessage = {
      id: userMsgId,
      sender: 'user',
      text: q
    };

    const initialAssistantMsg: ChatMessage = {
      id: assistantMsgId,
      sender: 'assistant',
      text: '',
      sources: [],
      isStreaming: true
    };

    setMessages((prev) => [...prev, userMsg, initialAssistantMsg]);
    setIsStreaming(true);
    setActiveSources([]);

    let streamedText = '';
    let messageSources: SourceCitation[] = [];

    const cancelFn = await streamAskQuestion(q, 5, {
      onSources: (sources) => {
        messageSources = sources;
        setActiveSources(sources);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, sources } : msg
          )
        );
      },
      onToken: (token) => {
        streamedText += token;
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, text: streamedText } : msg
          )
        );
      },
      onDone: () => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId ? { ...msg, isStreaming: false } : msg
          )
        );
      },
      onError: (err) => {
        setIsStreaming(false);
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === assistantMsgId
              ? {
                  ...msg,
                  text: streamedText || 'An error occurred while synthesizing the answer. Please ensure the backend is running.',
                  isStreaming: false
                }
              : msg
          )
        );
      }
    });

    abortControllerRef.current = cancelFn;
  };

  const handleClear = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current();
    }
    setMessages([]);
    setActiveSources([]);
    setIsStreaming(false);
  };

  const renderFormattedText = (text: string, sources: SourceCitation[] = []) => {
    // Regex matches [1], [2], or lists like [1, 2]
    const regex = /\[(\d+(?:,\s*\d+)*)\]/g;
    const elements: React.ReactNode[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = regex.exec(text)) !== null) {
      // Push text prior to citation
      if (match.index > lastIndex) {
        elements.push(text.slice(lastIndex, match.index));
      }

      // Parse citation numbers, e.g. "1" or "1, 2"
      const indices = match[1].split(',').map((s) => parseInt(s.trim(), 10));
      for (const idx of indices) {
        const sourceItem = sources[idx - 1];
        elements.push(
          <CitationPill key={`cite-${match.index}-${idx}`} index={idx} source={sourceItem} />
        );
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < text.length) {
      elements.push(text.slice(lastIndex));
    }

    return elements;
  };

  const getSourceIcon = (src?: string) => {
    switch (src?.toLowerCase()) {
      case 'openlibrary':
        return <BookOpen className="w-3.5 h-3.5 text-amber-600" />;
      case 'wikipedia':
        return <Globe className="w-3.5 h-3.5 text-sky-600" />;
      case 'openalex':
      case 'crossref':
      case 'europepmc':
        return <FileText className="w-3.5 h-3.5 text-emerald-600" />;
      default:
        return <Layers className="w-3.5 h-3.5 text-indigo-600" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 font-sans">
      {/* Header Banner */}
      <div className="flex flex-wrap items-center justify-between gap-4 pb-6 mb-6 border-b border-library-border">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-library-accent text-white shadow-xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <h1 className="font-editorial text-2xl sm:text-3xl font-bold text-library-dark tracking-tight">
              Ask the Library
            </h1>
          </div>
          <p className="text-xs text-library-secondary mt-1">
            Citation-grounded multi-turn conversational answers backed strictly by verified public knowledge sources.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            onClick={handleClear}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-library-border hover:border-library-dark bg-library-card hover:bg-white text-library-secondary hover:text-library-dark text-xs font-medium transition"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Conversation</span>
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Main Conversation Stream */}
        <div className="lg:col-span-3 flex flex-col h-[70vh] bg-white rounded-xl border border-library-border shadow-xs overflow-hidden">
          {/* Messages Area */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center p-6 space-y-4">
                <div className="p-4 rounded-xl bg-library-card border border-library-border text-library-accent">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div className="max-w-md">
                  <h3 className="font-editorial font-bold text-library-dark text-lg">
                    Inquire Across the Archival Record
                  </h3>
                  <p className="text-xs text-library-secondary mt-1.5 leading-relaxed">
                    Answers are synthesized from retrieved passages in Open Library, Wikipedia, OpenAlex, Crossref, and Europe PMC with inline citation references.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-xl mt-4">
                  {SUGGESTED_QUESTIONS.map((sq, i) => (
                    <button
                      key={i}
                      onClick={() => handleSend(sq)}
                      className="p-3 text-left rounded-lg border border-library-border bg-library-card hover:border-library-accent hover:bg-white transition text-xs font-medium text-library-dark flex items-center justify-between group"
                    >
                      <span className="line-clamp-2">{sq}</span>
                      <ChevronRight className="w-4 h-4 text-library-muted group-hover:text-library-accent flex-shrink-0 ml-2 transition" />
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex flex-col ${
                    msg.sender === 'user' ? 'items-end' : 'items-start'
                  }`}
                >
                  <div className="text-[11px] font-semibold text-library-muted mb-1 px-1">
                    {msg.sender === 'user' ? 'You' : 'Library Knowledge Engine'}
                  </div>
                  <div
                    className={`p-4 rounded-xl max-w-2xl text-sm leading-relaxed ${
                      msg.sender === 'user'
                        ? 'bg-library-accent text-white rounded-tr-xs shadow-xs'
                        : 'bg-library-card text-library-dark border border-library-border rounded-tl-xs whitespace-pre-line'
                    }`}
                  >
                    {msg.sender === 'user' ? (
                      msg.text
                    ) : (
                      <>
                        {renderFormattedText(msg.text, msg.sources)}
                        {msg.isStreaming && (
                          <span className="inline-block w-2 h-4 ml-1 bg-library-accent animate-pulse align-middle" />
                        )}
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Chat Input Bar */}
          <div className="p-4 border-t border-library-border bg-library-card/50">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about research papers, books, biology, physics, philosophy..."
                disabled={isStreaming}
                className="flex-1 px-4 py-2.5 rounded-lg border border-library-border bg-white text-sm text-library-dark placeholder:text-library-muted focus:outline-none focus:border-library-accent focus:ring-1 focus:ring-library-accent transition"
              />
              <button
                type="submit"
                disabled={isStreaming || !input.trim()}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-library-accent hover:bg-library-accent-hover text-white text-xs font-semibold shadow-xs transition disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed"
              >
                {isStreaming ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send</span>
                  </>
                )}
              </button>
            </form>
          </div>
        </div>

        {/* Right Reference Sources Inspector */}
        <aside className="lg:col-span-1 space-y-4">
          <div className="p-4 bg-white rounded-xl border border-library-border shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-library-border pb-3">
              <div className="flex items-center gap-2 font-editorial font-bold text-library-dark text-sm">
                <ShieldCheck className="w-4 h-4 text-emerald-700" />
                <span>Grounding Literature</span>
              </div>
              <span className="px-2 py-0.5 rounded bg-library-card border border-library-border text-[10px] font-mono text-library-secondary">
                {activeSources.length} cited
              </span>
            </div>

            {activeSources.length === 0 ? (
              <div className="text-center py-10 text-library-muted text-xs">
                <p>Retrieved source passages will appear here during synthesis.</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
                {activeSources.map((s, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-lg bg-library-card border border-library-border text-xs space-y-1.5 hover:border-library-accent transition"
                  >
                    <div className="flex items-center justify-between text-[10px] text-library-secondary font-semibold uppercase">
                      <span className="flex items-center gap-1">
                        <span className="px-1.5 py-0.2 rounded bg-library-accent/10 text-library-accent font-bold font-mono">
                          [{idx + 1}]
                        </span>
                        {getSourceIcon(s.source)}
                        <span>{s.source}</span>
                      </span>
                      <span className="text-[9px] lowercase bg-stone-200/70 px-1.5 py-0.5 rounded truncate max-w-[80px]">
                        {s.license}
                      </span>
                    </div>

                    <h4 className="font-editorial font-bold text-library-dark line-clamp-2 leading-tight">
                      <Link href={`/document/${s.doc_id}`} className="hover:text-library-accent transition">
                        {s.title}
                      </Link>
                    </h4>

                    <p className="text-[11px] text-library-secondary line-clamp-3 leading-relaxed">
                      {s.snippet}
                    </p>

                    <div className="pt-1 border-t border-library-border/60 flex items-center justify-between text-[10px]">
                      <span className="font-mono text-library-muted truncate max-w-[120px]">
                        {s.source_id}
                      </span>
                      {s.url && (
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-library-accent hover:text-library-accent-hover font-semibold inline-flex items-center gap-0.5"
                        >
                          <span>Upstream</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
