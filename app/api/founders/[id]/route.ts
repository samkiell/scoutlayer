import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const role = (session.user as { role?: string } | undefined)?.role;
    const userId = (session.user as { id?: string } | undefined)?.id;

    if (role !== 'investor') {
      return NextResponse.json(
        { success: false, error: 'Forbidden — investor role required to delete outbound founders' },
        { status: 403 }
      );
    }

    const { id } = await params;
    if (!id || !ObjectId.isValid(id)) {
      return NextResponse.json({ success: false, error: 'Invalid founder ID' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();

    // Find the founder
    const founder = await db.collection('founders').findOne({ _id: new ObjectId(id) });
    if (!founder) {
      return NextResponse.json({ success: false, error: 'Founder not found' }, { status: 404 });
    }

    // Verify source is outbound
    if (founder.source !== 'outbound') {
      return NextResponse.json(
        { success: false, error: 'Forbidden — inbound founders cannot be deleted by investors' },
        { status: 403 }
      );
    }

    // Verify sourcedByInvestorId matches current session user
    const sourcedByInvestorIdStr = founder.sourcedByInvestorId?.toString();
    if (sourcedByInvestorIdStr !== userId) {
      return NextResponse.json(
        { success: false, error: 'Forbidden — you can only delete outbound founders you have sourced' },
        { status: 403 }
      );
    }

    // Fetch corresponding applications to cascade delete their related records
    // founderId in applications is stored as a string
    const apps = await db.collection('applications').find({
      $or: [
        { founderId: id },
        { founderId: new ObjectId(id) as any }
      ]
    }).toArray();

    const appIds = apps.map((app) => app._id.toString());

    // Cascade delete across all 5 related collections
    // 1. founders
    await db.collection('founders').deleteOne({ _id: new ObjectId(id) });

    // 2. applications
    await db.collection('applications').deleteMany({
      $or: [
        { founderId: id },
        { founderId: new ObjectId(id) as any }
      ]
    });

    if (appIds.length > 0) {
      // 3. screenings
      await db.collection('screenings').deleteMany({
        applicationId: { $in: appIds }
      });

      // 4. trustClaims
      await db.collection('trustClaims').deleteMany({
        applicationId: { $in: appIds }
      });

      // 5. memos
      await db.collection('memos').deleteMany({
        applicationId: { $in: appIds }
      });

      // 6. pipelineRuns
      await db.collection('pipelineRuns').deleteMany({
        applicationId: { $in: appIds }
      });
    }

    return NextResponse.json({ success: true, message: 'Founder and all associated records deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
