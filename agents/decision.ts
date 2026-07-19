/**
 * ScoutLayer — Synthesizer (Decision) Agent
 *
 * Input:  applicationId
 * Output: AsyncGenerator streaming granular decision-stage progress events.
 *
 * Phase 6 scope:
 * - Pull structuredProfile, all 3 screening axes + rationales, and all trustClaims
 *   for the application.
 * - Generate an investment memo via Groq (gpt-oss-120b) with ONLY the required
 *   sections per the brief:
 *     - Company snapshot (one paragraph)
 *     - Investment hypotheses (bulleted: why invest, from actual screening rationale)
 *     - SWOT (short evidence-backed bullets, citing specific trustClaims where relevant)
 *     - Problem & product (plain language, from structuredProfile/repo description)
 *     - Traction & KPIs (from real signals only — stars, followers, repo activity; if
 *       genuinely unavailable, explicitly write "Not disclosed" / "No traction data
 *       available" rather than fabricating)
 * - CRITICAL CONSTRAINT: never invent numbers, revenue, funding history, or traction
 *   not present in structuredProfile/trustClaims. Any gap must be explicitly flagged
 *   in the memo text itself, not silently omitted.
 * - Write memo to `memos` collection per PRD schema.
 * - Update applications.status to 'decided'.
 * - Update pipelineRuns.
 * - Compute Founder Score as a weighted composite of the 3 screening axes and append
 *   to founderScore.history.
 */

import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { OpenAI } from 'openai';
import type { Memo, StructuredProfile, TrustClaim } from '@/types';
import {
  truncateRepoDescription,
  truncateDeckText,
  truncateLongField,
  checkTokenBudget,
} from '@/lib/utils/truncation';
import { extractDeckText } from '@/lib/sources/deck';

/* eslint-disable @typescript-eslint/no-explicit-any */

type MongoLogLevel = 'info' | 'warn' | 'error';

export type DecisionEvent =
  | { type: 'run_start'; message: string }
  | { type: 'data_gathered'; message: string }
  | { type: 'memo_generating'; message: string }
  | { type: 'memo_done'; message: string }
  | { type: 'founder_score'; value: number; message: string }
  | { type: 'run_done'; message: string }
  | { type: 'run_error'; message: string };

const groqApiKey = process.env.GROQ_API_KEY || '';
const client = new OpenAI({
  apiKey: groqApiKey,
  baseURL: 'https://api.groq.com/openai/v1',
});

// Primary model is openai/gpt-oss-120b per PRD.
const MODELS = ['openai/gpt-oss-120b'];

