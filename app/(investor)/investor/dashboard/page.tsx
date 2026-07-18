'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { Compass, Shield, Search, ArrowUpRight, Activity, Loader2 } from 'lucide-react';

interface ApplicationItem {
  id: string;
  name: string;
  company: string;
  source: 'inbound' | 'outbound';
  stage: string;
  founderScore: number | null;
  trustScore: number | null;
}

export default function InvestorDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<ApplicationItem[]>([]);

  // Auth Guard: Only investors allowed. Redirect founders.
  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    } else if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (role !== 'investor') {
        router.push(role === 'founder' ? '/founder/dashboard' : '/role-select');
      } else {
        // Fetch applications from the database via API
        fetch('/api/applications')
          .then((res) => res.json())
          .then((data) => {
            if (data.success && data.applications) {
              setApplications(data.applications);
            }
            setLoading(false);
          })
          .catch(() => {
            setLoading(false);
          });
      }
    }
  }, [session, status, router]);

  if (status === 'loading' || loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg text-text min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-action" />
      </div>
    );
  }

  // Statistics calculation based on real data
  const totalSourced = applications.filter((app) => app.stage === 'sourced').length;
  const totalScreened = applications.filter((app) => ['screening', 'diligence', 'decided'].includes(app.stage)).length;

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
              <div className="font-data text-xl font-semibold">{totalSourced}</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Shield className="h-4 w-4 text-action" />
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Screened</span>
              <div className="font-data text-xl font-semibold">{totalScreened}</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Shield className="h-4 w-4 text-trust" />
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Avg Trust</span>
              <div className="font-data text-xl font-semibold text-trust">—</div>
            </div>
          </div>

          <div className="bg-surface border border-border rounded-lg px-4 py-3 flex items-center gap-3">
            <Activity className="h-4 w-4 text-flag" />
            <div>
              <span className="text-[10px] text-text-muted uppercase tracking-widest font-medium">Active Pipeline</span>
              <div className="font-data text-xl font-semibold">{applications.length}</div>
            </div>
          </div>
        </div>

        {/* Data grid — dense table */}
        <div className="bg-surface border border-border rounded-lg overflow-hidden">
          {applications.length > 0 ? (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-text-muted text-xs uppercase tracking-widest bg-bg/20">
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
                {applications.map((app) => (
                  <tr key={app.id} className="border-b border-border/50 hover:bg-bg/50 transition-colors">
                    <td className="px-4 py-3 font-medium text-text">{app.name}</td>
                    <td className="px-4 py-3 text-text-muted">{app.company}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[10px] font-data px-2 py-0.5 rounded border uppercase tracking-wider ${
                        app.source === 'inbound' 
                          ? 'bg-action/10 text-action border-action/20' 
                          : 'bg-trust/10 text-trust border-trust/20'
                      }`}>
                        source: {app.source}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-data font-medium uppercase ${
                        app.stage === 'decided' ? 'text-trust'
                          : app.stage === 'sourced' ? 'text-text-muted'
                            : 'text-action'
                      }`}>
                        {app.stage}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right font-data font-semibold">
                      {app.founderScore !== null ? app.founderScore : <span className="text-text-muted">—</span>}
                    </td>
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
                        className="text-action hover:text-action/80 transition-colors inline-block"
                      >
                        <ArrowUpRight className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="py-16 text-center">
              <p className="text-text-muted text-sm">No applications or sourced founders found in the pipeline.</p>
              <p className="text-xs text-text-muted mt-1">Founders can apply directly, or you can trigger outbound scouting.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
