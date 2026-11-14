import { Router, Request, Response } from 'express';
import { PaymentService } from '../services/paymentService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const paymentService = new PaymentService();

// Customer: Request Credit Privileges
router.post('/credit/request', requireAuth, (req: Request, res: Response) => {
  try {
    const profile = paymentService.requestCredit(req.user!.id);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Customer: Get My Credit Ledger
router.get('/credit/ledger', requireAuth, (req: Request, res: Response) => {
  try {
    const ledger = paymentService.getCreditLedger(req.user!.id);
    res.json({ success: true, ledger });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Verify Cash / UPI Payment
router.post('/admin/verify', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { orderId, paymentMethod, transactionRef, amountPaise } = req.body;
    if (!orderId || !paymentMethod || amountPaise === undefined) {
      return res.status(400).json({ success: false, error: 'Order ID, payment method, and amount are required.' });
    }
    const payment = paymentService.verifyPayment(req.user!.id, {
      orderId,
      paymentMethod,
      transactionRef,
      amountPaise: Number(amountPaise)
    });
    res.json({ success: true, payment });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Set Customer Credit Status (APPROVED, REVOKED, DISABLED)
router.post('/admin/credit/:userId/status', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { status } = req.body;
    if (!status || !['APPROVED', 'REVOKED', 'DISABLED'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Valid status (APPROVED, REVOKED, DISABLED) is required.' });
    }
    const profile = paymentService.adminSetCreditStatus(req.user!.id, req.params.userId, status);
    res.json({ success: true, profile });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Settle Customer Balance
router.post('/admin/credit/:userId/settle', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { amountPaise, description } = req.body;
    if (!amountPaise || Number(amountPaise) <= 0) {
      return res.status(400).json({ success: false, error: 'Valid amount is required.' });
    }
    const result = paymentService.adminSettleDues(req.user!.id, {
      customerId: req.params.userId,
      amountPaise: Number(amountPaise),
      description: description || 'Cash Payment Settled'
    });
    res.json({ success: true, ...result });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Get Customer Credit Ledger
router.get('/admin/credit/:userId/ledger', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const ledger = paymentService.getCreditLedger(req.params.userId);
    res.json({ success: true, ledger });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Get All Customer Roster
router.get('/admin/customers', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  try {
    const customers = paymentService.getAllCustomersAdmin();
    res.json({ success: true, customers });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
