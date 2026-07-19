import { Db, ObjectId } from 'mongodb';

/**
 * Cascade deletes a founder and all corresponding records:
 * - The founder document itself
 * - All associated applications
 * - All associated screenings, trustClaims, memos, and pipelineRuns
 */
export async function deleteFounderCascade(db: Db, founderId: string) {
  if (!founderId) return;

  // Fetch corresponding applications to cascade delete their related records
  // founderId in applications is stored as a string
  const apps = await db.collection('applications').find({
    $or: [
      { founderId: founderId },
      { founderId: new ObjectId(founderId) as any }
    ]
  }).toArray();

  const appIds = apps.map((app) => app._id.toString());

  // 1. Delete from founders
  await db.collection('founders').deleteOne({ _id: new ObjectId(founderId) });

  // 2. Delete from applications
  await db.collection('applications').deleteMany({
    $or: [
      { founderId: founderId },
      { founderId: new ObjectId(founderId) as any }
    ]
  });

  if (appIds.length > 0) {
    // 3. Delete from screenings
    await db.collection('screenings').deleteMany({
      applicationId: { $in: appIds }
    });

    // 4. Delete from trustClaims
    await db.collection('trustClaims').deleteMany({
      applicationId: { $in: appIds }
    });

    // 5. Delete from memos
    await db.collection('memos').deleteMany({
      applicationId: { $in: appIds }
    });

    // 6. Delete from pipelineRuns
    await db.collection('pipelineRuns').deleteMany({
      applicationId: { $in: appIds }
    });
  }
}
