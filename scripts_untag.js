const { MongoClient } = require('mongodb');
(async () => {
  const c = new MongoClient(process.env.MONGODB_URI); await c.connect();
  const db = c.db();
  const res = await db.collection('founders').updateMany({ source: 'outbound', sourcedByInvestorId: '6a5c003c7883f8666934dc93' }, { $unset: { sourcedByInvestorId: '' } });
  console.log('Untagged', res.modifiedCount, 'founders (reverted to orphaned)');
  await c.close();
})().catch(e => { console.error(e.message); process.exit(1); });
