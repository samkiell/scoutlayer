'use client';

import React, { useState, useRef, useCallback } from 'react';
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
  Snowflake,
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

interface FounderEntry {
  username: string;
  founderId: string;
  applicationId: string;
  coldStart: boolean;
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
  const [founders, setFounders] = useState<FounderEntry[]>([]);
  const [runId, setRunId] = useState<string | null>(null);
  const logRef = useRef<HTMLDivElement>(null);

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
    setFounders([]);
    setRunId(null);
    setStatus('running');

    const thesis: Thesis = { keywords };
    if (minStars) thesis.minStars = parseInt(minStars, 10);
    if (createdAfter) thesis.createdAfter = createdAfter;

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
            if (evt.type === 'candidate_saved' && evt.username && evt.founderId && evt.applicationId) {
              setFounders((prev) => [
                ...prev,
                {
                  username: evt.username!,
                  founderId: evt.founderId!,
                  applicationId: evt.applicationId!,
                  coldStart: false, // will be set from candidate_structured
                },
              ]);
            }
            if (evt.type === 'candidate_structured' && evt.username) {
              setFounders((prev) =>
                prev.map((f) =>
                  f.username === evt.username ? { ...f, coldStart: evt.coldStart ?? false } : f
                )
              );
            }
            if (evt.type === 'run_done') {
              setStatus('done');
              toast.success(`Scout complete — ${evt.found ?? 0} founders saved`);
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
      case 'run_done':        return '🎯';
      case 'run_error':       return '❌';
      default:                return '·';
    }
  };

  const getEventColor = (type: string) => {
    if (type === 'run_error' || type === 'rate_limited') return 'text-flag';
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
        {events.length > 0 && (
          <div className="bg-surface border border-border rounded-2xl overflow-hidden">
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

        {/* Founders found */}
        {founders.length > 0 && (
          <div className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-semibold">
              Founders Found{' '}
              <span className="text-text-muted font-data text-sm ml-1">({founders.length})</span>
            </h2>

            <div className="flex flex-col gap-2">
              {founders.map((f) => (
                <div
                  key={f.founderId}
                  className="flex items-center justify-between bg-surface border border-border rounded-xl px-5 py-4 hover:border-action/40 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <Code2 className="h-4 w-4 text-text-muted shrink-0" />
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">@{f.username}</span>
                        {f.coldStart && (
                          <span className="flex items-center gap-1 text-xs text-flag bg-flag/10 px-2 py-0.5 rounded-full">
                            <Snowflake className="h-3 w-3" />
                            Cold Start
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-text-muted font-data mt-0.5">
                        founder:{f.founderId.slice(-8)} · app:{f.applicationId.slice(-8)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <a
                      href={`https://github.com/${f.username}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-text-muted hover:text-text transition-colors"
                      title="Open GitHub profile"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                    {/* Stub link — screening page not built yet */}
                    <button
                      disabled
                      title="Screening not built yet"
                      className="text-xs px-3 py-1.5 rounded-lg border border-border text-text-muted opacity-40 cursor-not-allowed"
                    >
                      View
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty done state */}
        {isDone && founders.length === 0 && (
          <div className="text-center py-10 text-text-muted text-sm">
            <Compass className="h-8 w-8 mx-auto mb-3 opacity-30" />
            <p>No new founders found. All candidates may already be in your pipeline.</p>
          </div>
        )}
      </main>
    </div>
  );
}
