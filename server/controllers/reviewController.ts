import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { logAudit } from '../services/audit.js';

export function createReviewController(db: FirebaseFirestore.Firestore) {
  return {
    async submitReview(req: Request, res: Response) {
      const userId = (req as any).user.uid;
      const { exchangeId, rating, comment } = req.body;

      if (!exchangeId || !rating || rating < 1 || rating > 5) {
        return res.status(400).json({ error: 'exchangeId e rating (1-5) são obrigatórios' });
      }

      try {
        const exchangeDoc = await db.collection('exchanges').doc(exchangeId).get();
        if (!exchangeDoc.exists) return res.status(404).json({ error: 'Troca não encontrada' });

        const exData = exchangeDoc.data()!;
        if (exData.exchange_status !== 'FINALIZED') {
          return res.status(400).json({ error: 'Só é possível avaliar trocas finalizadas' });
        }

        const isRequester = exData.requester_id === userId;
        const isOwner = exData.owner_id === userId;
        if (!isRequester && !isOwner) {
          return res.status(403).json({ error: 'Você não participou desta troca' });
        }

        const existingQ = await db
          .collection('reviews')
          .where('exchange_id', '==', exchangeId)
          .where('reviewer_id', '==', userId)
          .limit(1)
          .get();
        if (!existingQ.empty) return res.status(400).json({ error: 'Você já avaliou esta troca' });

        const reviewedId = isRequester ? exData.owner_id : exData.requester_id;

        const reviewRef = db.collection('reviews').doc();
        await reviewRef.set({
          exchange_id: exchangeId,
          reviewer_id: userId,
          reviewed_id: reviewedId,
          rating: Number(rating),
          comment: (comment || '').trim().substring(0, 500),
          created_at: admin.firestore.FieldValue.serverTimestamp(),
        });

        const reviewsQ = await db.collection('reviews').where('reviewed_id', '==', reviewedId).get();
        const allRatings = reviewsQ.docs.map((d) => d.data().rating as number);
        const avgRating = allRatings.reduce((a, b) => a + b, 0) / allRatings.length;

        await db.collection('users').doc(reviewedId).update({
          avg_rating: Math.round(avgRating * 10) / 10,
          review_count: allRatings.length,
        });

        await logAudit(db, 'REVIEW_SUBMITTED', userId, { exchangeId, reviewedId, rating });

        return res.json({ success: true, message: 'Avaliação enviada com sucesso!' });
      } catch (err: any) {
        console.error('Erro submit-review:', err);
        return res.status(500).json({ error: 'Erro ao enviar avaliação' });
      }
    },

    async getReviews(req: Request, res: Response) {
      const userId = String(req.params.userId);
      try {
        const reviewsQ = await db
          .collection('reviews')
          .where('reviewed_id', '==', userId)
          .orderBy('created_at', 'desc')
          .limit(20)
          .get();

        const reviews = reviewsQ.docs.map((d) => ({ id: d.id, ...d.data() }));
        return res.json({ reviews });
      } catch (err: any) {
        console.error('Erro get reviews:', err);
        return res.status(500).json({ error: 'Erro ao buscar avaliações' });
      }
    },
  };
}

