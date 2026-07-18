'use strict';
'use client';

import React from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { Compass, Shield, Search, ArrowUpRight, Activity } from 'lucide-react';

// Mock data for dense data-grid layout
const MOCK_APPLICATIONS = [
  { id: '1', name: 'Alice Chen', company: 'NeuralPay', source: 'inbound', stage: 'screening', founderScore: 91, trustScore: 87 },
  { id: '2', name: 'Marcus Wright', company: 'DataBridge', source: 'outbound', stage: 'diligence', founderScore: 78, trustScore: 72 },
  { id: '3', name: 'Sarah Kim', company: 'CloudForge', source: 'inbound', stage: 'sourced', founderScore: 85, trustScore: null },
  { id: '4', name: 'James Obi', company: 'Aether Labs', source: 'outbound', stage: 'decided', founderScore: 94, trustScore: 95 },
  { id: '5', name: 'Priya Sharma', company: 'QuantumLeap', source: 'inbound', stage: 'screening', founderScore: 67, trustScore: null },
];

export default function InvestorDashboard() {
  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      {/* Dense layout — Bloomberg-like per PRD */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8 flex flex-col gap-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pb-4 border-b border-border">
          <div>
            <h1 className="font-display text-2xl font-bold tracking-tight">Investor Pipeline</h1>
            <p className="text-text-muted text-sm mt-1">Track inbound applications and manage outbound scouting agents.</p>
          </div>
          <div className="flex gap-3">
            <Link
              href="/investor/search"
              className="flex items-center gap-2 px-4 py-2.5 bg-surface hover:bg-surface/80 text-text-muted border border-border font-medium rounded-lg text-sm transition-all"
            >
              <Search className="h-4 w-4" />
              NL Query
            </Link>
            <Link
              href="/investor/scout"
              className="flex items-center gap-2 px-4 py-2.5 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all"
            >
              <Compass className="h-4 w-4" />
              Scout Outbound
            </Link>
          </div>
        </div>

        {/* Analytics row — compact */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Compass className="h-4 w-4 text-action" />
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Sourced</span>
              <div className="font-data text-xl font-semibold">24</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Shield className="h-4 w-4 text-action" />
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Screened</span>
              <div className="font-data text-xl font-semibold">18</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Shield className="h-4 w-4 text-trust" />
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Avg Trust</span>
              <div className="font-data text-xl font-semibold text-trust">82%</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Activity className="h-4 w-4 text-flag" />
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Scout Runs</span>
              <div className="font-data text-xl font-semibold">3</div>
            </div>
          </div>
        </div>

        {/* Data grid — dense table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest">
                <th className="text-left px-4 py-3 font-medium">Founder</th>
                <th className="text-left px-4 py-3 font-medium">Company</th>
                <th className="text-left px-4 py-3 font-medium">Source</th>
                <th className="text-left px-4 py-3 font-medium">Stage</th>
                <th className="text-right px-4 py-3 font-medium">F. Score</th>
                <th className="text-right px-4 py-3 font-medium">Trust</th>
                <th className="text-right px-4 py-3 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {MOCK_APPLICATIONS.map((app) => (
                <tr key={app.id} className="border-b border-border/50 hover:bg-bg/50 transition-colors">
                  <td className="px-4 py-3 font-medium text-text">{app.name}</td>
                  <td className="px-4 py-3 text-text-muted">{app.company}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-data px-2 py-0.5 rounded ${
                      app.source === 'inbound' ? 'bg-action/10 text-action' : 'bg-trust/10 text-trust'
                    }`}>
                      {app.source}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-xs font-data font-medium ${
                      app.stage === 'decided' ? 'text-trust'
                        : app.stage === 'sourced' ? 'text-text-muted'
                          : 'text-action'
                    }`}>
                      {app.stage}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-data font-semibold">{app.founderScore}</td>
                  <td className="px-4 py-3 text-right font-data font-semibold">
                    {app.trustScore !== null ? (
                      <span className={app.trustScore >= 70 ? 'text-trust' : 'text-flag'}>
                        {app.trustScore}%
                      </span>
                    ) : (
                      <span className="text-text-muted">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <Link
                      href={`/investor/founder/${app.id}`}
                      className="text-action hover:text-action/80 transition-colors"
                    >
                      <ArrowUpRight className="h-4 w-4" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>
    </div>
  );
}
