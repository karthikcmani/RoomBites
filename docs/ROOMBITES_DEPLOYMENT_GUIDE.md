# RoomBites — Deployment & Production Operations Guide

- **Version:** 1.0.0
- **Document ID:** DOC-OPS-008

---

## 1. Hosting Topology & Zero-Cost Architecture

RoomBites can be hosted completely free or with negligible operating costs:
- **Frontend SPA / PWA:** Vercel / Cloudflare Pages / Netlify (Zero cost, global CDN, automatic HTTPS).
- **Backend API & WebSocket Server:** Render Free Tier, Fly.io, or Railway (\$0–\$5/month).
- **Database:** Supabase Free Tier (PostgreSQL 500MB, full transaction support, free automated backups).
- **Android APK:** Direct download via GitHub Releases, local USB APK installation, or F-Droid submission.

---

## 2. Environment Variables Configuration

Create a `.env` file in the backend root based on `.env.example`:

```env
# Server Configuration
PORT=4000
NODE_ENV=production
CLIENT_URL=https://roombites.rit.ac.in

# Cryptographic Secrets (Minimum 32 characters in production)
JWT_SECRET=generate_with_openssl_rand_hex_32
OTP_SECRET=generate_with_openssl_rand_hex_32_for_otp_pepper
ADMIN_SECRET_KEY=roombites_admin_master_setup_key

# Transactional Email Provider (SMTP) - Mandatory in Production
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=auth@rit.ac.in
SMTP_PASS=your_email_provider_app_password
SMTP_FROM="RoomBites RIT" <noreply@rit.ac.in>

# Database Connection (PostgreSQL / Supabase)
DATABASE_URL=postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres

# Initial Admin Identity
ADMIN_EMAIL=admin@rit.ac.in
ADMIN_PHONE=+919876543210
ADMIN_ROOM=Hostel-Mess-Room-102
```

---

## 3. Database Migration & Initialization

Run migrations and seed the initial menu catalog:
```bash
cd backend
npm install
npm run migrate
npm run seed
```

---

## 4. Building the Web & PWA Assets

```bash
cd apps/web
npm install
npm run build
```
Static output is generated in `apps/web/dist`, ready for deployment to any static hosting provider.

---

## 5. Building the Android APK (Capacitor)

```bash
cd apps/web
npm run build
npx cap sync android
cd android
./gradlew assembleRelease
```
The compiled, unsigned APK will be at `android/app/build/outputs/apk/release/app-release-unsigned.apk`.

### F-Droid Packaging Notes:
- Zero proprietary Google Play Services libraries are bundled.
- WebViews use the open-source system Chromium WebView.
- Push notifications utilize standard Web Push and open WebSockets.
- Fully compatible with F-Droid build recipes.
