'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import EvidenceReceipt from '@/components/EvidenceReceipt';
import LandingNavbar from '@/components/LandingNavbar';
import Footer from '@/components/Footer';
import PipelineStepper from '@/components/PipelineStepper';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [showcaseClaim, setShowcaseClaim] = useState<any>(null);

  useEffect(() => {
    fetch('/api/showcase-claim')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.claim) {
          setShowcaseClaim(data.claim);
        }
      })
      .catch((err) => console.error('Error fetching showcase claim:', err));
  }, []);

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (!role) {
        router.push('/role-select');
      } else if (role === 'founder') {
        // Query to check if founder has applied (using a mock check or API check; let's check via a client-side fetch or helper)
        fetch('/api/applications')
          .then((res) => res.json())
          .then((data) => {
            if (data.hasApplied) {
              router.push('/founder/dashboard');
            } else {
              router.push('/founder/apply');
            }
          })
          .catch(() => {
            // Fallback to dashboard if API fails
            router.push('/founder/dashboard');
          });
      } else if (role === 'investor') {
        router.push('/investor/dashboard');
      }
    }
  }, [session, status, router]);

  if (status === 'loading') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center bg-bg text-text">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-action"></div>
      </div>
    );
  }

  // Define steps with descriptions for "How It Works"
  const pipelineExplanation = [
    {
      label: 'Sourcing',
      desc: 'Founders apply, or we find them on GitHub before they start fundraising.',
    },
    {
      label: 'Screening',
      desc: 'Scored on founder, market, and idea fit — independently, never averaged.',
    },
    {
      label: 'Diligence',
      desc: 'Every claim checked against real evidence. No invented traction.',
    },
    {
      label: 'Decision',
      desc: 'A clear memo an investor can act on, gaps flagged honestly.',
    },
  ];

  return (
    <div className="flex-1 flex flex-col bg-bg text-text">
      <LandingNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-6 w-full flex flex-col gap-28 pb-28">
        {/* Hero — left-aligned, no decoration */}
        <section className="pt-24 max-w-2xl">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Source founders on evidence,
            <br />
            not warm intros.
          </h1>
          <p className="text-text-muted text-lg leading-relaxed mb-8 max-w-lg">
            ScoutLayer runs AI screening and claim verification on every founder application.
            Every score traces back to a real source. No black boxes.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-colors group"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </Link>
        </section>

        {/* 1. How It Works Section */}
        <section id="how-it-works" className="border-t border-border pt-16 flex flex-col gap-10">
          <div>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2">From signal to decision</h2>
            <p className="text-text-muted text-sm font-body">Our structured pipeline automates verification end-to-end.</p>
          </div>
          
          {/* Horizontal layout on desktop / Stacked on mobile handled via grid/stepper flex wrapper */}
          <div className="flex flex-col gap-8 bg-surface border border-border p-8 rounded-xl">
            <PipelineStepper currentStage={1} />
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-6 pt-6 border-t border-border/50">
              {pipelineExplanation.map((step, idx) => (
                <div key={idx} className="flex flex-col gap-1.5">
                  <span className="font-data text-xs text-text-muted uppercase tracking-wider">
                    {idx + 1}. {step.label}
                  </span>
                  <p className="text-sm text-text-muted leading-relaxed font-body">
                    {step.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 2. Evidence Receipt Showcase Section */}
        <section id="evidence-showcase" className="border-t border-border pt-16 grid md:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col gap-4">
            <h2 className="font-display text-2xl font-bold tracking-tight">Every score has a receipt</h2>
            <p className="text-text-muted text-sm leading-relaxed max-w-md font-body">
              No black-box scores. Click any result and see exactly what backed it. We generate receipts detailing the claims, sources, and verifier confidence.
            </p>
          </div>
          <div className="flex justify-start md:justify-end">
            <EvidenceReceipt
              claim={showcaseClaim ? showcaseClaim.claim : "Example: 500+ GitHub stars in 60 days"}
              source={showcaseClaim ? showcaseClaim.evidenceUrl : "https://github.com/scoutlayer/core-engine"}
              confidence={showcaseClaim ? showcaseClaim.confidence : 94}
              verifiedBy={showcaseClaim ? showcaseClaim.verifiedBy : "tavily"}
              timestamp={showcaseClaim && showcaseClaim.createdAt ? new Date(showcaseClaim.createdAt).toISOString().replace('T', ' ').substring(0, 16) + ' UTC' : "2026-07-18 21:50 UTC"}
            />
          </div>
        </section>

        {/* 3. For Founders / For Investors Section */}
        <section id="roles" className="border-t border-border pt-16 grid md:grid-cols-2 gap-8">
          {/* Founders Card */}
          <div className="bg-surface border border-border rounded-xl p-8 flex flex-col justify-between items-start min-h-[220px]">
            <div>
              <h3 className="font-display text-xl font-bold text-text mb-3">For Founders</h3>
              <p className="text-sm text-text-muted leading-relaxed mb-6 font-body">
                Apply once. Get seen on evidence, not who you know. Track your active verifications and claim receipts.
              </p>
            </div>
            <Link
              href="/login?intent=founder"
              className="px-5 py-2.5 bg-action hover:bg-action/90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Apply as a Founder
            </Link>
          </div>

          {/* Investors Card */}
          <div className="bg-surface border border-border rounded-xl p-8 flex flex-col justify-between items-start min-h-[220px]">
            <div>
              <h3 className="font-display text-xl font-bold text-text mb-3">For Investors</h3>
              <p className="text-sm text-text-muted leading-relaxed mb-6 font-body">
                Source and screen founders before the rest of the market sees them. Access detailed memos and verified signals.
              </p>
            </div>
            <Link
              href="/login?intent=investor"
              className="px-5 py-2.5 bg-action hover:bg-action/90 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Sign in as an Investor
            </Link>
          </div>
        </section>

        {/* 4. Final CTA Section */}
        <section className="border-t border-border pt-16 pb-8 flex flex-col items-start gap-6 max-w-xl">
          <h2 className="font-display text-2xl font-bold tracking-tight">Ready to see it work?</h2>
          <p className="text-text-muted text-sm leading-relaxed font-body">
            Get started by logging in and configuring your role. Start screening or verifying claims instantly.
          </p>
          <Link
            href="/login"
            className="px-6 py-3 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-colors"
          >
            Enter Platform
          </Link>
        </section>
      </main>

      <Footer />
    </div>
  );
}
