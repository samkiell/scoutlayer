'use strict';
'use client';

import React, { useEffect, useState, useRef } from 'react';
import Navbar from '@/components/Navbar';
import PipelineStepper from '@/components/PipelineStepper';
import EvidenceReceipt from '@/components/EvidenceReceipt';
import MemoDownloadButton from '@/components/MemoDownloadButton';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Award, TrendingUp, TrendingDown, Minus, Play, Loader2, Code2, ShieldAlert, FileText, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

const GithubIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    width="24"
    height="24"
    stroke="currentColor"
    strokeWidth="2"
    fill="none"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
    <path d="M9 18c-4.51 2-5-2-7-2" />
  </svg>
);

interface AxisScore {
  score: number;
  trend: 'improving' | 'declining' | 'stable';
  evidence: string;
}

interface ScreeningData {
  founderAxis?: AxisScore;
  marketAxis?: AxisScore;
  ideaVsMarketAxis?: AxisScore;
}

// Renders one axis card — shows a pulsing skeleton if the axis data hasn't arrived yet.
// This handles the SSE streaming case where axes arrive one at a time.
function AxisCard({
  label,
  axis,
  trendColor,
  trendIcon,
}: {
  label: string;
  axis: AxisScore | undefined;
  trendColor: (t: string) => string;
  trendIcon: (t: string) => React.ReactNode;
}) {
  if (!axis) {
    return (
      <div className="bg-surface border border-border rounded-xl p-5 flex flex-col gap-3 animate-pulse">
        <div className="flex justify-between items-center">
          <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">{label}</span>
          <div className="h-3 w-16 bg-border/50 rounded" />
        </div>
        <div className="h-10 w-20 bg-border/50 rounded" />
        <div className="h-3 w-full bg-border/30 rounded" />
        <div className="h-3 w-3/4 bg-border/20 rounded" />
      </div>
    );
  }

  return (
    <div className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between hover:border-border/85 transition-all">
      <div>
        <div className="flex justify-between items-center mb-2">
          <span className="text-[10px] text-text-muted uppercase tracking-widest font-semibold">{label}</span>
          <span className={`text-[10px] font-data font-medium flex items-center gap-1 uppercase ${trendColor(axis.trend)}`}>
            {trendIcon(axis.trend)}
            {axis.trend}
          </span>
        </div>
        <div className="font-data text-4xl font-bold mb-3">{axis.score}</div>
        <p className="text-sm text-text-muted leading-relaxed font-body">{axis.evidence}</p>
      </div>
    </div>
  );
}

