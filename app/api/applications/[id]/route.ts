import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid application ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Fetch application
    const app = await db.collection('applications').findOne({ _id: new ObjectId(id) });
    if (!app) {
      return NextResponse.json({ success: false, error: 'Application not found' }, { status: 404 });
    }

    // Fetch founder
    const founder = await db.collection('founders').findOne({ _id: new ObjectId(app.founderId) });
    if (!founder) {
      return NextResponse.json({ success: false, error: 'Founder not found' }, { status: 404 });
    }

    // Fetch screening
    const screening = await db.collection('screenings').findOne({ applicationId: id });

    // Fetch pipelineRuns logs for screening
    const pipelineRun = await db.collection('pipelineRuns').findOne({ applicationId: id, stage: 'screening' });

    // Fetch trust claims (diligence) if any exist
    const trustClaims = await db.collection('trustClaims').find({ applicationId: id }).toArray();

    // Fetch memo if exists
    const memo = await db.collection('memos').findOne({ applicationId: id });

    return NextResponse.json({
      success: true,
      data: {
        application: {
          id: app._id.toString(),
          deck: app.deck,
          companyInfo: app.companyInfo,
          status: app.status,
          createdAt: app.createdAt,
        },
        founder: {
          id: founder._id.toString(),
          name: founder.name,
          company: founder.company,
          source: founder.source,
          structuredProfile: founder.structuredProfile,
          founderScore: founder.founderScore,
        },
        screening: screening ? {
          founderAxis: screening.founderAxis,
          marketAxis: screening.marketAxis,
          ideaVsMarketAxis: screening.ideaVsMarketAxis,
        } : null,
        pipelineRun: pipelineRun ? {
          status: pipelineRun.status,
          log: pipelineRun.log,
        } : null,
        trustClaims: trustClaims.map((c) => ({
          claim: c.claim,
          source: c.evidenceUrl,
          confidence: c.confidence,
          verifiedBy: c.verifiedBy,
          timestamp: c.createdAt,
        })),
        memo: memo ? {
          companySnapshot: memo.companySnapshot,
          swot: memo.swot,
        } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
