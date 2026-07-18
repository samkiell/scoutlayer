'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Award, Shield, FileText, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';

export default function FounderProfile() {
  const router = useRouter();
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Stub fetch
    setProfile({
      id,
      name: 'John Doe',
      company: 'Innovate AI',
      founderScore: 88,
      source: 'inbound',
      structuredProfile: {
        oneLiner: 'Next-gen intelligence layers for developers.',
        description: 'Building custom agent pipelines with real-time feedback loops.',
        location: 'San Francisco, CA',
        githubUrl: 'https://github.com/johndoe',
      },
      screening: {
        founderAxis: { score: 90, trend: 'improving', evidence: 'Prior exit, 10+ yrs tech leadership' },
        marketAxis: { score: 85, trend: 'stable', evidence: 'High growth sector' },
        ideaVsMarketAxis: { score: 80, trend: 'improving', evidence: 'Highly resilient model' },
      },
      trustClaims: [
        { claim: 'Previously raised $1M', confidence: 95, verifiedBy: 'tavily', status: 'verified' },
        { claim: '10,000 monthly active users', confidence: 50, verifiedBy: 'unverified', status: 'contradiction' },
      ],
      memo: {
        companySnapshot: 'Innovate AI is building developer-centric LLM frameworks.',
        swot: {
          strengths: ['Experienced core team', 'Fast execution speed'],
          weaknesses: ['High computing costs'],
          opportunities: ['Uncapped developer demand'],
          threats: ['Open-source alternatives'],
        },
      },
    });
  }, [id]);

  if (!profile) return null;

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 min-h-screen">
      <Navbar />

      <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col gap-10">
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-zinc-500 hover:text-zinc-300 transition-colors mb-6"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to pipeline
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">{profile.name}</h1>
              <p className="text-indigo-400 text-lg font-semibold mt-1">{profile.company}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 px-4 py-2.5 rounded-2xl flex items-center gap-2">
              <Award className="h-5 w-5 text-indigo-400" />
              <div>
                <div className="text-[10px] text-zinc-500 uppercase tracking-wider font-semibold">Founder Score</div>
                <div className="text-lg font-bold">{profile.founderScore}/100</div>
              </div>
            </div>
          </div>
        </div>

        {/* Axis Scores */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">3-Axis Screening</h2>
          <div className="grid sm:grid-cols-3 gap-6">
            {Object.entries(profile.screening).map(([key, value]: any) => (
              <div key={key} className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">
                      {key.replace('Axis', '')}
                    </span>
                    <span className="text-xs text-indigo-400 font-semibold flex items-center gap-1">
                      <TrendingUp className="h-3 w-3" />
                      {value.trend}
                    </span>
                  </div>
                  <div className="text-3xl font-extrabold mb-4">{value.score}</div>
                  <p className="text-sm text-zinc-400">{value.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Claims */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">Diligence & Trust Scores</h2>
          <div className="flex flex-col gap-4">
            {profile.trustClaims.map((claim: any, idx: number) => (
              <div key={idx} className="bg-zinc-900/30 border border-zinc-900 rounded-2xl p-6 flex justify-between items-center">
                <div className="flex items-center gap-4">
                  {claim.status === 'verified' ? (
                    <CheckCircle2 className="h-6 w-6 text-emerald-400 flex-shrink-0" />
                  ) : (
                    <AlertTriangle className="h-6 w-6 text-red-400 flex-shrink-0" />
                  )}
                  <div>
                    <h4 className="font-semibold text-zinc-200">{claim.claim}</h4>
                    <p className="text-xs text-zinc-500 mt-1">Verified via: {claim.verifiedBy}</p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs text-zinc-500 font-semibold uppercase tracking-wider">Confidence</div>
                  <div className="font-bold text-zinc-200">{claim.confidence}%</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Investment Memo */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-bold tracking-tight">Investment Memo</h2>
          <div className="bg-zinc-900/30 border border-zinc-900 rounded-3xl p-8 flex flex-col gap-6">
            <div>
              <h3 className="font-bold text-zinc-200 mb-2">Company Snapshot</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">{profile.memo.companySnapshot}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-6 mt-4">
              <div className="bg-zinc-950/40 p-6 rounded-2xl border border-zinc-800/60">
                <h4 className="font-bold text-zinc-300 mb-3 text-sm">Strengths</h4>
                <ul className="text-sm text-zinc-400 list-disc list-inside flex flex-col gap-1.5">
                  {profile.memo.swot.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-zinc-950/40 p-6 rounded-2xl border border-zinc-800/60">
                <h4 className="font-bold text-zinc-300 mb-3 text-sm">Weaknesses</h4>
                <ul className="text-sm text-zinc-400 list-disc list-inside flex flex-col gap-1.5">
                  {profile.memo.swot.weaknesses.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
