'use strict';
'use client';

import React from 'react';
import { signIn } from 'next-auth/react';
import Link from 'next/link';

export default function Login() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-bg px-4 text-text min-h-screen">
      {/* Wordmark */}
      <span className="font-display font-bold text-xl tracking-tight text-text mb-8">
        Scout<span className="text-action">Layer</span>
      </span>

      {/* Card */}
      <div className="w-full max-w-sm bg-surface border border-border rounded-xl p-8">
        <p className="text-text-muted text-sm text-center mb-6">
          Sign in to source, screen, and back exceptional founders.
        </p>

        <button
          onClick={() => signIn('google', { callbackUrl: '/' })}
          className="w-full flex items-center justify-center gap-3 px-5 py-3 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-colors"
        >
          {/* Google G icon — inline SVG */}
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#fff"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#fff" opacity=".8"/>
            <path d="M5.84 14.09A6.97 6.97 0 0 1 5.49 12c0-.72.13-1.43.35-2.09V7.07H2.18A11.01 11.01 0 0 0 1 12c0 1.78.43 3.45 1.18 4.94l3.66-2.85z" fill="#fff" opacity=".6"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#fff" opacity=".9"/>
          </svg>
          Continue with Google
        </button>

        <p className="text-text-muted text-xs text-center mt-6 leading-relaxed">
          By continuing, you agree to our{' '}
          <Link href="/terms" className="text-action hover:underline">Terms</Link>
          {' '}and{' '}
          <Link href="/privacy" className="text-action hover:underline">Privacy Policy</Link>.
        </p>
      </div>
    </div>
  );
}
