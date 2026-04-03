import type { Request, Response, NextFunction } from 'express';

export function createRiskLockMiddleware(db: FirebaseFirestore.Firestore) {
  return async function checkRiskLocked(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user?.uid;
    if (!userId) return res.status(401).json({ error: 'Token obrigatório' });

    try {
      const userDoc = await db.collection('users').doc(userId).get();
      if (userDoc.exists && userDoc.data()?.account_status === 'RISK_LOCKED') {
        return res.status(403).json({
          error: 'ACCOUNT_LOCKED',
          message:
            'Sua conta está bloqueada por motivos de segurança. Entre em contato com o suporte.',
        });
      }
      next();
    } catch (error) {
      console.error('Erro ao verificar status de risco:', error);
      res.status(500).json({ error: 'Erro interno ao verificar conta' });
    }
  };
}

