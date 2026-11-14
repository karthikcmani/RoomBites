import { getDb } from '../db/index.js';
import { CustomerPresence } from '../types/index.js';

export class PresenceService {
  private db = getDb();

  public updatePresence(userId: string, activity: string, currentPage?: string): void {
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
  }

  public setOffline(userId: string): void {
    this.db.prepare(`
      UPDATE customer_presence
      SET is_online = 0, disconnected_at = CURRENT_TIMESTAMP
      WHERE user_id = ?
    `).run(userId);
  }

  public getOnlineCustomers(): CustomerPresence[] {
    // Only customers seen in the last 60 seconds are considered online
    const rows = this.db.prepare(`
      SELECT p.*, cp.full_name, cp.room_number
      FROM customer_presence p
      LEFT JOIN customer_profiles cp ON p.user_id = cp.user_id
      WHERE p.is_online = 1
      ORDER BY p.last_heartbeat DESC
    `).all() as any[];

    return rows.map(r => ({
      userId: r.user_id,
      name: r.full_name || 'Student',
      roomNumber: r.room_number || 'Room ?',
      isOnline: Boolean(r.is_online),
      activity: r.activity || 'idle',
      currentPage: r.current_page || undefined,
      lastHeartbeat: r.last_heartbeat,
      disconnectedAt: r.disconnected_at || undefined
    }));
  }
}
