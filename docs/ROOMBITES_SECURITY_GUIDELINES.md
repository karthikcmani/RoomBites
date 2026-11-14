# RoomBites — Security & Privacy Guidelines

- **Version:** 1.0.0
- **Status:** Approved
- **Document ID:** DOC-SEC-005

---

## 1. Threat Modeling & Security Principles

RoomBites manages personal contact information (hostel room numbers, phone numbers) and financial records (cash balances, UPI references). We adhere to strict zero-trust principles:

1. **Defense in Depth:** Client validation is mirrored and strictly re-enforced by server-side schemas.
2. **Principle of Least Privilege:** Ordinary students cannot view peers' presence, phone numbers, or order histories.
3. **Financial Immutability:** Orders and credit transactions cannot be deleted; state updates are audited with author IDs and timestamps.
4. **Zero-Secret Commits:** No credentials, API secrets, or private keys in the Git repository.

---

## 2. Authentication & Authorization Policies

### 2.1 Institutional Domain Quarantine
- All customer registration and sign-in operations validate the email against `@rit.ac.in`.
- Regular expression verification: `/^[a-zA-Z0-9._%+-]+@rit\.ac\.in$/i`.
- Attempts to register with personal Gmail, Yahoo, or Outlook addresses are rejected at the edge with `400 Bad Request`.

### 2.2 Role-Based Access Control (RBAC)
- **Roles:** `CUSTOMER`, `ADMIN`.
- Protected routes inspect `req.user.role`.
- Any non-admin attempting access to `/api/v1/admin/*` receives immediate `403 Forbidden` response and an audit log event.
- Admin initial assignment is controlled exclusively by server environment variables or master seed tokens.

### 2.3 Passwordless OTP Security
- Cryptographic OTP: 6 random numeric digits generated via `crypto.randomInt(100000, 999999)`.
- OTP Lifetime: 10 minutes (600 seconds).
- Rate Limiting: Maximum 3 OTP requests per email per 15 minutes; maximum 5 verification attempts per OTP before invalidation.
- OTP storage: Stored in memory / database with hashing and expiry timestamp.

---

## 3. Financial & Ledger Integrity

1. **Integer Arithmetic Enforcement:**
   - Currency is stored and calculated in integer Indian Paise (\(1\text{ Rupee} = 100\text{ Paise}\)).
   - Division is executed strictly for display formatting, preventing binary floating-point roundoff errors.
2. **The 2-Due Credit Rule Enforcement:**
   - Server-side check during order checkout transaction:
     ```ts
     const unpaidOrders = await db.orders.count({
       where: { customerId, paymentStatus: 'UNPAID', paymentMethod: 'CREDIT' }
     });
     if (unpaidOrders > 2) {
       throw new ForbiddenError('CREDIT_LIMIT_EXCEEDED: Maximum 2 unpaid dues permitted.');
     }
     ```
3. **Payment Verification:**
   - Customer UPI references or cash orders are marked `PENDING` until explicit admin verification. Client-side claims are never auto-credited.

---

## 4. Privacy & Data Minimization

1. **Customer Presence Concealment:**
   - Presence tracking broadcasts are sent exclusively to WebSocket clients with `role === 'ADMIN'`.
   - Customers never receive peer presence payloads.
2. **PII Shielding:**
   - Phone numbers and room numbers are shared only with the seller for delivery execution.
   - Database queries exclude phone numbers from public catalog and review queries.

---

## 5. Environment & Secret Management
- `.env` is added to `.gitignore`.
- `.env.example` provides template variables with dummy values:
  ```env
  PORT=4000
  NODE_ENV=development
  JWT_SECRET=replace_with_64_character_random_hex_key
  ADMIN_EMAIL=admin@rit.ac.in
  DATABASE_URL=postgres://user:pass@localhost:5432/roombites
  ```
