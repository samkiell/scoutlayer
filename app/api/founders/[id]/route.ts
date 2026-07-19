import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { deleteFounderCascade } from '@/lib/utils/deleteCascade';

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

    // Cascade delete across all related collections
    await deleteFounderCascade(db, id);

    return NextResponse.json({ success: true, message: 'Founder and all associated records deleted successfully.' });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
