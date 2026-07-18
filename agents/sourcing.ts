/**
 * ScoutLayer — Outbound Sourcing Agent
 *
 * Input:  Thesis { keywords, minStars?, createdAfter? }
 * Output: Streams progress events and writes new Founder + Application docs to MongoDB.
 *
 * Scope: SOURCING ONLY. Does not run screening, diligence, or memo logic.
 */

import clientPromise from '@/lib/db';
import {
  searchRepos,
  getUserProfile,
  getUserRepos,
} from '@/lib/sources/github';
import type { Thesis, RawSignal, StructuredProfile } from '@/types';
import type { GitHubUser, GitHubRepo } from '@/lib/sources/github';

export type SourcingEvent =
  | { type: 'run_start'; runId: string; message: string }
  | { type: 'search_done'; total: number; message: string }
  | { type: 'candidate_found'; username: string; message: string }
  | { type: 'candidate_skip'; username: string; reason: string }
  | { type: 'candidate_structured'; username: string; coldStart: boolean; founderId: string }
  | { type: 'candidate_saved'; username: string; founderId: string; applicationId: string }
  | { type: 'rate_limited'; message: string }
  | { type: 'run_done'; found: number; skipped: number; message: string }
  | { type: 'run_error'; message: string };

export interface SourcingResult {
  runId: string;
  foundersAdded: number;
  skipped: number;
}

