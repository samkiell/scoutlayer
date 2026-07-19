import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    // If user already has a role and lands on /role-select, send them to their dashboard
    if (token?.role && pathname === '/role-select') {
      const dest = token.role === 'founder' ? '/founder/dashboard' : '/investor/dashboard';
      return NextResponse.redirect(new URL(dest, req.url));
    }

    // Check if the user is authenticated but hasn't selected a role yet
    if (token && !token.role && pathname !== '/role-select') {
      return NextResponse.redirect(new URL('/role-select', req.url));
    }

    // Role-gating logic
    if (pathname.startsWith('/founder') && token?.role !== 'founder') {
      return NextResponse.redirect(new URL('/role-select', req.url));
    }

    if (pathname.startsWith('/investor') && token?.role !== 'investor') {
      return NextResponse.redirect(new URL('/role-select', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ['/founder/:path*', '/investor/:path*', '/role-select'],
};
