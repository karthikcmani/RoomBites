# RoomBites v1.0.0 — Comprehensive Post-Release Verification & Audit

- **Date of Audit:** 2026-11-15
- **Auditor:** RoomBites Autonomous Engineering Team
- **Target Repository:** https://github.com/karthikcmani/RoomBites
- **Branch:** `main`
- **Audit Commit Baseline:** `251d339`
- **Local Workspace:** `D:\RoomBites`

---

## 1. Executive Summary

This independent post-release audit was conducted to verify the operational integrity, security, and deployment readiness of the RoomBites v1.0.0 release. Rather than relying on previous claims, every module, test suite, build process, and architectural boundary was independently executed and inspected in the active repository.

### Key Audit Findings at a Glance
1. **Repository Synchronization:** Clean working tree, fully synchronized with `origin/main` at commit `251d339`.
2. **Backend Automated Tests:** 15 out of 15 tests executed and passing (100% pass rate in 393ms).
3. **Frontend Production Build:** Vite production build compiles cleanly in 2.95s, yielding a compressed gzip payload of ~75 kB.
4. **Authentication (Email OTP):** The OTP generation, verification, domain quarantine, and rate-limiting are fully implemented; however, **actual email delivery via SMTP or transactional email API is not integrated**. In development mode, the OTP is returned in the API payload and logged to stdout. In production mode, without an external email provider, the code is suppressed, which is a **deployment blocker**.
5. **Role Security:** Role elevation is strictly protected. Ordinary customers cannot self-promote to administrators. The Admin account is seeded via `ADMIN_EMAIL`. However, in development mode, the admin OTP is accessible via the response preview code if requested.
6. **Payment Decoupling:** UPI initiation (opening deep link `upi://pay`) is strictly decoupled from payment verification. Cash and UPI payments require explicit administrative verification (`/api/v1/payments/admin/verify`) before transitioning to `PAID` / `VERIFIED`.
7. **Database Architecture:** The active runtime driver is SQLite (`node:sqlite` DatabaseSync). A shared PostgreSQL driver (`pg`) is not currently active in `backend/src/db/index.ts`. For shared multi-instance production hosting, PostgreSQL integration is required.
8. **Real-time vs Background Push:** WebSocket handles in-app chimes and presence while the application is active. **There is no OS-level background push notification mechanism** (Web Push / FCM / UnifiedPush) when the application is terminated or suspended.
9. **Android APK Compilation:** The Android project wrapper is configured with Capacitor 7. However, Capacitor 7 requires **Java 21**, while the host machine currently has **JDK 17** installed, causing `./gradlew assembleDebug` to fail with `error: invalid source release: 21`.

---

## 2. Verified Functionality

The following features were independently verified by inspecting the codebase and running automated tests:

### 2.1 Institutional Domain Quarantine
- Validates institutional regex `/^[a-zA-Z0-9._%+-]+@rit\.ac\.in$/i`.
- Rejects non-institutional emails (`@gmail.com`, `@yahoo.com`, empty) with `400 INVALID_DOMAIN`.
- Verified in `backend/tests/api.test.ts` (Test `AUTH-01`).

### 2.2 Product Catalog & Integer Currency Arithmetic
- Initial menu seeded across 6 categories (Tea, Coffee, Health Drinks, Snacks, Instant Food, Fruits).
- All monetary values stored and calculated as integers in **Indian Paise** (\(₹1 = 100\text{ paise}\)).
- Normal Tea = `1200` paise (₹12), Bru Coffee = `1500` paise (₹15), Maggi = `3000` paise (₹30).
- Check constraints enforce non-negative prices and quantities.

