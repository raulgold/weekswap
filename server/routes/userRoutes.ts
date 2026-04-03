import { Router } from 'express';
import { createUserController } from '../controllers/userController.js';

export function createUserRouter(db: FirebaseFirestore.Firestore, checkRiskLocked: any) {
  const router = Router();
  const controller = createUserController(db);

  router.get('/user/:userId', checkRiskLocked, controller.getProfile);

  return router;
}

