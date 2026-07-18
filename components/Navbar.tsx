'use client';

import React from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import Link from 'next/link';
import { LogOut, User, Shield } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const role = (session?.user as any)?.role;

  return (
    <nav className="border-b border-border bg-bg/80 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center">
      <div className="flex items-center">
        <Link href="/" className="flex items-center">
          <img
            src="/assets/logo.png"
            alt="ScoutLayer"
            className="h-11 w-auto object-contain"
          />
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {session ? (
          <>
            <div className="flex items-center gap-4 text-sm font-medium">
              {role === 'founder' && (
                <>
                  <Link href="/founder/dashboard" className="text-text-muted hover:text-action transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/founder/apply" className="text-text-muted hover:text-action transition-colors">
                    Apply
                  </Link>
                </>
              )}
              {role === 'investor' && (
                <>
                  <Link href="/investor/dashboard" className="text-text-muted hover:text-action transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/investor/scout" className="text-text-muted hover:text-action transition-colors">
                    Scout Outbound
                  </Link>
                  <Link href="/investor/search" className="text-text-muted hover:text-action transition-colors">
                    Search
                  </Link>
                </>
              )}
            </div>

            <div className="h-4 w-px bg-border" />

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-medium text-text">{session.user?.name || 'User'}</span>
                <span className="text-[10px] text-text-muted uppercase tracking-widest flex items-center gap-1">
                  {role === 'investor' ? (
                    <Shield className="h-3 w-3 text-action inline" />
                  ) : (
                    <User className="h-3 w-3 text-trust inline" />
                  )}
                  {role || 'No Role'}
                </span>
              </div>

              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-border"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-surface flex items-center justify-center font-medium text-sm text-text-muted border border-border">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
              )}

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 text-text-muted hover:text-flag hover:bg-surface rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <Link
            href="/login"
            className="flex items-center gap-2 px-4 py-2 bg-action hover:bg-action/90 text-white font-medium rounded-lg text-sm transition-all"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
