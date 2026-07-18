'use strict';
'use client';

import React, { useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { User, Shield, ArrowRight } from 'lucide-react';
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
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-4 text-text">
      <div className="w-full max-w-2xl text-center">
        <div className="inline-flex bg-action w-14 h-14 rounded-xl items-center justify-center mb-6">
          <span className="text-white font-display font-bold text-xl">SL</span>
        </div>
        <h2 className="font-display text-3xl font-bold tracking-tight mb-2">Choose Your Role</h2>
        <p className="text-text-muted mb-10 max-w-md mx-auto">
          Select your perspective to configure your ScoutLayer access level.
        </p>

        <div className="grid sm:grid-cols-2 gap-6 text-left">
          {/* Founder Card */}
          <button
            onClick={() => selectRole('founder')}
            disabled={loading}
            className="group p-8 bg-surface border border-border hover:border-trust/50 rounded-2xl transition-all duration-200 flex flex-col justify-between text-left disabled:opacity-50"
          >
            <div>
              <div className="p-3 bg-trust/10 rounded-xl w-fit text-trust mb-6">
                <User className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-text mb-2">I am a Founder</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Submit your pitch deck, describe your project, track screening progress, and view your verified Founder Score.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-8 text-sm font-semibold text-trust group-hover:translate-x-1 transition-transform">
              Apply Now <ArrowRight className="h-4 w-4" />
            </div>
          </button>

          {/* Investor Card */}
          <button
            onClick={() => selectRole('investor')}
            disabled={loading}
            className="group p-8 bg-surface border border-border hover:border-action/50 rounded-2xl transition-all duration-200 flex flex-col justify-between text-left disabled:opacity-50"
          >
            <div>
              <div className="p-3 bg-action/10 rounded-xl w-fit text-action mb-6">
                <Shield className="h-6 w-6" />
              </div>
              <h3 className="font-display text-xl font-bold text-text mb-2">I am an Investor</h3>
              <p className="text-sm text-text-muted leading-relaxed">
                Source deals, verify applications via automated agents, inspect trust scores, and export actionable investment memos.
              </p>
            </div>
            <div className="flex items-center gap-2 mt-8 text-sm font-semibold text-action group-hover:translate-x-1 transition-transform">
              Access Pipeline <ArrowRight className="h-4 w-4" />
            </div>
          </button>
        </div>
      </div>
    </div>
  );
}
