import admin from 'firebase-admin';

function getReferralRate(referralCount: number): number {
  if (referralCount >= 51) return 0.025;
  if (referralCount >= 21) return 0.02;
  if (referralCount >= 6) return 0.015;
  return 0.01;
}

export async function distributeReferralBonus(
  db: FirebaseFirestore.Firestore,
  userId: string,
  tradeAmount: number
) {
  try {
    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists) return;

    const referredBy = userDoc.data()?.referred_by;
    if (!referredBy) return;

    const referrerQuery = await db
      .collection('users')
      .where('referral_code', '==', referredBy)
      .limit(1)
      .get();

    if (referrerQuery.empty) return;

    const referrerDoc = referrerQuery.docs[0];
    const referrerData = referrerDoc.data();
    const referralCount = referrerData.referral_count || 0;
    const rate = getReferralRate(referralCount);
    const bonus = Math.floor(tradeAmount * rate);

    if (bonus <= 0) return;

    await referrerDoc.ref.update({
      referral_credits: admin.firestore.FieldValue.increment(bonus),
    });

    console.log(`Bônus de indicação: ${bonus} créditos para ${referrerDoc.id}`);
  } catch (error) {
    console.error('Erro ao distribuir bônus de indicação:', error);
  }
}

