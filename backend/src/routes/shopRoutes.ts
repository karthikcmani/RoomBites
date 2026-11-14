import { Router, Request, Response } from 'express';
import { ShopService } from '../services/shopService.js';
import { AnalyticsService } from '../services/analyticsService.js';
import { PresenceService } from '../services/presenceService.js';
import { requireAuth, requireAdmin } from '../middleware/auth.js';

const router = Router();
const shopService = new ShopService();
const analyticsService = new AnalyticsService();
const presenceService = new PresenceService();

// Public: Get Shop Settings
router.get('/settings', (_req: Request, res: Response) => {
  try {
    const settings = shopService.getSettings();
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Update Shop Settings
router.patch('/settings', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const settings = shopService.updateSettings(req.body);
    res.json({ success: true, settings });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Public: Get Active Announcements
router.get('/announcements', (_req: Request, res: Response) => {
  try {
    const announcements = shopService.getAnnouncements();
    res.json({ success: true, announcements });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Post Announcement
router.post('/announcements', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    const { title, message, badgeType, expiresAt } = req.body;
    if (!title || !message) {
      return res.status(400).json({ success: false, error: 'Title and message are required.' });
    }
    const announcement = shopService.createAnnouncement({ title, message, badgeType, expiresAt });
    res.status(201).json({ success: true, announcement });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Delete Announcement
router.delete('/announcements/:id', requireAuth, requireAdmin, (req: Request, res: Response) => {
  try {
    shopService.deleteAnnouncement(req.params.id);
    res.json({ success: true, message: 'Announcement removed.' });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Admin: Get Real-Time Dashboard Analytics
router.get('/admin/analytics', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  try {
    const metrics = analyticsService.getDashboardMetrics();
    res.json({ success: true, metrics });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// Admin: Get Live Online Customer Presence
router.get('/admin/presence', requireAuth, requireAdmin, (_req: Request, res: Response) => {
  try {
    const online = presenceService.getOnlineCustomers();
    res.json({ success: true, presence: online });
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

export default router;
