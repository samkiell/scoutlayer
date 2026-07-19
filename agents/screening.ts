import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { OpenAI } from 'openai';
import {
  truncateRepoDescription,
  truncateDeckText,
  truncateLongField,
  checkTokenBudget,
} from '@/lib/utils/truncation';
import { extractDeckText } from '@/lib/sources/deck';

export type ScreeningEvent =
  | { type: 'run_start'; message: string }
  | { type: 'founder_axis_start'; message: string }
  | { type: 'founder_axis_done'; score: number; evidence: string; message: string }
  | { type: 'market_axis_start'; message: string }
  | { type: 'market_axis_done'; score: number; evidence: string; message: string }
  | { type: 'idea_axis_start'; message: string }
  | { type: 'idea_axis_done'; score: number; evidence: string; message: string }
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
  appendLog?: (message: string, level?: 'info' | 'warn' | 'error') => Promise<void>
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
        temperature: 0.1,
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

export async function* runScreeningAgent(
  applicationId: string
): AsyncGenerator<ScreeningEvent, void, unknown> {
  const mongoClient = await clientPromise;
  const db = mongoClient.db();

  const appsCol = db.collection('applications');
  const foundersCol = db.collection('founders');
  const screeningsCol = db.collection('screenings');
  const pipelineRunsCol = db.collection('pipelineRuns');

  // Find or create pipeline run
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

  // Set application status to screening
  await appsCol.updateOne({ _id: appObjectId }, { $set: { status: 'screening' } });

  // Add pipeline run entry or update it
  let runDoc = await pipelineRunsCol.findOne({ applicationId, stage: 'screening' });
  if (!runDoc) {
    const newRun = {
      applicationId,
      founderId: application.founderId,
      stage: 'screening',
      status: 'running',
      log: [{ timestamp: new Date(), message: 'Started screening agent', level: 'info' }],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    const result = await pipelineRunsCol.insertOne(newRun);
    runDoc = { ...newRun, _id: result.insertedId } as any;
  } else {
    await pipelineRunsCol.updateOne(
      { _id: runDoc._id },
      {
        $set: { status: 'running', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Restarted screening agent', level: 'info' } } as any,
      }
    );
  }

  const runObjectId = runDoc!._id;

  const appendLog = async (message: string, level: 'info' | 'warn' | 'error' = 'info') => {
    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $push: { log: { timestamp: new Date(), message, level } } as any,
        $set: { updatedAt: new Date() },
      }
    );
  };

  yield { type: 'run_start', message: 'Initiating 3-axis screening agent' };
  await appendLog('3-axis screening agent initiated');

  // ── Gather BOTH GitHub profile AND application data ─────────────────────
  const profile = founder.structuredProfile || {};
  const companyInfo = application.companyInfo || {};
  const deckUrl: string | undefined = application.deck;

  const deckExtract = await extractDeckText(deckUrl);
  const extractedDeckText = deckExtract.analyzed ? truncateDeckText(deckExtract.text) : null;

  // Truncate fields to protect the token budget
  const rawTopRepos = profile.topRepos || [];
  const sortedRepos = [...rawTopRepos].sort((a: any, b: any) => (b.stars || 0) - (a.stars || 0));
  const top5Repos = sortedRepos.slice(0, 5).map((r: any) => ({
    name: r.name,
    stars: r.stars,
    language: r.language,
    description: truncateRepoDescription(r.description),
    url: r.url,
  }));

   const truncatedBio = truncateLongField(profile.bio || profile.description);
  const truncatedAdditionalContext = truncateLongField(
    application.additionalContext ||
    companyInfo.additionalContext ||
    application.context ||
    companyInfo.description
  );

  const contextPayload = JSON.stringify({
    // Application data (founder-submitted)
    application: {
      companyName: companyInfo.name || null,
      oneLinerPitch: companyInfo.oneLiner || null,
      companyDescription: truncatedAdditionalContext || null,
      deckUrl: deckUrl || null,
      deckText: extractedDeckText || null,
      deckAnalyzed: deckExtract.analyzed,
      deckAnalyzedReason: deckExtract.reason,
      deckNote: deckExtract.analyzed
        ? 'Pitch deck text was successfully extracted and is provided below.'
        : deckUrl
          ? `Pitch deck link was provided but contents were not analyzed: ${deckExtract.reason}.`
          : 'No pitch deck was submitted.',
    },
    // GitHub / structured profile data
    github: {
      name: founder.name,
      company: founder.company,
      oneLiner: profile.oneLiner,
      description: truncatedBio,
      sectors: profile.sectors,
      location: profile.location,
      followers: profile.followers,
      publicRepos: profile.publicRepos,
      coldStart: profile.coldStart,
      topRepos: top5Repos,
    },
  });

  try {
    // ── Axis 1: Founder Axis ──────────────────────────────────────────────────
    yield { type: 'founder_axis_start', message: 'Analyzing founder signals and background...' };
    await appendLog('Analyzing founder signals...');

    const founderSystemPrompt = `You are a venture capital investment screening agent.
You will receive two data sources: (1) the founder's APPLICATION data — company name, one-liner pitch, company description, and pitch deck text if extractable, and (2) their GITHUB profile signals — repos, followers, bio, etc.
Evaluate the founder's strength on the "Founder" axis by combining BOTH sources:
- Application signals: quality of the pitch, clarity of the company vision, background implied by the submission, and deck text if provided.
- GitHub signals: repo activity, followers, language breadth, cold-start status.
Weight the application data heavily — a founder who submitted a clear company name and pitch should NOT be penalized for sparse GitHub activity.
If a deck was provided but its contents could not be analyzed, note that in your rationale but do not penalize.
Provide your response strictly in the following JSON format:
{
  "score": <number between 0 and 100>,
  "rationale": "<one-line concise rationale explaining the score based on BOTH application and GitHub signals>"
}`;

    const founderResultRaw = await callGroqWithFallback(founderSystemPrompt, contextPayload, appendLog);
    const founderResult = JSON.parse(founderResultRaw);
    const founderScore = Math.max(0, Math.min(100, Number(founderResult.score) || 0));
    const founderEvidence = founderResult.rationale || 'Limited founder signals available.';

    yield {
      type: 'founder_axis_done',
      score: founderScore,
      evidence: founderEvidence,
      message: `Founder axis completed with score ${founderScore}`,
    };
    await appendLog(`Founder axis score: ${founderScore} - ${founderEvidence}`);

    // ── Axis 2: Market Axis ───────────────────────────────────────────────────
    yield { type: 'market_axis_start', message: 'Inferring market dynamics and space...' };
    await appendLog('Analyzing market space...');

    const marketSystemPrompt = `You are a venture capital investment screening agent.
You will receive two data sources: (1) the founder's APPLICATION data — company name, one-liner pitch, company description, and pitch deck text if extractable, and (2) their GITHUB profile signals.
Analyze the market the founder is targeting by combining BOTH sources:
- Application signals: the company description and one-liner pitch are the PRIMARY indicators of the market/space, supplemented by deck text if provided.
- GitHub signals: repo descriptions, topics, and languages serve as SECONDARY proxies for technical market alignment.
If the application provides a clear company description and pitch, use those as the primary basis for market assessment — do NOT fall back to GitHub-only reasoning.
State explicitly whether market assessment is based on application data, GitHub proxy signals, or both.
Provide your response strictly in the following JSON format:
{
  "score": <number between 0 and 100>,
  "rationale": "<one-line concise rationale explaining the score, noting which data sources informed the assessment>"
}`;

    const marketResultRaw = await callGroqWithFallback(marketSystemPrompt, contextPayload, appendLog);
    const marketResult = JSON.parse(marketResultRaw);
    const marketScore = Math.max(0, Math.min(100, Number(marketResult.score) || 0));
    const marketEvidence = marketResult.rationale || 'Lightweight signal proxy evaluation complete.';

    yield {
      type: 'market_axis_done',
      score: marketScore,
      evidence: marketEvidence,
      message: `Market axis completed with score ${marketScore}`,
    };
    await appendLog(`Market axis score: ${marketScore} - ${marketEvidence}`);

    // ── Axis 3: Idea vs Market Axis ───────────────────────────────────────────
    yield { type: 'idea_axis_start', message: 'Assessing product-market thesis and pivot resiliency...' };
    await appendLog('Analyzing Idea vs Market fit...');

    const ideaSystemPrompt = `You are a venture capital investment screening agent.
You will receive two data sources: (1) the founder's APPLICATION data — company name, one-liner pitch, company description, and pitch deck text if extractable, and (2) their GITHUB profile signals.
Evaluate the "Idea vs Market" axis by combining BOTH sources:
- The company name, one-liner pitch, and description from the APPLICATION are the PRIMARY indicators of the idea, supplemented by deck text if provided.
- GitHub repos and topics provide SECONDARY signals about technical capability and market alignment.
Assess: does the submitted idea/product description fit the market? Is there pivot potential? Is the pitch clear and compelling?
Do NOT describe the idea as "vague" if a clear company name and pitch were provided in the application data.
Provide your response strictly in the following JSON format:
{
  "score": <number between 0 and 100>,
  "rationale": "<one-line concise rationale explaining the score and pivot potential, referencing the submitted pitch>"
}`;

    const ideaResultRaw = await callGroqWithFallback(ideaSystemPrompt, contextPayload, appendLog);
    const ideaResult = JSON.parse(ideaResultRaw);
    const ideaScore = Math.max(0, Math.min(100, Number(ideaResult.score) || 0));
    const ideaEvidence = ideaResult.rationale || 'Evaluation of product-market thesis complete.';

    yield {
      type: 'idea_axis_done',
      score: ideaScore,
      evidence: ideaEvidence,
      message: `Idea vs Market axis completed with score ${ideaScore}`,
    };
    await appendLog(`Idea vs Market axis score: ${ideaScore} - ${ideaEvidence}`);

    // ── Trend evaluation (stable with comment per PRD) ───────────────────────
    // Default trend is stable. Trend tracking begins after a founder's second scoring pass.
    const comment = 'Trend tracking begins after a founder\'s second scoring pass';

    const screeningDoc = {
      applicationId,
      founderAxis: { score: founderScore, trend: 'stable' as const, evidence: `${founderEvidence} (${comment})` },
      marketAxis: { score: marketScore, trend: 'stable' as const, evidence: `${marketEvidence} (${comment})` },
      ideaVsMarketAxis: { score: ideaScore, trend: 'stable' as const, evidence: `${ideaEvidence} (${comment})` },
      createdAt: new Date(),
    };

    // Update screenings collection (upsert per application)
    await screeningsCol.replaceOne({ applicationId }, screeningDoc, { upsert: true });

    // Update application status to screened
    await appsCol.updateOne({ _id: appObjectId }, { $set: { status: 'screened' } });

    // Update pipeline run status
    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $set: { status: 'done', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: 'Screening agent completed successfully', level: 'info' } } as any,
      }
    );

    yield { type: 'run_done', message: '3-axis screening complete' };

  } catch (err: any) {
    const errorMsg = err?.message || 'Error occurred during LLM scoring calls';
    await pipelineRunsCol.updateOne(
      { _id: runObjectId },
      {
        $set: { status: 'error', updatedAt: new Date() },
        $push: { log: { timestamp: new Date(), message: `Screening failed: ${errorMsg}`, level: 'error' } } as any,
      }
    );
    yield { type: 'run_error', message: errorMsg };
  }
}