### 2.3 Order Lifecycle & State Machine
- Strict transitions: `PLACED` → `ACCEPTED` / `REJECTED` / `AWAITING_APPROVAL` → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED`.
- Customer cancellation permitted **only** before admin confirmation (`PLACED` or `AWAITING_APPROVAL`). Once confirmed, customer cancellation is blocked (`CANCELLATION_NOT_ALLOWED`).
- Alternative suggestion workflow: Admin proposes substitute product; order transitions to `AWAITING_APPROVAL`; student accepts or declines; item snapshot and totals update automatically.

### 2.4 The Strict 2-Due Credit Rule (Rule 15)
- Unapproved students cannot order on credit (`CREDIT_NOT_APPROVED`).
- Approved students can place credit orders up to 2 unpaid dues.
- Placing a 4th order when `unpaid_orders_count > 2` is strictly rejected by the backend with `403 CREDIT_LIMIT_EXCEEDED`.
- Partial cash settlement in the admin room decrements the ledger and unblocks credit ordering.

### 2.5 Shop Availability States
- 4 states supported: `AVAILABLE`, `BUSY`, `SLEEPING`, `CLOSED`.
- Instant orders placed while the shop is `SLEEPING` are strictly rejected with `SHOP_SLEEPING` and display the admin emergency phone number.

---

## 3. Test Execution Results

The backend test suite was run via `tsx --test tests/**/*.test.ts`:

```
TAP version 13
# Subtest: RoomBites Comprehensive Backend Test Suite
    # Subtest: 1. Authentication & Institutional Domain Quarantine
        ok 1 - Rejects non-@rit.ac.in email addresses (1.42ms)
        ok 2 - Accepts valid @rit.ac.in institutional email and delivers OTP (1.48ms)
        ok 3 - Verifies OTP, generates valid JWT session, and supports profile creation (3.18ms)
    ok 1 - 1. Authentication & Institutional Domain Quarantine (6.75ms)

    # Subtest: 2. Product Catalog & Menu Integrity
        ok 1 - Seeds initial categories and products correctly (0.68ms)
        ok 2 - Admin can add, update, and toggle product stock status (0.53ms)
    ok 2 - 2. Product Catalog & Menu Integrity (1.37ms)

    # Subtest: 3. Order Lifecycle, Cash & UPI Payments
        ok 1 - Places order with multiple items and validates authoritative server prices (1.29ms)
        ok 2 - Admin transitions order: PLACED -> ACCEPTED -> PREPARING -> OUT_FOR_DELIVERY -> DELIVERED (1.92ms)
        ok 3 - Customer cancellation allowed only before admin acceptance (1.78ms)
        ok 4 - Admin verifies UPI payment settlement (1.09ms)
    ok 3 - 3. Order Lifecycle, Cash & UPI Payments (7.85ms)

    # Subtest: 4. Alternative Product Suggestion Workflow
        ok 1 - Admin suggests substitute product and customer accepts with updated price (2.99ms)
    ok 4 - 4. Alternative Product Suggestion Workflow (3.09ms)

    # Subtest: 5. Strict Credit Ledger & The 2-Due Rule
        ok 1 - Unapproved customer cannot place credit order (0.37ms)
        ok 2 - Admin approves credit, customer can place up to 2 unpaid dues (1.88ms)
        ok 3 - Admin settles partial dues, customer is unblocked when unpaid count <= 2 (0.81ms)
    ok 5 - 5. Strict Credit Ledger & The 2-Due Rule (6.21ms)

    # Subtest: 6. Shop Availability & Analytics
        ok 1 - Admin switches shop to SLEEPING and instant orders are blocked (1.66ms)
        ok 2 - Analytics dashboard aggregates metrics correctly (0.51ms)
    ok 6 - 6. Shop Availability & Analytics (2.26ms)

# tests 15
# suites 7
# pass 15
# fail 0
# duration_ms 393.285
```

---

## 4. Security Findings & Code Inspection

### 4.1 OTP Email Delivery vs Local Mocking
- **Finding:** In `backend/src/services/authService.ts` lines 33–40:
  ```ts
  const isDev = process.env.NODE_ENV !== 'production';
  console.log(`[OTP] Dispatching OTP for ${cleanEmail}: ${code}`);
  return {
    success: true,
    message: 'Verification code sent to your RIT email address.',
    previewCode: isDev ? code : undefined
  };
  ```
- **Severity:** High (Production Blocker).
- **Explanation:** There is no SMTP transport (e.g. Nodemailer, AWS SES, Resend) wired into `authService.ts`. In development, `previewCode` allows testing. In production (`NODE_ENV=production`), `previewCode` is undefined and no email is sent, preventing user login.

### 4.2 Admin Role Elevation & Account Security
- **Finding:** Customer role elevation is securely prevented.
  - The `POST /api/v1/auth/profile` endpoint accepts only `{ fullName, roomNumber, phoneNumber }`. The `role` column in the `users` table is never modified by customer-facing endpoints.
  - The admin account is identified strictly by matching `email === (process.env.ADMIN_EMAIL || 'admin@rit.ac.in').toLowerCase()`.
- **Vulnerability in Dev Mode:** Because `previewCode` is returned in non-production environments, anyone who submits `admin@rit.ac.in` to `/auth/request-otp` receives the valid OTP in the response body, gaining admin privileges in development mode.

### 4.3 Fallback JWT Secret
- **Finding:** In `backend/src/middleware/auth.ts`:
  ```ts
  const JWT_SECRET = process.env.JWT_SECRET || 'roombites_dev_secret_key_change_in_production_32_chars';
  ```
- **Risk:** If the application is started in production without setting `JWT_SECRET`, it defaults to the known dev string. The server should throw an error at startup if `NODE_ENV === 'production'` and `JWT_SECRET` is not set.

### 4.4 Payment Verification Decoupling
- **Finding:** Verified secure.
  - When placing orders with `CASH` or `UPI`, `payment_status` is initialized to `'PENDING'`.
  - The client-side UPI URI (`upi://pay?pa=...`) only launches the external UPI application. It cannot alter the server state.
  - Cash and UPI payments require explicit administrative verification via `POST /api/v1/payments/admin/verify`.
  - Ordinary customers have no access to the `/payments/admin/*` endpoints (`requireAdmin` middleware enforces `403 Forbidden`).

