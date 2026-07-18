'use strict';
'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { FileText, PlusCircle, Award, Activity } from 'lucide-react';

export default function FounderDashboard() {
  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      {/* Calm, generous whitespace — Notion-like per PRD */}
      <main className="flex-1 max-w-3xl w-full mx-auto px-6 py-16 flex flex-col gap-12">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-8 border-b border-border">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight">Founder Hub</h1>
            <p className="text-text-muted text-sm mt-2">Manage your application and track your real-time founder score.</p>
          </div>
          <Link
            href="/founder/apply"
            className="flex items-center gap-2 px-5 py-3 bg-action hover:bg-action/90 text-white font-semibold rounded-xl text-sm transition-all"
          >
            <PlusCircle className="h-4 w-4" />
            Apply to ScoutLayer
          </Link>
        </div>

        {/* Analytics Summary */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="p-3 bg-action/10 rounded-xl text-action">
              <Award className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-text-muted uppercase tracking-widest font-medium">Founder Score</span>
              <div className="font-data text-2xl font-semibold mt-0.5">85<span className="text-text-muted text-base">/100</span></div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="p-3 bg-trust/10 rounded-xl text-trust">
              <Activity className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-text-muted uppercase tracking-widest font-medium">Pipeline Status</span>
              <div className="font-data text-lg font-semibold mt-0.5 text-text-muted">No active run</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-xl p-6 flex items-center gap-4">
            <div className="p-3 bg-trust/10 rounded-xl text-trust">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <span className="text-xs text-text-muted uppercase tracking-widest font-medium">Verified Claims</span>
              <div className="font-data text-2xl font-semibold mt-0.5">0</div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center border border-dashed border-border rounded-2xl py-20 px-6 text-center">
          <div className="p-4 bg-surface border border-border rounded-xl mb-6">
            <FileText className="h-8 w-8 text-text-muted" />
          </div>
          <h2 className="font-display text-xl font-bold text-text">No Applications Submitted</h2>
          <p className="text-text-muted text-sm max-w-sm mt-2 mb-8">
            You haven&apos;t submitted any pitch decks or company information yet. Get started by clicking the button below.
          </p>
          <Link
            href="/founder/apply"
            className="px-6 py-3 bg-action hover:bg-action/90 text-white font-semibold rounded-xl text-sm transition-all"
          >
            Submit Application
          </Link>
        </div>
      </main>
    </div>
  );
}
