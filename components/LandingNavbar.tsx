'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { signIn } from 'next-auth/react';
import { Menu, X } from 'lucide-react';

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-bg border-b border-surface">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center">
          <img
            src="/assets/logo.png"
            alt="ScoutLayer"
            className="h-11 w-auto object-contain"
          />
        </Link>

        {/* Right: Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <Link href="/login?intent=founder" className="text-sm text-text-muted hover:text-text transition-colors">
            For Founders
          </Link>
          <Link href="/login?intent=investor" className="text-sm text-text-muted hover:text-text transition-colors">
            For Investors
          </Link>
          <Link
            href="/login"
            className="px-4 py-2 bg-action hover:bg-action/90 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign In
          </Link>
        </div>

        {/* Right: Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-text-muted hover:text-text transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-t border-border px-6 py-3 flex flex-col gap-1">
          <Link
            href="/login?intent=founder"
            onClick={() => setMobileOpen(false)}
            className="min-h-[44px] flex items-center text-sm text-text-muted hover:text-text hover:bg-bg/50 rounded-lg transition-colors px-3"
          >
            For Founders
          </Link>
          <Link
            href="/login?intent=investor"
            onClick={() => setMobileOpen(false)}
            className="min-h-[44px] flex items-center text-sm text-text-muted hover:text-text hover:bg-bg/50 rounded-lg transition-colors px-3"
          >
            For Investors
          </Link>
          <Link
            href="/login"
            onClick={() => setMobileOpen(false)}
            className="w-full text-center px-4 py-3 bg-action hover:bg-action/90 text-white text-sm font-medium rounded-lg transition-colors mt-2 min-h-[44px] flex items-center justify-center"
          >
            Sign In
          </Link>
        </div>
      )}
    </nav>
  );
}
