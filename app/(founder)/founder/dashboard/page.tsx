'use strict';
'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { FileText, PlusCircle, Activity, Award, CheckCircle } from 'lucide-react';

export default function FounderDashboard() {
  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Welcome Banner */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-zinc-900">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Founder Hub</h1>
            <p className="text-zinc-400 text-sm mt-1">Manage your application and track your real-time founder score.</p>
          </div>
          <Link
            href="/founder/apply"
            className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/10 hover:scale-[1.01]"
          >
            <PlusCircle className="h-4 w-4" />
            Apply to ScoutLayer
          </Link>
        </div>

        {/* Analytics Summary */}
        <div className="grid sm:grid-cols-3 gap-6">
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Award className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Founder Score</span>
              <div className="text-2xl font-bold mt-0.5">85/100</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Active Run Status</span>
              <div className="text-lg font-bold mt-0.5 text-emerald-400">No active run</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Verified Claims</span>
              <div className="text-2xl font-bold mt-0.5">0</div>
            </div>
          </div>
        </div>

        {/* Empty State */}
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-900 rounded-3xl py-20 px-6 text-center bg-zinc-900/10">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl mb-6">
            <FileText className="h-10 w-10 text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-200">No Applications Submitted</h2>
          <p className="text-zinc-500 text-sm max-w-sm mt-2 mb-8">
            You haven't submitted any pitch decks or company information yet. Get started by clicking the button below.
          </p>
          <Link
            href="/founder/apply"
            className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-sm transition-all"
          >
            Submit Application
          </Link>
        </div>
      </main>
    </div>
  );
}
