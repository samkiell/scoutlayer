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
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight flex items-center gap-2">
            Natural Language Search <Sparkles className="h-6 w-6 text-indigo-400" />
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Query across sourced founders and applications using plain English. E.g. "technical founder in Berlin with AI background".
          </p>
        </div>

        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="text"
            required
            placeholder="Search founders by concept, skills, location..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-2xl px-6 py-4 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
          />
          <button
            type="submit"
            disabled={loading}
            className="flex items-center gap-2 px-6 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-2xl text-sm transition-all"
          >
            <Search className="h-4 w-4" />
            {loading ? 'Searching...' : 'Search'}
          </button>
        </form>

        {results && (
          <div className="mt-8 p-6 bg-zinc-900/40 border border-zinc-800 rounded-3xl">
            <h2 className="text-lg font-bold mb-4">Query Translation Result (Stub)</h2>
            <pre className="text-xs text-indigo-400 bg-zinc-950 p-4 rounded-xl overflow-x-auto">
              {JSON.stringify(results.filters, null, 2)}
            </pre>
            <p className="text-sm text-zinc-400 mt-4">
              Found 0 founders matching this parsed filter structure.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}
