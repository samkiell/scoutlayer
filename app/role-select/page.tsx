'use strict';
'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Shield, ArrowRight, Brain } from 'lucide-react';
import { toast } from 'sonner';

export default function RoleSelect() {
  const { data: session, update } = useSession();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const selectRole = async (role: 'founder' | 'investor') => {
    setLoading(true);
    try {
      const res = await fetch('/api/user/role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      });

      const data = await res.json();
      if (data.success) {
        toast.success(`Role set to ${role}`);
        // Trigger NextAuth session update
        await update({ role });
        router.push(role === 'founder' ? '/founder/dashboard' : '/investor/dashboard');
      } else {
        toast.error(data.error || 'Failed to update role');
      }
    } catch (err: any) {
      toast.error('An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-zinc-950 px-4 text-zinc-100">
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(99,102,241,0.05),transparent_60%)] pointer-events-none" />

      <div className="w-full max-w-2xl text-center relative z-10">
        <div className="inline-flex bg-gradient-to-tr from-violet-600 to-indigo-500 p-3 rounded-2xl shadow-lg shadow-indigo-500/20 mb-6">
          <Brain className="h-8 w-8 text-white" />
        </div>
        <h2 className="text-3xl font-extrabold tracking-tight mb-2">Choose Your Role</h2>
        <p className="text-zinc-400 mb-10 max-w-md mx-auto">
          To get started, please select your perspective. This configuration will define your access level on ScoutLayer.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 text-left">
          {/* Founder Card */}
          <button
            onClick={() => selectRole('founder')}
            disabled={loading}
            className="group p-8 bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900/60 rounded-3xl transition-all duration-300 flex flex-col justify-between text-left disabled:opacity-50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <User className="h-24 w-24 text-indigo-400" />
            </div>
            <div>
              <div className="p-3 bg-emerald-500/10 rounded-2xl w-fit text-emerald-400 mb-6">
                <User className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">I am a Founder</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Submit your pitch deck, describe your project, track screening progress, and view your verified Founder Score.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-8 text-sm font-semibold text-emerald-400 group-hover:translate-x-1 transition-transform">
              Apply Now <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          {/* Investor Card */}
          <button
            onClick={() => selectRole('investor')}
            disabled={loading}
            className="group p-8 bg-zinc-900/40 border border-zinc-800 hover:border-indigo-500/50 hover:bg-zinc-900/60 rounded-3xl transition-all duration-300 flex flex-col justify-between text-left disabled:opacity-50 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Shield className="h-24 w-24 text-indigo-400" />
            </div>
            <div>
              <div className="p-3 bg-indigo-500/10 rounded-2xl w-fit text-indigo-400 mb-6">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="text-xl font-bold text-zinc-100 mb-2">I am an Investor</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Source deals, verify applications via automated agents, inspect trust scores, and export actionable investment memos.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-8 text-sm font-semibold text-indigo-400 group-hover:translate-x-1 transition-transform">
              Access Pipeline <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
