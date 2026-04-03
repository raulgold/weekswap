import admin from 'firebase-admin';

export async function updateGlobalStats(
  db: FirebaseFirestore.Firestore,
  commissionAmount: number,
  exchangeCount: number
) {
  const statsRef = db.collection('platform').doc('stats');
  await statsRef.set(
    {
      total_commission: admin.firestore.FieldValue.increment(commissionAmount),
      total_exchanges: admin.firestore.FieldValue.increment(exchangeCount),
      last_updated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
}

