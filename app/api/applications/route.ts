import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import clientPromise from '@/lib/db';
import { getUserProfile, getUserRepos } from '@/lib/sources/github';

function extractGithubUsername(input: string): string | null {
  if (!input) return null;
  let cleaned = input.trim();
  
  // Handle protocol-less urls like github.com/username
  if (!cleaned.startsWith('http://') && !cleaned.startsWith('https://') && cleaned.includes('github.com')) {
    cleaned = 'https://' + cleaned;
  }

  if (cleaned.startsWith('http://') || cleaned.startsWith('https://')) {
    try {
      const url = new URL(cleaned);
      if (url.hostname.includes('github.com')) {
        const parts = url.pathname.split('/').filter(Boolean);
        if (parts.length > 0) return parts[0];
      }
    } catch (e) {
      console.error('Error parsing GitHub URL:', e);
      return null;
    }
  }
  
  // Strip trailing slashes or query parameters if it was not caught by URL parser
  return cleaned.replace(/^@/, '').split(/[?#/]/)[0];
}

export async function GET(req: Request) {
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

    const role = user.role;

    if (role === 'investor') {
      // Return this investor's pipeline: their outbound (scouted) founders + ALL
      // inbound applications. Outbound founders are scoped to the sourcing investor
      // via sourcedByInvestorId; inbound founders (self-applied) are visible to all.
      // A $or query keeps inbound unfiltered while restricting outbound to this investor.
      // Existing outbound founders created before sourcedByInvestorId existed have no
      // such field and therefore match neither branch (orphaned) — see summary note.

      const applicationsCollection = db.collection('applications');
      // NOTE: application.founderId is stored as a plain string, while
      // founder._id is an ObjectId — so the join must convert via $toObjectId.
      const applications = await applicationsCollection
        .aggregate([
          {
            $lookup: {
              from: 'founders',
              let: { founderIdStr: '$founderId' },
              pipeline: [
                {
                  $match: {
                    $expr: { $eq: ['$_id', { $toObjectId: '$$founderIdStr' }] },
                  },
                },
              ],
              as: 'founder',
            },
          },
          { $unwind: { path: '$founder', preserveNullAndEmptyArrays: true } },
          {
            $match: {
              $or: [
                { 'founder.source': 'inbound' },
                { 'founder.sourcedByInvestorId': user._id.toString() },
              ],
            },
          },
          { $sort: { createdAt: -1 } },
        ])
        .toArray();

      const joinedApplications = applications.map((app: any) => ({
        id: app._id.toString(),
        founderId: app.founder?._id?.toString() || null,
        name: app.founder?.name || app.companyInfo?.name || 'Unknown Founder',
        company: app.companyInfo?.name || app.founder?.company || 'Unknown Company',
        githubUsername: app.founder?.githubUsername || null,
        source: app.founder?.source || 'inbound',
        stage: app.status || 'sourced',
        founderScore: app.founder?.founderScore?.value ?? null,
        trustScore: null,
      }));

      return NextResponse.json({ success: true, applications: joinedApplications });
    } else if (role === 'founder') {
      const foundersCollection = db.collection('founders');
      const userFounders = await foundersCollection
        .find({ userId: user._id.toString() })
        .project({ _id: 1 })
        .toArray();
      const userFounderIds = userFounders.map((f: any) => f._id.toString());

      if (userFounderIds.length === 0) {
        return NextResponse.json({ success: true, hasApplied: false, hasActiveApplication: false });
      }

      const applicationsCollection = db.collection('applications');
      const ACTIVE_STATUSES = ['sourced', 'screening', 'screened', 'diligence', 'diligenced'];

      // Most recent application (by createdAt desc) — handles multiple 'decided' over time.
      const applications = await applicationsCollection
        .find({ founderId: { $in: userFounderIds } })
        .sort({ createdAt: -1 })
        .toArray();
      const application = applications[0] ?? null;
      const hasActiveApplication = applications.some((a: any) => ACTIVE_STATUSES.includes(a.status));
      const founder = await foundersCollection.findOne(
        { _id: new (require('mongodb').ObjectId)(application ? application.founderId : userFounderIds[0]) },
        { projection: { founderScore: 1, name: 1, company: 1, structuredProfile: 1 } } as any
      );

      return NextResponse.json({
        success: true,
        hasApplied: !!application,
        hasActiveApplication,
        application,
        applications,
        founder,
      });
    }

    return NextResponse.json({ success: false, error: 'Invalid role' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    if (user.role !== 'founder') {
      return NextResponse.json({ success: false, error: 'Only founders can apply' }, { status: 403 });
    }

    // Enforce a single active application per founder.
    // A founder may have multiple 'decided' applications over time, but only one
    // application may be in-flight (not yet decided) at any moment.
    const foundersCol = db.collection('founders');
    const applicationsCol = db.collection('applications');
    const userFounders = await foundersCol
      .find({ userId: user._id.toString() })
      .project({ _id: 1 })
      .toArray();
    const userFounderIds = userFounders.map((f: any) => f._id.toString());

    if (userFounderIds.length > 0) {
      const ACTIVE_STATUSES = ['sourced', 'screening', 'screened', 'diligence', 'diligenced'];
      const activeApplication = await applicationsCol.findOne({
        founderId: { $in: userFounderIds },
        status: { $in: ACTIVE_STATUSES },
      });
      if (activeApplication) {
        return NextResponse.json(
          {
            success: false,
            error: 'You already have an active application in progress',
            applicationId: activeApplication._id.toString(),
          },
          { status: 409 }
        );
      }
    }

    const body = await req.json();
    const { companyName, deckUrl, oneLiner, github, context } = body;

    // Validation
    if (!companyName || !companyName.trim()) {
      return NextResponse.json({ success: false, error: 'Company name is required' }, { status: 400 });
    }

    if (!deckUrl || !deckUrl.trim()) {
      return NextResponse.json({ success: false, error: 'Deck link is required' }, { status: 400 });
    }

    // Basic URL validation
    try {
      new URL(deckUrl);
    } catch {
      return NextResponse.json({ success: false, error: 'Deck link must be a valid URL' }, { status: 400 });
    }

    if (!oneLiner || !oneLiner.trim()) {
      return NextResponse.json({ success: false, error: 'One-liner pitch is required' }, { status: 400 });
    }

    if (oneLiner.length > 150) {
      return NextResponse.json({ success: false, error: 'One-liner pitch must be 150 characters or less' }, { status: 400 });
    }

    // Handle optional GitHub enrichment
    let rawSignals: any[] = [];
    let structuredProfile: any = {
      oneLiner,
      description: context || oneLiner,
      websiteUrl: undefined,
      coldStart: true,
      coldStartScoredPath: true,
    };
    let githubUsername: string | null = null;
    let founderName = user.name || 'Founder';

    if (github && github.trim()) {
      githubUsername = extractGithubUsername(github);
      
      if (githubUsername) {
        const profileResult = await getUserProfile(githubUsername);
        
        if (!profileResult.ok) {
          return NextResponse.json({
            success: false,
            error: `GitHub lookup failed for @${githubUsername}: ${profileResult.message}`,
          }, { status: 400 });
        }

        const profile = profileResult.data;
        const reposResult = await getUserRepos(githubUsername, 5);
        
        const topRepos = reposResult.ok ? reposResult.data : [];

        rawSignals = [
          {
            type: 'github_profile',
            source: 'github',
            data: profile,
            capturedAt: new Date(),
          },
          ...topRepos.map((r) => ({
            type: 'github_repo',
            source: 'github',
            data: r,
            capturedAt: new Date(),
          })),
        ];

        const coldStart = !profile.bio && !profile.company && (profile.followers ?? 0) < 20;
        const primaryLanguages = [
          ...new Set(topRepos.map((r) => r.language).filter(Boolean) as string[]),
        ];

        structuredProfile = {
          oneLiner: profile.bio || oneLiner,
          description: context || profile.bio || oneLiner,
          sectors: primaryLanguages.length > 0 ? primaryLanguages : undefined,
          location: profile.location || undefined,
          githubUrl: profile.html_url,
          websiteUrl: profile.blog || undefined,
          twitterUsername: profile.twitter_username || undefined,
          avatarUrl: profile.avatar_url,
          followers: profile.followers,
          publicRepos: profile.public_repos,
          githubCreatedAt: profile.created_at,
          topRepos: topRepos.map((r) => ({
            name: r.name,
            description: r.description,
            stars: r.stargazers_count,
            language: r.language,
            url: r.html_url,
          })),
          coldStart,
          coldStartScoredPath: coldStart,
        };

        if (profile.name) {
          founderName = profile.name;
        }
      }
    }

    // Write founder doc
    const founderDoc = {
      userId: user._id.toString(),
      githubUsername: githubUsername || undefined,
      name: founderName,
      company: companyName,
      source: 'inbound',
      channel: 'self-reported',
      rawSignals,
      structuredProfile,
      founderScore: {
        value: 0,
        history: [],
      },
      createdAt: new Date(),
    };

    const founderInsert = await foundersCol.insertOne(founderDoc);
    const founderId = founderInsert.insertedId.toString();

    // Write application doc
    const applicationDoc = {
      founderId,
      deck: deckUrl,
      companyInfo: {
        name: companyName,
        oneLiner,
        description: context || oneLiner,
        githubUsername: githubUsername || undefined,
      },
      status: 'sourced',
      createdAt: new Date(),
    };

    await applicationsCol.insertOne(applicationDoc);

    return NextResponse.json({
      success: true,
      message: 'Application submitted',
    });
  } catch (error: any) {
    console.error('[Application Submission Error]', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
