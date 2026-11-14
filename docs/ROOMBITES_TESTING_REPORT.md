# RoomBites — Testing Strategy & Quality Assurance Report

- **Document ID:** DOC-TEST-007
- **Target Test Devices:**
  - **Admin Device:** Nothing Phone (3a) (Android 14 / Nothing OS)
  - **Customer Device:** Xiaomi Redmi Note 8 (Android 11 / MIUI, 4GB RAM)
  - **Desktop / Browser:** Chromium & Safari (Desktop & Mobile viewports)

---

## 1. Test Suite Coverage Plan

### 1.1 Authentication & Domain Quarantine
- [x] Rejection of non-`@rit.ac.in` email addresses (e.g., `@gmail.com`, `@yahoo.com`).
- [x] Acceptance and OTP delivery for valid institutional student emails.
- [x] Preventing duplicate user profile creation with the same email.
- [x] Session token issuance and expiration handling.

### 1.2 Cart & Server-Side Price Calculation
- [x] Multiple items with customized options in cart.
- [x] Total computation verified against backend database prices (tampered client prices discarded).
- [x] In-stock and out-of-stock validation at order placement time.

### 1.3 Order Lifecycle & State Machine Transitions
- [x] Order placed by student triggers real-time admin alert.
- [x] Admin can accept or reject order with reason.
- [x] Alternative product suggestion: student can accept or reject.
- [x] Customer cancellation: allowed only while in `PLACED` / `AWAITING_APPROVAL` status; blocked once `ACCEPTED`.

### 1.4 Financial Ledger & The Strict 2-Due Credit Rule
- [x] Credit order allowed when unpaid dues count \(\le 2\).
- [x] Credit order blocked with `403 Forbidden` when unpaid dues count \(> 2\).
- [x] Integer arithmetic verification: No floating-point roundoff errors in paise totals.
- [x] Cash and UPI payment verification moves balance from pending to settled.

### 1.5 Real-Time Customer Presence & Privacy
- [x] Admin receives customer presence updates (status, activity, room number).
- [x] Customers are strictly shielded from seeing other customers' presence.
- [x] Disconnect detection: Inactive/closed sockets transition to offline status.

---

## 2. Test Execution Log
*Test results will be updated as the test suite is executed in Phase 8.*
