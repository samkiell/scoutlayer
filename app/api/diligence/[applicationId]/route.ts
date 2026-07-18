import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;
  return NextResponse.json({
    success: true,
    message: `Diligence verifications executed for application ${applicationId} (stub)`,
    data: [
      {
        claim: 'Founder has 5+ years of AI experience',
        evidenceUrl: 'https://linkedin.com/in/founder',
        confidence: 95,
        verifiedBy: 'tavily',
      },
      {
        claim: 'ARR is $10k',
        evidenceUrl: 'https://twitter.com/founder/status/1234',
        confidence: 60,
        verifiedBy: 'tavily',
      },
    ],
  });
}
