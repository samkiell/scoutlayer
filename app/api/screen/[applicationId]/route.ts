import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runScreeningAgent } from '@/agents/screening';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

export const dynamic = 'force-dynamic';
export const maxDuration = 60; // Vercel hobby limit

export async function POST(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;

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
      JSON.stringify({ error: 'Forbidden — investor role required to run screening' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  if (!applicationId) {
    return new Response(JSON.stringify({ error: 'applicationId parameter is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  // ── 2. SSE stream ─────────────────────────────────────────────────────────
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const generator = runScreeningAgent(applicationId);

        for await (const event of generator) {
          emit(event);
          if (event.type === 'run_done' || event.type === 'run_error') break;
        }
      } catch (err: any) {
        const message = err?.message ?? 'Screening agent crashed';
        emit({ type: 'run_error', message });

        // Ensure pipeline status gets set to error in db if it crashed out of generator loop
        try {
          const mongoClient = await clientPromise;
          const db = mongoClient.db();
          await db.collection('pipelineRuns').updateOne(
            { applicationId, stage: 'screening' },
            {
              $set: { status: 'error', updatedAt: new Date() },
              $push: { log: { timestamp: new Date(), message: `Screening crashed: ${message}`, level: 'error' } } as any,
            }
          );
        } catch (dbErr) {
          console.error('Failed to update pipelineRuns status on crash:', dbErr);
        }
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
