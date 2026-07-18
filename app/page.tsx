'use client';

import React, { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Target, Award, Shield } from 'lucide-react';
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

      {/* Hero section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center py-24">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-border text-xs font-medium text-text-muted mb-10">
          <span className="flex h-2 w-2 rounded-full bg-action animate-pulse"></span>
          Maschmeyer Group · Challenge 02
        </div>

        <h1 className="font-display text-5xl sm:text-7xl font-bold tracking-tight mb-6 text-text">
          Evidence-Backed
          <br />
          Venture Sourcing
        </h1>

        <p className="text-lg sm:text-xl text-text-muted max-w-2xl mb-10 leading-relaxed">
          ScoutLayer is an AI-first venture sourcing and screening platform.
          Surface exceptional founders on verifiable evidence, not network access.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-20">
          <button
            onClick={() => signIn('google')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-action hover:bg-action/90 text-white font-semibold rounded-xl text-md transition-all group"
          >
            Enter Platform
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid sm:grid-cols-3 gap-6 w-full border-t border-border pt-16">
          <div className="flex flex-col items-center p-6 bg-surface border border-border rounded-xl">
            <div className="p-3 bg-action/10 rounded-xl mb-4 text-action">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2 text-text">Outbound Sourcing</h3>
            <p className="text-sm text-text-muted">Scan developer channels like GitHub to discover elite technical talent early.</p>
          </div>

          <div className="flex flex-col items-center p-6 bg-surface border border-border rounded-xl">
            <div className="p-3 bg-action/10 rounded-xl mb-4 text-action">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2 text-text">3-Axis Screening</h3>
            <p className="text-sm text-text-muted">AI analysis of Founder, Market, and Idea VS Market trends without averaging.</p>
          </div>

          <div className="flex flex-col items-center p-6 bg-surface border border-border rounded-xl">
            <div className="p-3 bg-trust/10 rounded-xl mb-4 text-trust">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="font-display font-semibold text-lg mb-2 text-text">Trust Verification</h3>
            <p className="text-sm text-text-muted">Tavily-backed claim checker generates real trust scores with full citations.</p>
          </div>
        </div>

        {/* Evidence Receipt Preview */}
        <div className="mt-16 flex flex-col items-center">
          <h2 className="font-display text-lg font-semibold text-text-muted mb-6">Every claim needs a receipt</h2>
          <EvidenceReceipt
            claim="Previously raised $1M seed round from Y Combinator"
            source="https://techcrunch.com/2024/03/innovate-ai-seed"
            confidence={92}
            verifiedBy="tavily"
            timestamp="2024-03-15 14:32 UTC"
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
