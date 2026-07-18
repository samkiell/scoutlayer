'use client';

import React, { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight } from 'lucide-react';
import EvidenceReceipt from '@/components/EvidenceReceipt';
import LandingNavbar from '@/components/LandingNavbar';
import Footer from '@/components/Footer';

export default function Home() {
  const { data: session, status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === 'authenticated') {
      const role = (session?.user as any)?.role;
      if (!role) {
        router.push('/role-select');
      } else if (role === 'founder') {
        router.push('/founder/dashboard');
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

  return (
    <div className="flex-1 flex flex-col bg-bg text-text">
      <LandingNavbar />

      <main className="flex-1 max-w-5xl mx-auto px-6 w-full">
        {/* Hero — left-aligned, no decoration */}
        <section className="pt-24 pb-20 sm:pt-32 sm:pb-28 max-w-2xl">
          <h1 className="font-display text-4xl sm:text-5xl font-bold tracking-tight leading-[1.1] mb-5">
            Source founders on evidence,
            <br />
            not warm intros.
          </h1>
          <p className="text-text-muted text-lg leading-relaxed mb-8 max-w-lg">
            ScoutLayer runs AI screening and claim verification on every founder application.
            Every score traces back to a real source. No black boxes.
          </p>
          <button
            onClick={() => signIn('google')}
            className="inline-flex items-center gap-2 px-6 py-3 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-colors group"
          >
            Get Started
            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
          </button>
        </section>

        {/* What it does — two columns, text + receipt */}
        <section className="pb-20 sm:pb-28 grid sm:grid-cols-2 gap-12 items-start border-t border-border pt-16">
          <div>
            <h2 className="font-display text-xl font-semibold mb-4">How it works</h2>
            <ol className="flex flex-col gap-4 text-sm text-text-muted">
              <li className="flex gap-3">
                <span className="font-data text-action font-semibold shrink-0">01</span>
                <span>Founders apply directly, or investors run outbound scans on GitHub and other channels.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-data text-action font-semibold shrink-0">02</span>
                <span>AI agents score each application across three independent axes — Founder, Market, Idea vs. Market.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-data text-action font-semibold shrink-0">03</span>
                <span>A verification agent cross-checks every claim against real sources. Each claim gets its own trust score.</span>
              </li>
              <li className="flex gap-3">
                <span className="font-data text-action font-semibold shrink-0">04</span>
                <span>An investment memo is generated with flagged gaps — never fabricated data.</span>
              </li>
            </ol>
          </div>

          <div className="flex flex-col gap-3">
            <span className="text-xs font-data text-text-muted uppercase tracking-wider">Sample output</span>
            <EvidenceReceipt
              claim="Previously raised $1M seed from Y Combinator"
              source="https://techcrunch.com/2024/03/innovate-ai-seed"
              confidence={92}
              verifiedBy="tavily"
              timestamp="2024-03-15 14:32 UTC"
            />
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
