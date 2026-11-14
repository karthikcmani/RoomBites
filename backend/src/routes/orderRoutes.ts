import { Router, Request, Response } from 'express';
import { OrderService } from '../services/orderService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const orderService = new OrderService();

// Customer: Place Order
router.post('/', requireAuth, (req: Request, res: Response) => {
  try {
    const { deliveryRoom, specialInstructions, paymentMethod, isScheduled, scheduledFor, items } = req.body;
    if (!paymentMethod || !items) {
      return res.status(400).json({ success: false, error: 'Payment method and cart items are required.' });
    }
    const order = orderService.createOrder(req.user!.id, {
      deliveryRoom,
      specialInstructions,
      paymentMethod,
      isScheduled: Boolean(isScheduled),
      scheduledFor,
      items
    });
    res.status(201).json({ success: true, order });
  } catch (err: any) {
    const status = err.message.startsWith('CREDIT_') ? 403 : 400;
    res.status(status).json({ success: false, error: err.message });
  }
});

// Customer: Get My Orders
router.get('/my-orders', requireAuth, (req: Request, res: Response) => {
  try {
    const orders = orderService.getOrdersForCustomer(req.user!.id);
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer / Admin: Get Order By ID
router.get('/:id', requireAuth, (req: Request, res: Response) => {
  try {
    const order = orderService.getOrderById(req.params.id);
    if (!order) return res.status(404).json({ success: false, error: 'Order not found.' });

    // Customer can only view their own order
    if (req.user!.role !== 'ADMIN' && order.customerId !== req.user!.id) {
      return res.status(403).json({ success: false, error: 'Access denied.' });
    }

    res.json({ success: true, order });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Customer: Cancel Order
router.post('/:id/cancel', requireAuth, (req: Request, res: Response) => {
  try {
    const { reason } = req.body;
    const order = orderService.customerCancelOrder(req.params.id, req.user!.id, reason);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Customer: Respond to Alternative Suggestion
router.post('/:id/respond-alternative', requireAuth, (req: Request, res: Response) => {
  try {
    const { action } = req.body;
    if (action !== 'ACCEPT' && action !== 'REJECT') {
      return res.status(400).json({ success: false, error: 'Action must be ACCEPT or REJECT.' });
    }
    const order = orderService.customerRespondAlternative(req.params.id, req.user!.id, action);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Get all orders
router.get('/admin/feed', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const filter = req.query.filter as string | undefined;
    const orders = orderService.getOrdersAdmin(filter);
    res.json({ success: true, orders });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Update Order Status
router.patch('/admin/:id/status', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { status, rejectionReason } = req.body;
    if (!status) return res.status(400).json({ success: false, error: 'Status is required.' });
    const order = orderService.adminUpdateStatus(req.params.id, status, rejectionReason);
    res.json({ success: true, order });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Suggest Alternative Product
router.post('/admin/:id/suggest-alternative', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { originalProductId, suggestedProductId, note } = req.body;
    if (!originalProductId || !suggestedProductId) {
      return res.status(400).json({ success: false, error: 'Original and suggested product IDs are required.' });
    }
    const alt = orderService.adminSuggestAlternative(req.params.id, {
      originalProductId,
      suggestedProductId,
      note
    });
    res.json({ success: true, alternative: alt });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

export default router;
