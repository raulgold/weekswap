import { Router } from 'express';
import { createAdminController } from '../controllers/adminController.js';

export function createAdminRouter(db: FirebaseFirestore.Firestore, checkAdmin: any) {
  const router = Router();
  const controller = createAdminController(db);

  router.get('/stats', checkAdmin, controller.getStats);
  router.get('/weeks-pending-docs', checkAdmin, controller.getWeeksPendingDocs);
  router.post('/verify-week', checkAdmin, controller.verifyWeek);
  router.get('/users', checkAdmin, controller.listUsers);
  router.post('/toggle-user-lock', checkAdmin, controller.toggleUserLock);
  router.get('/audit-logs', checkAdmin, controller.getAuditLogs);

  return router;
}