/** Main entry point — call this from the API route. Yields events via an async generator. */
export async function* runSourcingAgent(
  thesis: Thesis
): AsyncGenerator<SourcingEvent, SourcingResult, unknown> {
  const client = await clientPromise;
  const db = client.db();

  const foundersCol = db.collection('founders');
  const applicationsCol = db.collection('applications');
  const pipelineRunsCol = db.collection('pipelineRuns');

  // ── 1. Create the pipeline run doc ───────────────────────────────────────
  const runDoc = {
    stage: 'sourcing',
    status: 'running',
    thesis,
    log: [],
    createdAt: new Date(),
    updatedAt: new Date(),
  };
  const runInsert = await pipelineRunsCol.insertOne(runDoc);
  const runId = runInsert.insertedId.toString();

  const appendLog = async (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    await pipelineRunsCol.updateOne(
      { _id: runInsert.insertedId },
      {
        $push: { log: { timestamp: new Date(), message, level } } as any,
        $set: { updatedAt: new Date() },
      }
    );
  };

  yield { type: 'run_start', runId, message: `Pipeline run ${runId} created — starting sourcing` };

  // ── 2. Build search query from thesis ─────────────────────────────────────
  const searchQuery = thesis.keywords.join(' ');
  let foundersAdded = 0;
  let skipped = 0;

  try {
    // ── 3. Search GitHub repos ───────────────────────────────────────────────
    const searchResult = await searchRepos(searchQuery, {
      sort: 'stars',
      order: 'desc',
      perPage: 30,
      minStars: thesis.minStars,
      createdAfter: thesis.createdAfter,
    });

    if (!searchResult.ok) {
      if (searchResult.rateLimited) {
        yield { type: 'rate_limited', message: searchResult.message };
        await appendLog(searchResult.message, 'error');
        await pipelineRunsCol.updateOne(
          { _id: runInsert.insertedId },
          { $set: { status: 'error', updatedAt: new Date() } }
        );
        yield { type: 'run_error', message: searchResult.message };
        return { runId, foundersAdded, skipped };
      }
      throw new Error(searchResult.message);
    }

    const repos = searchResult.data.items;
    yield {
      type: 'search_done',
      total: searchResult.data.total_count,
      message: `Found ${repos.length} repos (total: ${searchResult.data.total_count}) — extracting owners`,
    };
    await appendLog(`Search returned ${repos.length} repos`, 'info');

    // ── 4. Extract unique owners (only User accounts, not Orgs) ─────────────
    const seenUsernames = new Set<string>();
    const candidates: GitHubRepo[] = [];

    for (const repo of repos) {
      if (repo.owner.type !== 'User') continue;
      if (seenUsernames.has(repo.owner.login)) continue;
      seenUsernames.add(repo.owner.login);
      candidates.push(repo);
    }

    // ── 5. Deduplicate against existing founders ─────────────────────────────
    const usernames = Array.from(seenUsernames);
    const existingFounders = await foundersCol
      .find({ githubUsername: { $in: usernames } }, { projection: { githubUsername: 1 } })
      .toArray();
    const existingUsernames = new Set(existingFounders.map((f: any) => f.githubUsername));

    const newCandidates = candidates.filter((c) => !existingUsernames.has(c.owner.login));
    skipped += candidates.length - newCandidates.length;

    for (const repo of candidates) {
      if (existingUsernames.has(repo.owner.login)) {
        yield {
          type: 'candidate_skip',
          username: repo.owner.login,
          reason: 'already exists in founders collection',
        };
      }
    }

    // ── 6. Process each new candidate ────────────────────────────────────────
    for (const seedRepo of newCandidates) {
      const username = seedRepo.owner.login;
      yield {
        type: 'candidate_found',
        username,
        message: `Processing @${username} (seed repo: ${seedRepo.full_name} ⭐${seedRepo.stargazers_count})`,
      };
      await appendLog(`Processing candidate: ${username}`, 'info');

      // Fetch profile
      const profileResult = await getUserProfile(username);
      if (!profileResult.ok) {
        if (profileResult.rateLimited) {
          yield { type: 'rate_limited', message: profileResult.message };
          await appendLog(profileResult.message, 'warn');
          skipped++;
          continue;
        }
        yield { type: 'candidate_skip', username, reason: profileResult.message };
        skipped++;
        continue;
      }
      const profile: GitHubUser = profileResult.data;

      // Fetch top repos
      const reposResult = await getUserRepos(username, 5);
      const topRepos: GitHubRepo[] = reposResult.ok ? reposResult.data : [];

      // ── 7. Build raw signals ─────────────────────────────────────────────
      const rawSignals: RawSignal[] = [
        {
          type: 'github_profile',
          source: 'github',
          data: profile as unknown as Record<string, any>,
          capturedAt: new Date(),
        },
        ...topRepos.map((r) => ({
          type: 'github_repo',
          source: 'github',
          data: r as unknown as Record<string, any>,
          capturedAt: new Date(),
        })),
      ];

      // ── 8. Detect cold start ─────────────────────────────────────────────
      const coldStart =
        !profile.bio &&
        !profile.company &&
        (profile.followers ?? 0) < 20;

      // ── 9. Structure the profile ─────────────────────────────────────────
      const primaryLanguages = [
        ...new Set(topRepos.map((r) => r.language).filter(Boolean) as string[]),
      ];

      const structuredProfile: StructuredProfile = {
        oneLiner: profile.bio ?? undefined,
        description: profile.bio ?? undefined,
        sectors: primaryLanguages.length > 0 ? primaryLanguages : undefined,
        location: profile.location ?? undefined,
        githubUrl: profile.html_url,
        websiteUrl: profile.blog || undefined,
        twitterUsername: profile.twitter_username ?? undefined,
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

      yield {
        type: 'candidate_structured',
        username,
        coldStart,
        founderId: '', // will be populated after insert
      };

      // ── 10. Write founder doc ────────────────────────────────────────────
      const founderDoc = {
        githubUsername: username,
        name: profile.name ?? username,
        company: profile.company?.replace('@', '').trim() ?? '',
        source: 'outbound',
        channel: 'github',
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

      // ── 11. Write application doc ────────────────────────────────────────
      const applicationDoc = {
        founderId,
        companyInfo: {
          name: profile.company?.replace('@', '').trim() || username,
          website: profile.blog || undefined,
          description: profile.bio ?? `GitHub: ${profile.html_url}`,
          githubUsername: username,
        },
        status: 'sourced',
        createdAt: new Date(),
      };

      const applicationInsert = await applicationsCol.insertOne(applicationDoc);
      const applicationId = applicationInsert.insertedId.toString();

      foundersAdded++;
      await appendLog(`Saved @${username} → founder:${founderId}`, 'info');

      yield {
        type: 'candidate_saved',
        username,
        founderId,
        applicationId,
      };
    }

    // ── 12. Mark run done ────────────────────────────────────────────────────
    await pipelineRunsCol.updateOne(
      { _id: runInsert.insertedId },
      { $set: { status: 'done', updatedAt: new Date() } }
    );

    const summary = `Sourcing complete — ${foundersAdded} new founders saved, ${skipped} skipped`;
    await appendLog(summary, 'info');

    yield {
      type: 'run_done',
      found: foundersAdded,
      skipped,
      message: summary,
    };

    return { runId, foundersAdded, skipped };
  } catch (err: any) {
    const msg = err?.message ?? 'Unknown error in sourcing agent';
    await pipelineRunsCol
      .updateOne(
        { _id: runInsert.insertedId },
        { $set: { status: 'error', updatedAt: new Date() } }
      )
      .catch(() => {});
    await appendLog(msg, 'error').catch(() => {});

    yield { type: 'run_error', message: msg };
    return { runId, foundersAdded, skipped };
  }
}
