'use strict';
'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Sparkles, ArrowUpRight, Compass, Shield, HelpCircle } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

interface MatchFounder {
  id: string;
  name: string;
  company: string;
  source: 'inbound' | 'outbound';
  stage: string;
  founderScore: number | null;
  trustScore: number | null;
  structuredProfile: any;
}

export default function SearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    success: boolean;
    explanation: string;
    unsupported: string[];
    filter: any;
    founders: MatchFounder[];
  } | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query) return;

    setLoading(true);
    try {
      const res = await fetch('/api/query', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query }),
      });

      const data = await res.json();
      if (data.success) {
        setResults(data);
        toast.success('Query parsed successfully');
      } else {
        toast.error(data.error || 'Failed to search');
      }
    } catch (err: any) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col gap-6 sm:gap-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="font-display text-3xl font-bold tracking-tight flex items-center gap-2">
            Natural Language Search <Sparkles className="h-6 w-6 text-action" />
          </h1>
          <p className="text-text-muted text-sm mt-1">
            Query across sourced founders and applications using plain English. E.g. &quot;technical founder in Berlin with AI background&quot;.
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3 sm:gap-4">
          <input
            type="text"
            required
            placeholder="Search founders by concept, skills, location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-surface border border-border rounded-xl px-4 sm:px-6 py-3 sm:py-4 text-sm text-text transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 px-6 py-3 sm:py-4 bg-action hover:bg-action/90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all min-h-[44px]"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {results && (
          <div className="flex flex-col gap-6">
            {/* Interpretation card */}
            <div className="p-5 bg-surface border border-border rounded-xl flex flex-col gap-3">
              <div>
                <h3 className="text-xs uppercase tracking-wider text-text-muted font-semibold font-data">Interpretation</h3>
                <p className="text-sm mt-1">{results.explanation}</p>
              </div>

              {results.unsupported && results.unsupported.length > 0 && (
                <div className="border-t border-border/50 pt-3">
                  <h4 className="text-xs uppercase tracking-wider text-flag font-semibold flex items-center gap-1 font-data">
                    <HelpCircle className="h-3 w-3" /> Unmappable Criteria (Best-Effort / Unsupported)
                  </h4>
                  <ul className="list-disc pl-5 mt-1 text-xs text-text-muted space-y-1">
                    {results.unsupported.map((item, idx) => (
                      <li key={idx}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Results listing */}
            <div>
              <h2 className="font-display text-xl font-bold mb-4">Results ({results.founders.length})</h2>

              {results.founders.length > 0 ? (
                <div className="grid gap-4">
                  {results.founders.map((founder) => (
                    <div key={founder.id} className="bg-surface border border-border rounded-xl p-5 hover:border-border/85 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold text-text text-base">{founder.name}</h3>
                          <span className={`text-[9px] font-data px-1.5 py-0.5 rounded border uppercase tracking-wider ${
                            founder.source === 'inbound'
                              ? 'bg-action/10 text-action border-action/20'
                              : 'bg-trust/10 text-trust border-trust/20'
                          }`}>
                            {founder.source}
                          </span>
                        </div>
                        <p className="text-sm text-text-muted mt-0.5">{founder.company}</p>
                        {founder.structuredProfile?.oneLiner && (
                          <p className="text-xs text-text-muted/80 mt-2 line-clamp-2 max-w-2xl bg-bg/30 p-2 rounded-lg border border-border/30">
                            {founder.structuredProfile.oneLiner}
                          </p>
                        )}
                        {founder.structuredProfile?.location && (
                          <p className="text-xs text-text-muted mt-2 font-data">
                            📍 {founder.structuredProfile.location}
                          </p>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-4 self-stretch sm:self-auto justify-between border-t sm:border-t-0 border-border/50 pt-3 sm:pt-0">
                        <div className="text-right">
                          <span className="text-[10px] text-text-muted uppercase tracking-widest block font-data">F. Score</span>
                          <span className="font-data text-lg font-bold text-action">
                            {founder.founderScore !== null ? founder.founderScore : '—'}
                          </span>
                        </div>
                        <Link
                          href={`/investor/founder/${founder.id}`}
                          className="flex items-center justify-center gap-1.5 px-4 py-2 bg-bg hover:bg-surface text-sm border border-border rounded-lg transition-colors font-medium text-action"
                        >
                          Details
                          <ArrowUpRight className="h-4 w-4" />
                        </Link>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="bg-surface border border-border rounded-xl py-12 text-center text-text-muted text-sm">
                  <p className="font-semibold">No matches found</p>
                  <p className="text-xs mt-1 max-w-md mx-auto">
                    Try broadening your search query or removing highly specific constraints like exact city or niche tools.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
