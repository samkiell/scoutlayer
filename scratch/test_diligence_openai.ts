import fs from 'fs';
import path from 'path';

// Load .env file manually before any other imports
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

async function runTest() {
  const { default: clientPromise } = await import('../lib/db');
  const { ObjectId } = await import('mongodb');
  const { runDiligenceAgent } = await import('../agents/diligence');

  const mongoClient = await clientPromise;
  const db = mongoClient.db();

  const foundersCol = db.collection('founders');
  const appsCol = db.collection('applications');
  const trustClaimsCol = db.collection('trustClaims');
  const pipelineRunsCol = db.collection('pipelineRuns');

  console.log('Cleaning up old test data...');
  await foundersCol.deleteMany({ email: 'test-diligence-openai@example.com' });
  await appsCol.deleteMany({ 'companyInfo.name': 'Diligence OpenAI Inc' });

  // Setup a test founder with startupUrl and additionalLinks
  console.log('Creating test founder with startupUrl and additionalLinks...');
  const founderInsert = await foundersCol.insertOne({
    email: 'test-diligence-openai@example.com',
    name: 'OpenAI Tester',
    company: 'Diligence OpenAI Inc',
    source: 'inbound',
    createdAt: new Date(),
    startupUrl: 'https://openai.com',
    additionalLinks: [
      { url: 'https://twitter.com/OpenAI', label: 'Twitter/X' },
      { url: 'https://github.com/openai', label: 'GitHub' }
    ],
    structuredProfile: {
      oneLiner: 'Building cutting edge reasoning engines.',
      description: 'Creating GPT-4 and other advanced models.',
      followers: 12000,
      publicRepos: 85,
      topRepos: [
        { name: 'gym', stars: 25000, language: 'Python', description: 'A toolkit for developing and comparing reinforcement learning algorithms.' },
        { name: 'gpt-3', stars: 15000, language: 'Python', description: 'GPT-3 documentation and examples.' }
      ]
    },
    founderScore: { value: 0, history: [] }
  });
  const founderId = founderInsert.insertedId;

  // Setup test application
  const appInsert = await appsCol.insertOne({
    founderId: founderId.toString(),
    status: 'sourced',
    deck: 'https://docs.google.com/presentation/d/1t_z3lG9Xf7qKmsK20YmP1F4Z14Z52-bX14Z52-bX14Z/edit', // mock slides url
    companyInfo: {
      name: 'Diligence OpenAI Inc',
      oneLiner: 'Next-generation AI orchestration platform',
      description: 'We claim to have launched on Product Hunt with 500+ upvotes, and we have over 40,000 GitHub stars across our open-source repositories.'
    },
    createdAt: new Date()
  });
  const applicationId = appInsert.insertedId.toString();

  // Clear existing logs
  await trustClaimsCol.deleteMany({ applicationId });
  await pipelineRunsCol.deleteMany({ applicationId });

  console.log(`Running Diligence agent for Application ID: ${applicationId}...`);
  for await (const event of runDiligenceAgent(applicationId)) {
    console.log('[Event]', JSON.stringify(event));
  }

  // Fetch final trust claims
  const claims = await trustClaimsCol.find({ applicationId }).toArray();
  console.log('\n======================================');
  console.log('PERSISTED TRUST CLAIMS FOR THE FOUNDER:');
  console.log('======================================');
  claims.forEach((c, idx) => {
    console.log(`[Claim ${idx + 1}]`);
    console.log(`- Text:       ${c.claim}`);
    console.log(`- URL:        ${c.evidenceUrl}`);
    console.log(`- Confidence: ${c.confidence}%`);
    console.log(`- Verified:   ${c.verifiedBy}`);
  });

  process.exit(0);
}

runTest().catch(err => {
  console.error('Test run failed:', err);
  process.exit(1);
});
