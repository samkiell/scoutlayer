'use client';

import React, { useState } from 'react';
import { signIn } from 'next-auth/react';
import { Menu, X } from 'lucide-react';

export default function LandingNavbar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <nav className="sticky top-0 z-50 bg-bg border-b border-surface">
      <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
        {/* Left: Wordmark */}
        <span className="font-display font-bold text-lg tracking-tight text-text">
          Scout<span className="text-action">Layer</span>
        </span>

        {/* Right: Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          <a href="#founders" className="text-sm text-text-muted hover:text-text transition-colors">
            For Founders
          </a>
          <a href="#investors" className="text-sm text-text-muted hover:text-text transition-colors">
            For Investors
          </a>
          <button
            onClick={() => signIn('google')}
            className="px-4 py-2 bg-action hover:bg-action/90 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Sign In
          </button>
        </div>

        {/* Right: Mobile hamburger */}
        <button
          onClick={() => setMobileOpen(!mobileOpen)}
          className="md:hidden p-2 text-text-muted hover:text-text transition-colors"
          aria-label="Toggle menu"
        >
          {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* Mobile panel */}
      {mobileOpen && (
        <div className="md:hidden bg-surface border-t border-border px-6 py-4 flex flex-col gap-3">
          <a
            href="#founders"
            onClick={() => setMobileOpen(false)}
            className="text-sm text-text-muted hover:text-text transition-colors py-2"
          >
            For Founders
          </a>
          <a
            href="#investors"
            onClick={() => setMobileOpen(false)}
            className="text-sm text-text-muted hover:text-text transition-colors py-2"
          >
            For Investors
          </a>
          <button
            onClick={() => signIn('google')}
            className="w-full px-4 py-2.5 bg-action hover:bg-action/90 text-white text-sm font-medium rounded-lg transition-colors mt-1"
          >
            Sign In
          </button>
        </div>
      )}
    </nav>
  );
}
