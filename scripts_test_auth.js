const { encode } = require('next-auth/jwt');

// Mint NextAuth JWT session tokens for both investors using the app's secret.
// This mirrors what next-auth sets in the `next-auth.session-token` cookie.
(async () => {
  const secret = process.env.NEXTAUTH_SECRET || 'dev-secret';

  const tokenA = await encode({
    secret,
    token: { name: 'A', email: 'samuelezekiel488@gmail.com', role: 'investor', userId: '6a5c003c7883f8666934dc93', sub: '6a5c003c7883f8666934dc93' },
    maxAge: 60 * 60,
  });
  const tokenB = await encode({
    secret,
    token: { name: 'B', email: 'samkiel488@gmail.com', role: 'investor', userId: '6a5c25f9b0a0ceed86a33b87', sub: '6a5c25f9b0a0ceed86a33b87' },
    maxAge: 60 * 60,
  });

  const headers = (tok) => ({
    'Content-Type': 'application/json',
    Cookie: `next-auth.session-token=${tok}`,
  });

  async function apps(tok) {
    const r = await fetch('http://localhost:3000/api/applications', { headers: headers(tok) });
    return r.json();
  }

  const a = await apps(tokenA);
  const b = await apps(tokenB);
  console.log('Investor A apps:', a.applications?.length, '| outbound:', a.applications?.filter(x=>x.source==='outbound').length, '| inbound:', a.applications?.filter(x=>x.source==='inbound').length);
  console.log('Investor B apps:', b.applications?.length, '| outbound:', b.applications?.filter(x=>x.source==='outbound').length, '| inbound:', b.applications?.filter(x=>x.source==='inbound').length);
  console.log('Both see same inbound set:', JSON.stringify(a.applications?.filter(x=>x.source==='inbound').map(x=>x.id).sort()) === JSON.stringify(b.applications?.filter(x=>x.source==='inbound').map(x=>x.id).sort()));
})().catch(e => { console.error('ERR', e.message); process.exit(1); });
