import React from 'react';
import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-surface border-t border-border">
      <div className="max-w-5xl mx-auto px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Left: Wordmark + tagline */}
        <div className="flex flex-col sm:flex-row items-center gap-2 sm:gap-3">
          <span className="font-display font-bold text-sm tracking-tight text-text">
            Scout<span className="text-action">Layer</span>
          </span>
          <span className="text-text-muted text-xs font-body">
            Evidence-backed venture sourcing, not network access.
          </span>
        </div>

        {/* Right: Minimal links & credits */}
        <div className="flex flex-col sm:flex-row items-center gap-4 text-xs font-data text-text-muted">
          <div className="flex items-center gap-3">
            <Link href="/faqs" className="hover:text-action transition-colors">
              FAQs
            </Link>
            <span className="text-border">|</span>
            <Link href="/terms" className="hover:text-action transition-colors">
              Terms
            </Link>
            <span className="text-border">|</span>
            <Link href="/privacy" className="hover:text-action transition-colors">
              Privacy
            </Link>
            <span className="text-border">|</span>
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-action transition-colors"
            >
              GitHub
            </a>
          </div>
          <span className="hidden sm:inline text-border">|</span>
          <span className="text-[10px] uppercase tracking-wider text-text-muted/60">Built for Hack-Nation 6th Global AI Hackathon</span>
        </div>
      </div>
    </footer>
  );
}
