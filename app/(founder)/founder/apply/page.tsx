'use strict';
'use client';

import React, { useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';
import { FileText, ArrowLeft, UploadCloud, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';

export default function FounderApply() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    website: '',
    description: '',
    deckUrl: '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName || !form.description) {
      toast.error('Company Name and Description are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyInfo: {
            name: form.companyName,
            website: form.website,
            description: form.description,
          },
          deck: form.deckUrl,
        }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success('Application submitted successfully!');
        router.push('/founder/dashboard');
      } else {
        toast.error(data.error || 'Failed to submit application.');
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

      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-12 flex flex-col gap-8">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="text-3xl font-extrabold tracking-tight">Apply to ScoutLayer</h1>
          <p className="text-zinc-400 text-sm mt-1">Provide details about your venture. We will run our AI-first screening & verification pipeline.</p>
        </div>

        <form onSubmit={handleSubmit} className="bg-zinc-900/40 border border-zinc-800 rounded-3xl p-8 flex flex-col gap-6 backdrop-blur-xl">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Company Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. ScoutLayer"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="bg-zinc-950/70 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Website URL</label>
            <input
              type="url"
              placeholder="https://example.com"
              value={form.website}
              onChange={(e) => setForm({ ...form, website: e.target.value })}
              className="bg-zinc-950/70 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">One-liner & Description *</label>
            <textarea
              required
              rows={4}
              placeholder="What problem are you solving? Describe your product, team background, and metrics."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="bg-zinc-950/70 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
            />
          </div>

          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Pitch Deck Link (Optional)</label>
            <input
              type="url"
              placeholder="https://drive.google.com/... (or file URL)"
              value={form.deckUrl}
              onChange={(e) => setForm({ ...form, deckUrl: e.target.value })}
              className="bg-zinc-950/70 border border-zinc-800 rounded-xl px-4 py-3 text-sm text-zinc-100 focus:outline-none focus:border-indigo-500 transition-colors"
            />
          </div>

          <div className="border border-dashed border-zinc-800 bg-zinc-950/30 rounded-2xl p-6 text-center flex flex-col items-center justify-center cursor-pointer hover:border-indigo-500/50 transition-colors">
            <UploadCloud className="h-8 w-8 text-zinc-600 mb-2" />
            <span className="text-xs text-zinc-500">Upload pitch deck file directly (Under development)</span>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/10 hover:scale-[1.01] mt-4"
          >
            {loading ? 'Submitting...' : 'Submit Application'}
          </button>
        </form>
      </main>
    </div>
  );
}
