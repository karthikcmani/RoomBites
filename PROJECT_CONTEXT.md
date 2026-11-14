# RoomBites — Project Context & Engineering Standards

## 1. Product Identity & Philosophy
- **Name:** RoomBites
- **Tagline:** Built by students, for students.
- **Mission:** A lightweight, reliable student-to-student food ordering and night-mess management platform specifically engineered for hostel communities (initially at Rajiv Gandhi Institute of Technology — RIT, Kottayam, Kerala).
- **Initial Model:** Single student seller operating night hours (9:00 PM – 5:00/6:00 AM) preparing hot food/drinks delivered straight to hostel rooms. Direct delivery, zero delivery fees, zero bloated commercial aggregator markups.

---

## 2. Core Architectural Decisions & Technology Stack
- **Architecture Style:** Decoupled Monorepo with a single clean TypeScript codebase for UI (Cross-platform Web/PWA + Android APK via Capacitor) and a robust TypeScript Backend (Express/Node.js, PostgreSQL with Knex/Prisma query engine & migrations, SQLite compatibility for local dev/testing, WebSocket real-time engine).
- **Frontend App:** React 19 + TypeScript + Vite + Tailwind CSS + Lucide Icons + PWA (Service Workers, Web App Manifest) + Capacitor for native Android build.
- **Backend API:** Node.js (v22+) + TypeScript + Express + WebSocket (`ws`) + JWT Session Auth + Zod Schema Validation.
- **Database:** PostgreSQL (with Supabase compatibility layer and local SQLite dialect for rapid test runner execution).
- **Auth Engine:** Verified `@rit.ac.in` domain email validation, OTP/Magic token verification, Google OAuth compatible hooks, and role-based access control (RBAC).
- **Payment & Ledger:** Double-entry integer-paise financial ledger, supporting Cash on Delivery / Counter and Direct UPI Intent / Dynamic QR verification.
- **Real-Time Presence:** WebSocket heartbeats + activity tagging (`browsing_menu`, `viewing_item`, `cart`, `placing_order`) with automatic stale disconnection and low battery/network overhead.
- **Notifications:** Dual-channel (In-app real-time WebSocket toast & sound notifications + persistent notification inbox + standard Web Push / Service Worker push).

---

## 3. Repository Conventions & Structure
```
RoomBites/
├── apps/
│   ├── web/                    # Single-codebase React+Vite+Capacitor Customer & Admin App
│   │   ├── android/            # Capacitor native Android project wrapper (F-Droid clean)
│   │   ├── src/
│   │   │   ├── components/     # UI design system (Cards, Modal, Sheet, Badges, Tables)
│   │   │   ├── contexts/       # Auth, Cart, Presence, Realtime, Theme, Sound
│   │   │   ├── pages/
│   │   │   │   ├── customer/   # Splash, Login, Menu, ItemDetails, Cart, Checkout, Orders, Profile
│   │   │   │   └── admin/      # Dashboard, Live Presence, Orders, Menu/Stock, Customers, Ledger, Analytics
│   │   │   ├── services/       # Typed API client, WebSocket listener, Storage
│   │   │   └── types/          # Shared domain models and interfaces
│   │   └── public/             # PWA assets, icons, sound effects, manifest
├── backend/
│   ├── src/
│   │   ├── controllers/        # Express handlers (auth, orders, products, credit, analytics)
│   │   ├── middleware/         # Auth verification, RLS simulation, error handling, rate limiting
│   │   ├── routes/             # REST routing declarations
│   │   ├── services/           # Business logic (order state machine, credit ledger, presence)
│   │   ├── db/                 # Migrations, seeders, schema definitions
│   │   └── websocket/          # WebSocket realtime broker & connection registry
│   └── tests/                  # Integration and unit tests
├── infrastructure/
│   ├── docker-compose.yml      # Local Postgres & backend orchestration
│   └── scripts/                # Database backup, migration runner, release packager
├── docs/                       # Official documentation suite
└── PROJECT_CONTEXT.md          # This context manifesto
```

---

## 4. Key Business Rules (Strictly Enforced)
1. **Institutional Domain Enforcement:** Only email addresses ending with `@rit.ac.in` can register as customers.
2. **Integer Currency Arithmetic:** All monetary fields (`price`, `subtotal`, `total`, `balance`, `due`) must be strictly represented and calculated in integer **paise** (\(₹1 = 100\text{ paise}\)). Never use floating-point for money.
3. **Credit Rule:** A student customer may place a credit order ONLY if they have approved credit status AND they have **no more than 2 outstanding unpaid dues**. If `unpaid_orders_count > 2`, credit checkout is strictly blocked by the backend API.
4. **Order State Machine:**
   `PLACED` → `AWAITING_APPROVAL` → `ACCEPTED` (or `REJECTED`) → `PREPARING` → `OUT_FOR_DELIVERY` → `DELIVERED` (or `CANCELLED`).
   Alternative suggestions require explicit customer accept/reject.
5. **Shop Availability Protection:** Orders can only be placed when Shop Status is `AVAILABLE` and current time is within operating hours (unless emergency manual override is active). Statuses: `AVAILABLE`, `BUSY`, `CLOSED`, `SLEEPING`.
6. **Presence Privacy:** Only authenticated administrators have permission to observe customer presence and activity. Customers can never inspect presence of other peers.
7. **Zero-Secret Commits:** `.env` files are ignored; only `.env.example` is committed. No service role tokens, database credentials, or private keys shall ever enter Git history.

---

## 5. Development Status & Next Steps
- **Phase 0:** Audit Complete.
- **Phase 1 & 2:** PRD, Technical Blueprint, Database Design, ADR, API Docs drafted.
- **Phase 3:** UI/UX Design System defined.
- **Phase 4:** Core Backend & Frontend project foundation scaffolding.
