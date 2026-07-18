'use strict';
'use client';

import React, { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import PipelineStepper from '@/components/PipelineStepper';
import EvidenceReceipt from '@/components/EvidenceReceipt';
import { useRouter, useParams } from 'next/navigation';
import { ArrowLeft, Award, TrendingUp, TrendingDown, Minus } from 'lucide-react';

export default function FounderProfile() {
  const router = useRouter();
  const { id } = useParams();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    // Stub fetch — mock data
    setProfile({
      id,
      name: 'John Doe',
      company: 'Innovate AI',
      founderScore: 88,
      source: 'inbound',
      currentStage: 2, // 0=Sourcing, 1=Screening, 2=Diligence, 3=Decision
      structuredProfile: {
        oneLiner: 'Next-gen intelligence layers for developers.',
        description: 'Building custom agent pipelines with real-time feedback loops.',
        location: 'San Francisco, CA',
        githubUrl: 'https://github.com/johndoe',
      },
      screening: {
        founderAxis: { score: 90, trend: 'improving', evidence: 'Prior exit, 10+ yrs tech leadership' },
        marketAxis: { score: 85, trend: 'stable', evidence: 'High growth sector, strong TAM' },
        ideaVsMarketAxis: { score: 80, trend: 'improving', evidence: 'Highly resilient model, pivot potential' },
      },
      trustClaims: [
        { claim: 'Previously raised $1M seed round from Y Combinator', source: 'https://techcrunch.com/2024/innovate-ai-seed', confidence: 95, verifiedBy: 'tavily' as const, timestamp: '2024-03-15 14:32 UTC' },
        { claim: '10,000 monthly active users', source: 'https://similarweb.com/innovate-ai (no data found)', confidence: 42, verifiedBy: 'unverified' as const, timestamp: '2024-03-15 14:33 UTC' },
        { claim: 'Team previously at Google DeepMind', source: 'https://linkedin.com/in/johndoe (confirmed)', confidence: 88, verifiedBy: 'tavily' as const, timestamp: '2024-03-15 14:34 UTC' },
      ],
      memo: {
        companySnapshot: 'Innovate AI is building developer-centric LLM frameworks with a focus on custom agent pipelines. The founding team brings deep ML research experience and a prior successful exit.',
        swot: {
          strengths: ['Experienced core team with prior exit', 'Fast execution speed', 'Strong technical moat'],
          weaknesses: ['High computing costs', 'Limited go-to-market track record'],
          opportunities: ['Uncapped developer demand for LLM tooling', 'Enterprise adoption wave'],
          threats: ['Open-source alternatives (LangChain, CrewAI)', 'Cloud provider bundling'],
        },
      },
    });
  }, [id]);

  if (!profile) return null;

  const trendIcon = (trend: string) => {
    if (trend === 'improving') return <TrendingUp className="h-3 w-3" />;
    if (trend === 'declining') return <TrendingDown className="h-3 w-3" />;
    return <Minus className="h-3 w-3" />;
  };

  const trendColor = (trend: string) => {
    if (trend === 'improving') return 'text-trust';
    if (trend === 'declining') return 'text-flag';
    return 'text-text-muted';
  };

  return (
    <div className="flex-1 flex flex-col bg-bg text-text min-h-screen">
      <Navbar />

      {/* Dense layout for investor view */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8 flex flex-col gap-8">
        {/* Back + Header */}
        <div>
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-sm text-text-muted hover:text-text transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to pipeline
          </button>
          <div className="flex justify-between items-start">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">{profile.name}</h1>
              <p className="text-action text-lg font-medium mt-1">{profile.company}</p>
              <p className="text-text-muted text-sm mt-1">{profile.structuredProfile.oneLiner}</p>
            </div>
            <div className="bg-surface border border-border px-4 py-3 rounded-xl flex items-center gap-3">
              <Award className="h-5 w-5 text-action" />
              <div>
                <div className="text-[10px] text-text-muted uppercase tracking-wider font-medium">Founder Score</div>
                <div className="font-data text-xl font-semibold">{profile.founderScore}<span className="text-text-muted text-sm">/100</span></div>
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Stepper */}
        <section className="bg-surface border border-border rounded-xl p-6">
          <PipelineStepper currentStage={profile.currentStage} />
        </section>

        {/* 3-Axis Screening */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight">3-Axis Screening</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            {Object.entries(profile.screening).map(([key, value]: any) => (
              <div key={key} className="bg-surface border border-border rounded-xl p-5 flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-xs text-text-muted uppercase tracking-widest font-medium">
                      {key.replace('Axis', '').replace(/([A-Z])/g, ' $1').trim()}
                    </span>
                    <span className={`text-xs font-medium flex items-center gap-1 ${trendColor(value.trend)}`}>
                      {trendIcon(value.trend)}
                      {value.trend}
                    </span>
                  </div>
                  <div className="font-data text-3xl font-bold mb-3">{value.score}</div>
                  <p className="text-sm text-text-muted">{value.evidence}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Trust Claims — Evidence Receipts */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight">Diligence &amp; Trust Claims</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {profile.trustClaims.map((claim: any, idx: number) => (
              <EvidenceReceipt
                key={idx}
                claim={claim.claim}
                source={claim.source}
                confidence={claim.confidence}
                verifiedBy={claim.verifiedBy}
                timestamp={claim.timestamp}
              />
            ))}
          </div>
        </section>

        {/* Investment Memo */}
        <section className="flex flex-col gap-3">
          <h2 className="font-display text-lg font-bold tracking-tight">Investment Memo</h2>
          <div className="bg-surface border border-border rounded-xl p-6 flex flex-col gap-5">
            <div>
              <h3 className="font-display font-semibold text-text mb-2">Company Snapshot</h3>
              <p className="text-sm text-text-muted leading-relaxed">{profile.memo.companySnapshot}</p>
            </div>

            <div className="grid sm:grid-cols-2 gap-4 mt-2">
              <div className="bg-bg p-5 rounded-xl border border-border">
                <h4 className="font-display font-semibold text-text mb-3 text-sm">Strengths</h4>
                <ul className="text-sm text-text-muted list-disc list-inside flex flex-col gap-1.5">
                  {profile.memo.swot.strengths.map((s: string, i: number) => (
                    <li key={i}>{s}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-bg p-5 rounded-xl border border-border">
                <h4 className="font-display font-semibold text-text mb-3 text-sm">Weaknesses</h4>
                <ul className="text-sm text-text-muted list-disc list-inside flex flex-col gap-1.5">
                  {profile.memo.swot.weaknesses.map((w: string, i: number) => (
                    <li key={i}>{w}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-bg p-5 rounded-xl border border-border">
                <h4 className="font-display font-semibold text-text mb-3 text-sm">Opportunities</h4>
                <ul className="text-sm text-text-muted list-disc list-inside flex flex-col gap-1.5">
                  {profile.memo.swot.opportunities.map((o: string, i: number) => (
                    <li key={i}>{o}</li>
                  ))}
                </ul>
              </div>

              <div className="bg-bg p-5 rounded-xl border border-border">
                <h4 className="font-display font-semibold text-text mb-3 text-sm">Threats</h4>
                <ul className="text-sm text-text-muted list-disc list-inside flex flex-col gap-1.5">
                  {profile.memo.swot.threats.map((t: string, i: number) => (
                    <li key={i}>{t}</li>
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
