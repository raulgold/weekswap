import { Router } from 'express';
import { createReviewController } from '../controllers/reviewController.js';

export function createReviewRouter(db: FirebaseFirestore.Firestore) {
  const router = Router();
  const controller = createReviewController(db);

  router.post('/submit-review', controller.submitReview);
  router.get('/reviews/:userId', controller.getReviews);

  return router;
}

