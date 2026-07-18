import clientPromise from '@/lib/db';
import { ObjectId } from 'mongodb';
import { OpenAI } from 'openai';

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

// Primary model is gpt-oss-120b per PRD. Fallbacks defined for robustness.
const MODELS = ['gpt-oss-120b', 'llama-3.3-70b-versatile', 'llama3-70b-8192'];

async function callGroqWithFallback(systemPrompt: string, userPrompt: string): Promise<string> {
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

  const profile = founder.structuredProfile || {};
  const profileSummary = JSON.stringify({
    name: founder.name,
    company: founder.company,
    oneLiner: profile.oneLiner,
    description: profile.description,
    sectors: profile.sectors,
    location: profile.location,
    followers: profile.followers,
    publicRepos: profile.publicRepos,
    coldStart: profile.coldStart,
    topRepos: profile.topRepos,
  });

  try {
    // ── Axis 1: Founder Axis ──────────────────────────────────────────────────
    yield { type: 'founder_axis_start', message: 'Analyzing founder signals and background...' };
    await appendLog('Analyzing founder signals...');

    const founderSystemPrompt = `You are a venture capital investment screening agent.
Analyze the provided founder profile and evaluate their strength on the "Founder" axis.
Consider repo activity, followers, background details (if bio or company is present), and cold-start status.
Provide your response strictly in the following JSON format:
{
  "score": <number between 0 and 100>,
  "rationale": "<one-line concise rationale explaining the score based on profile signals>"
}`;

    const founderResultRaw = await callGroqWithFallback(founderSystemPrompt, profileSummary);
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
Analyze the provided founder profile. Since we do not have direct market reports, reason from the founder's repo descriptions and topics/languages as a proxy for the space/market they operate in.
State explicitly in the rationale that this is a lightweight signal based on developer footprint, not deep market research.
Provide your response strictly in the following JSON format:
{
  "score": <number between 0 and 100>,
  "rationale": "<one-line concise rationale explaining the score, explicitly noting this is a lightweight signal proxy>"
}`;

    const marketResultRaw = await callGroqWithFallback(marketSystemPrompt, profileSummary);
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
Analyze the provided founder profile and company description/repos. Evaluate the "Idea vs Market" axis: does the specific project or product description fit the inferred developer/tech market, or is it a stretch? Is there pivot potential?
Provide your response strictly in the following JSON format:
{
  "score": <number between 0 and 100>,
  "rationale": "<one-line concise rationale explaining the score and pivot potential>"
}`;

    const ideaResultRaw = await callGroqWithFallback(ideaSystemPrompt, profileSummary);
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
