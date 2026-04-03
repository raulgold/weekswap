import type { Request, Response } from 'express';
import admin from 'firebase-admin';
import { logAudit } from '../services/audit.js';

export function createAdminController(db: FirebaseFirestore.Firestore) {
  return {
    async getStats(_req: Request, res: Response) {
      try {
        const [usersQ, weeksQ, exchangesQ, platformDoc] = await Promise.all([
          db.collection('users').count().get(),
          db.collection('weeks').count().get(),
          db.collection('exchanges').where('exchange_status', '==', 'FINALIZED').count().get(),
          db.collection('platform').doc('stats').get(),
        ]);

        const platformData = platformDoc.data() || {};
        return res.json({
          total_users: usersQ.data().count,
          total_weeks: weeksQ.data().count,
          total_exchanges: exchangesQ.data().count,
          total_commission: platformData.total_commission || 0,
        });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    },

    async getWeeksPendingDocs(_req: Request, res: Response) {
      try {
        const q = await db
          .collection('weeks')
          .where('docs_verified', '==', false)
          .where('status', '==', 'available')
          .orderBy('created_at', 'desc')
          .limit(50)
          .get();

        const weeks = q.docs.map((d) => ({ id: d.id, ...d.data() }));
        return res.json({ weeks });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    },

    async verifyWeek(req: Request, res: Response) {
      const adminId = (req as any).user.uid;
      const { weekId, approved, reason } = req.body;

      if (!weekId) return res.status(400).json({ error: 'weekId obrigatório' });

      try {
        await db.collection('weeks').doc(weekId).update({
          docs_verified: approved === true,
          docs_verification_note: reason || '',
          docs_verified_at: admin.firestore.FieldValue.serverTimestamp(),
          docs_verified_by: adminId,
        });

        await logAudit(db, approved ? 'DOCS_APPROVED' : 'DOCS_REJECTED', adminId!, { weekId, reason });
        return res.json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    },

    async listUsers(_req: Request, res: Response) {
      try {
        const q = await db.collection('users').orderBy('created_at', 'desc').limit(100).get();

        const users = q.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            name: data.name,
            email: data.email,
            credits_balance: data.credits_balance || 0,
            account_status: data.account_status || 'active',
            is_admin: data.is_admin || false,
            review_count: data.review_count || 0,
            avg_rating: data.avg_rating || 0,
            created_at: data.created_at,
          };
        });

        return res.json({ users });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    },

    async toggleUserLock(req: Request, res: Response) {
      const adminId = (req as any).user.uid;
      const { targetUserId, lock, reason } = req.body;

      if (!targetUserId) return res.status(400).json({ error: 'targetUserId obrigatório' });

      try {
        const newStatus = lock ? 'RISK_LOCKED' : 'active';
        await db.collection('users').doc(targetUserId).update({
          account_status: newStatus,
          lock_reason: reason || '',
          locked_at: lock ? admin.firestore.FieldValue.serverTimestamp() : null,
          locked_by: lock ? adminId : null,
        });

        await logAudit(db, lock ? 'USER_LOCKED' : 'USER_UNLOCKED', adminId!, { targetUserId, reason });
        return res.json({ success: true });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    },

    async getAuditLogs(_req: Request, res: Response) {
      try {
        const q = await db.collection('audit_logs').orderBy('created_at', 'desc').limit(100).get();
        const logs = q.docs.map((d) => ({ id: d.id, ...d.data() }));
        return res.json({ logs });
      } catch (err: any) {
        return res.status(500).json({ error: err.message });
      }
    },
  };
}

