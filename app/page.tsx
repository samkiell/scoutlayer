'use client';

import React, { useEffect } from 'react';
import { useSession, signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Brain, ArrowRight, Shield, Target, Award } from 'lucide-react';

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
      <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 text-zinc-100">
        <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-indigo-500"></div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-zinc-950 text-zinc-100 selection:bg-indigo-500/30">
      {/* Background gradients */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(99,102,241,0.08),transparent_50%),radial-gradient(ellipse_at_bottom_left,rgba(168,85,247,0.05),transparent_50%)] pointer-events-none" />

      {/* Hero section */}
      <main className="flex-1 max-w-5xl mx-auto px-6 flex flex-col items-center justify-center text-center relative z-10 py-20">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800 text-xs font-semibold text-zinc-400 mb-8 animate-fade-in shadow-inner">
          <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-pulse"></span>
          Maschmeyer Group challenge 02
        </div>

        <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-4 rounded-3xl shadow-xl shadow-indigo-500/20 mb-8">
          <Brain className="h-12 w-12 text-white" />
        </div>

        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight mb-6 bg-gradient-to-b from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Evidence-Backed Venture Sourcing
        </h1>

        <p className="text-lg sm:text-xl text-zinc-400 max-w-2xl mb-10 leading-relaxed">
          ScoutLayer is an AI-first venture sourcing and screening platform. Surface exceptional founders on verifiable evidence, not network access.
        </p>

        <div className="flex flex-col sm:flex-row gap-4 mb-16">
          <button
            onClick={() => signIn('google')}
            className="flex items-center justify-center gap-2 px-8 py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold rounded-xl text-md transition-all shadow-lg shadow-indigo-600/25 group"
          >
            Enter Platform
            <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        {/* Feature Highlights */}
        <div className="grid sm:grid-cols-3 gap-8 w-full border-t border-zinc-900 pt-16">
          <div className="flex flex-col items-center p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
            <div className="p-3 bg-indigo-500/10 rounded-xl mb-4 text-indigo-400">
              <Target className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-zinc-200">Outbound Sourcing</h3>
            <p className="text-sm text-zinc-500">Scan developer channels like GitHub to discover elite technical talent early.</p>
          </div>

          <div className="flex flex-col items-center p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
            <div className="p-3 bg-violet-500/10 rounded-xl mb-4 text-violet-400">
              <Award className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-zinc-200">3-Axis Screening</h3>
            <p className="text-sm text-zinc-500">AI analysis of Founder, Market, and Idea VS Market trends without averaging.</p>
          </div>

          <div className="flex flex-col items-center p-4 bg-zinc-900/30 border border-zinc-900 rounded-2xl">
            <div className="p-3 bg-emerald-500/10 rounded-xl mb-4 text-emerald-400">
              <Shield className="h-6 w-6" />
            </div>
            <h3 className="font-semibold text-lg mb-2 text-zinc-200">Trust claim verification</h3>
            <p className="text-sm text-zinc-500">Tavily-backed claim checker generates real trust scores with full citations.</p>
          </div>
        </div>
      </main>
    </div>
  );
}
