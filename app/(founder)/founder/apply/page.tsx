'use strict';
'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Loader2, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';

export default function FounderApply() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [hasActiveApplication, setHasActiveApplication] = useState(false);
  const [form, setForm] = useState({
    companyName: '',
    deckUrl: '',
    oneLiner: '',
    github: '',
    context: '',
    startupUrl: '',
  });
  const [additionalLinks, setAdditionalLinks] = useState<Array<{ url: string; label: string }>>([]);

  const handleAddLink = () => {
    if (additionalLinks.length < 3) {
      setAdditionalLinks([...additionalLinks, { url: '', label: '' }]);
    }
  };

  const handleRemoveLink = (index: number) => {
    setAdditionalLinks(additionalLinks.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, key: 'url' | 'label', value: string) => {
    const updated = [...additionalLinks];
    updated[index][key] = value;
    setAdditionalLinks(updated);
  };

  // Auth Guard: Only founders allowed. Redirect investors.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'founder') {
        router.push(role === 'investor' ? '/investor/dashboard' : '/role-select');
        return;
      }
      // Check whether this founder already has an active (in-progress) application.
      fetch('/api/applications')
        .then((res) => res.json())
        .then((data) => {
          if (data.success) setHasActiveApplication(!!data.hasActiveApplication);
        })
        .catch(() => {})
        .finally(() => setChecking(false));
    } else {
      setChecking(false);
    }
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!form.companyName.trim()) {
      toast.error('Company Name is required.');
      return;
    }

    if (!form.deckUrl.trim()) {
      toast.error('Pitch Deck Link is required.');
      return;
    }

    // URL validation
    try {
      new URL(form.deckUrl.trim());
    } catch {
      toast.error('Pitch Deck Link must be a valid URL.');
      return;
    }

    if (!form.oneLiner.trim()) {
      toast.error('One-liner pitch is required.');
      return;
    }

    if (form.oneLiner.length > 150) {
      toast.error('One-liner pitch cannot exceed 150 characters.');
      return;
    }

    if (form.startupUrl.trim()) {
      try {
        new URL(form.startupUrl.trim());
      } catch {
        toast.error('Startup/Product Website must be a valid URL.');
        return;
      }
    }

    for (const link of additionalLinks) {
      if (link.url.trim()) {
        try {
          new URL(link.url.trim());
        } catch {
          toast.error(`Additional Link URL "${link.url}" must be a valid URL.`);
          return;
        }
      }
    }

    setLoading(true);
    // Re-verify at submission time too
    try {
      const checkRes = await fetch('/api/applications');
      const checkData = await checkRes.json();
      if (checkData.success && checkData.hasActiveApplication) {
        toast.error('You already have an active application in progress.');
        setHasActiveApplication(true);
        setLoading(false);
        return;
      }
    } catch {
      // Non-fatal checking error, let POST route handle it
    }

    try {
      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          companyName: form.companyName.trim(),
          deckUrl: form.deckUrl.trim(),
          oneLiner: form.oneLiner.trim(),
          github: form.github.trim() || undefined,
          context: form.context.trim() || undefined,
          startupUrl: form.startupUrl.trim() || undefined,
          additionalLinks: additionalLinks.filter(l => l.url.trim().length > 0).map(l => ({
            url: l.url.trim(),
            label: l.label.trim() || undefined
          })),
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

  if (status === 'loading' || checking) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg text-text min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-action" />
      </div>
    );
  }

  // Already have an in-progress application — block the form.
  if (hasActiveApplication) {
    return (
      <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
        <Navbar />
        <main className="flex-1 max-w-2xl w-full mx-auto px-4 sm:px-6 py-10 sm:py-16 flex flex-col gap-8 sm:gap-10">
          <div>
            <button
              onClick={() => router.back()}
              className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-8"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <h1 className="font-display text-3xl font-bold tracking-tight">Apply to ScoutLayer</h1>
          </div>

          <div className="bg-surface border border-border rounded-2xl p-10 flex flex-col items-center text-center gap-4">
            <div className="p-4 bg-flag/10 rounded-2xl text-flag">
              <ShieldAlert className="h-8 w-8" />
            </div>
            <h2 className="font-display text-xl font-bold text-text">You have an active application in progress</h2>
            <p className="text-text-muted text-sm max-w-md">
              You can only have one application in the pipeline at a time. Check its current status
              on your founder dashboard.
            </p>
            <Link
              href="/founder/dashboard"
              className="flex items-center gap-2 px-5 py-3 bg-action hover:bg-action/90 text-white font-semibold rounded-xl text-sm transition-all cursor-pointer mt-2"
            >
              View Application Status
            </Link>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      {/* Calm, generous whitespace — Notion-like */}
      <main className="flex-1 max-w-2xl w-full mx-auto px-6 py-16 flex flex-col gap-10">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-8"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <h1 className="font-display text-3xl font-bold tracking-tight">Apply to ScoutLayer</h1>
          <p className="text-text-muted text-sm mt-2">
            Provide details about your venture. We will run our AI-first screening &amp; verification pipeline.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="bg-surface border border-border rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
          {/* Company Name */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Company Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. ScoutLayer"
              value={form.companyName}
              onChange={(e) => setForm({ ...form, companyName: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors focus:border-action"
            />
          </div>

          {/* Deck Link */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Pitch Deck Link *</label>
            <input
              type="url"
              required
              placeholder="https://drive.google.com/file/d/... or Notion/PDF URL"
              value={form.deckUrl}
              onChange={(e) => setForm({ ...form, deckUrl: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors focus:border-action"
            />
            <span className="text-[10px] text-text-muted">
              Accepts well-formed URLs (Google Slides, Notion, PDF, etc.). Direct file uploads are not supported.
            </span>
          </div>

          {/* One-liner Pitch */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">One-liner Pitch *</label>
            <textarea
              required
              rows={3}
              maxLength={150}
              placeholder="What are you building in one sentence?"
              value={form.oneLiner}
              onChange={(e) => setForm({ ...form, oneLiner: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors resize-none focus:border-action"
            />
            <span className={`text-[10px] font-data text-right ${form.oneLiner.length > 150 ? 'text-flag' : 'text-text-muted'}`}>
              {form.oneLiner.length}/150
            </span>
          </div>

          {/* GitHub Username or Profile URL */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">GitHub Username or Profile URL (Optional)</label>
            <input
              type="text"
              placeholder="e.g. @samkiel or https://github.com/samkiel"
              value={form.github}
              onChange={(e) => setForm({ ...form, github: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors focus:border-action"
            />
            <span className="text-[10px] text-text-muted">
              If provided, we will automatically enrich your application using your GitHub profile &amp; repos.
            </span>
          </div>

          {/* Links Section */}
          <div className="border-t border-border pt-6 flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <h3 className="text-sm font-bold text-text uppercase tracking-wider">Links</h3>
              <p className="text-[11px] text-text-muted">
                GitHub profiles are automatically verified. Other links provide context for our diligence process but aren&apos;t independently scraped.
              </p>
            </div>

            {/* Startup/Product Website */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Startup/Product Website (Optional)</label>
              <input
                type="url"
                placeholder="https://yourstartup.com"
                value={form.startupUrl}
                onChange={(e) => setForm({ ...form, startupUrl: e.target.value })}
                className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors focus:border-action"
              />
            </div>

            {/* Additional Links */}
            <div className="flex flex-col gap-3">
              <label className="text-xs font-medium text-text-muted uppercase tracking-wider flex items-center justify-between">
                <span>Additional Links (Optional, Max 3)</span>
                {additionalLinks.length < 3 && (
                  <button
                    type="button"
                    onClick={handleAddLink}
                    className="text-xs text-action hover:underline cursor-pointer"
                  >
                    + Add Link
                  </button>
                )}
              </label>

              {additionalLinks.map((link, index) => (
                <div key={index} className="flex gap-2 items-center">
                  <input
                    type="text"
                    placeholder="Label (e.g. Twitter/X, LinkedIn)"
                    value={link.label}
                    onChange={(e) => handleLinkChange(index, 'label', e.target.value)}
                    className="w-1/3 bg-bg border border-border rounded-xl px-3 py-2 text-sm text-text transition-colors focus:border-action"
                  />
                  <input
                    type="url"
                    placeholder="https://..."
                    value={link.url}
                    onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                    className="flex-1 bg-bg border border-border rounded-xl px-3 py-2 text-sm text-text transition-colors focus:border-action"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemoveLink(index)}
                    className="text-xs text-flag hover:underline cursor-pointer px-2"
                  >
                    Remove
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Additional Context */}
          <div className="flex flex-col gap-2">
            <label className="text-xs font-medium text-text-muted uppercase tracking-wider">Additional Context (Optional)</label>
            <textarea
              rows={4}
              placeholder="Traction, team size, funding stage, or any other relevant information..."
              value={form.context}
              onChange={(e) => setForm({ ...form, context: e.target.value })}
              className="w-full bg-bg border border-border rounded-xl px-4 py-3 text-sm text-text transition-colors resize-none focus:border-action"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-5 py-4 bg-action hover:bg-action/90 disabled:opacity-50 text-white font-semibold rounded-xl text-sm transition-all mt-2 cursor-pointer"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Submitting Application...
              </>
            ) : (
              'Submit Application'
            )}
          </button>
        </form>
      </main>
    </div>
  );
}