async function callGroqWithFallback(
  systemPrompt: string,
  userPrompt: string,
  appendLog?: (message: string, level?: MongoLogLevel) => Promise<void>
): Promise<string> {
  const totalPromptText = systemPrompt + userPrompt;
  const { tokens } = checkTokenBudget(totalPromptText);
  if (tokens > 8000 && appendLog) {
    await appendLog(`[Warning] Prompt size estimated at ${tokens} tokens, exceeding safe threshold of 8000.`, 'warn');
  }

  let lastError: any = null;
  for (const model of MODELS) {
    try {
      const response = await client.chat.completions.create({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      });
      return response.choices[0].message?.content || '{}';
    } catch (err: any) {
      lastError = err;
      // Continue to fallback models
    }
  }
  throw lastError || new Error('All Groq models failed');
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function safeNum(input: unknown): number | null {
  if (typeof input === 'number' && !Number.isNaN(input)) return input;
  if (typeof input === 'string' && input.trim().length > 0) {
    const n = Number(input);
    return Number.isNaN(n) ? null : n;
  }
  return null;
}

/**
 * Founder Score weighting.
 *
 * The per-opportunity 3-axis screening scores are deliberately NOT averaged into a
 * single score for the investment decision (per PRD §3 — each axis is evaluated
 * independently and the "don't average" rule applies to those axes specifically).
 *
 * Founder Score, however, is a DIFFERENT, persistent number that lives on the founder
 * and is intended to be a single comparable signal across applications. For the
 * Decision stage we therefore compute it as a simple, transparent weighted composite
 * of the 3 screening axes. Weights reflect emphasis on the person (founder) and the
 * idea/market fit, with market slightly de-emphasised since it is a lightweight
 * developer-footprint proxy (see screening.ts market-axis rationale):
 *
 *   founderAxis      50%  (track record / background — the persistent signal)
 *   ideaVsMarketAxis 30%  (product-market thesis / pivot resiliency)
 *   marketAxis       20%  (lightweight proxy, lower confidence)
 *
 * This is intentionally simple and the weights are documented here so they can be
 * tuned later. The result is clamped to 0-100 and appended to founderScore.history.
 */
const FOUNDER_SCORE_WEIGHTS = {
  founderAxis: 0.5,
  ideaVsMarketAxis: 0.3,
  marketAxis: 0.2,
};

function computeFounderScore({
  founderAxis,
  marketAxis,
  ideaVsMarketAxis,
}: {
  founderAxis: number;
  marketAxis: number;
  ideaVsMarketAxis: number;
}): number {
  const weighted =
    founderAxis * FOUNDER_SCORE_WEIGHTS.founderAxis +
    ideaVsMarketAxis * FOUNDER_SCORE_WEIGHTS.ideaVsMarketAxis +
    marketAxis * FOUNDER_SCORE_WEIGHTS.marketAxis;
  return clamp(Math.round(weighted), 0, 100);
}

export async function* runDecisionAgent(
  applicationId: string
): AsyncGenerator<DecisionEvent, void, unknown> {
  const mongoClient = await clientPromise;
  const db = mongoClient.db();

  const appsCol = db.collection('applications');
  const foundersCol = db.collection('founders');
  const screeningsCol = db.collection('screenings');
  const trustClaimsCol = db.collection<Omit<TrustClaim, '_id'> & { _id?: any }>('trustClaims');
  const memosCol = db.collection<Omit<Memo, '_id'> & { _id?: any }>('memos');
  const pipelineRunsCol = db.collection('pipelineRuns');

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

  // ── Pipeline run (find or create) ────────────────────────────────────────────
  let runDoc: { _id: import('mongodb').ObjectId; applicationId: string; founderId: string } | null =
    (await pipelineRunsCol.findOne({ applicationId, stage: 'decision' })) as any;
  if (!runDoc) {
    const inserted = await pipelineRunsCol.insertOne({
      applicationId,
      founderId: application.founderId,
      stage: 'decision',
      status: 'running',
      log: [{ timestamp: new Date(), message: 'Started decision synthesizer', level: 'info' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    runDoc = { _id: inserted.insertedId, applicationId, founderId: application.founderId };
  } else {
    await pipelineRunsCol.updateOne(
      { _id: runDoc._id },
      {
        $set: { status: 'running', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Restarted decision synthesizer', level: 'info' } } as any,
      }
    );
  }

  const runObjectId = runDoc._id;

  const appendLog = async (message: string, level: MongoLogLevel = 'info') => {
    await pipelineRunsCol.updateOne(
      { _id: runObjectId } as any,
      {
        $push: { log: { timestamp: new Date(), message, level } } as any,
        $set: { updatedAt: new Date() },
      } as any
    );
  };

  yield { type: 'run_start', message: 'Initiating decision synthesizer agent (Phase 6)' };
  await appendLog('Decision synthesizer initiated');

  try {
    // ── Gather inputs ──────────────────────────────────────────────────────────
    const screening = await screeningsCol.findOne({ applicationId });
    const trustClaims = await trustClaimsCol.find({ applicationId }).toArray();
    const profile: StructuredProfile = founder?.structuredProfile || {};

    if (!screening) {
      yield { type: 'run_error', message: 'Screening must be completed before generating a memo' };
      await pipelineRunsCol.updateOne(
        { _id: runObjectId },
        {
          $set: { status: 'error', updatedAt: new Date() },
          $push: { log: { timestamp: new Date(), message: 'Decision failed: missing screening', level: 'error' } } as any,
        }
      );
      return;
    }

    yield { type: 'data_gathered', message: `Gathered ${trustClaims.length} trust claims and 3 screening axes` };
    await appendLog(`Gathered ${trustClaims.length} trust claims`);

    // ── Build the prompt context (facts only — no fabrication) ──────────────────
    const founderAxis = screening.founderAxis || {};
    const marketAxis = screening.marketAxis || {};
    const ideaAxis = screening.ideaVsMarketAxis || {};

    const rawTopRepos = profile.topRepos || [];
    const sortedRepos = [...rawTopRepos].sort((a: any, b: any) => (b.stars || 0) - (a.stars || 0));
    const top5Repos = sortedRepos.slice(0, 5).map((r: any) => ({
      name: r.name,
      stars: r.stars,
      language: r.language,
      description: truncateRepoDescription(r.description),
      url: r.url,
    }));

    const deckExtract = await extractDeckText(application.deck);
    const deckText = truncateDeckText(deckExtract.analyzed ? deckExtract.text : null);

    const truncatedBio = truncateLongField(profile.bio || profile.description);
    const truncatedAdditionalContext = truncateLongField(
      application.additionalContext ||
      application.companyInfo?.additionalContext ||
      application.context ||
      application.companyInfo?.description
    );

    const context = {
      founderName: founder?.name,
      company: founder?.company || application?.companyInfo?.name,
      oneLiner: profile.oneLiner,
      description: truncatedBio,
      sectors: profile.sectors,
      location: profile.location,
      followers: safeNum(profile.followers),
      publicRepos: safeNum(profile.publicRepos),
      githubUrl: profile.githubUrl,
      topRepos: top5Repos,
      deck: application.deck
        ? {
            url: application.deck,
            analyzed: deckExtract.analyzed,
            reason: deckExtract.reason,
            text: deckText || undefined,
          }
        : undefined,
      companyInfo: application?.companyInfo ? {
        ...application.companyInfo,
        description: truncatedAdditionalContext,
        deckText: deckText || undefined,
      } : undefined,
      screening: {
        founderAxis: {
          score: founderAxis.score,
          evidence: founderAxis.evidence,
        },
        marketAxis: {
          score: marketAxis.score,
          evidence: marketAxis.evidence,
        },
        ideaVsMarketAxis: {
          score: ideaAxis.score,
          evidence: ideaAxis.evidence,
        },
      },
      trustClaims: trustClaims.map((c: any) => ({
        claim: c.claim,
        confidence: c.confidence,
        verifiedBy: c.verifiedBy,
        evidenceUrl: c.evidenceUrl,
      })),
    };

    const systemPrompt = `You are a venture capital investment memo synthesizer for ScoutLayer.
You are given STRICTLY the factual outputs of prior pipeline stages: a founder's structured
profile, 3 independent screening-axis scores + rationales, and per-claim Trust Scores with
their verification status.

Your job is to compile an investment memo.

CRITICAL CONSTRAINTS:
- NEVER invent numbers, revenue, funding history, team size, customers, or any traction that
  is not present in the provided context.
- If a section cannot be substantiated from the provided data (e.g. traction/KPIs are not
  disclosed), you MUST explicitly write "Not disclosed" or "No traction data available" — do
  NOT fabricate. Flag the gap in the text itself.
- When writing SWOT, cite specific trustClaims or screening rationales where relevant.
- For Traction & KPIs, only use real signals: GitHub stars, followers, repo activity that are
  present in the context. If none are present, state "No traction data available".
- If deck content was provided in the context, use it to enrich Problem & Product and
  Company Snapshot. If deck content was NOT provided or could not be analyzed, you MUST
  explicitly disclose this in the memo text and add it to gapsFlagged.

Return STRICTLY a JSON object with exactly these keys (do not add other sections):
{
  "companySnapshot": "<one concise paragraph describing the company in plain language>",
  "investmentHypotheses": "<bulleted lines joined by newline, each starting with '- ', stating why to invest, grounded in the actual screening rationales>",
  "swot": {
    "strengths": ["<short evidence-backed bullet>", ...],
    "weaknesses": ["<short evidence-backed bullet>", ...],
    "opportunities": ["<short evidence-backed bullet>", ...],
    "threats": ["<short evidence-backed bullet>", ...]
  },
  "problemProduct": "<plain-language description of the problem and the product, from the structured profile / repo descriptions>",
  "tractionKpis": "<real signals only — stars, followers, repo activity; if genuinely unavailable write 'No traction data available' or 'Not disclosed'>",
  "gapsFlagged": ["<any data gap you explicitly flagged in the memo, e.g. 'No revenue disclosed'>", ...]
}`;

    yield { type: 'memo_generating', message: 'Generating investment memo via Groq (gpt-oss-120b)...' };
    await appendLog('Generating memo via Groq');

    const memoRaw = await callGroqWithFallback(systemPrompt, JSON.stringify(context, null, 2), appendLog);
    const memoResult = JSON.parse(memoRaw);

    const gapsFlagged = Array.isArray(memoResult.gapsFlagged) ? memoResult.gapsFlagged.map(String) : [];
    if (application.deck && !deckExtract.analyzed) {
      const disclosure = `Deck link provided but contents not analyzed — ${deckExtract.reason}`;
      if (!gapsFlagged.some((g: string) => g.toLowerCase().includes('deck'))) {
        gapsFlagged.push(disclosure);
      }
    }

    const memoDoc: Omit<Memo, '_id'> = {
      applicationId,
      companySnapshot: String(memoResult.companySnapshot || '').trim(),
      investmentHypotheses: String(memoResult.investmentHypotheses || '').trim(),
      swot: {
        strengths: Array.isArray(memoResult.swot?.strengths) ? memoResult.swot.strengths.map(String) : [],
        weaknesses: Array.isArray(memoResult.swot?.weaknesses) ? memoResult.swot.weaknesses.map(String) : [],
        opportunities: Array.isArray(memoResult.swot?.opportunities) ? memoResult.swot.opportunities.map(String) : [],
        threats: Array.isArray(memoResult.swot?.threats) ? memoResult.swot.threats.map(String) : [],
      },
      problemProduct: String(memoResult.problemProduct || '').trim(),
      tractionKpis: String(memoResult.tractionKpis || '').trim(),
      gapsFlagged,
      createdAt: new Date(),
    };

    // Persist memo (upsert per application)
    await memosCol.replaceOne({ applicationId }, memoDoc, { upsert: true });

    yield { type: 'memo_done', message: 'Investment memo generated and stored' };
    await appendLog('Memo generated and stored');

    // ── Compute Founder Score (persistent, weighted composite of 3 axes) ────────
    const fScore = safeNum(founderAxis.score) ?? 0;
    const mScore = safeNum(marketAxis.score) ?? 0;
    const iScore = safeNum(ideaAxis.score) ?? 0;
    const founderScoreValue = computeFounderScore({
      founderAxis: fScore,
      marketAxis: mScore,
      ideaVsMarketAxis: iScore,
    });

    const existingScore = founder?.founderScore?.value ?? 0;
    const updatedScore = existingScore > 0 ? Math.round((existingScore + founderScoreValue) / 2) : founderScoreValue;

    await foundersCol.updateOne(
      { _id: founderObjectId },
      {
        $set: {
          'founderScore.value': updatedScore,
        },
        $push: {
          'founderScore.history': {
            value: founderScoreValue,
            timestamp: new Date(),
            reason: `Decision-stage composite of 3 screening axes (founder ${fScore}, market ${mScore}, idea ${iScore})`,
          },
        } as any,
      }
    );

    yield {
      type: 'founder_score',
      value: updatedScore,
      message: `Founder Score updated to ${updatedScore} (stage composite ${founderScoreValue})`,
    };
    await appendLog(`Founder Score updated to ${updatedScore}`);

    // ── Update application status + pipeline run ───────────────────────────────
    await appsCol.updateOne({ _id: appObjectId }, { $set: { status: 'decided' } });
    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $set: { status: 'done', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Decision stage complete', level: 'info' } } as any,
      }
    );

    yield { type: 'run_done', message: 'Decision stage complete — memo + Founder Score persisted' };
  } catch (err: any) {
    const msg = err?.message ?? 'Unknown error in decision synthesizer';
    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $set: { status: 'error', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: `Decision failed: ${msg}`, level: 'error' } } as any,
      }
    ).catch(() => {});
    yield { type: 'run_error', message: msg };
  }
}
