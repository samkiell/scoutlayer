/**
 * POST /api/scout
 *
 * Accepts a Thesis object and streams sourcing progress as Server-Sent Events (SSE).
 * Each event is a JSON-encoded SourcingEvent from the sourcing agent.
 *
 * SSE format:
 *   data: {"type":"candidate_found","username":"torvalds",...}\n\n
 */

import { runSourcingAgent } from '@/agents/sourcing';
import type { Thesis } from '@/types';

export const dynamic = 'force-dynamic';
export const maxDuration = 300; // 5 min cap (Vercel hobby: 60s, pro: 300s)

export async function POST(req: Request) {
  let thesis: Thesis;

  try {
    thesis = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid JSON body' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // Validate thesis
  if (!thesis?.keywords || !Array.isArray(thesis.keywords) || thesis.keywords.length === 0) {
    return new Response(JSON.stringify({ error: 'thesis.keywords must be a non-empty array' }), {
      status: 422,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── SSE stream setup ─────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        const chunk = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(chunk));
      };

      try {
        const generator = runSourcingAgent(thesis);

        for await (const event of generator) {
          emit(event);
          // Break on terminal states
          if (event.type === 'run_done' || event.type === 'run_error') {
            break;
          }
        }
      } catch (err: any) {
        emit({ type: 'run_error', message: err?.message ?? 'Sourcing agent crashed' });
      } finally {
        // Signal end of stream
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
      'X-Accel-Buffering': 'no', // disable nginx buffering on Vercel
    },
  });
}
