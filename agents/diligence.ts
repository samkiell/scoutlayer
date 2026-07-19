 /**
 * ScoutLayer — Verifier (Diligence) Agent
 *
 * Input:  applicationId
 * Output: AsyncGenerator streaming granular diligence progress events.
 *
 * Phase 5 scope:
 * - Extract discrete, checkable claims from existing data (founder structuredProfile + screenings rationales)
 * - For each claim, run Tavily web search to corroborate via independent sources
 * - Persist each claim as a `trustClaims` doc (never drop unverifiable claims)
 * - Update applications.status to 'diligence' -> 'diligenced' and update pipelineRuns doc
 *
 * Note:
 * - Memo generation is Phase 6 and is intentionally not implemented here.
 */

import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import type { TrustClaim, StructuredProfile } from '@/types';
import { extractDeckText, extractClaimFromDeckText } from '@/lib/sources/deck';

/* eslint-disable @typescript-eslint/no-explicit-any */

type MongoLogLevel = 'info' | 'warn' | 'error';

type PipelineRunDoc = {
  _id: unknown;

  applicationId: string;
  founderId: string;
  stage: 'diligence';
  status: 'pending' | 'running' | 'done' | 'error';
  log: Array<{ timestamp: Date; message: string; level: MongoLogLevel }>;
  createdAt: Date;
  updatedAt?: Date;
};

export type DiligenceEvent =
  | { type: 'run_start'; message: string }
  | { type: 'claim_start'; index: number; claim: string }
  | {
      type: 'claim_checked';
      index: number;
      claim: string;
      verifiedBy: 'tavily' | 'unverified';
      confidence: number;
      evidenceUrl?: string;
    }
  | { type: 'run_done'; message: string }
  | { type: 'run_error'; message: string };

type TavilyResult = {
  results?: Array<{ url?: string; title?: string; content?: string }>;
};

async function tavilySearch(query: string): Promise<{
  ok: boolean;
  rateLimited: boolean;
  message?: string;
  results?: Array<{ url?: string; title?: string; content?: string }>;
}> {
  const apiKey = process.env.TAVILY_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      rateLimited: false,
      message: 'Missing TAVILY_API_KEY',
    };
  }

  try {
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        api_key: apiKey,
        query,
        search_depth: 'basic',
        include_answer: false,
        include_raw_content: false,
        max_results: 5,
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      const msg = `Tavily error ${res.status}${text ? `: ${text.slice(0, 250)}` : ''}`;
      const rateLimited = res.status === 429 || res.status === 403;
      return { ok: false, rateLimited, message: msg };
    }

    const data = (await res.json()) as TavilyResult;
    return {
      ok: true,
      rateLimited: false,
      results: data.results ?? [],
    };
  } catch (err: any) {
    return {
      ok: false,
      rateLimited: false,
      message: err?.message ?? 'Network error reaching Tavily',
    };
  }
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeString(input: unknown): string {
  if (input === null || input === undefined) return '';
  return String(input);
}

function extractMarketContextFromScreening(screening: any): string | null {
  const marketEvidence = screening?.marketAxis?.evidence;
  if (!marketEvidence) return null;
  const s = safeString(marketEvidence);

  // Heuristic: attempt to capture a bracketed or quoted space/market mention.
  const bracket = s.match(/\[([^\]]{3,80})\]/);
  if (bracket?.[1]) return bracket[1].trim();

  const quoted = s.match(/"([^"]{3,80})"/);
  if (quoted?.[1]) return quoted[1].trim();

  // Fallback: use the entire evidence as "market context".
  return s.length > 6 ? s : null;
}