export default function FounderProfile() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [app, setApp] = useState<any>(null);
  const [founder, setFounder] = useState<any>(null);
  const [screening, setScreening] = useState<ScreeningData | null>(null);
  const [trustClaims, setTrustClaims] = useState<any[]>([]);
  const [memo, setMemo] = useState<any>(null);

  // Screening run states
  const [isScreening, setIsScreening] = useState(false);
  const [isDeciding, setIsDeciding] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logTerminalRef = useRef<HTMLDivElement>(null);
  const consoleContainerRef = useRef<HTMLDivElement>(null);
  const shouldScrollRef = useRef(true);
  const hasScrolledConsoleRef = useRef(false);

  // Delete states
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [deletingInProgress, setDeletingInProgress] = useState(false);

  const confirmDelete = async () => {
    if (!founder || !founder.id) return;
    setDeletingInProgress(true);
    try {
      const res = await fetch(`/api/founders/${founder.id}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Removed");
        router.push('/investor/scout');
      } else {
        toast.error(data.error || "Failed to remove founder");
      }
    } catch (err: any) {
      toast.error(err?.message || "Failed to remove founder");
    } finally {
      setDeletingInProgress(false);
      setIsDeleteConfirmOpen(false);
    }
  };

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/applications/${id}`);
      const result = await res.json();
      if (result.success && result.data) {
        setApp(result.data.application);
        setFounder(result.data.founder);
        setScreening(result.data.screening);
        setTrustClaims(result.data.trustClaims || []);
        setMemo(result.data.memo);
        if (result.data.pipelineRun) {
          const runLogs = result.data.pipelineRun.log || [];
          setLogs(runLogs.map((l: any) => `[${new Date(l.timestamp).toLocaleTimeString()}] ${l.message}`));
          if (result.data.pipelineRun.status === 'running') {
            setIsScreening(true);
          }
        }
      } else {
        toast.error(result.error || 'Failed to load details.');
      }
    } catch (err) {
      toast.error('Network error loading details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchData();
    }
  }, [id]);

  useEffect(() => {
    if ((isScreening || isDeciding) && consoleContainerRef.current) {
      if (!hasScrolledConsoleRef.current) {
        consoleContainerRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
        hasScrolledConsoleRef.current = true;
      }
    } else if (!isScreening && !isDeciding) {
      hasScrolledConsoleRef.current = false;
    }
  }, [isScreening, isDeciding]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const distanceFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
    shouldScrollRef.current = distanceFromBottom < 50;
  };

  useEffect(() => {
    if (logTerminalRef.current && shouldScrollRef.current) {
      logTerminalRef.current.scrollTo({ top: logTerminalRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, [logs]);

  const runDiligence = async () => {
    if (isScreening) return;
    setIsScreening(true);
    setLogs(['[System] Initializing connection to diligence verifier...']);

    try {
      const response = await fetch(`/api/diligence/${id}`, { method: 'POST' });
      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
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
            const evt = JSON.parse(dataLine);
            const timestamp = `[${new Date().toLocaleTimeString()}]`;

            if (evt.message) {
              setLogs((prev) => [...prev, `${timestamp} ${evt.message}`]);
            }

            if (evt.type === 'claim_checked') {
              const vb = evt.verifiedBy === 'tavily' ? 'VERIFIED' : 'UNVERIFIED';
              setLogs((prev) => [
                ...prev,
                `${timestamp} [Claim ${evt.index + 1}] ${vb} (${evt.confidence}%)${evt.evidenceUrl ? ` — ${evt.evidenceUrl}` : ''}`,
              ]);
            }

            if (evt.type === 'run_done') {
              toast.success('Diligence completed successfully.');
              setIsScreening(false);
              fetchData();
            } else if (evt.type === 'run_error') {
              toast.error(evt.message || 'Diligence failed.');
              setIsScreening(false);
            }
          } catch {
            // parse issue
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred during diligence.');
      setIsScreening(false);
    }
  };

  const runDecision = async () => {
    if (isDeciding) return;
    setIsDeciding(true);
    setLogs((prev) => [...prev, '[System] Initializing connection to decision synthesizer...']);

    try {
      const response = await fetch(`/api/memo/${id}`, { method: 'POST' });
      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
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
            const evt = JSON.parse(dataLine);
            const timestamp = `[${new Date().toLocaleTimeString()}]`;

            if (evt.message) {
              setLogs((prev) => [...prev, `${timestamp} ${evt.message}`]);
            }

            if (evt.type === 'founder_score') {
              setLogs((prev) => [...prev, `${timestamp} Founder Score → ${evt.value}`]);
            }

            if (evt.type === 'run_done') {
              toast.success('Memo generated — decision stage complete.');
              setIsDeciding(false);
              fetchData();
            } else if (evt.type === 'run_error') {
              toast.error(evt.message || 'Memo generation failed.');
              setIsDeciding(false);
            }
          } catch {
            // parse issue
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred during memo generation.');
      setIsDeciding(false);
    }
  };

  const runScreening = async () => {
    if (isScreening) return;
    setIsScreening(true);
    setLogs(['[System] Initializing connection to screening agent...']);

    try {
      const response = await fetch(`/api/screen/${id}`, { method: 'POST' });
      if (!response.ok || !response.body) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData?.error ?? `HTTP ${response.status}`);
      }

      const reader = response.body.getReader();
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
            const evt = JSON.parse(dataLine);
            const timestamp = `[${new Date().toLocaleTimeString()}]`;
            
            if (evt.message) {
              setLogs((prev) => [...prev, `${timestamp} ${evt.message}`]);
            }

            if (evt.type === 'founder_axis_done') {
              setScreening((prev) => ({
                ...(prev ?? {}),
                founderAxis: { score: evt.score, trend: 'stable', evidence: evt.evidence }
              }));
            } else if (evt.type === 'market_axis_done') {
              setScreening((prev) => ({
                ...(prev ?? {}),
                marketAxis: { score: evt.score, trend: 'stable', evidence: evt.evidence }
              }));
            } else if (evt.type === 'idea_axis_done') {
              setScreening((prev) => ({
                ...(prev ?? {}),
                ideaVsMarketAxis: { score: evt.score, trend: 'stable', evidence: evt.evidence }
              }));
            } else if (evt.type === 'run_done') {
              toast.success('Screening completed successfully.');
              setIsScreening(false);
              fetchData(); // refresh fully
            } else if (evt.type === 'run_error') {
              toast.error(evt.message || 'Screening failed.');
              setIsScreening(false);
            }
          } catch (e) {
            // parsing issue
          }
        }
      }
    } catch (err: any) {
      toast.error(err?.message || 'Error occurred during screening.');
      setIsScreening(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg text-text min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-action" />
      </div>
    );
  }

  if (!app || !founder) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg text-text min-h-screen">
        <ShieldAlert className="h-10 w-10 text-flag mb-2" />
        <p className="text-text-muted">Application profile not found.</p>
      </div>
    );
  }

  const getStageIndex = (statusStr?: string) => {
    switch (statusStr) {
      case 'sourced':
        return 0;
      case 'screening':
        return 1;
      case 'screened':
      case 'diligence':
      case 'diligenced':
        return 2;
      case 'decided':
        return 3;
      default:
        return 0;
    }
  };

  const currentStageIndex = getStageIndex(app.status);

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-3.5 w-3.5" />;
    if (trend === 'declining') return <TrendingDown className="h-3.5 w-3.5" />;
    return <Minus className="h-3.5 w-3.5" />;
  };

  const trendColor = (trend: string) => {
    if (trend === 'improving') return 'text-trust';
    if (trend === 'declining') return 'text-flag';
    return 'text-text-muted';
  };

  const hasScore = founder.founderScore && founder.founderScore.value > 0;

  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Back Button & Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-6 cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to pipeline
          </button>
          
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
            <div className="min-w-0 w-full sm:w-auto">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-2xl sm:text-3xl font-bold tracking-tight break-words">{founder.name}</h1>
                {founder.source === 'inbound' ? (
                  <span className="text-[10px] font-data px-2 py-0.5 rounded border uppercase tracking-wider bg-action/10 text-action border-action/20">
                    Inbound
                  </span>
                ) : (
                  <span className="text-[10px] font-data px-2 py-0.5 rounded border uppercase tracking-wider bg-surface text-text-muted border-border flex items-center gap-1 inline-flex">
                    <GithubIcon className="h-3.5 w-3.5" />
                    Sourced via GitHub
                  </span>
                )}
                {founder.source === 'outbound' && (
                  <button
                    onClick={() => setIsDeleteConfirmOpen(true)}
                    title="Delete outbound founder"
                    className="text-text-muted hover:text-flag transition-colors cursor-pointer p-1"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                )}
              </div>
              <p className="text-action text-lg font-medium mt-1">{founder.company}</p>
              <p className="text-text-muted text-sm mt-1 max-w-2xl">{founder.structuredProfile?.oneLiner}</p>
            </div>
            
            <div className="bg-surface border border-border px-4 py-3 rounded-xl flex items-center gap-3 shrink-0 w-full sm:w-auto">
              <Award className="h-5 w-5 text-action" />
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Founder Score</div>
                <div className="font-data text-xl font-semibold">
                  {hasScore ? `${founder.founderScore.value}` : '—'}
                  <span className="text-text-muted text-xs font-normal">/100</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Stepper */}
        <section className="bg-surface border border-border rounded-xl p-6">
          <PipelineStepper currentStage={currentStageIndex} />
        </section>

        {/* Structured Profile details */}
        <section className="bg-surface border border-border rounded-xl p-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 mb-4">
            <h2 className="font-display text-lg font-bold tracking-tight">Founder Signals</h2>
            <span className="text-xs text-text-muted font-medium font-data">
              {founder.source === 'outbound'
                ? 'Profile data sourced from public GitHub API'
                : 'Application enriched with public GitHub data'}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-bg/40 border border-border/50 p-4 rounded-lg">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Location</span>
              <p className="text-sm font-medium mt-1 text-text">{founder.structuredProfile?.location || 'Not specified'}</p>
            </div>
            <div className="bg-bg/40 border border-border/50 p-4 rounded-lg">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">GitHub Username</span>
              <p className="text-sm font-medium mt-1 text-text">
                {founder.githubUsername ? `@${founder.githubUsername}` : 'None provided'}
              </p>
            </div>
            <div className="bg-bg/40 border border-border/50 p-4 rounded-lg">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Followers</span>
              <p className="text-sm font-medium mt-1 text-text font-data">{founder.structuredProfile?.followers ?? '—'}</p>
            </div>
            <div className="bg-bg/40 border border-border/50 p-4 rounded-lg">
              <span className="text-[10px] text-text-muted uppercase tracking-wider font-semibold">Public Repos</span>
              <p className="text-sm font-medium mt-1 text-text font-data">{founder.structuredProfile?.publicRepos ?? '—'}</p>
            </div>
          </div>

          {founder.structuredProfile?.topRepos && founder.structuredProfile.topRepos.length > 0 && (
            <div className="mt-6 border-t border-border/50 pt-4">
              <span className="text-xs text-text-muted uppercase tracking-wider font-semibold">Top Repositories</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-3">
                {founder.structuredProfile.topRepos.slice(0, 4).map((repo: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start bg-bg/25 border border-border/30 rounded-xl px-4 py-3 min-w-0">
                    <div className="flex flex-col min-w-0 pr-2">
                      <a
                        href={repo.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-medium text-action hover:underline block truncate"
                      >
                        {repo.name}
                      </a>
                      <span className="text-xs text-text-muted block truncate mt-0.5">{repo.description || 'No description'}</span>
                    </div>
                    <div className="flex items-center gap-1 font-data text-xs text-text-muted shrink-0 mt-0.5">
                      <span>⭐</span>
                      <span>{repo.stars}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* 3-Axis Screening Section */}
        <section className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">3-Axis Screening</h2>
            
            {app.status === 'sourced' && !isScreening && (
              <button
                onClick={runScreening}
                className="flex items-center gap-2 px-4 py-2 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all cursor-pointer w-full sm:w-auto justify-center"
              >
                <Play className="h-4 w-4" />
                Run Screening
              </button>
            )}

            {app.status === 'screened' && (
              <button
                onClick={runDiligence}
                className="flex items-center gap-2 px-4 py-2 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all cursor-pointer w-full sm:w-auto justify-center"
              >
                <ShieldAlert className="h-4 w-4" />
                Run Diligence
              </button>
            )}

            {(app.status === 'diligenced' || app.status === 'decided') && !isDeciding && (
              <button
                onClick={runDecision}
                disabled={app.status === 'decided'}
                className="flex items-center gap-2 px-4 py-2 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed w-full sm:w-auto justify-center"
              >
                <FileText className="h-4 w-4" />
                {app.status === 'decided' ? 'Memo Generated' : 'Generate Memo'}
              </button>
            )}
          </div>

          {/* SSE Stream Logs Console (if running/active) */}
          {(isScreening || isDeciding || logs.length > 0) && (
            <div ref={consoleContainerRef} className="bg-surface border border-border rounded-xl overflow-hidden flex flex-col">
              <div className="bg-bg/60 border-b border-border/80 px-4 py-2 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Code2 className="h-4 w-4 text-action" />
                  <span className="font-data text-xs font-semibold uppercase tracking-wider text-text-muted">Agent Execution Console</span>
                </div>
                {(isScreening || isDeciding) && (
                  <div className="flex items-center gap-1.5 text-xs text-action">
                    <Loader2 className="h-3 w-3 animate-spin" />
                    <span>Running</span>
                  </div>
                )}
              </div>
              <div
                ref={logTerminalRef}
                onScroll={handleScroll}
                className="bg-black/90 p-4 h-48 overflow-y-auto font-data text-xs text-trust leading-relaxed flex flex-col gap-1 select-text scrollbar-thin"
              >
                {logs.map((log, idx) => (
                  <div key={idx} className="whitespace-pre-wrap">{log}</div>
                ))}
              </div>
            </div>
          )}

          {/* Cards Display — each axis rendered independently to survive partial SSE state */}
          {screening ? (
            <div className="grid sm:grid-cols-3 gap-4 mt-2">
              <AxisCard label="Founder Axis" axis={screening.founderAxis} trendColor={trendColor} trendIcon={trendIcon} />
              <AxisCard label="Market Axis" axis={screening.marketAxis} trendColor={trendColor} trendIcon={trendIcon} />
              <AxisCard label="Idea vs Market Fit" axis={screening.ideaVsMarketAxis} trendColor={trendColor} trendIcon={trendIcon} />
            </div>
          ) : (
            !isScreening && (
              <div className="bg-surface/30 border border-dashed border-border py-12 rounded-xl text-center">
                <p className="text-text-muted text-sm">This application has not been screened yet.</p>
                <p className="text-xs text-text-muted mt-1">Click &quot;Run Screening&quot; to execute multi-agent scoring on the candidate.</p>
              </div>
            )
          )}
        </section>

        {/* Trust Claims — Evidence Receipts */}
        {trustClaims.length > 0 && (
          <section className="flex flex-col gap-3">
            <h2 className="font-display text-lg font-bold tracking-tight">Diligence &amp; Trust Claims</h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {trustClaims.map((claim: any, idx: number) => (
                <EvidenceReceipt
                  key={idx}
                  claim={claim.claim}
                  source={claim.source}
                  confidence={claim.confidence}
                  verifiedBy={claim.verifiedBy}
                  timestamp={claim.timestamp}
                />
              ))}
            </div>
          </section>
        )}

        {/* Investment Memo */}
        {memo && (
          <section className="flex flex-col gap-3 print-memo-section">
            <div className="flex justify-between items-center no-print">
              <h2 className="font-display text-lg font-bold tracking-tight">Investment Memo</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => window.print()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-surface hover:bg-surface/80 border border-border rounded-lg text-xs font-semibold text-text-muted hover:text-text transition-all cursor-pointer"
                >
                  <FileText className="h-3.5 w-3.5" />
                  Print Memo
                </button>
                <MemoDownloadButton companyName={founder.company} memo={memo} />
              </div>
            </div>
            <h2 className="font-display text-lg font-bold tracking-tight hidden print:block">Investment Memo - {founder.company}</h2>
            <div className="bg-surface border border-border rounded-xl p-6 md:p-8 flex flex-col gap-7 print-container">
              <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                  body {
                    background: #0D1117 !important;
                    color: #EDEFF3 !important;
                  }
                  nav, button, footer, .no-print, .agent-console, .pipeline-stepper, .delete-btn {
                    display: none !important;
                  }
                  .print-memo-section {
                    display: block !important;
                    width: 100% !important;
                  }
                  .print-container {
                    border: none !important;
                    background: transparent !important;
                    padding: 0 !important;
                    margin: 0 !important;
                    max-width: 100% !important;
                  }
                }
              `}} />
              {/* Company snapshot */}
              <div>
                <h3 className="font-display font-semibold text-text mb-2 text-sm uppercase tracking-wider">Company Snapshot</h3>
                <p className="text-[15px] text-text-muted leading-relaxed font-body">{memo.companySnapshot}</p>
              </div>

              {/* Investment hypotheses */}
              {memo.investmentHypotheses && (
                <div>
                  <h3 className="font-display font-semibold text-text mb-2 text-sm uppercase tracking-wider">Investment Hypotheses</h3>
                  <div className="text-[15px] text-text-muted leading-relaxed font-body whitespace-pre-line">
                    {memo.investmentHypotheses}
                  </div>
                </div>
              )}

              {/* SWOT */}
              {memo.swot && (
                <div>
                  <h3 className="font-display font-semibold text-text mb-3 text-sm uppercase tracking-wider">SWOT</h3>
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Object.entries(memo.swot).map(([key, list]: any) => (
                      <div key={key} className="bg-bg p-5 rounded-xl border border-border">
                        <h4 className="font-display font-semibold text-text mb-3 text-sm capitalize">{key}</h4>
                        <ul className="text-sm text-text-muted list-disc list-inside flex flex-col gap-1.5">
                          {list.map((item: string, i: number) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Problem & product */}
              {memo.problemProduct && (
                <div>
                  <h3 className="font-display font-semibold text-text mb-2 text-sm uppercase tracking-wider">Problem &amp; Product</h3>
                  <p className="text-[15px] text-text-muted leading-relaxed font-body">{memo.problemProduct}</p>
                </div>
              )}

              {/* Traction & KPIs */}
              {memo.tractionKpis && (
                <div>
                  <h3 className="font-display font-semibold text-text mb-2 text-sm uppercase tracking-wider">Traction &amp; KPIs</h3>
                  <p className="text-[15px] text-text-muted leading-relaxed font-body">{memo.tractionKpis}</p>
                </div>
              )}

              {/* Gaps flagged */}
              {memo.gapsFlagged && memo.gapsFlagged.length > 0 && (
                <div className="border-t border-border/60 pt-5">
                  <h3 className="font-display font-semibold text-flag mb-2 text-sm uppercase tracking-wider flex items-center gap-2">
                    <ShieldAlert className="h-4 w-4" />
                    Gaps Flagged
                  </h3>
                  <ul className="text-sm text-text-muted list-disc list-inside flex flex-col gap-1.5">
                    {memo.gapsFlagged.map((g: string, i: number) => (
                      <li key={i}>{g}</li>
                    ))}
                  </ul>
                </div>
              )}
              {/* Data Provenance Note */}
              <div className="border-t border-border/40 pt-4 mt-2">
                <p className="text-xs text-text-muted font-data italic">
                  Data sources: {founder.source === 'inbound' 
                    ? 'founder-submitted application + public GitHub enrichment' 
                    : 'public GitHub profile'}
                </p>
              </div>
            </div>
          </section>
        )}
      </main>

      {/* Confirmation Modal */}
      {isDeleteConfirmOpen && founder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg/85 backdrop-blur-sm">
          <div className="w-full max-w-md bg-surface border border-border rounded-2xl p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="font-display text-lg font-bold text-text mb-2">Confirm Removal</h3>
            <p className="text-sm text-text-muted mb-6 leading-relaxed">
              Remove <strong className="text-text">{founder.name} ({founder.company})</strong> from your scouted list? This deletes all screening and diligence data for them. This can't be undone.
            </p>
            <div className="flex justify-end gap-3">
              <button
                type="button"
                disabled={deletingInProgress}
                onClick={() => setIsDeleteConfirmOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-bg border border-border text-text hover:bg-surface transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingInProgress}
                onClick={confirmDelete}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-flag hover:bg-flag/90 text-white transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {deletingInProgress ? (
                  <>
                    <Loader2 className="h-3 w-3 animate-spin" />
                    Deleting…
                  </>
                ) : (
                  'Delete'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
