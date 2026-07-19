import { Request, Response } from 'express';
import { VerificationService } from '../services/VerificationService';
import { VerificationType } from '../entities/GuestVerification';
import multer from 'multer';
import path from 'path';

const upload = multer({ dest: 'uploads/' });

export class VerificationController {
  private service: VerificationService;

  constructor() {
    this.service = new VerificationService();
  }

  initiateVerification = async (req: Request, res: Response) => {
    try {
      const { guestId, verificationType, identityNumber } = req.body;

      const verification = await this.service.initiateVerification(
        guestId,
        verificationType as VerificationType,
        identityNumber
      );

      res.status(201).json({ success: true, data: verification });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  verifyNIN = async (req: Request, res: Response) => {
    try {
      const { verificationId, nin, firstName, lastName, dateOfBirth } = req.body;

      await this.service.verifyNIN(verificationId, nin, firstName, lastName, dateOfBirth);

      res.json({ success: true, message: 'NIN verification initiated' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  verifyBVN = async (req: Request, res: Response) => {
    try {
      const { verificationId, bvn, phoneNumber } = req.body;

      await this.service.verifyBVN(verificationId, bvn, phoneNumber);

      res.json({ success: true, message: 'BVN verification initiated' });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  uploadDocuments = async (req: Request, res: Response) => {
    try {
      const { verificationId } = req.body;
      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      const documentPath = files.document?.[0]?.path;
      const selfiePath = files.selfie?.[0]?.path;

      if (!documentPath || !selfiePath) {
        return res.status(400).json({ success: false, message: 'Both document and selfie required' });
      }

      const similarity = await this.service.performFaceMatch(
        verificationId,
        documentPath,
        selfiePath
      );

      res.json({
        success: true,
        data: { faceMatchScore: similarity },
        message: similarity >= 75 ? 'Face match successful' : 'Face match failed',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };

  getVerificationStatus = async (req: Request, res: Response) => {
    try {
      const { guestId } = req.params;

      const verification = await this.service.getVerificationStatus(guestId);

      if (!verification) {
        return res.status(404).json({ success: false, message: 'No verification found' });
      }

      res.json({ success: true, data: verification });
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message });
    }
  };
}

export const verificationController = new VerificationController();
export const uploadMiddleware = upload.fields([
  { name: 'document', maxCount: 1 },
  { name: 'selfie', maxCount: 1 },
]);
