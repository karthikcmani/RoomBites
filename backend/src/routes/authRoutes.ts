import { Router, Request, Response } from 'express';
import { AuthService } from '../services/authService.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();
const authService = new AuthService();

router.post('/request-otp', (req: Request, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, error: 'Email address is required.' });
    }
    const result = authService.requestOtp(email);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.post('/verify-otp', (req: Request, res: Response) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      return res.status(400).json({ success: false, error: 'Email and verification code are required.' });
    }
    const result = authService.verifyOtp(email, code);
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

router.get('/profile', requireAuth, (req: Request, res: Response) => {
  try {
    const profile = authService.getProfile(req.user!.id);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

router.post('/profile', requireAuth, (req: Request, res: Response) => {
  try {
    const { fullName, roomNumber, phoneNumber } = req.body;
    if (!fullName || !roomNumber || !phoneNumber) {
      return res.status(400).json({ success: false, error: 'Full name, hostel room number, and phone number are required.' });
    }
    const profile = authService.updateProfile(req.user!.id, { fullName, roomNumber, phoneNumber });
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
