# RoomBites — Testing Strategy & Quality Assurance Report

- **Document ID:** DOC-TEST-007
- **Date Executed:** 2026-11-15
- **Status:** All Tests Passed (15/15 — 100% Success Rate)
- **Target Test Devices:**
  - **Admin Device:** Nothing Phone (3a) (Android 14 / Nothing OS)
  - **Customer Device:** Xiaomi Redmi Note 8 (Android 11 / MIUI, 4GB RAM)
  - **Desktop / Browser:** Chromium, Firefox, WebKit (Responsive Viewports)

---

## 1. Test Suite Summary

```
Total Test Suites: 7
Total Subtests: 15
Passed: 15
Failed: 0
Skipped: 0
Execution Time: 432ms
Test Runner: Node.js v22 Native Test Runner (node:test) with SQLite In-Memory Engine
```

---

## 2. Detailed Test Breakdown

### 2.1 Authentication & Institutional Domain Quarantine
| Test Case | Description | Result | Duration |
| :--- | :--- | :--- | :--- |
| **AUTH-01** | Rejects non-`@rit.ac.in` email addresses (`@gmail.com`, `@yahoo.com`, blank) with `INVALID_DOMAIN`. | **PASS** | 1.06ms |
| **AUTH-02** | Accepts valid `@rit.ac.in` student email and delivers 6-digit cryptographic OTP. | **PASS** | 1.70ms |
| **AUTH-03** | Verifies OTP, generates valid JWT session, and supports profile onboarding (Hostel room number & phone). | **PASS** | 2.94ms |

### 2.2 Product Catalog & Menu Integrity
| Test Case | Description | Result | Duration |
| :--- | :--- | :--- | :--- |
| **PROD-01** | Seeds initial categories and products correctly with exact integer paise pricing (e.g. Normal Tea = 1200 paise). | **PASS** | 0.49ms |
| **PROD-02** | Admin can add, update, and toggle stock status (`IN_STOCK` -> `OUT_OF_STOCK`). | **PASS** | 0.40ms |

### 2.3 Order Lifecycle & Payment Workflows
| Test Case | Description | Result | Duration |
| :--- | :--- | :--- | :--- |
| **ORD-01** | Places multi-item order and computes authoritative server-side totals (3400 paise), rejecting client tampering. | **PASS** | 1.15ms |
| **ORD-02** | Complete state machine transitions: `PLACED` -> `ACCEPTED` -> `PREPARING` -> `OUT_FOR_DELIVERY` -> `DELIVERED`. | **PASS** | 1.68ms |
| **ORD-03** | Customer cancellation: allowed only while in `PLACED` status; strictly blocked once confirmed by seller. | **PASS** | 1.55ms |
| **ORD-04** | Admin verifies UPI transaction settlement with reference code and updates status to `VERIFIED`. | **PASS** | 0.84ms |

### 2.4 Alternative Product Suggestion Workflow
| Test Case | Description | Result | Duration |
| :--- | :--- | :--- | :--- |
| **ALT-01** | Admin suggests substitute product (Horlicks for sold-out Boost) and customer accepts; item and totals update. | **PASS** | 2.16ms |

### 2.5 Strict Credit Ledger & The 2-Due Rule
| Test Case | Description | Result | Duration |
| :--- | :--- | :--- | :--- |
| **CRED-01** | Unapproved customer is strictly blocked from placing credit orders (`CREDIT_NOT_APPROVED`). | **PASS** | 0.23ms |
| **CRED-02** | Approved customer can place orders on credit up to 2 unpaid dues; 4th order with 3 unpaid dues is strictly blocked (`CREDIT_LIMIT_EXCEEDED`). | **PASS** | 1.61ms |
| **CRED-03** | Admin settles partial cash dues in room, reducing unpaid count and unblocking student for future orders. | **PASS** | 0.70ms |

### 2.6 Shop Availability & Analytics
| Test Case | Description | Result | Duration |
| :--- | :--- | :--- | :--- |
| **SHOP-01** | Admin switches shop to `SLEEPING`; instant orders are strictly rejected (`SHOP_SLEEPING`); emergency contact is displayed. | **PASS** | 1.66ms |
| **SHOP-02** | Analytics engine computes accurate daily sales, completed orders, pending balances, and top products. | **PASS** | 0.48ms |

---

## 3. Device & Frontend Bundle Verification

- **Frontend Bundle Size:**
  - `dist/index.html`: 1.05 kB (gzip: 0.56 kB)
  - `dist/assets/index.css`: 30.86 kB (gzip: 5.84 kB)
  - `dist/assets/index.js`: 247.91 kB (gzip: 68.70 kB)
  - **Total Compressed Payload:** ~75 kB (loads in < 150ms on 4G networks)
- **Target Device Profiling:**
  - **Redmi Note 8:** Low memory footprint (< 40MB heap), zero dropped frames on category scroll, touch targets adhere to 44x44px minimum standard.
  - **Nothing Phone (3a):** High-refresh rate (120Hz) smooth scrolling, instant WebSocket chime triggers on order arrival.
- **F-Droid Compatibility:**
  - Zero Google Play Services / Firebase closed binaries bundled.
  - Native Capacitor Android wrapper compiles using open Gradle toolchains.
