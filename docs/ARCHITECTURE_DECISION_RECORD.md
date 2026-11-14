# Architecture Decision Record (ADR)

## ADR-001: RoomBites Platform Architecture & Technology Stack

- **Status:** Approved
- **Date:** 2026-11-15
- **Decider:** RoomBites Autonomous Engineering Team

---

### 1. Context & Problem Statement
RoomBites is a student-to-student food ordering service initially operating in the hostels of Rajiv Gandhi Institute of Technology (RIT), Kottayam. The platform needs:
1. Low latency real-time communication for order updates and customer presence.
2. Lightweight client footprint capable of smooth execution on budget student devices (e.g., Xiaomi Redmi Note 8 with 4GB RAM) as well as modern mid-rangers (Nothing Phone 3a) and web browsers.
3. Android APK distribution, iOS accessibility via PWA, and full future compatibility with F-Droid (free and open-source software catalog without proprietary Google Play Services hard dependencies).
4. Strictly reliable transaction and credit ledger accounting (preventing double spending, floating point errors, and adhering to the "maximum 2 unpaid dues" credit rule).
5. Low maintenance, minimal operational costs (capable of zero-cost free-tier deployment on Supabase/Render/Fly.io/Vercel or self-hosting on a basic VPS or student laptop).

---

### 2. Decision Summary

| Domain | Selected Technology | Primary Alternatives Evaluated | Rationale |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | **React 19 + TypeScript + Vite + Tailwind CSS** | React Native (Bare CLI), Expo, Flutter | Single codebase for Web, Mobile PWA, and Android wrapper; extremely small bundle size; instant desktop/mobile responsiveness; no complex dual-codebase drift. |
| **Mobile Runtime / Packaging** | **Capacitor + Progressive Web App (PWA)** | Expo EAS, React Native CLI, Cordova | Capacitor allows standard web assets to be packaged into a pure Android APK without requiring proprietary closed-source SDKs, making it 100% compliant with F-Droid inclusion guidelines. PWA provides instant zero-install access on iOS Safari. |
| **Backend Framework** | **Node.js (v22) + TypeScript + Express** | Python FastAPI, Go Fiber, Supabase Pure BaaS | Pure BaaS locks complex credit business rules into client or proprietary PL/pgSQL edge functions. A lightweight Node.js Express service provides testable, type-safe business logic, robust WebSocket presence orchestration, and zero vendor lock-in. |
| **Database & ORM** | **PostgreSQL (Production/Supabase) & SQLite (Local testing/dev) with Knex/Prisma query engine** | MongoDB, Pure Firebase Firestore | Relational consistency is mandatory for double-entry credit ledger, orders, and transactional state changes. PostgreSQL provides JSONB, Row Level Security, and transaction isolation. |
| **Realtime Engine** | **Native WebSocket (`ws`) with heartbeat presence** | Pusher, Firebase Realtime DB, Polling | Free, zero recurring third-party costs, lightweight, full bidirectional communication for real-time customer presence tracking and instant admin order chime alerts. |
| **Authentication** | **Institutional Email Verification (`@rit.ac.in`) with JWT & OTP** | Firebase Auth, Pure Google Identity Services | Strict verification of student email identity without requiring proprietary SDKs. Google OAuth compatibility integrated via standard OAuth2 redirects. |
| **Monetary Representation** | **Strict Integer Paise (INR ₹1 = 100 paise)** | Floating point numbers (`float`/`double`), Decimal strings | Floating-point inaccuracies lead to financial reconciliation discrepancies. Integer paise guarantees exact arithmetic across all cart, credit, and order computations. |

---

### 3. Detailed Trade-off Analysis

#### A. Frontend: React + Capacitor vs. React Native / Expo
- **React Native / Expo:**
  - *Pros:* Native UI primitives, rich ecosystem.
  - *Cons:* Heavy APK footprint (~25MB–50MB), separate web codebase or complex `react-native-web` abstractions, Expo push notifications depend on Google FCM and Expo push services which violate F-Droid inclusion requirements unless stripped.
- **React + Vite + Capacitor (Chosen):**
  - *Pros:* Single responsive UI codebase for Web, iOS (PWA), and Android APK. Bundle size is minimal (< 5MB initial download, cached via Service Worker). Perfect F-Droid eligibility as the APK uses Android's open-source WebView without closed-source Google binaries.
  - *Cons:* Slightly less native animation physics for heavy gestures, but for an efficient food ordering menu and admin dashboard, modern CSS transforms and Virtualized Lists achieve 60fps easily on a Redmi Note 8.

#### B. F-Droid Eligibility Analysis
- F-Droid requires that applications can be compiled from source using free and open-source tools without non-free dependencies or proprietary trackers (e.g. Firebase Analytics, Google Play Billing).
- By utilizing Capacitor with pure web standards (HTML5 Web Audio for chimes, WebSockets for realtime, Web Push API / Service Workers for notifications), the Android build contains zero Google Play proprietary binaries and is fully eligible for F-Droid packaging.

#### C. Backend: Dedicated Express TypeScript Service vs. Pure Supabase BaaS
- While Supabase PostgreSQL is ideal for hosted storage and database, putting all state machine rules (order cancellation grace periods, credit approval limits, alternative suggestion negotiation, live presence tracking) into a dedicated TypeScript backend allows deterministic unit and integration testing without spinning up Dockerized Supabase emulators for every CI run.
- The Node.js service can connect directly to hosted Supabase PostgreSQL or any vanilla PostgreSQL instance.

---

### 4. Financial Calculations & Data Precision
All monetary values in the database, API payloads, and frontend state are integers representing Indian Paise:
- ₹15.00 = `1500`
- ₹0.00 = `0`
- ₹120.50 = `12050`
All frontend display components use a centralized currency formatter:
```ts
export const formatINR = (paise: number): string => `₹${(paise / 100).toFixed(2)}`;
```

---

### 5. Migration and Long-Term Maintenance
- If RoomBites expands to multi-seller operations in the future, the database schema includes `seller_id` on all products, orders, and shop availability configurations. The initial release defaults all operational rows to `seller_id = 'seller_primary'`.
- Hosting: The backend can be containerized via Docker and deployed on a free-tier Render/Fly.io or a \$3/month VPS. The frontend static bundle can be deployed on Cloudflare Pages, Vercel, or GitHub Pages.
