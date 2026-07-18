import { NextResponse } from 'next/server';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;
  return NextResponse.json({
    success: true,
    message: `Pipeline progress status for ${applicationId} (stub)`,
    data: {
      applicationId,
      stage: 'screening',
      status: 'running',
      log: [
        { timestamp: new Date(), message: 'Started pipeline run', level: 'info' },
        { timestamp: new Date(), message: 'Sourcing completed', level: 'info' },
        { timestamp: new Date(), message: 'Running screening agents...', level: 'info' },
      ],
    },
  });
}
