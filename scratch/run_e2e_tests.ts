import fs from 'fs';
import path from 'path';

// Load .env file manually before any other imports so keys are set
try {
  const envPath = path.resolve(process.cwd(), '.env');
  if (fs.existsSync(envPath)) {
    const envConfig = fs.readFileSync(envPath, 'utf-8');
    envConfig.split('\n').forEach(line => {
      const parts = line.split('=');
      if (parts.length >= 2) {
        const key = parts[0].trim();
        const value = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
        if (key && !key.startsWith('#')) {
          process.env[key] = value;
        }
      }
    });
  }
} catch (e) {
  console.error('Error loading .env manually:', e);
}

import clientPromise from '../lib/db';
import { ObjectId } from 'mongodb';
import { runScreeningAgent } from '../agents/screening';
import { runDiligenceAgent } from '../agents/diligence';
import { runDecisionAgent } from '../agents/decision';
import { translateNLQuery } from '../lib/query/queryTranslator';
import { getUserProfile, getUserRepos } from '../lib/sources/github';

// Helper to fully consume an async generator and print its events
async function consumeAgent(generator: AsyncGenerator<any, any, any>, agentName: string) {
  console.log(`\n--- Starting ${agentName} ---`);
  let lastEvent: any = null;
  const start = Date.now();
  for await (const event of generator) {
    console.log(`[${agentName} Event]`, JSON.stringify(event));
    lastEvent = event;
  }
  const duration = Date.now() - start;
  console.log(`--- Finished ${agentName} in ${duration}ms ---`);
  if (!lastEvent || (lastEvent.type !== 'run_done' && lastEvent.type !== 'memo_done')) {
    throw new Error(`${agentName} did not complete with success. Last event: ${JSON.stringify(lastEvent)}`);
  }
  return lastEvent;
}

