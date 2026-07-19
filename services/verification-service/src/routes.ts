import { Router } from 'express';
import { verificationController, uploadMiddleware } from './controllers/VerificationController';

const router = Router();

router.post('/verifications', verificationController.initiateVerification);
router.post('/verifications/nin', verificationController.verifyNIN);
router.post('/verifications/bvn', verificationController.verifyBVN);
router.post('/verifications/documents', uploadMiddleware, verificationController.uploadDocuments);
router.get('/verifications/guest/:guestId', verificationController.getVerificationStatus);

export default router;