function buildClaims({
  application,
  founder,
  profile,
  screening,
}: {
  application: any;
  founder: any;
  profile: StructuredProfile;
  screening: any;
}): Array<{
  claim: string;
  query: string;
  kind: 'traction' | 'background' | 'company' | 'repo' | 'market_context';
}> {
  const claims: Array<{ claim: string; query: string; kind: any }> = [];

  const company = application?.companyInfo?.name || profile?.company || founder?.company;
  const githubUrl = profile?.githubUrl;
  const topRepos: Array<any> = profile?.topRepos || [];

  // Founder background / company
  if (company && company.trim().length > 1) {
    claims.push({
      claim: `Founder is associated with ${company}`,
      query: `${founder?.name || 'founder'} ${company} founder`,
      kind: 'company',
    });
  }

  // GitHub reputation style claims
  const followers = typeof profile?.followers === 'number' ? profile.followers : null;
  if (followers !== null) {
    claims.push({
      claim: `Founder has about ${followers} followers on GitHub`,
      query: `${founder?.githubUsername || githubUrl || ''} followers GitHub ${followers}`.trim(),
      kind: 'traction',
    });
  }

  if (typeof profile?.publicRepos === 'number') {
    claims.push({
      claim: `Founder has ${profile.publicRepos} public GitHub repos`,
      query: `${founder?.githubUsername || githubUrl || ''} public repos GitHub`,
      kind: 'traction',
    });
  }

  // Repo claims (top repo stars and identity)
  const maxRepos = Math.min(topRepos.length, 2);
  for (let i = 0; i < maxRepos; i++) {
    const r = topRepos[i];
    if (!r?.name) continue;
    const stars = typeof r.stars === 'number' ? r.stars : null;
    claims.push({
      claim: `${r.name} repo has about ${stars ?? 'unknown'} stars`,
      query: `${r.name} GitHub stargazers ${stars ?? ''}`.trim(),
      kind: 'repo',
    });

    // Also add a discrete repo ownership claim if we can infer it.
    const fullClaim = `${r.name} is published under the founder's GitHub account`;
    claims.push({
      claim: fullClaim,
      query: `${founder?.githubUsername || ''} ${r.name} GitHub`.trim(),
      kind: 'repo',
    });
  }

  // Market / space context (from screening rationale) — Phase 5 weakness strengthening.
  const marketContext = extractMarketContextFromScreening(screening);
  if (marketContext) {
    claims.push({
      claim: `Market context: ${marketContext}`,
      query: `${marketContext} competitive landscape`,
      kind: 'market_context',
    });
  }

  // De-duplicate by claim text.
  const seen = new Set<string>();
  return claims.filter((c) => {
    const key = c.claim.trim();
    if (!key) return false;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toEvidenceUrl(candidateResults: Array<{ url?: string; title?: string }>): string | undefined {
  const first = candidateResults.find((r) => !!r.url);
  return first?.url;
}

function confidenceFromResults({
  claimKind,
  hadResults,
  rateLimited,
}: {
  claimKind: string;
  hadResults: boolean;
  rateLimited: boolean;
}): number {
  // Conservative: only high confidence when we actually got results.
  if (rateLimited) return 40;
  if (!hadResults) return 15;

  // Heuristic confidence tiers.
  if (claimKind === 'repo') return 80;
  if (claimKind === 'company') return 70;
  if (claimKind === 'traction') return 65;
  if (claimKind === 'market_context') return 60;
  return 55;
}

export async function* runDiligenceAgent(
  applicationId: string
): AsyncGenerator<DiligenceEvent, void, unknown> {
  const mongoClient = await clientPromise;
  const db = mongoClient.db();

  const appsCol = db.collection('applications');
  const foundersCol = db.collection('founders');
  const screeningsCol = db.collection('screenings');
  const pipelineRunsCol = db.collection<{
    applicationId: string;
    founderId?: string;
    stage: 'diligence' | 'sourcing' | 'screening' | 'decision';
    status: 'pending' | 'running' | 'done' | 'error';
    log: Array<{ timestamp: Date; message: string; level: 'info' | 'warn' | 'error' }>;
    createdAt: Date;
    updatedAt?: Date;
  }>('pipelineRuns');

  const trustClaimsCol = db.collection<
    Omit<TrustClaim, '_id'> & { _id?: any }
  >('trustClaims');


  const appObjectId = new ObjectId(applicationId);
  const application = await appsCol.findOne({ _id: appObjectId });

  if (!application) {
    yield { type: 'run_error', message: `Application ${applicationId} not found` };
    return;
  }

  const founderObjectId = new ObjectId(application.founderId);
  const founder = await foundersCol.findOne({ _id: founderObjectId });
  if (!founder) {
    yield { type: 'run_error', message: `Founder for application ${applicationId} not found` };
    return;
  }

  const screening = await screeningsCol.findOne({ applicationId });

  // Create / upsert pipeline run for diligence
  const existingRun = await pipelineRunsCol.findOne({ applicationId, stage: 'diligence' });

  let runDoc: { _id: import('mongodb').ObjectId; applicationId: string; founderId: string } | null =
    (existingRun as any) ?? null;

  if (!runDoc) {
    const inserted = await pipelineRunsCol.insertOne({
      applicationId,
      founderId: application.founderId,
      stage: 'diligence',
      status: 'running',
      log: [{ timestamp: new Date(), message: 'Started diligence verifier', level: 'info' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    runDoc = { _id: inserted.insertedId, applicationId, founderId: application.founderId };
  } else {
    await pipelineRunsCol.updateOne(
      { _id: runDoc._id },
      {
        $set: { status: 'running', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Restarted diligence verifier', level: 'info' } },
      }
    );
  }

  const runObjectId = runDoc._id;

  const appendLog = async (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    await pipelineRunsCol.updateOne(
      { _id: runObjectId } as any,
      {
        $push: {
          log: { timestamp: new Date(), message, level },
        } as any,
        $set: { updatedAt: new Date() },
      } as any
    );
  };

  // Only move to diligence stage here if currently at screened
  if (application.status === 'screened') {
    await appsCol.updateOne({ _id: appObjectId }, { $set: { status: 'diligence' } });
  }

  yield { type: 'run_start', message: 'Initiating diligence verifier agent (per-claim Tavily checks)' };
  await appendLog('Diligence verifier initiated');

  try {
    const profile: StructuredProfile = founder?.structuredProfile || {};

    const claims = buildClaims({ application, founder, profile, screening });

    if (claims.length === 0) {
      await appendLog('No claims extracted from available data; writing empty trustClaims run', 'warn');
      yield { type: 'run_done', message: 'No diligence claims extracted' };
      await pipelineRunsCol.updateOne(
        { _id: runObjectId },
        { $set: { status: 'done', updatedAt: new Date() }, $push: { log: { timestamp: new Date(), message: 'Diligence completed (no claims)', level: 'warn' } } as any }
      );
      await appsCol.updateOne({ _id: appObjectId }, { $set: { status: 'diligenced' } });
      return;
    }

    // Run per-claim Tavily checks
    for (let i = 0; i < claims.length; i++) {
      const { claim, query, kind } = claims[i];

      yield { type: 'claim_start', index: i, claim };
      await appendLog(`Claim ${i + 1}/${claims.length} start: ${claim}`);

      const search = await tavilySearch(query || claim);

      const hadResults = !!search.results && search.results.length > 0;
      const evidenceUrl = hadResults ? toEvidenceUrl(search.results || []) : undefined;

      const confidence = confidenceFromResults({
        claimKind: kind,
        hadResults,
        rateLimited: !!search.rateLimited,
      });

      const verifiedBy: TrustClaim['verifiedBy'] = hadResults ? 'tavily' : 'unverified';

      const trustClaim: Omit<TrustClaim, '_id'> = {
        applicationId,
        claim,
        evidenceUrl,
        confidence: clamp(Math.round(confidence), 0, 100),
        verifiedBy,
        createdAt: new Date(),
      };

      await trustClaimsCol.insertOne(trustClaim as any);

      yield {
        type: 'claim_checked',
        index: i,
        claim,
        verifiedBy,
        confidence: trustClaim.confidence,
        evidenceUrl: trustClaim.evidenceUrl,
      };

      await appendLog(
        `Claim ${i + 1} checked: verifiedBy=${verifiedBy}, confidence=${trustClaim.confidence}${evidenceUrl ? `, evidence=${evidenceUrl}` : ''}`,
        hadResults ? 'info' : search.rateLimited ? 'warn' : 'warn'
      );
    }

    await appsCol.updateOne({ _id: appObjectId }, { $set: { status: 'diligenced' } });

    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $set: { status: 'done', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Diligence verifier completed successfully', level: 'info' } } as any,
      }
    );

    yield { type: 'run_done', message: 'Diligence completed — trustClaims persisted' };
  } catch (err: any) {
    const msg = err?.message ?? 'Unknown error in diligence verifier';
    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $set: { status: 'error', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: `Diligence failed: ${msg}`, level: 'error' } } as any,
      }
    ).catch(() => {});

    yield { type: 'run_error', message: msg };
  }
}

