import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { ShopSetting, ShopStatus, Announcement } from '../types/index.js';
import { WebSocketBroker } from '../websocket/server.js';

export class ShopService {
  private db = getDb();

  public getSettings(): ShopSetting {
    const row = this.db.prepare('SELECT s.*, sel.emergency_contact FROM shop_settings s LEFT JOIN sellers sel ON s.seller_id = sel.id WHERE s.seller_id = ?').get('seller_primary') as any;

    if (!row) {
      return {
        id: 'setting_primary',
        sellerId: 'seller_primary',
        status: 'AVAILABLE',
        statusNote: 'Night Mess is open for orders.',
        openingTimeIST: '21:00',
        closingTimeIST: '05:00',
        autoScheduleEnabled: true,
        emergencyContact: '+919876543210',
        updatedAt: new Date().toISOString()
      };
    }

    return {
      id: row.id,
      sellerId: row.seller_id,
      status: row.status as ShopStatus,
      statusNote: row.status_note || undefined,
      openingTimeIST: row.opening_time_ist,
      closingTimeIST: row.closing_time_ist,
      autoScheduleEnabled: Boolean(row.auto_schedule_enabled),
      emergencyContact: row.emergency_contact || undefined,
      updatedAt: row.updated_at
    };
  }

  public updateSettings(data: {
    status?: ShopStatus;
    statusNote?: string;
    openingTimeIST?: string;
    closingTimeIST?: string;
    autoScheduleEnabled?: boolean;
    emergencyContact?: string;
  }): ShopSetting {
    const current = this.getSettings();
    const status = data.status || current.status;
    const note = data.statusNote !== undefined ? data.statusNote : current.statusNote;
    const openTime = data.openingTimeIST || current.openingTimeIST;
    const closeTime = data.closingTimeIST || current.closingTimeIST;
    const autoSchedule = data.autoScheduleEnabled !== undefined ? (data.autoScheduleEnabled ? 1 : 0) : (current.autoScheduleEnabled ? 1 : 0);

    this.db.prepare(`
      UPDATE shop_settings
      SET status = ?, status_note = ?, opening_time_ist = ?, closing_time_ist = ?,
          auto_schedule_enabled = ?, updated_at = CURRENT_TIMESTAMP
      WHERE seller_id = 'seller_primary'
    `).run(status, note || null, openTime, closeTime, autoSchedule);

    if (data.emergencyContact !== undefined) {
      this.db.prepare(`
        UPDATE sellers
        SET emergency_contact = ?
        WHERE id = 'seller_primary'
      `).run(data.emergencyContact.trim());
    }

    const updated = this.getSettings();

    // Broadcast status change to all connected clients
    WebSocketBroker.getInstance().broadcastAll({
      type: 'SHOP_STATUS_CHANGED',
      payload: {
        status: updated.status,
        statusNote: updated.statusNote,
        emergencyContact: updated.emergencyContact
      }
    });

    return updated;
  }

  public getAnnouncements(): Announcement[] {
    const rows = this.db.prepare(`
      SELECT * FROM announcements WHERE is_active = 1 ORDER BY created_at DESC
    `).all() as any[];

    return rows.map(r => ({
      id: r.id,
      sellerId: r.seller_id,
      title: r.title,
      message: r.message,
      badgeType: r.badge_type,
      isActive: Boolean(r.is_active),
      expiresAt: r.expires_at || undefined,
      createdAt: r.created_at
    }));
  }

  public createAnnouncement(data: {
    title: string;
    message: string;
    badgeType?: 'INFO' | 'ALERT' | 'SPECIAL';
    expiresAt?: string;
  }): Announcement {
    const id = 'ann_' + crypto.randomUUID().slice(0, 10);
    this.db.prepare(`
      INSERT INTO announcements (id, seller_id, title, message, badge_type, is_active, expires_at)
      VALUES (?, 'seller_primary', ?, ?, ?, 1, ?)
    `).run(id, data.title.trim(), data.message.trim(), data.badgeType || 'INFO', data.expiresAt || null);

    const ann: Announcement = {
      id,
      sellerId: 'seller_primary',
      title: data.title.trim(),
      message: data.message.trim(),
      badgeType: data.badgeType || 'INFO',
      isActive: true,
      expiresAt: data.expiresAt,
      createdAt: new Date().toISOString()
    };

    WebSocketBroker.getInstance().broadcastAll({
      type: 'NEW_ANNOUNCEMENT',
      payload: ann
    });

    return ann;
  }

  public deleteAnnouncement(id: string): void {
    this.db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
  }
}
