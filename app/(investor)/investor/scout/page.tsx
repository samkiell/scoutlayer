'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import PipelineStepper from '@/components/PipelineStepper';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Compass,
  X,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Code2,
  Star,
  Calendar,
  ExternalLink,
  Search,
} from 'lucide-react';
import { toast } from 'sonner';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Thesis {
  keywords: string[];
  minStars?: number;
  createdAfter?: string;
}

interface SourcingEvent {
  type: string;
  message?: string;
  runId?: string;
  username?: string;
  coldStart?: boolean;
  founderId?: string;
  applicationId?: string;
  total?: number;
  found?: number;
  skipped?: number;
  reason?: string;
}

type RunStatus = 'idle' | 'running' | 'done' | 'error';

// ── Component ─────────────────────────────────────────────────────────────────
export default function ScoutPage() {
  const router = useRouter();

  // ── Thesis form state ──────────────────────────────────────────────────────
  const [keywordInput, setKeywordInput] = useState('');
  const [keywords, setKeywords] = useState<string[]>([]);
  const [minStars, setMinStars] = useState('');
  const [createdAfter, setCreatedAfter] = useState('');

  // ── Run state ──────────────────────────────────────────────────────────────
  const [status, setStatus] = useState<RunStatus>('idle');
  const [events, setEvents] = useState<SourcingEvent[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);
  const logContainerRef = useRef<HTMLDivElement>(null);

  // ── Persisted pipeline: this investor's outbound + all inbound ─────────────
  interface PipelineItem {
    id: string;
    name: string;
    company: string;
    githubUsername?: string | null;
    source: 'inbound' | 'outbound';
    stage: string;
    founderScore: number | null;
  }
  const [pipeline, setPipeline] = useState<PipelineItem[]>([]);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loadingPipeline, setLoadingPipeline] = useState(true);

  // Fetch the combined, correctly-scoped pipeline list.
  const loadPipeline = useCallback(async () => {
    try {
      const res = await fetch('/api/applications');
      const data = await res.json();
      if (data.success && data.applications) {
        setPipeline(data.applications as PipelineItem[]);
      }
    } catch {
      // non-fatal — keep current list
    } finally {
      setLoadingPipeline(false);
    }
  }, []);

  useEffect(() => {
    loadPipeline();
  }, [loadPipeline]);

  // Debounce the search input (300ms).
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Client-side filter by name, company, or GitHub username.
  const visiblePipeline = pipeline.filter((item) => {
    const q = debouncedSearch.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name?.toLowerCase().includes(q) ||
      item.company?.toLowerCase().includes(q) ||
      (item.githubUsername || '').toLowerCase().includes(q)
    );
  });

  const addEvent = useCallback((evt: SourcingEvent) => {
    setEvents((prev) => [...prev, evt]);
    // Auto-scroll log
    setTimeout(() => {
      logRef.current?.scrollTo({ top: logRef.current.scrollHeight, behavior: 'smooth' });
    }, 50);
  }, []);

  // ── Add keyword on Enter or comma ─────────────────────────────────────────
  const handleKeywordKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const kw = keywordInput.trim().replace(/,+$/, '');
      if (kw && !keywords.includes(kw)) {
        setKeywords((prev) => [...prev, kw]);
      }
      setKeywordInput('');
    }
  };

  const removeKeyword = (kw: string) => setKeywords((prev) => prev.filter((k) => k !== kw));

  // ── Run scout ──────────────────────────────────────────────────────────────
  const handleRunScout = async (e: React.FormEvent) => {
    e.preventDefault();
    if (keywords.length === 0) {
      toast.error('Add at least one keyword before running Scout.');
      return;
    }

    // Reset state
    setEvents([]);
    setRunId(null);
    setStatus('running');

    const thesis: Thesis = { keywords };
    if (minStars) thesis.minStars = parseInt(minStars, 10);
    if (createdAfter) thesis.createdAfter = createdAfter;

    // Scroll down to center the log container area in the viewport
    setTimeout(() => {
      if (logContainerRef.current) {
        logContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }, 50);

    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(thesis),
      });

      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as any)?.error ?? `HTTP ${res.status}`);
      }

      // Consume SSE stream
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() ?? '';

        for (const line of lines) {
          const dataLine = line.replace(/^data: /, '').trim();
          if (!dataLine || dataLine === '[DONE]') continue;

          try {
            const evt: SourcingEvent = JSON.parse(dataLine);
            addEvent(evt);

            // Handle specific event types
            if (evt.type === 'run_start' && evt.runId) {
              setRunId(evt.runId);
            }
            if (evt.type === 'run_done') {
              setStatus('done');
              toast.success(`Scout complete — ${evt.found ?? 0} founders saved`);
              loadPipeline(); // refresh the scoped list with newly sourced founders
            }
            if (evt.type === 'run_error') {
              setStatus('error');
              toast.error(evt.message ?? 'Scout run encountered an error');
            }
          } catch {
            // Malformed event line — skip
          }
        }
      }

      if (status === 'running') setStatus('done');
    } catch (err: any) {
      setStatus('error');
      addEvent({ type: 'run_error', message: err?.message ?? 'Connection failed' });
      toast.error(err?.message ?? 'Scout failed to connect');
    }
  };

  // ── Render helpers ─────────────────────────────────────────────────────────
  const isRunning = status === 'running';
  const isDone = status === 'done';
  const isError = status === 'error';

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'run_start':       return '⚡';
      case 'search_done':     return '🔍';
      case 'candidate_found': return '👤';
      case 'candidate_skip':  return '⏭';
      case 'candidate_structured': return '🧩';
      case 'candidate_saved': return '✅';
      case 'rate_limited':    return '⚠️';
      case 'batch_capped':    return '⚠️';
      case 'run_done':        return '🎯';
      case 'run_error':       return '❌';
      default:                return '·';
    }
  };

  const getEventColor = (type: string) => {
    if (type === 'run_error' || type === 'rate_limited' || type === 'batch_capped') return 'text-flag';
    if (type === 'candidate_saved' || type === 'run_done') return 'text-trust';
    if (type === 'candidate_skip') return 'text-text-muted';
    return 'text-text';
  };

  // ── JSX ────────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
        {/* Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="font-display text-3xl font-bold tracking-tight">Outbound Scout</h1>
          <p className="text-text-muted text-sm mt-1">
            Define a thesis, run the sourcing agent, and watch founders land in your pipeline.
          </p>
        </div>

        {/* Pipeline stepper — Sourcing is stage 0 */}
        <PipelineStepper
          stages={[
            { label: 'Sourcing', status: isDone ? 'done' : isRunning ? 'active' : 'pending' },
            { label: 'Screening', status: 'pending' },
            { label: 'Diligence', status: 'pending' },
            { label: 'Decision', status: 'pending' },
          ]}
        />

        {/* Thesis form */}
        <form
          onSubmit={handleRunScout}
          className="bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6"
        >
          {/* Keywords */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">
              Keywords / Tags
            </label>
            <div className="flex flex-wrap gap-2 min-h-[44px] bg-bg border border-border rounded-xl px-3 py-2">
              {keywords.map((kw) => (
                <span
                  key={kw}
                  className="flex items-center gap-1 bg-action/15 text-action text-xs font-data px-2 py-1 rounded-lg"
                >
                  {kw}
                  <button
                    type="button"
                    onClick={() => removeKeyword(kw)}
                    className="hover:text-white transition-colors"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <input
                type="text"
                placeholder={keywords.length === 0 ? 'Type a keyword and press Enter…' : 'Add more…'}
                value={keywordInput}
                onChange={(e) => setKeywordInput(e.target.value)}
                onKeyDown={handleKeywordKeyDown}
                className="flex-1 min-w-[180px] bg-transparent text-sm text-text placeholder:text-text-muted outline-none"
                disabled={isRunning}
              />
            </div>
            <p className="text-xs text-text-muted">Press Enter or comma to add each keyword</p>
          </div>

          {/* Min Stars + Created After */}
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Star className="h-3 w-3" />
                Min Stars (optional)
              </label>
              <input
                type="number"
                min={0}
                placeholder="e.g. 20"
                value={minStars}
                onChange={(e) => setMinStars(e.target.value)}
                disabled={isRunning}
                className="bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors"
              />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                Created After (optional)
              </label>
              <input
                type="date"
                value={createdAfter}
                onChange={(e) => setCreatedAfter(e.target.value)}
                disabled={isRunning}
                className="bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isRunning || keywords.length === 0}
            id="run-scout-btn"
            className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-action hover:bg-action/90 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all mt-2"
          >
            {isRunning ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Scout Running…
              </>
            ) : (
              <>
                <Compass className="h-4 w-4" />
                Run Scout
              </>
            )}
          </button>
        </form>

        {/* Live event log */}
        {(status !== 'idle' || events.length > 0) && (
          <div ref={logContainerRef} className="bg-surface border border-border rounded-2xl overflow-hidden scroll-mt-20">
            <div className="flex items-center justify-between px-6 py-4 border-b border-border">
              <span className="text-xs font-medium text-text-muted uppercase tracking-wider font-data">
                Live Log
              </span>
              {runId && (
                <span className="text-xs text-text-muted font-data">
                  run:{runId.slice(-8)}
                </span>
              )}
              {isRunning && (
                <Loader2 className="h-3.5 w-3.5 text-action animate-spin" />
              )}
              {isDone && <CheckCircle2 className="h-3.5 w-3.5 text-trust" />}
              {isError && <AlertTriangle className="h-3.5 w-3.5 text-flag" />}
            </div>

            <div
              ref={logRef}
              className="p-4 max-h-72 overflow-y-auto flex flex-col gap-1 font-data text-xs"
            >
              {events.map((evt, i) => (
                <div key={i} className={`flex gap-2 ${getEventColor(evt.type)}`}>
                  <span className="shrink-0 w-5">{getEventIcon(evt.type)}</span>
                  <span className="break-all leading-relaxed">
                    {evt.message ??
                      (evt.type === 'candidate_skip'
                        ? `skip @${evt.username} — ${evt.reason}`
                        : evt.type === 'candidate_structured'
                        ? `structured @${evt.username}${evt.coldStart ? ' [COLD START]' : ''}`
                        : evt.type === 'candidate_saved'
                        ? `saved @${evt.username} → founders/${evt.founderId?.slice(-8)}`
                        : JSON.stringify(evt))}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Pipeline — this investor's outbound + all inbound (scoped on server) */}
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h2 className="font-display text-lg font-semibold">
              Sourced Pipeline{' '}
              <span className="text-text-muted font-data text-sm ml-1">({visiblePipeline.length})</span>
            </h2>

            {/* Search input — --surface styled per token system */}
            <div className="relative w-full sm:w-72">
              <Search className="h-4 w-4 text-text-muted absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search founder, company, or @github"
                className="w-full bg-surface border border-border rounded-xl pl-9 pr-3 py-2.5 text-sm text-text placeholder:text-text-muted outline-none focus:border-action/40 transition-colors"
              />
            </div>
          </div>

          {loadingPipeline ? (
            <div className="bg-surface border border-border rounded-xl py-10 text-center">
              <Loader2 className="h-5 w-5 animate-spin text-action mx-auto" />
            </div>
          ) : visiblePipeline.length === 0 ? (
            <div className="bg-surface border border-border rounded-xl py-10 text-center text-text-muted text-sm">
              {debouncedSearch
                ? 'No founders match your search.'
                : 'No sourced founders yet. Run a scout to discover founders.'}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {visiblePipeline.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4 hover:border-action/40 transition-colors"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <Code2 className="h-4 w-4 text-text-muted shrink-0" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm truncate">{item.name}</span>
                        <span className={`text-[10px] font-data px-2 py-0.5 rounded border uppercase tracking-wider ${
                          item.source === 'inbound'
                            ? 'bg-action/10 text-action border-action/20'
                            : 'bg-trust/10 text-trust border-trust/20'
                        }`}>
                          {item.source}
                        </span>
                      </div>
                      <p className="text-xs text-text-muted font-data mt-0.5 truncate">
                        {item.githubUsername ? `@${item.githubUsername}` : item.company}
                        {item.githubUsername && item.company ? ` · ${item.company}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    {item.githubUsername && (
                      <a
                        href={`https://github.com/${item.githubUsername}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-text-muted hover:text-text transition-colors"
                        title="Open GitHub profile"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    )}
                    <button
                      onClick={() => router.push(`/investor/founder/${item.id}`)}
                      title="View full profile, screening, diligence & memo"
                      className="text-xs px-3 py-1.5 rounded-lg border border-action/30 text-action hover:bg-action/10 transition-colors cursor-pointer"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Empty done state */}
        {isDone && events.some((e) => e.type === 'run_done') && (
          <div className="text-center py-6 text-text-muted text-sm">
            <CheckCircle2 className="h-6 w-6 mx-auto mb-2 text-trust opacity-70" />
            <p>Run complete — newly sourced founders are now in your pipeline above.</p>
          </div>
        )}
      </main>
    </div>
  );
}
