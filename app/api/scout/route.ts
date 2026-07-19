/**
 * POST /api/scout
 *
 * Auth: investor session required (401 otherwise).
 * Body: Thesis { keywords: string[], minStars?: number, createdAfter?: string }
 * Response: text/event-stream (SSE) — one JSON event per line.
 *
 * Batch cap: max 15 new candidates per invocation to stay within Vercel 60s limit.
 * If GitHub returns more matches, a final SSE event communicates the overflow count.
 */

import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runSourcingAgent } from '@/agents/sourcing';
import type { Thesis } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // explicit 60s — honest about hobby-tier ceiling

export async function POST(req: Request) {
  // ── 1. Auth guard ─────────────────────────────────────────────────────────
  const session = await getServerSession(authOptions);

  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const role = (session.user as any)?.role;
  if (role !== 'investor') {
    return new Response(
      JSON.stringify({ error: 'Forbidden — investor role required to run outbound scouting' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 2. Parse + validate thesis ────────────────────────────────────────────
  let thesis: Thesis;
  try {
    thesis = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  if (!thesis?.keywords || !Array.isArray(thesis.keywords) || thesis.keywords.length === 0) {
    return new Response(
      JSON.stringify({ error: 'thesis.keywords must be a non-empty array' }),
      { status: 422, headers: { 'Content-Type': 'application/json' } }
    );
  }

  // ── 3. SSE stream ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  // Capture the sourcing investor's ID so outbound founders can be scoped to them.
  const investorId = (session.user as { id?: string } | undefined)?.id;

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const generator = runSourcingAgent(thesis, { candidateCap: 15 }, investorId);

        for await (const event of generator) {
          emit(event);
          if (event.type === 'run_done' || event.type === 'run_error') break;
        }
      } catch (err: any) {
        emit({ type: 'run_error', message: err?.message ?? 'Sourcing agent crashed' });
      } finally {
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}
