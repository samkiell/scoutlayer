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

    const role = (session.user as { role?: string } | undefined)?.role;
    const userId = (session.user as { id?: string } | undefined)?.id;

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

    // Authorization:
    // - Investors may view any application (that's their job).
    // - Founders may only view their own application (match session user to the
    //   application's founderId/userId).
    if (role === 'founder') {
      const founderUserId = founder.userId ? founder.userId.toString() : undefined;
      const appFounderId = app.founderId ? app.founderId.toString() : undefined;
      const ownsApplication = (userId && founderUserId === userId) || (userId && appFounderId === userId);
      if (!ownsApplication) {
        return NextResponse.json(
          { success: false, error: 'Forbidden — you can only view your own application' },
          { status: 403 }
        );
      }
    } else if (role === 'investor') {
      // Outbound founders are scoped to the investor who sourced them. Inbound
      // founders (self-applied) remain open to any investor.
      if (
        founder.source === 'outbound' &&
        founder.sourcedByInvestorId &&
        founder.sourcedByInvestorId.toString() !== userId
      ) {
        return NextResponse.json(
          { success: false, error: 'Forbidden — outbound founder scoped to a different investor' },
          { status: 403 }
        );
      }
    } else {
      // Any other (or missing) role is not permitted to read applications.
      return NextResponse.json(
        { success: false, error: 'Forbidden — insufficient role' },
        { status: 403 }
      );
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
          investmentHypotheses: memo.investmentHypotheses,
          swot: memo.swot,
          problemProduct: memo.problemProduct,
          tractionKpis: memo.tractionKpis,
          gapsFlagged: memo.gapsFlagged,
        } : null,
      },
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
