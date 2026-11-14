import nodemailer, { Transporter } from 'nodemailer';

export interface EmailOptions {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export class EmailService {
  private static instance: EmailService;
  private transporter: Transporter | null = null;
  private isConfigured = false;
  private lastSentEmailForTesting: { to: string; subject: string; text: string; code: string } | null = null;

  private constructor() {
    this.initTransporter();
  }

  public static getInstance(): EmailService {
    if (!EmailService.instance) {
      EmailService.instance = new EmailService();
    }
    return EmailService.instance;
  }

  private initTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587', 10);
    const secure = process.env.SMTP_SECURE === 'true' || port === 465;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: {
          user,
          pass,
        },
      });
      this.isConfigured = true;
    } else if (process.env.NODE_ENV === 'test' || process.env.EMAIL_DRIVER === 'memory') {
      // Stream / JSON test transporter for automated CI/test environments
      this.transporter = nodemailer.createTransport({
        streamTransport: true,
        newline: 'unix',
        buffer: true,
      });
      this.isConfigured = true;
    } else {
      this.isConfigured = false;
    }
  }

  public isEmailConfigured(): boolean {
    return this.isConfigured;
  }

  public getLastSentForTesting() {
    return this.lastSentEmailForTesting;
  }

  public clearLastSentForTesting() {
    this.lastSentEmailForTesting = null;
  }

  public async sendOtpEmail(email: string, code: string): Promise<{ success: boolean; messageId?: string }> {
    const from = process.env.SMTP_FROM || '"RoomBites RIT" <noreply@rit.ac.in>';
    const isProduction = process.env.NODE_ENV === 'production';

    // Store for test verification
    this.lastSentEmailForTesting = {
      to: email,
      subject: 'Your RoomBites Verification Code',
      text: `Your RoomBites verification code is: ${code}. Valid for 10 minutes.`,
      code,
    };

    if (!this.isConfigured) {
      if (isProduction) {
        throw new Error('EMAIL_SERVICE_UNAVAILABLE: Real transactional email provider (SMTP) is not configured in production.');
      }
      // In local dev without SMTP configured, we note the missing provider
      console.warn(`[EmailService] SMTP not configured. OTP generated for ${email}. Configure SMTP_HOST/SMTP_USER in .env for inbox delivery.`);
      return { success: true };
    }

    const html = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #0f172a; color: #f8fafc; padding: 20px; }
            .container { max-width: 480px; margin: 0 auto; background-color: #1e293b; border-radius: 16px; padding: 32px; border: 1px solid #334155; }
            .header { text-align: center; margin-bottom: 24px; }
            .logo { color: #f59e0b; font-size: 24px; font-weight: 800; }
            .badge { display: inline-block; padding: 4px 10px; background-color: rgba(245, 158, 11, 0.15); color: #fbbf24; border-radius: 9999px; font-size: 11px; font-weight: 700; margin-top: 6px; }
            .code-box { background-color: #0f172a; border: 2px dashed #f59e0b; border-radius: 12px; padding: 20px; text-align: center; margin: 28px 0; }
            .code { font-size: 36px; font-weight: 900; letter-spacing: 6px; color: #fbbf24; font-family: monospace; }
            .text { font-size: 14px; line-height: 1.6; color: #cbd5e1; }
            .footer { font-size: 11px; color: #64748b; text-align: center; margin-top: 24px; border-top: 1px solid #334155; padding-top: 16px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="logo">RoomBites</div>
              <div class="badge">RIT Midnight Mess Verification</div>
            </div>
            <p class="text">Hello,</p>
            <p class="text">Use the single-use verification code below to sign in to RoomBites. This code will expire in <strong>10 minutes</strong>.</p>
            <div class="code-box">
              <div class="code">${code}</div>
            </div>
            <p class="text" style="font-size: 12px; color: #94a3b8;">
              If you did not request this login code, you can safely ignore this email. Never forward or share this code with anyone.
            </p>
            <div class="footer">
              RoomBites — Built by students, for students • Rajiv Gandhi Institute of Technology (RIT), Kottayam
            </div>
          </div>
        </body>
      </html>
    `;

    const text = `RoomBites Verification Code: ${code}\n\nValid for 10 minutes. Do not share this code with anyone.\n\nBuilt by students, for students • RIT Kottayam`;

    if (!this.transporter) {
      return { success: true };
    }

    const info = await this.transporter.sendMail({
      from,
      to: email,
      subject: `${code} is your RoomBites verification code`,
      text,
      html,
    });

    return {
      success: true,
      messageId: info.messageId,
    };
  }
}
