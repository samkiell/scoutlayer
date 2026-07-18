import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;
  return NextResponse.json({
    success: true,
    message: `Screening executed for application ${applicationId} (stub)`,
    data: {
      applicationId,
      founderAxis: { score: 85, trend: 'improving', evidence: 'Experienced tech founder' },
      marketAxis: { score: 70, trend: 'stable', evidence: 'Growing AI infrastructure market' },
      ideaVsMarketAxis: { score: 75, trend: 'improving', evidence: 'Solid value prop' },
    },
  });
}
