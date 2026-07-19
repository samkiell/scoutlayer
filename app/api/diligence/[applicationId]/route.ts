import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { runDiligenceAgent } from '@/agents/diligence';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
      JSON.stringify({ error: 'Forbidden — investor role required to run diligence' }),
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
        const generator = runDiligenceAgent(applicationId);
        for await (const event of generator) {
          emit(event);
          if (event.type === 'run_done' || event.type === 'run_error') break;
        }
      } catch (err: unknown) {
        const message = typeof err === 'object' && err && 'message' in err
          ? (err as { message?: string }).message
          : undefined;
        emit({ type: 'run_error', message: message ?? 'Diligence agent crashed' });
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

