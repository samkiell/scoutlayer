import { NextResponse } from 'next/server';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ applicationId: string }> }
) {
  const { applicationId } = await params;
  return NextResponse.json({
    success: true,
    message: `Memo generated for application ${applicationId} (stub)`,
    data: {
      applicationId,
      companySnapshot: 'ScoutLayer is an AI-first venture scouting application.',
      investmentHypotheses: 'AI-first sourcing will find hidden gems.',
      swot: {
        strengths: ['Highly automated', 'Tavily-backed verification'],
        weaknesses: ['Requires multiple API integrations'],
        opportunities: ['VC funds scanning for outbound sources'],
        threats: ['Sourcing rate limits'],
      },
      problemProduct: 'Traditional sourcing is human-intensive and network-driven.',
      tractionKpis: 'Prototype scaffold built successfully.',
      gapsFlagged: ['No financial audits performed yet'],
    },
  });
}
