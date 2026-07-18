'use strict';
'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Compass, Code, Rss } from 'lucide-react';
import { toast } from 'sonner';

export default function Scout() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [channel, setChannel] = useState<'github' | 'hn' | 'devpost' | 'arxiv'>('github');
  const [query, setQuery] = useState('');

  const handleScoutTrigger = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/scout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ channel, query }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Scout run successfully initiated for ${channel}!`);
        router.push('/investor/dashboard');
      } else {
        toast.error(data.error || 'Failed to trigger scout.');
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

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="font-display text-3xl font-bold tracking-tight">Outbound Sourcing Agent</h1>
          <p className="text-text-muted text-sm mt-1">
            Trigger a real-time autonomous scanning pipeline. The agent will traverse the chosen platform, structure founder profiles, and run verification.
          </p>
        </div>

        <form onSubmit={handleScoutTrigger} className="bg-surface border border-border rounded-2xl p-8 flex flex-col gap-6">
          {/* Channel selection */}
          <div className="flex flex-col gap-3">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Select Sourcing Channel</label>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => setChannel('github')}
                className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all ${
                  channel === 'github'
                    ? 'border-action bg-action/10 text-action'
                    : 'border-border bg-bg hover:border-text-muted/30 text-text-muted'
                }`}
              >
                <Code className="h-5 w-5" />
                GitHub (Primary)
              </button>

              <button
                type="button"
                onClick={() => setChannel('hn')}
                className={`flex items-center gap-3 p-4 rounded-xl border text-sm font-medium transition-all ${
                  channel === 'hn'
                    ? 'border-action bg-action/10 text-action'
                    : 'border-border bg-bg hover:border-text-muted/30 text-text-muted'
                }`}
              >
                <Rss className="h-5 w-5" />
                Hacker News
              </button>
            </div>
          </div>

          {/* Search query */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Target Keywords or Domain</label>
            <input
              type="text"
              required
              placeholder="e.g. 'web3 payments', 'compiler developers', 'Berlin AI'"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-action hover:bg-action/90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all mt-2"
          >
            <Compass className="h-4 w-4" />
            {loading ? 'Initializing Agent...' : 'Trigger Sourcing Agent'}
          </button>
        </form>
      </main>
    </div>
  );
}
