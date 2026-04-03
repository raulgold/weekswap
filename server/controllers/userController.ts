import type { Request, Response } from 'express';

export function createUserController(db: FirebaseFirestore.Firestore) {
  return {
    async getProfile(req: Request, res: Response) {
      try {
        const authUserId = (req as any).user.uid;
        const userId = String(req.params.userId);

        if (authUserId !== userId) {
          return res.status(403).json({ error: 'Sem permissao para acessar dados de outro usuario' });
        }

        const userDoc = await db.collection('users').doc(userId).get();
        if (!userDoc.exists) return res.status(404).json({ error: 'Usuário não encontrado' });

        const data = userDoc.data()!;
        return res.json({
          uid: userDoc.id,
          name: data.name,
          email: data.email,
          credits_balance: data.credits_balance || 0,
          pending_credits: data.pending_credits || 0,
          account_status: data.account_status || 'active',
        });
      } catch (error) {
        console.error('Erro ao buscar usuário:', error);
        return res.status(500).json({ error: 'Erro ao buscar usuário' });
      }
    },
  };
}

