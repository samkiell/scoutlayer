import { NextResponse } from 'next/server';
import clientPromise from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const client = await clientPromise;
    const db = client.db();
    const claim = await db.collection('trustClaims').findOne(
      {
        verifiedBy: 'tavily',
        confidence: { $gte: 75 },
        claim: { $exists: true, $ne: '' }
      },
      {
        sort: { confidence: -1 }
      }
    );

    return NextResponse.json({ success: true, claim });
  } catch (error: any) {
    console.error('Error fetching showcase claim:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
