import crypto from 'node:crypto';
import { getDb } from '../db/index.js';
import { isValidRitEmail, signToken, AuthUser, getOtpPepper } from '../middleware/auth.js';
import { User, CustomerProfile } from '../types/index.js';
import { EmailService } from './emailService.js';

export class AuthService {
  private db = getDb();
  private emailService = EmailService.getInstance();

  /**
   * Cryptographically secure 6-digit numeric OTP generator using Node.js CSPRNG.
   * crypto.randomInt(100000, 1000000) produces uniform integers in [100000, 999999],
   * eliminating modulo bias and guaranteeing a 6-digit string without leading zero truncation.
   */
  public generateSecureOtp(): string {
    return crypto.randomInt(100000, 1000000).toString();
  }

  /**
   * Computes an HMAC-SHA256 digest keyed with the server-side pepper and contextually
   * bound to the user's normalized institutional email.
   *
   * Security Benefits:
   * 1. Secret Key Separation: The pepper is stored strictly in server memory/environment,
   *    never in the database. A database dump or SQL injection leak cannot brute-force
   *    the 6-digit OTP offline without the server-side secret key.
   * 2. Contextual Binding: The hash is cryptographically bound to the recipient's email,
   *    preventing cross-account hash transposition.
   */
  public hashOtp(email: string, code: string): string {
    const pepper = getOtpPepper();
    return crypto
      .createHmac('sha256', pepper)
      .update(`${email.trim().toLowerCase()}:${code.trim()}`)
      .digest('hex');
  }

  private maskEmail(email: string): string {
    const [user, domain] = email.split('@');
    if (!user || !domain) return '***@***';
    const visible = user.length > 2 ? `${user[0]}***${user[user.length - 1]}` : `${user[0]}***`;
    return `${visible}@${domain}`;
  }

  public async requestOtp(email: string): Promise<{ success: boolean; message: string }> {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Institutional email verification
    if (!isValidRitEmail(cleanEmail)) {
      throw new Error('INVALID_DOMAIN: Only @rit.ac.in institutional email addresses are allowed.');
    }

    // 2. Request Rate Limiting & Cooldown Checks
    const existing = this.db.prepare('SELECT * FROM otps WHERE email = ?').get(cleanEmail) as any;
    const now = Date.now();

    if (existing) {
      const lastRequested = new Date(existing.last_requested_at || existing.created_at).getTime();
      const diffSeconds = (now - lastRequested) / 1000;

      // Rule: 60-second cooldown between consecutive requests
      if (diffSeconds < 60) {
        const remaining = Math.ceil(60 - diffSeconds);
        throw new Error(`RATE_LIMITED: Please wait ${remaining} seconds before requesting a new verification code.`);
      }

      // Rule: Maximum 5 requests in a 15-minute rolling window
      const windowStart = new Date(existing.created_at).getTime();
      const windowDiffMinutes = (now - windowStart) / (1000 * 60);

      if (windowDiffMinutes < 15 && existing.request_count >= 5) {
        throw new Error('RATE_LIMITED_EXCEEDED: Maximum OTP request limit reached. Please wait 15 minutes before requesting again.');
      }
    }

    // 3. Generate 6-digit cryptographic numeric OTP using CSPRNG
    const code = this.generateSecureOtp();
    const codeHash = this.hashOtp(cleanEmail, code);
    const expiresAt = new Date(now + 10 * 60 * 1000).toISOString(); // 10 minutes

    // 4. Update / Insert Rate-Limited OTP Record with HMAC-SHA256 Hash
    const nowIso = new Date(now).toISOString();

    if (existing) {
      const windowStart = new Date(existing.created_at).getTime();
      const isWindowExpired = (now - windowStart) > (15 * 60 * 1000);
      const newCount = isWindowExpired ? 1 : (existing.request_count || 1) + 1;
      const newCreatedAt = isWindowExpired ? nowIso : existing.created_at;

      this.db.prepare(`
        UPDATE otps
        SET code_hash = ?, attempts = 0, last_requested_at = ?,
            request_count = ?, expires_at = ?, created_at = ?
        WHERE email = ?
      `).run(codeHash, nowIso, newCount, expiresAt, newCreatedAt, cleanEmail);
    } else {
      this.db.prepare(`
        INSERT INTO otps (email, code_hash, attempts, last_requested_at, request_count, expires_at, created_at)
        VALUES (?, ?, 0, ?, 1, ?, ?)
      `).run(cleanEmail, codeHash, nowIso, expiresAt, nowIso);
    }

    // 5. Send Real Email via Transactional Email Provider
    // Note: NEVER log plaintext OTP to console in production
    if (process.env.NODE_ENV !== 'production' && process.env.NODE_ENV !== 'test') {
      console.log(`[Auth] OTP dispatched to ${this.maskEmail(cleanEmail)}`);
    }

    await this.emailService.sendOtpEmail(cleanEmail, code);

    // 6. Return uniform response without leaking OTP code or user status
    return {
      success: true,
      message: 'If this is a valid institutional address, a verification code has been dispatched to your institutional inbox.'
    };
  }

