import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { isValidRitEmail, signToken, AuthUser } from '../middleware/auth.js';
import { User, CustomerProfile } from '../types/index.js';

export class AuthService {
  private db = getDb();

  public requestOtp(email: string): { success: boolean; message: string; previewCode?: string } {
    const cleanEmail = email.trim().toLowerCase();

    // Check institutional email requirement
    if (!isValidRitEmail(cleanEmail)) {
      throw new Error('INVALID_DOMAIN: Only @rit.ac.in institutional email addresses are allowed.');
    }

    // Generate 6-digit numeric OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 minutes

    this.db.prepare(`
      INSERT INTO otps (email, code, attempts, expires_at)
      VALUES (?, ?, 0, ?)
      ON CONFLICT(email) DO UPDATE SET
        code = excluded.code,
        attempts = 0,
        expires_at = excluded.expires_at,
        created_at = CURRENT_TIMESTAMP
    `).run(cleanEmail, code, expiresAt);

    // In a real production deployment, this emails the user.
    // For local dev/testing, we return the previewCode if not in strict production mode.
    const isDev = process.env.NODE_ENV !== 'production';
    console.log(`[OTP] Dispatching OTP for ${cleanEmail}: ${code}`);

    return {
      success: true,
      message: 'Verification code sent to your RIT email address.',
      previewCode: isDev ? code : undefined
    };
  }

  public verifyOtp(email: string, code: string): { token: string; user: User & { profile?: CustomerProfile } } {
    const cleanEmail = email.trim().toLowerCase();

    const otpRecord = this.db.prepare('SELECT * FROM otps WHERE email = ?').get(cleanEmail) as {
      code: string;
      attempts: number;
      expires_at: string;
    } | undefined;

    if (!otpRecord) {
      throw new Error('OTP_NOT_FOUND: Please request a new verification code.');
    }

    if (new Date() > new Date(otpRecord.expires_at)) {
      this.db.prepare('DELETE FROM otps WHERE email = ?').run(cleanEmail);
      throw new Error('OTP_EXPIRED: The verification code has expired. Please request a new one.');
    }

    if (otpRecord.attempts >= 5) {
      this.db.prepare('DELETE FROM otps WHERE email = ?').run(cleanEmail);
      throw new Error('TOO_MANY_ATTEMPTS: Too many incorrect attempts. Please request a new code.');
    }

    if (otpRecord.code !== code.trim()) {
      this.db.prepare('UPDATE otps SET attempts = attempts + 1 WHERE email = ?').run(cleanEmail);
      throw new Error('INVALID_OTP: The entered verification code is incorrect.');
    }

    // Validated: delete OTP
    this.db.prepare('DELETE FROM otps WHERE email = ?').run(cleanEmail);

    // Fetch or create User
    let userRecord = this.db.prepare('SELECT * FROM users WHERE email = ?').get(cleanEmail) as any;
    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@rit.ac.in').toLowerCase();
    const isAdmin = cleanEmail === adminEmail;

    if (!userRecord) {
      const newUserId = 'usr_' + crypto.randomUUID().slice(0, 12);
      const role = isAdmin ? 'ADMIN' : 'CUSTOMER';
      this.db.prepare(`
        INSERT INTO users (id, email, role, is_active)
        VALUES (?, ?, ?, 1)
      `).run(newUserId, cleanEmail, role);

      userRecord = this.db.prepare('SELECT * FROM users WHERE id = ?').get(newUserId);
    }

    // Fetch profile
    let profileRecord = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(userRecord.id) as any;

    const authPayload: AuthUser = {
      id: userRecord.id,
      email: userRecord.email,
      role: userRecord.role,
      fullName: profileRecord?.full_name,
      roomNumber: profileRecord?.room_number
    };

    const token = signToken(authPayload);

    return {
      token,
      user: {
        id: userRecord.id,
        email: userRecord.email,
        role: userRecord.role,
        isActive: Boolean(userRecord.is_active),
        createdAt: userRecord.created_at,
        updatedAt: userRecord.updated_at,
        profile: profileRecord ? {
          userId: profileRecord.user_id,
          fullName: profileRecord.full_name,
          roomNumber: profileRecord.room_number,
          phoneNumber: profileRecord.phone_number,
          creditStatus: profileRecord.credit_status,
          unpaidOrdersCount: profileRecord.unpaid_orders_count,
          outstandingBalancePaise: profileRecord.outstanding_balance_paise,
          createdAt: profileRecord.created_at,
          updatedAt: profileRecord.updated_at
        } : undefined
      }
    };
  }

  public updateProfile(userId: string, data: { fullName: string; roomNumber: string; phoneNumber: string }): CustomerProfile {
    const existing = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(userId) as any;

    if (existing) {
      this.db.prepare(`
        UPDATE customer_profiles
        SET full_name = ?, room_number = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(data.fullName.trim(), data.roomNumber.trim(), data.phoneNumber.trim(), userId);
    } else {
      this.db.prepare(`
        INSERT INTO customer_profiles (user_id, full_name, room_number, phone_number)
        VALUES (?, ?, ?, ?)
      `).run(userId, data.fullName.trim(), data.roomNumber.trim(), data.phoneNumber.trim());
    }

    const updated = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(userId) as any;
    return {
      userId: updated.user_id,
      fullName: updated.full_name,
      roomNumber: updated.room_number,
      phoneNumber: updated.phone_number,
      creditStatus: updated.credit_status,
      unpaidOrdersCount: updated.unpaid_orders_count,
      outstandingBalancePaise: updated.outstanding_balance_paise,
      createdAt: updated.created_at,
      updatedAt: updated.updated_at
    };
  }

  public getProfile(userId: string): CustomerProfile | null {
    const profile = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(userId) as any;
    if (!profile) return null;
    return {
      userId: profile.user_id,
      fullName: profile.full_name,
      roomNumber: profile.room_number,
      phoneNumber: profile.phone_number,
      creditStatus: profile.credit_status,
      unpaidOrdersCount: profile.unpaid_orders_count,
      outstandingBalancePaise: profile.outstanding_balance_paise,
      createdAt: profile.created_at,
      updatedAt: profile.updated_at
    };
  }
}
