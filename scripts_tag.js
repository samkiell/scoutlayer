const { MongoClient } = require('mongodb');
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI); await c.connect();
  const db = c.db();
  // Pick one legacy outbound founder and tag it to Investor A for this test.
  const f = await db.collection('founders').findOne({ source: 'outbound', sourcedByInvestorId: { $exists: false } });
  console.log('Tagging outbound founder', f._id.toString(), '-> Investor A (6a5c003c7883f8666934dc93)');
  await db.collection('founders').updateOne({ _id: f._id }, { $set: { sourcedByInvestorId: '6a5c003c7883f8666934dc93' } });
  console.log('TAGGED_OK');
  await c.close();
})().catch(e => { console.error(e.message); process.exit(1); });
