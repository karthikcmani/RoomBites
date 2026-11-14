# RoomBites — Product Requirements Document (PRD)

- **Version:** 1.0.0
- **Status:** Approved
- **Author:** RoomBites Autonomous Engineering Team
- **Target Audience:** RIT Hostel Students (Customers) & Hostel Mess Operators (Admin/Seller)

---

## 1. Executive Summary & Vision
RoomBites is an ultra-lightweight, community-centered digital food ordering platform designed specifically for hostel environments. Initially serving the residential hostels of Rajiv Gandhi Institute of Technology (RIT), Kottayam, Kerala, India, RoomBites empowers a student entrepreneur to prepare hot beverages, midnight snacks, and instant meals, and deliver them directly to fellow students' hostel rooms during night hours (typically 9:00 PM – 5:00 AM).

---

## 2. Target Personas

### 2.1 Customer (Hostel Student)
- **Profile:** Studying at RIT Kottayam, residing in campus or affiliated hostels (e.g., Men's Hostel, PG accommodations nearby).
- **Need:** Craves affordable, hot tea, coffee, Maggi, or snacks late at night while studying or completing assignments.
- **Pain Points:** Canteens are closed at midnight; food delivery apps (Swiggy/Zomato) have exorbitant delivery fees, minimum order thresholds, and do not deliver to internal hostel room doors; irregular cash liquidity requires short-term credit.

### 2.2 Administrator (Student Mess Operator / Seller)
- **Profile:** Single student entrepreneur operating the night preparation station in their hostel room.
- **Need:** Streamlined order intake without managing dozens of disorganized WhatsApp messages, phone calls, or lost paper ledgers.
- **Pain Points:** Handling orders when out of stock; tracking who owes money; managing sleep periods; knowing when customers are actively browsing.

---

## 3. Product Scope & Functional Requirements

### 3.1 Authentication & Profile Management
- **FR-AUTH-1:** Registration is strictly restricted to email addresses matching the institutional domain `@rit.ac.in`.
- **FR-AUTH-2:** One-Time Password (OTP) / Magic verification codes ensure proof of email ownership.
- **FR-AUTH-3:** Profile onboarding requires: Full Name, Hostel Block / Room Number, WhatsApp / Phone number.
- **FR-AUTH-4:** Admin accounts are created through a secure seed/environment setup script; ordinary students cannot self-promote to admin.
- **FR-AUTH-5:** Secure session handling using cryptographic JWTs with automatic refresh and secure logout.

### 3.2 Product Catalog & Inventory
- **FR-PROD-1:** Categorized catalog (Tea, Coffee, Health Drinks, Snacks, Instant Food, Fruits).
- **FR-PROD-2:** Dynamic customization options per item (e.g., Sugar Level: None, Normal, Extra; Milk Strength: Light, Strong; Preparation notes: Spicy, Extra boiled).
- **FR-PROD-3:** Admin can add, update, archive, and adjust pricing and stock status (`in_stock`, `low_stock`, `out_of_stock`).
- **FR-PROD-4:** Instant live availability toggling (takes effect on client screens within 1 second via WebSocket).

### 3.3 Shop Status & Availability
- **FR-SHOP-1:** Four operational states:
  - `AVAILABLE`: Store is open and accepting new incoming orders.
  - `BUSY`: Store is active but pausing incoming orders due to peak cooking load.
  - `CLOSED`: Normal daytime shutdown or off-schedule closure.
  - `SLEEPING`: Night closure when seller is resting; displays optional emergency contact phone number.
- **FR-SHOP-2:** Scheduled operating window configuration (default 21:00 to 05:00 IST) with manual administrative override.
- **FR-SHOP-3:** Clients are prevented from submitting instant orders when shop is `CLOSED` or `SLEEPING`.

### 3.4 Shopping Cart & Checkout
- **FR-CART-1:** Multi-item cart with custom instructions per item.
- **FR-CART-2:** Real-time stock validation at checkout.
- **FR-CART-3:** Server-side price calculation (never trusting client payload totals).
- **FR-CART-4:** Free delivery policy (initial delivery fee = ₹0).
- **FR-CART-5:** Scheduled order capability: customer can pick a future delivery slot within operating hours.

### 3.5 Order Lifecycle & State Machine
The lifecycle transitions strictly follow this state machine:
```
[DRAFT/CART]
      │
      ▼
 [PLACED] (Awaiting Admin Confirmation)
      ├──► [CANCELLED_BY_CUSTOMER] (Allowed only before Admin confirmation)
      ├──► [REJECTED] (Admin rejects with reason, e.g., kitchen out of gas)
      ├──► [ALTERNATIVE_OFFERED] (Admin proposes substitute)
      │          ├──► [ALTERNATIVE_ACCEPTED] ──► [ACCEPTED]
      │          └──► [ALTERNATIVE_REJECTED] ──► [CANCELLED]
      ▼
 [ACCEPTED] (Order confirmed by Seller)
      │
      ▼
 [PAYMENT_PENDING] (For Cash visit or UPI transaction)
      ├──► [PAID] (Admin validates receipt or approves credit)
      ▼
 [PREPARING] (Food is on the stove)
      │
      ▼
 [OUT_FOR_DELIVERY] (Seller walking to customer hostel room)
      │
      ▼
 [DELIVERED] (Order completed)
```

### 3.6 Payments & Financial Ledger
- **FR-PAY-1:** Support for Cash on Delivery/Counter and UPI (UPI Intent URL for mobile + dynamic UPI QR with embedded transaction reference).
- **FR-PAY-2:** UPI payments generate a reference code; admin manually verifies transaction settlement before marking `PAID`.
- **FR-PAY-3:** Double-entry immutable ledger: every debit, credit, refund, and payment is recorded with an exact timestamp and audit reference.
- **FR-PAY-4:** Currency stored strictly in integer Indian paise (\(1\text{ INR} = 100\text{ paise}\)).

### 3.7 Credit System
- **FR-CRED-1:** Default customer credit status is `DISABLED`. Customers must submit a credit request.
- **FR-CRED-2:** Admin approves or revokes customer credit privileges.
- **FR-CRED-3 (The Strict 2-Due Rule):** An approved customer can place orders on credit ONLY IF their count of unpaid orders is **2 or fewer**. If a customer has **more than 2 unpaid orders** (i.e., \(\ge 3\)), new order placement is strictly rejected by the backend until outstanding balances are cleared.
- **FR-CRED-4:** Admin dashboard provides full ledger view with one-click payment settlement.

### 3.8 Real-Time Customer Presence
- **FR-PRES-1:** Authenticated client sends periodic lightweight heartbeats over WebSocket (every 30 seconds or on screen navigation).
- **FR-PRES-2:** Activity state reported: `browsing_menu`, `viewing_item`, `reviewing_cart`, `checkout`.
- **FR-PRES-3:** Client inactivity or socket disconnect triggers offline status after 60-second grace window.
- **FR-PRES-4:** **Privacy Rule:** Presence data is visible ONLY to authenticated admins. Zero visibility to other customers.

### 3.9 Notifications & Announcements
- **FR-NOTIF-1:** Real-time in-app notification toasts with audio chimes for new orders (Admin) and status changes (Customer).
- **FR-NOTIF-2:** Persistent notification inbox.
- **FR-NOTIF-3:** Admin broadcasts announcements and discount offers (e.g., "Fresh bananas available tonight", "10% off Tea + Biscuit combo").

### 3.10 Ratings, Reviews & Reordering
- **FR-REV-1:** Customers can rate completed orders (1–5 stars) and write constructive feedback.
- **FR-REV-2:** "One-Click Reorder" populates current cart from any previously delivered order, validating item availability.

---

## 4. Non-Functional Requirements (NFR)
1. **Performance:** App initial interactive load < 2.0s on 3G/4G networks; API response times < 150ms for cart and order queries.
2. **Resource Efficiency:** Low memory footprint (< 60MB RAM on Android WebView); minimal battery drain by pausing presence pings when browser tab or app is minimized.
3. **Resilience to Unstable Wi-Fi:** Offline menu caching using Service Worker / localStorage; clear banner alerting users when network connectivity drops.
4. **Security & Data Privacy:** Passwords/Tokens hashed using Argon2/Bcrypt; JWTs signed with HMAC-SHA256; zero exposure of student phone numbers to peers; SQL injection prevention via parameterized queries.
5. **F-Droid Compliance:** Zero proprietary closed-source SDKs; zero Google Play Services hard dependencies.
