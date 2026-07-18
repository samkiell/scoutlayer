'use strict';
'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Search, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function SearchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any>(null);

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

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
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

        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            required
            placeholder="Search founders by concept, skills, location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-surface border border-border rounded-xl px-6 py-4 text-sm text-text transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-4 bg-action hover:bg-action/90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {results && (
          <div className="mt-4 p-6 bg-surface border border-border rounded-xl">
            <h2 className="font-display text-lg font-bold mb-4">Query Translation Result (Stub)</h2>
            <pre className="font-data text-xs text-action bg-bg p-4 rounded-lg overflow-x-auto">
              {JSON.stringify(results.filters, null, 2)}
            </pre>
            <p className="text-sm text-text-muted mt-4">
              Found 0 founders matching this parsed filter structure.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
