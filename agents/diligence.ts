/**
 * ScoutLayer — Verifier (Diligence) Agent using OpenAI (gpt-4.1-mini)
 *
 * Input:  applicationId
 * Output: AsyncGenerator streaming granular diligence progress events.
 */

import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import type { TrustClaim, StructuredProfile } from '@/types';
import { extractDeckText } from '@/lib/sources/deck';
import { OpenAI } from 'openai';
import {
  truncateRepoDescription,
  truncateDeckText,
  truncateLongField,
} from '@/lib/utils/truncation';

/* eslint-disable @typescript-eslint/no-explicit-any */

type MongoLogLevel = 'info' | 'warn' | 'error';

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

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || '',
});

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
      log: [{ timestamp: new Date(), message: 'Started diligence verifier (OpenAI gpt-4.1-mini)', level: 'info' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    runDoc = { _id: inserted.insertedId, applicationId, founderId: application.founderId };
  } else {
    await pipelineRunsCol.updateOne(
      { _id: runDoc._id },
      {
        $set: { status: 'running', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Restarted diligence verifier (OpenAI gpt-4.1-mini)', level: 'info' } },
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

  yield { type: 'run_start', message: 'Initiating diligence verifier agent (OpenAI gpt-4.1-mini + Tavily verification)' };
  await appendLog('Diligence verifier initiated using OpenAI gpt-4.1-mini');

  let totalInputTokens = 0;
  let totalOutputTokens = 0;

  try {
    const profile: StructuredProfile = founder?.structuredProfile || {};
    const companyName = application?.companyInfo?.name || profile?.company || founder?.company || 'the startup';

    // Consolidate text sources and truncate them for token/cost safety (applying limits)
    const pitch = truncateLongField(application?.companyInfo?.oneLiner || '', 500) || '';
    const additionalContext = truncateLongField(application?.companyInfo?.description || '', 1000) || '';

    const githubBio = truncateLongField(profile.bio || profile.description || '', 500) || '';
    const reposText = (profile.topRepos || []).slice(0, 5).map((r: any) => {
      const desc = truncateRepoDescription(r.description || '');
      return `- Repo: ${r.name} (${r.language || 'unknown'}): ${r.stars} stars. Description: ${desc}`;
    }).join('\n');

    let deckText = '';
    const deckResult = await extractDeckText((application as any).deck);
    if (deckResult.analyzed && deckResult.text) {
      deckText = truncateDeckText(deckResult.text) || '';
    }

    const startupUrl = founder.startupUrl || '';
    const additionalLinksText = (founder.additionalLinks || []).map((l: any) => `- ${l.label || 'Link'}: ${l.url}`).join('\n');

    const consolidatedContext = `
Company Name: ${companyName}
Pitch (One-liner): ${pitch}
Additional Context: ${additionalContext}

GitHub Username: ${founder.githubUsername || 'None'}
GitHub Bio: ${githubBio}
GitHub Followers: ${profile.followers ?? 'unknown'}
GitHub Public Repos Count: ${profile.publicRepos ?? 'unknown'}
Top Repositories:
${reposText}

Extracted Deck Text:
${deckText}

Startup Website URL: ${startupUrl}
Additional Links:
${additionalLinksText}
`.trim();

    // 1. Extract 5-8 checkable claims using gpt-4.1-mini
    const systemPromptClaims = `You are a startup diligence assistant. Your task is to extract between 5 and 8 discrete, specific, and independently-checkable claims from a founder's application context.
Focus on claims that can be corroborated or disproved via web searches (e.g. repository star counts, founder background, product/startup websites, launches, feature claims, customer traction, and public links).
Do not extract vague, subjective claims. Extract concrete claims like "claims 500+ GitHub stars on [repo]", "claims launch on Product Hunt", "claims enterprise traction in pitch", "claims website URL [url]".
Format the output as a JSON object with a single key "claims" containing an array of claims. Each claim must be an object with:
- "claim": The specific checkable claim text.
- "query": A targeted, specific search query designed to verify/corroborate this claim via search engine (e.g. if company name is X and claim is Y, query should search for Y in the context of X).
- "kind": One of "traction", "background", "company", "repo", "market_context".

Example format:
{
  "claims": [
    {
      "claim": "Claims 500+ GitHub stars on scoutlayer repo",
      "query": "scoutlayer github stars",
      "kind": "repo"
    }
  ]
}
`;

    await appendLog('Calling OpenAI gpt-4.1-mini to extract claims...');

    const claimsResponse = await openai.chat.completions.create({
      model: 'gpt-4.1-mini',
      messages: [
        { role: 'system', content: systemPromptClaims },
        { role: 'user', content: `Here is the consolidated context for founder ${founder.name || 'Unknown'}:\n\n${consolidatedContext}` }
      ],
      temperature: 0.1,
      response_format: { type: 'json_object' }
    });

    if (claimsResponse.usage) {
      totalInputTokens += claimsResponse.usage.prompt_tokens;
      totalOutputTokens += claimsResponse.usage.completion_tokens;
    }

    const claimsResult = JSON.parse(claimsResponse.choices[0].message?.content || '{}');
    let claims: Array<{ claim: string; query: string; kind: string }> = claimsResult.claims || [];

    // Cap total claims processed per diligence run at 8
    if (claims.length > 8) {
      claims = claims.slice(0, 8);
    }

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

    await appendLog(`Extracted ${claims.length} claims. Initiating Tavily search and OpenAI verification per claim...`);

    // 2. Process each claim
    for (let i = 0; i < claims.length; i++) {
      const { claim, query, kind } = claims[i];

      yield { type: 'claim_start', index: i, claim };
      await appendLog(`Claim ${i + 1}/${claims.length} start: ${claim}`);

      // Run primary Tavily search
      const search = await tavilySearch(query || claim);
      let searchResults = search.results || [];

      // If startupUrl was provided, also run one Tavily search against that domain specifically for corroboration
      if (startupUrl) {
        try {
          const domain = new URL(startupUrl).hostname;
          if (domain) {
            const domainSearch = await tavilySearch(`site:${domain} ${query || claim}`);
            if (domainSearch.ok && domainSearch.results && domainSearch.results.length > 0) {
              searchResults = [...searchResults, ...domainSearch.results];
            }
          }
        } catch (e) {
          // Ignore invalid startup URL format
        }
      }

      const resultsText = searchResults.length > 0
        ? searchResults.map((r, idx) => `[Result ${idx + 1}] Title: ${r.title}\nURL: ${r.url}\nContentSnippet: ${r.content}\n`).join('\n')
        : 'No search results found.';

      // Use gpt-4.1-mini to read results and evaluate corroboration
      const verifySystemPrompt = `You are a startup diligence verifier. Your task is to read search results and reason about whether they corroborate or disprove a specific claim.
You must output a 0-100 confidence score representing how strongly the search results corroborate the claim, along with a brief, honest justification (1-2 sentences).
Be highly analytical:
- Confidence score should reflect real corroboration strength, not just search-hit presence (e.g. simply seeing a hit doesn't mean verified).
- If the claim is backed by a verified GitHub profile/stars matching the search hits, confidence can be 80-100.
- If it's a website reference but no independent verification, or the claim is not supported, confidence should be low.
- Return a JSON object with:
  - "confidence": number (0-100)
  - "reasoning": string (brief reasoning for the score)
  - "evidenceUrl": string (the most relevant url from the search results that corroborates/proves this claim, or null if none)

Example format:
{
  "confidence": 85,
  "reasoning": "Search results confirm the repository exists and matches the stargazers count.",
  "evidenceUrl": "https://github.com/..."
}
`;

      const verifyResponse = await openai.chat.completions.create({
        model: 'gpt-4.1-mini',
        messages: [
          { role: 'system', content: verifySystemPrompt },
          {
            role: 'user',
            content: `Claim to verify: "${claim}"\nTargeted Search Query used: "${query || claim}"\n\nSearch Results:\n${resultsText}`
          }
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' }
      });

      if (verifyResponse.usage) {
        totalInputTokens += verifyResponse.usage.prompt_tokens;
        totalOutputTokens += verifyResponse.usage.completion_tokens;
      }

      const verifyResult = JSON.parse(verifyResponse.choices[0].message?.content || '{}');
      const confidence = typeof verifyResult.confidence === 'number' ? verifyResult.confidence : 0;
      const reasoning = verifyResult.reasoning || 'No reasoning provided.';
      const evidenceUrl = verifyResult.evidenceUrl || undefined;

      const verifiedBy: TrustClaim['verifiedBy'] = searchResults.length > 0 && confidence >= 70 ? 'tavily' : 'unverified';

      const trustClaim: Omit<TrustClaim, '_id'> = {
        applicationId,
        claim: `${claim} (${reasoning})`,
        evidenceUrl,
        confidence: clamp(Math.round(confidence), 0, 100),
        verifiedBy,
        createdAt: new Date(),
      };

      await trustClaimsCol.insertOne(trustClaim as any);

      yield {
        type: 'claim_checked',
        index: i,
        claim: trustClaim.claim,
        verifiedBy,
        confidence: trustClaim.confidence,
        evidenceUrl: trustClaim.evidenceUrl,
      };

      await appendLog(
        `Claim ${i + 1} checked: verifiedBy=${verifiedBy}, confidence=${trustClaim.confidence}, reasoning="${reasoning}"${evidenceUrl ? `, evidence=${evidenceUrl}` : ''}`
      );
    }

    // Log total token usage observed
    console.log(`[Diligence Total Token Usage] Input: ${totalInputTokens}, Output: ${totalOutputTokens}, Total: ${totalInputTokens + totalOutputTokens}`);
    await appendLog(`Diligence completed. Total estimated token usage: Input: ${totalInputTokens}, Output: ${totalOutputTokens}`);

    await appsCol.updateOne({ _id: appObjectId }, { $set: { status: 'diligenced' } });

    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $set: { status: 'done', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Diligence verifier completed successfully using OpenAI', level: 'info' } } as any,
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
