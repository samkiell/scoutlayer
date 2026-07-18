import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const { query } = await req.json();
    return NextResponse.json({
      success: true,
      message: 'Natural language query processed (stub)',
      query,
      filters: {
        'structuredProfile.sectors': 'AI',
        'structuredProfile.location': 'Berlin',
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
