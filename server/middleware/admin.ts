import type { Request, Response, NextFunction } from 'express';

export function createAdminMiddleware(db: FirebaseFirestore.Firestore) {
  return async function checkAdmin(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user?.uid;
    if (!userId) return res.status(401).json({ error: 'Não autenticado' });

    const userDoc = await db.collection('users').doc(userId).get();
    if (!userDoc.exists || !userDoc.data()?.is_admin) {
      return res.status(403).json({ error: 'Acesso restrito a administradores' });
    }
    next();
  };
}

