import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { runDecisionAgent } from '@/agents/decision';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// ── POST: trigger memo generation (investor-only, auth guarded) ───────────────
export async function POST(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return new Response(JSON.stringify({ error: 'Unauthenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const role = (session.user as { role?: string } | undefined)?.role;
  if (role !== 'investor') {
    return new Response(
      JSON.stringify({ error: 'Forbidden — investor role required to generate memo' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    );
  }

  const { applicationId } = await params;
  if (!applicationId) {
    return new Response(JSON.stringify({ error: 'applicationId is required' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const emit = (event: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(event)}\n\n`));
      };

      try {
        const generator = runDecisionAgent(applicationId);
        for await (const event of generator) {
          emit(event);
          if (event.type === 'run_done' || event.type === 'run_error') break;
        }
      } catch (err: unknown) {
        const message = typeof err === 'object' && err && 'message' in err
          ? (err as { message?: string }).message
          : undefined;
        emit({ type: 'run_error', message: message ?? 'Decision agent crashed' });
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

// ── GET: return the real stored memo (no hardcoded stub) ──────────────────────
export async function GET(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
  }

  const role = (session.user as { role?: string } | undefined)?.role;
  if (role !== 'investor') {
    return NextResponse.json(
      { success: false, error: 'Forbidden — investor role required to read memo' },
      { status: 403 }
    );
  }

  const { applicationId } = await params;
  if (!applicationId || !ObjectId.isValid(applicationId)) {
    return NextResponse.json({ success: false, error: 'Invalid application ID' }, { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db();

    const memo = await db.collection('memos').findOne({ applicationId });
    if (!memo) {
      return NextResponse.json({ success: true, data: null });
    }

    return NextResponse.json({
      success: true,
      data: {
        applicationId: memo.applicationId,
        companySnapshot: memo.companySnapshot,
        investmentHypotheses: memo.investmentHypotheses,
        swot: memo.swot,
        problemProduct: memo.problemProduct,
        tractionKpis: memo.tractionKpis,
        gapsFlagged: memo.gapsFlagged,
        createdAt: memo.createdAt,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
