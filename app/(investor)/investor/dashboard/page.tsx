'use strict';
'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Compass, Shield, Search, ArrowUpRight, BarChart2 } from 'lucide-react';

export default function InvestorDashboard() {
  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
        {/* Welcome Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 pb-6 border-b border-zinc-900">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Investor Pipeline</h1>
            <p className="text-zinc-400 text-sm mt-1">Track inbound applications and manage outbound scouting agents.</p>
          </div>
          <div className="flex gap-4">
            <Link
              href="/investor/search"
              className="flex items-center gap-2 px-5 py-3 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 border border-zinc-800 font-semibold rounded-xl text-sm transition-all"
            >
              <Search className="h-4 w-4" />
              NL Query
            </Link>
            <Link
              href="/investor/scout"
              className="flex items-center gap-2 px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-sm transition-all shadow-lg shadow-indigo-600/10 hover:scale-[1.01]"
            >
              <Compass className="h-4 w-4" />
              Scout Outbound
            </Link>
          </div>
        </div>

        {/* Analytics Summary */}
        <div className="grid sm:grid-cols-4 gap-6">
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-indigo-500/10 rounded-xl text-indigo-400">
              <Compass className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Total Sourced</span>
              <div className="text-2xl font-bold mt-0.5">24</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-violet-500/10 rounded-xl text-violet-400">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Screened / Vetted</span>
              <div className="text-2xl font-bold mt-0.5">18</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-emerald-500/10 rounded-xl text-emerald-400">
              <BarChart2 className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Avg Trust Score</span>
              <div className="text-2xl font-bold mt-0.5">82%</div>
            </div>
          </div>

          <div className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex items-center gap-4">
            <div className="p-3 bg-amber-500/10 rounded-xl text-amber-400">
              <ActivityIcon className="h-6 w-6" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Scout Runs</span>
              <div className="text-2xl font-bold mt-0.5">3 Active</div>
            </div>
          </div>
        </div>

        {/* Empty State / Dashboard Content */}
        <div className="flex-1 flex flex-col items-center justify-center border-2 border-dashed border-zinc-900 rounded-3xl py-20 px-6 text-center bg-zinc-900/10">
          <div className="p-4 bg-zinc-900 border border-zinc-800 rounded-2xl mb-6">
            <Compass className="h-10 w-10 text-zinc-600" />
          </div>
          <h2 className="text-xl font-bold text-zinc-200">No applications or sourced startups yet</h2>
          <p className="text-zinc-500 text-sm max-w-sm mt-2 mb-8">
            Start by running an outbound scouting agent scan on developer/hacker directories, or wait for founders to apply.
          </p>
          <Link
            href="/investor/scout"
            className="px-6 py-3 bg-zinc-100 hover:bg-zinc-200 text-zinc-950 font-semibold rounded-xl text-sm transition-all"
          >
            Launch Scout Run
          </Link>
        </div>
      </main>
    </div>
  );
}

// Simple fallback inline helper
function ActivityIcon(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
    </svg>
  );
}