---

## 5. Architecture & Database Inspection (SQLite vs PostgreSQL)

- **Current Implementation:**
  `backend/src/db/index.ts` instantiates Node 22's built-in `node:sqlite` (`DatabaseSync`) targeting `./roombites.db` or `:memory:`.
- **Shared Production Limitations:**
  - SQLite is single-file and node-process-local. It works well for a single Node process on a single VPS or student laptop.
  - If deployed to serverless environments (e.g. Vercel serverless functions, Render free tier ephemeral instances) or scaled horizontally across multiple instances, SQLite storage is not shared and will reset on container restart.
- **Requirement for Shared Production:**
  A PostgreSQL database client (e.g. `pg` connection pool or Prisma/Knex) must be wired into `backend/src/db/index.ts` so that when `DB_TYPE=postgres` or `DATABASE_URL` is set, queries run against managed PostgreSQL (such as Supabase). The SQL schema in [ROOMBITES_DATABASE_DESIGN.md](file:///D:/RoomBites/docs/ROOMBITES_DATABASE_DESIGN.md) is already PostgreSQL DDL compatible.

---

## 6. Real-Time WebSocket & Push Notification Analysis

- **WebSocket Authentication & Heartbeat:**
  - Token verified during initial handshake via `?token=<JWT>` or `{ type: 'AUTH', payload: { token } }`.
  - Heartbeat sent every 25 seconds: `{ type: 'HEARTBEAT', payload: { activity } }`.
  - On disconnection (`close` / `error`), `unregisterClient` sets `customer_presence.is_online = 0` and broadcasts the offline status to admins.
- **Absence of Background Push Notifications:**
  - **Important Technical Distinction:** WebSockets require an active TCP socket. When a mobile browser is closed, tab suspended, or native app backgrounded, the WebSocket connection terminates.
  - RoomBites currently has **in-app WebSocket chimes** (synthesized via Web Audio API) and in-app toasts.
  - It does **not** have a background push notification service worker (Web Push with VAPID keys) or FCM/UnifiedPush receiver. Users will not receive notifications if their app/browser is completely closed.

---

## 7. Android Capacitor Build Status

- **Android Project Setup:**
  Generated via Capacitor 7 in `apps/web/android/`.
- **Build Attempt Execution:**
  Executed: `cd apps/web/android; ./gradlew assembleDebug`
- **Result:** **FAILED**
- **Error:**
  ```
  > Task :capacitor-android:compileDebugJavaWithJavac FAILED
  Execution failed for task ':capacitor-android:compileDebugJavaWithJavac'.
  > error: invalid source release: 21
  ```
- **Root Cause:**
  Capacitor 7's core Android library sets:
  `sourceCompatibility JavaVersion.VERSION_21`
  The host environment has **JDK 17** (`jdk-17.0.18.8-hotspot`) installed.
- **Resolution:**
  To compile an APK on this host machine, either:
  1. Install **JDK 21** and update `JAVA_HOME`, or
  2. Downgrade Capacitor from version 7 to version 6 (which targets Java 17).

---

## 8. Summary of Production Blockers & Missing Integrations

| Item | Category | Description | Remedy |
| :--- | :--- | :--- | :--- |
| **1. SMTP Email Provider** | Production Blocker | OTPs are logged locally; no actual email dispatch occurs. | Connect Nodemailer / Resend API in `backend/src/services/authService.ts`. |
| **2. Android JDK Version** | Build Blocker | Capacitor 7 requires JDK 21; system has JDK 17. | Install JDK 21 on build host or configure Gradle toolchain. |
| **3. Shared PostgreSQL Driver** | Hosting Blocker | SQLite file driver is hardcoded; multi-instance deployment requires Postgres. | Wire `pg` pool into `backend/src/db/index.ts` when `DATABASE_URL` is set. |
| **4. Background Push Service** | Feature Gap | Notifications only work while app is actively open via WebSocket. | Implement Web Push Service Worker with VAPID keys for PWA / browser notifications. |
| **5. Google OAuth** | Feature Gap | Only email OTP is currently implemented; institutional Google Sign-In is planned. | Add Google OAuth2 redirect flow. |

---

## 9. Local Execution Guide

To run RoomBites locally from scratch on this machine:

### 1. Start the Backend API & WebSocket Server
```powershell
cd D:\RoomBites\backend
npm install
npm run build
npm start
```
- Health check: `http://localhost:4000/health`
- WebSocket endpoint: `ws://localhost:4000/ws`
- Dev mode auto-reloading: `npm run dev`
- Test suite: `npm test`

### 2. Start the Frontend Application
```powershell
cd D:\RoomBites\apps\web
npm install
npm run dev
```
- Local access: `http://localhost:5173`
- Default Admin Email: `admin@rit.ac.in` (OTP previewed in console / dev modal)
- Production build: `npm run build`
