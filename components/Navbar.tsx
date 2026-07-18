'use client';

import React from 'react';
import { useSession, signOut, signIn } from 'next-auth/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Compass, LogOut, Brain, User, Shield } from 'lucide-react';

export default function Navbar() {
  const { data: session } = useSession();
  const router = useRouter();
  const role = (session?.user as any)?.role;

  return (
    <nav className="border-b border-zinc-800 bg-zinc-950/70 backdrop-blur-md sticky top-0 z-50 px-6 py-4 flex justify-between items-center text-zinc-100">
      <div className="flex items-center gap-3">
        <div className="bg-gradient-to-tr from-violet-600 to-indigo-500 p-2 rounded-xl shadow-lg shadow-indigo-500/20">
          <Brain className="h-6 w-6 text-white" />
        </div>
        <Link href="/" className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-zinc-100 to-zinc-400 bg-clip-text text-transparent">
          Scout<span className="text-indigo-400 font-medium">Layer</span>
        </Link>
      </div>

      <div className="flex items-center gap-6">
        {session ? (
          <>
            <div className="flex items-center gap-4 text-sm font-medium">
              {role === 'founder' && (
                <>
                  <Link href="/founder/dashboard" className="hover:text-indigo-400 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/founder/apply" className="hover:text-indigo-400 transition-colors">
                    Apply
                  </Link>
                </>
              )}
              {role === 'investor' && (
                <>
                  <Link href="/investor/dashboard" className="hover:text-indigo-400 transition-colors">
                    Dashboard
                  </Link>
                  <Link href="/investor/scout" className="hover:text-indigo-400 transition-colors">
                    Scout Outbound
                  </Link>
                  <Link href="/investor/search" className="hover:text-indigo-400 transition-colors">
                    Search
                  </Link>
                </>
              )}
            </div>

            <div className="h-4 w-px bg-zinc-800" />

            <div className="flex items-center gap-3">
              <div className="flex flex-col items-end">
                <span className="text-sm font-semibold text-zinc-200">{session.user?.name || 'User'}</span>
                <span className="text-[10px] text-zinc-400 uppercase tracking-widest flex items-center gap-1">
                  {role === 'investor' ? (
                    <Shield className="h-3 w-3 text-indigo-400 inline" />
                  ) : (
                    <User className="h-3 w-3 text-emerald-400 inline" />
                  )}
                  {role || 'No Role'}
                </span>
              </div>

              {session.user?.image ? (
                <img
                  src={session.user.image}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border border-zinc-800"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center font-bold text-sm text-zinc-400 border border-zinc-700">
                  {session.user?.name?.charAt(0) || 'U'}
                </div>
              )}

              <button
                onClick={() => signOut({ callbackUrl: '/login' })}
                className="p-2 text-zinc-400 hover:text-red-400 hover:bg-zinc-900 rounded-lg transition-all"
                title="Logout"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </>
        ) : (
          <button
            onClick={() => signIn('google')}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-medium rounded-lg text-sm transition-all shadow-md shadow-indigo-600/10"
          >
            Sign In
          </button>
        )}
      </div>
    </nav>
  );
}
