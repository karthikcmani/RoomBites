import { getDb } from '../db/index.js';
import { CustomerPresence } from '../types/index.js';

export class PresenceService {
  private db = getDb();
  private guestPresence = new Map<string, { activity: string; currentPage?: string; lastHeartbeat: string }>();

  public updatePresence(userId: string, activity: string, currentPage?: string): void {
    if (userId.startsWith('guest_')) {
      this.guestPresence.set(userId, {
        activity,
        currentPage,
        lastHeartbeat: new Date().toISOString()
      });
      return;
    }

    try {
      const existing = this.db.prepare('SELECT user_id FROM customer_presence WHERE user_id = ?').get(userId);

      if (existing) {
        this.db.prepare(`
          UPDATE customer_presence
          SET is_online = 1, activity = ?, current_page = ?, last_heartbeat = CURRENT_TIMESTAMP
          WHERE user_id = ?
        `).run(activity, currentPage || null, userId);
      } else {
        this.db.prepare(`
          INSERT INTO customer_presence (user_id, is_online, activity, current_page, last_heartbeat)
          VALUES (?, 1, ?, ?, CURRENT_TIMESTAMP)
        `).run(userId, activity, currentPage || null);
      }
    } catch (err) {
      console.error('[Presence] Error updating presence for user', userId, err);
    }
  }

  public setOffline(userId: string): void {
    if (userId.startsWith('guest_')) {
      this.guestPresence.delete(userId);
      return;
    }

    try {
      this.db.prepare(`
        UPDATE customer_presence
        SET is_online = 0, disconnected_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(userId);
    } catch (err) {
      console.error('[Presence] Error setting offline for user', userId, err);
    }
  }

  public getOnlineCustomers(): CustomerPresence[] {
    const rows = this.db.prepare(`
      SELECT p.*, cp.full_name, cp.room_number, u.role
      FROM customer_presence p
      LEFT JOIN customer_profiles cp ON p.user_id = cp.user_id
      LEFT JOIN users u ON p.user_id = u.id
      WHERE p.is_online = 1
      ORDER BY p.last_heartbeat DESC
    `).all() as any[];

    const result: CustomerPresence[] = rows.map(r => {
      let isoDate = new Date().toISOString();
      if (r.last_heartbeat) {
        const raw = String(r.last_heartbeat);
        const parsed = new Date(raw.includes('T') ? raw : raw.replace(' ', 'T') + 'Z');
        if (!isNaN(parsed.getTime())) {
          isoDate = parsed.toISOString();
        }
      }
      return {
        userId: r.user_id,
        name: r.full_name || (r.role === 'ADMIN' ? 'RoomBites Admin' : 'Student'),
        roomNumber: r.room_number || (r.role === 'ADMIN' ? 'Admin Room 101' : 'Room ?'),
        isOnline: Boolean(r.is_online),
        isGuest: false,
        activity: r.activity || 'online',
        currentPage: r.current_page || undefined,
        lastHeartbeat: isoDate,
        disconnectedAt: r.disconnected_at || undefined
      };
    });

    // Add active guest visitors
    for (const [guestId, g] of this.guestPresence.entries()) {
      result.push({
        userId: guestId,
        name: 'Guest Visitor',
        roomNumber: 'Browsing App (Unauthenticated)',
        isOnline: true,
        isGuest: true,
        activity: g.activity || 'browsing_menu',
        currentPage: g.currentPage,
        lastHeartbeat: g.lastHeartbeat
      });
    }

    return result;
  }
}
