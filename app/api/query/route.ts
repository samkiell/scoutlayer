import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { translateNLQuery } from '@/lib/query/queryTranslator';

export async function POST(req: Request) {
  try {
    // 1. Auth check
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
    }

    if (user.role !== 'investor') {
      return NextResponse.json({ success: false, error: 'Forbidden' }, { status: 403 });
    }

    // 2. Parse query
    const { query } = await req.json();
    if (!query || typeof query !== 'string') {
      return NextResponse.json({ success: false, error: 'Query string is required' }, { status: 400 });
    }

    // 3. Translate query using Groq
    const translation = await translateNLQuery(query);

    // 4. Perform database search using aggregation (joining applications & screenings)
    const foundersCol = db.collection('founders');

    const results = await foundersCol.aggregate([
      // Lookup applications
      {
        $lookup: {
          from: 'applications',
          let: { idStr: { $toString: '$_id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$founderId', '$$idStr'] }
              }
            }
          ],
          as: 'applications'
        }
      },
      // Keep application as first object or null
      {
        $addFields: {
          application: { $arrayElemAt: ['$applications', 0] }
        }
      },
      // Lookup screenings (using application ID if present)
      {
        $lookup: {
          from: 'screenings',
          let: { appIdStr: { $toString: '$application._id' } },
          pipeline: [
            {
              $match: {
                $expr: { $eq: ['$applicationId', '$$appIdStr'] }
              }
            }
          ],
          as: 'screenings'
        }
      },
      // Keep screening as first object or null
      {
        $addFields: {
          screening: { $arrayElemAt: ['$screenings', 0] }
        }
      },
      // Apply translated filter
      {
        $match: translation.filter
      },
      // Sort newest first
      {
        $sort: { createdAt: -1 }
      }
    ]).toArray();

    // Map to the format needed by dashboards/founder list card
    const matchedFounders = results.map((founder: any) => ({
      id: founder._id.toString(),
      name: founder.name,
      company: founder.company,
      source: founder.source,
      stage: founder.application?.status || 'sourced',
      founderScore: founder.founderScore?.value ?? null,
      trustScore: null, // TrustScore calculations are loaded in detail views
      structuredProfile: founder.structuredProfile || {}
    }));

    return NextResponse.json({
      success: true,
      query,
      filter: translation.filter,
      explanation: translation.explanation,
      unsupported: translation.unsupported,
      founders: matchedFounders
    });

  } catch (error: any) {
    console.error('NL Query route error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
