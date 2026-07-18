import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, hasApplied: false, error: 'Unauthorized' }, { status: 401 });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');
    const user = await usersCollection.findOne({ email: session.user.email });

    if (!user) {
      return NextResponse.json({ success: false, hasApplied: false, error: 'User not found' }, { status: 404 });
    }

    // Check if there is an application tied to the founder
    const applicationsCollection = db.collection('applications');
    const application = await applicationsCollection.findOne({ founderId: user._id.toString() });

    return NextResponse.json({ success: true, hasApplied: !!application });
  } catch (error: any) {
    return NextResponse.json({ success: false, hasApplied: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    const body = await req.json();

    // Store application with reference to founder user ID
    const applicationsCollection = db.collection('applications');
    await applicationsCollection.insertOne({
      founderId: user._id.toString(),
      status: 'sourced',
      ...body,
      createdAt: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: 'Application received',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 400 }
    );
  }
}