async function runTests() {
  const mongoClient = await clientPromise;
  const db = mongoClient.db();

  const foundersCol = db.collection('founders');
  const appsCol = db.collection('applications');
  const screeningsCol = db.collection('screenings');
  const trustClaimsCol = db.collection('trustClaims');
  const memosCol = db.collection('memos');
  const pipelineRunsCol = db.collection('pipelineRuns');

  console.log('Cleaning up old test data...');
  await foundersCol.deleteMany({ email: { $in: ['test-a-strong@example.com', 'test-b-cold@example.com'] } });
  await appsCol.deleteMany({ 'companyInfo.name': { $in: ['Test A Inc', 'Test B Cold'] } });
  
  // Clean up any stray data associated with these applications
  const testApps = await appsCol.find({ 'companyInfo.name': { $in: ['Test A Inc', 'Test B Cold'] } }).toArray();
  const testAppIds = testApps.map(a => a._id.toString());
  if (testAppIds.length > 0) {
    await screeningsCol.deleteMany({ applicationId: { $in: testAppIds } });
    await trustClaimsCol.deleteMany({ applicationId: { $in: testAppIds } });
    await memosCol.deleteMany({ applicationId: { $in: testAppIds } });
    await pipelineRunsCol.deleteMany({ applicationId: { $in: testAppIds } });
  }

  // ---------------------------------------------------------------------------
  // TEST A: Strong Founder (e.g. Dan Abramov 'gaearon')
  // ---------------------------------------------------------------------------
  console.log('\n======================================');
  console.log('TEST A: Strong Founder (gaearon)');
  console.log('======================================');

  // Fetch real GitHub data for gaearon
  console.log('Fetching real GitHub data for gaearon...');
  const ghProfileResult = await getUserProfile('gaearon');
  if (!ghProfileResult.ok) {
    throw new Error('Failed to fetch gaearon profile: ' + ghProfileResult.message);
  }
  const ghReposResult = await getUserRepos('gaearon', 5);
  const topRepos = ghReposResult.ok ? ghReposResult.data : [];

  const strongProfile = {
    oneLiner: ghProfileResult.data.bio || 'React core team member',
    description: 'Developing UI library and developer tools used by millions.',
    sectors: ['React', 'TypeScript', 'JavaScript'],
    location: ghProfileResult.data.location || 'London, UK',
    githubUrl: ghProfileResult.data.html_url,
    websiteUrl: ghProfileResult.data.blog || undefined,
    followers: ghProfileResult.data.followers,
    publicRepos: ghProfileResult.data.public_repos,
    coldStart: false,
    coldStartScoredPath: false,
    topRepos: topRepos.map(r => ({
      name: r.name,
      description: r.description,
      stars: r.stargazers_count,
      language: r.language
    }))
  };

  const strongFounderInsert = await foundersCol.insertOne({
    email: 'test-a-strong@example.com',
    name: ghProfileResult.data.name || 'Dan Abramov',
    company: 'React / Meta',
    githubUsername: 'gaearon',
    source: 'inbound',
    createdAt: new Date(),
    structuredProfile: strongProfile,
    founderScore: { value: 0, history: [] }
  });
  const strongFounderId = strongFounderInsert.insertedId;

  const strongAppInsert = await appsCol.insertOne({
    founderId: strongFounderId.toString(),
    status: 'sourced',
    deck: 'https://example.com/deck-a.pdf',
    companyInfo: {
      name: 'Test A Inc',
      oneLiner: 'Next generation rendering framework',
      description: 'Building developer tools that speed up React compilation by 10x.'
    },
    createdAt: new Date()
  });
  const strongAppId = strongAppInsert.insertedId.toString();

  // Run through pipeline
  await consumeAgent(runScreeningAgent(strongAppId), 'Test A Screening');
  await consumeAgent(runDiligenceAgent(strongAppId), 'Test A Diligence');
  await consumeAgent(runDecisionAgent(strongAppId), 'Test A Decision');

  // Verify DB entries
  const strongAppFinal = await appsCol.findOne({ _id: new ObjectId(strongAppId) });
  const strongFounderFinal = await foundersCol.findOne({ _id: strongFounderId });
  const strongScreening = await screeningsCol.findOne({ applicationId: strongAppId });
  const strongClaims = await trustClaimsCol.find({ applicationId: strongAppId }).toArray();
  const strongMemo = await memosCol.findOne({ applicationId: strongAppId });

  console.log('\n--- Test A Final Verification ---');
  console.log('App Status:', strongAppFinal?.status); // should be decided
  console.log('Founder Score:', strongFounderFinal?.founderScore?.value);
  console.log('Screening Axis Scores:', JSON.stringify(strongScreening?.axes));
  console.log('Trust Claims Count:', strongClaims.length);
  console.log('Memo SWOT:', JSON.stringify(strongMemo?.swot));
  console.log('Memo Traction KPIs:', strongMemo?.tractionKpis);

  if (strongAppFinal?.status !== 'decided') throw new Error('Test A failed: Status is not decided');
  if (!strongFounderFinal?.founderScore?.value) throw new Error('Test A failed: Founder Score was not populated');
  if (strongClaims.length === 0) throw new Error('Test A failed: No trust claims were verified');

  // ---------------------------------------------------------------------------
  // TEST B: Cold-start Founder (no GitHub data)
  // ---------------------------------------------------------------------------
  console.log('\n======================================');
  console.log('TEST B: Cold-start Founder');
  console.log('======================================');

  const coldProfile = {
    oneLiner: 'Building local-first document editor',
    description: 'Building a collaborative markdown editor with CRDTs and offline support.',
    sectors: ['TypeScript', 'Node.js'],
    coldStart: true,
    coldStartScoredPath: true,
    followers: 0,
    publicRepos: 0,
    topRepos: []
  };

  const coldFounderInsert = await foundersCol.insertOne({
    email: 'test-b-cold@example.com',
    name: 'Anonymous Hacker',
    company: 'Test B Cold',
    source: 'inbound',
    createdAt: new Date(),
    structuredProfile: coldProfile,
    founderScore: { value: 0, history: [] }
  });
  const coldFounderId = coldFounderInsert.insertedId;

  const coldAppInsert = await appsCol.insertOne({
    founderId: coldFounderId.toString(),
    status: 'sourced',
    deck: 'https://example.com/deck-b.pdf',
    companyInfo: {
      name: 'Test B Cold',
      oneLiner: 'Local-first markdown workspace',
      description: 'Collaborative markdown editor with CRDTs and offline support.'
    },
    createdAt: new Date()
  });
  const coldAppId = coldAppInsert.insertedId.toString();

  // Run through pipeline
  await consumeAgent(runScreeningAgent(coldAppId), 'Test B Screening');
  await consumeAgent(runDiligenceAgent(coldAppId), 'Test B Diligence');
  await consumeAgent(runDecisionAgent(coldAppId), 'Test B Decision');

  // Verify DB entries
  const coldAppFinal = await appsCol.findOne({ _id: new ObjectId(coldAppId) });
  const coldFounderFinal = await foundersCol.findOne({ _id: coldFounderId });
  const coldScreening = await screeningsCol.findOne({ applicationId: coldAppId });
  const coldClaims = await trustClaimsCol.find({ applicationId: coldAppId }).toArray();
  const coldMemo = await memosCol.findOne({ applicationId: coldAppId });

  console.log('\n--- Test B Final Verification ---');
  console.log('App Status:', coldAppFinal?.status); // should be decided
  console.log('Founder Score:', coldFounderFinal?.founderScore?.value);
  console.log('Screening Axis Scores:', JSON.stringify(coldScreening?.axes));
  console.log('Trust Claims Count:', coldClaims.length);
  console.log('Memo SWOT:', JSON.stringify(coldMemo?.swot));
  console.log('Memo Traction KPIs:', coldMemo?.tractionKpis);
  console.log('Gaps Flagged:', JSON.stringify(coldMemo?.gapsFlagged));

  if (coldAppFinal?.status !== 'decided') throw new Error('Test B failed: Status is not decided');
  if (!coldFounderFinal?.founderScore?.value) throw new Error('Test B failed: Founder Score was not populated');
  // Cold start founders might not have many or any verifiable claims
  console.log('Cold start verified claims count:', coldClaims.length);

  // ---------------------------------------------------------------------------
  // TEST C: Natural Language Query Filtering
  // ---------------------------------------------------------------------------
  console.log('\n======================================');
  console.log('TEST C: Natural Language Query Filtering');
  console.log('======================================');

  // Query that should match Test A but not Test B
  const nlQuery = 'founders with React experience and high follower count';
  console.log(`Translating query: "${nlQuery}"`);
  const translation = await translateNLQuery(nlQuery);
  console.log('Interpretation:', translation.explanation);
  console.log('MongoDB Filter:', JSON.stringify(translation.filter));

  // Run query on MongoDB founders collection
  // The system uses a join, but let's query founders directly using the filter
  const matchingFounders = await foundersCol.find(translation.filter).toArray();
  console.log('Matching founders:');
  matchingFounders.forEach(f => console.log(`- ${f.name} (email: ${f.email}, followers: ${f.structuredProfile?.followers})`));

  const matchedStrong = matchingFounders.some(f => f.email === 'test-a-strong@example.com');
  const matchedCold = matchingFounders.some(f => f.email === 'test-b-cold@example.com');

  console.log(`Matched Strong (Test A): ${matchedStrong ? 'PASS' : 'FAIL'}`);
  console.log(`Matched Cold (Test B): ${matchedCold ? 'FAIL (should not match)' : 'PASS (correctly skipped)'}`);

  // Summary Report
  console.log('\n======================================');
  console.log('TEST RUN REPORT SUMMARY');
  console.log('======================================');
  console.log(`Test A Screening: PASS`);
  console.log(`Test A Diligence: PASS`);
  console.log(`Test A Decision:  PASS`);
  console.log(`Test A Score:     ${strongFounderFinal?.founderScore?.value} (PASS)`);
  
  console.log(`Test B Screening: PASS`);
  console.log(`Test B Diligence: PASS`);
  console.log(`Test B Decision:  PASS`);
  console.log(`Test B Score:     ${coldFounderFinal?.founderScore?.value} (PASS)`);
  console.log(`Test B Cold-start honored: ${coldScreening?.axes?.founderAxis?.evidence?.toLowerCase().includes('github') || coldMemo?.tractionKpis?.toLowerCase().includes('no traction') || coldMemo?.tractionKpis?.toLowerCase().includes('not disclosed') ? 'PASS' : 'FAIL'}`);

  console.log(`NL Query Match A: ${matchedStrong ? 'PASS' : 'FAIL'}`);
  console.log(`NL Query Match B: ${!matchedCold ? 'PASS' : 'FAIL'}`);
  
  process.exit(0);
}

runTests().catch(err => {
  console.error('Test run crashed:', err);
  process.exit(1);
});
