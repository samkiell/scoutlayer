import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { type, dismissed, dismissedNextStepHints } = body as {
      type?: 'onboarding' | 'nextStepHint';
      dismissed?: boolean;
      dismissedNextStepHints?: Record<string, boolean>;
    };

    if (!type || (type === 'onboarding' && typeof dismissed !== 'boolean')) {
      return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
    }

    const client = await clientPromise;
    const db = client.db();
    const usersCollection = db.collection('users');

    if (type === 'onboarding') {
      const result = await usersCollection.updateOne(
        { email: session.user.email },
        { $set: { dismissedOnboarding: dismissed } }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    if (type === 'nextStepHint') {
      if (!dismissedNextStepHints || typeof dismissedNextStepHints !== 'object') {
        return NextResponse.json({ success: false, error: 'Invalid request body' }, { status: 400 });
      }

      const result = await usersCollection.updateOne(
        { email: session.user.email },
        { $set: { dismissedNextStepHints } }
      );

      if (result.matchedCount === 0) {
        return NextResponse.json({ success: false, error: 'User not found' }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ success: false, error: 'Invalid type' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