  public verifyOtp(email: string, code: string): { token: string; user: User & { profile?: CustomerProfile } } {
    const cleanEmail = email.trim().toLowerCase();

    const otpRecord = this.db.prepare('SELECT * FROM otps WHERE email = ?').get(cleanEmail) as any;

    if (!otpRecord) {
      throw new Error('OTP_NOT_FOUND: Please request a new verification code.');
    }

    // Check expiration (10 minutes)
    if (new Date() > new Date(otpRecord.expires_at)) {
      this.db.prepare('DELETE FROM otps WHERE email = ?').run(cleanEmail);
      throw new Error('OTP_EXPIRED: The verification code has expired. Please request a new one.');
    }

    // Check attempt limits (max 5)
    if (otpRecord.attempts >= 5) {
      this.db.prepare('DELETE FROM otps WHERE email = ?').run(cleanEmail);
      throw new Error('TOO_MANY_ATTEMPTS: Maximum verification attempts exceeded. Please request a new code.');
    }

    // Constant-time hash verification against timing attacks using HMAC-SHA256
    const inputHash = this.hashOtp(cleanEmail, code);
    const storedHash = otpRecord.code_hash || '';

    const inputBuffer = Buffer.from(inputHash, 'utf8');
    const storedBuffer = Buffer.from(storedHash, 'utf8');

    let isValid = false;
    if (inputBuffer.length === storedBuffer.length) {
      isValid = crypto.timingSafeEqual(inputBuffer, storedBuffer);
    } else {
      // Constant-time dummy comparison to prevent timing leakage on length mismatch
      crypto.timingSafeEqual(inputBuffer, inputBuffer);
      isValid = false;
    }

    if (!isValid) {
      const newAttempts = otpRecord.attempts + 1;
      if (newAttempts >= 5) {
        this.db.prepare('DELETE FROM otps WHERE email = ?').run(cleanEmail);
        throw new Error('TOO_MANY_ATTEMPTS: Maximum verification attempts exceeded. Please request a new code.');
      } else {
        this.db.prepare('UPDATE otps SET attempts = ? WHERE email = ?').run(newAttempts, cleanEmail);
      }
      throw new Error('INVALID_OTP: The entered verification code is incorrect.');
    }

    // Successfully verified: immediately delete OTP
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
    // Security check: Only sanitize and accept fullName, roomNumber, phoneNumber.
    // Ignored: any 'role', 'creditStatus', 'unpaidOrdersCount', 'isAdmin' injected by malicious clients.
    const fullName = String(data.fullName || '').trim();
    const roomNumber = String(data.roomNumber || '').trim();
    const phoneNumber = String(data.phoneNumber || '').trim();

    if (!fullName || !roomNumber || !phoneNumber) {
      throw new Error('INVALID_INPUT: Full name, room number, and phone number are required.');
    }

    const existing = this.db.prepare('SELECT * FROM customer_profiles WHERE user_id = ?').get(userId) as any;

    if (existing) {
      this.db.prepare(`
        UPDATE customer_profiles
        SET full_name = ?, room_number = ?, phone_number = ?, updated_at = CURRENT_TIMESTAMP
        WHERE user_id = ?
      `).run(fullName, roomNumber, phoneNumber, userId);
    } else {
      this.db.prepare(`
        INSERT INTO customer_profiles (user_id, full_name, room_number, phone_number)
        VALUES (?, ?, ?, ?)
      `).run(userId, fullName, roomNumber, phoneNumber);
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
