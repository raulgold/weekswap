import admin from 'firebase-admin';

export async function logAudit(
  db: FirebaseFirestore.Firestore,
  action: string,
  userId: string,
  data: Record<string, any>
) {
  try {
    await db.collection('audit_logs').add({
      action,
      user_id: userId,
      ...data,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });
  } catch (err) {
    console.error('Erro ao gravar audit_log:', err);
  }
}

