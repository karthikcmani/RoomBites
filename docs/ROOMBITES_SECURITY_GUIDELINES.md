# RoomBites — Security & Privacy Guidelines

- **Version:** 1.1.0
- **Status:** Approved
- **Document ID:** DOC-SEC-005

---

## 1. Threat Modeling & Security Principles

RoomBites manages student personal contact information (hostel room numbers, phone numbers) and financial records (cash balances, UPI references). We adhere to strict zero-trust principles:

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

### 2.2 Role-Based Access Control (RBAC) & Anti-Tampering
- **Roles:** `CUSTOMER`, `ADMIN`.
- Protected routes inspect `req.user.role`.
- Any non-admin attempting access to `/api/v1/admin/*` receives immediate `403 Forbidden` response and an audit log event.
- **Role Tampering Prevention:** Profile update endpoints (`POST /api/v1/auth/profile`) accept and sanitize only `{ fullName, roomNumber, phoneNumber }`. Any client-injected fields such as `role`, `isAdmin`, `creditStatus`, or `unpaidOrdersCount` are strictly discarded. Ordinary users cannot promote themselves under any circumstance.
- **Admin Provisioning:** The administrator account is bound strictly to `ADMIN_EMAIL` configured via server environment variables. Admin sessions cannot be self-claimed.

### 2.3 Passwordless OTP Cryptographic Security & Abuse Prevention
- **CSPRNG Generation:** 6 random numeric digits generated via Node.js cryptographically secure pseudo-random number generator `crypto.randomInt(100000, 1000000)`. Range $[100000, 999999]$ guarantees uniform distribution over $900,000$ values, completely eliminates modulo bias, and guarantees a 6-digit string without leading zero truncation.
- **HMAC-SHA256 Server-Side Pepper & Database Hashing:**
  - Plaintext OTPs are never persisted to disk or logged.
  - OTP records store an HMAC-SHA256 digest keyed with a server-side pepper (`OTP_SECRET` / `OTP_PEPPER`, falling back to `JWT_SECRET`) and contextually bound to the recipient's normalized email address:
    $$\text{code\_hash} = \text{HMAC-SHA256}(\text{OTP\_SECRET},\, \text{cleanEmail} + \text{":"} + \text{code})$$
  - **Offline Brute-Force Immunity:** Because a 6-digit OTP search space is only $900,000$ combinations, unkeyed or publicly salted hashes can be brute-forced in milliseconds. Keying the hash with a secret server-side pepper stored exclusively in server environment memory separates the storage tier from the secret tier. An attacker with full read access to the database (via SQL injection or database volume leak) cannot perform offline dictionary or rainbow table attacks without the server pepper.
  - **Contextual Binding:** The recipient's email is bound into the HMAC payload, ensuring an OTP hash cannot be transposed across different accounts.
- **Timing Attack Resistance:** Verification uses `crypto.timingSafeEqual` over the 256-bit hash buffers, including constant-time dummy comparisons on malformed buffer lengths, eliminating timing side-channel leaks.
- **Rate Limiting & Cooldown:**
  - 60-second mandatory cooldown between consecutive OTP requests for the same address.
  - Maximum 5 OTP requests per email in any 15-minute rolling window.
- **Brute-Force Protection:**
  - Maximum 5 failed verification attempts allowed per OTP.
  - On the 5th failed attempt, the OTP record is permanently purged and blocked.
- **Zero-Exposure Policy:**
  - OTP codes are **never** returned in any API responses.
  - Plaintext OTP codes are **never** written to production application logs. Logs display only masked addresses (e.g. `s***t@rit.ac.in`).

### 2.4 Cryptographic Session Token & Secret Management
- Signed using HMAC-SHA256 (`HS256`).
- **Production Fail-Fast Guard:** In `NODE_ENV === 'production'`, the server verifies `JWT_SECRET` and `OTP_SECRET` at boot. If either secret is unset, shorter than 32 characters, or matches default development keys, the server terminates immediately with a fatal security error (`process.exit(1)`).

---

## 3. Financial & Ledger Integrity

1. **Integer Arithmetic Enforcement:**
   - Currency is stored and calculated strictly in integer Indian Paise (\(1\text{ Rupee} = 100\text{ Paise}\)).
   - Floating-point numbers are prohibited in database columns and monetary logic.
2. **The 2-Due Credit Rule Enforcement:**
   - Enforced transactionally by the backend order creation service:
     ```ts
     if (paymentMethod === 'CREDIT') {
       if (profile.credit_status !== 'APPROVED') {
         throw new ForbiddenError('CREDIT_NOT_APPROVED');
       }
       if (profile.unpaid_orders_count > 2) {
         throw new ForbiddenError('CREDIT_LIMIT_EXCEEDED');
       }
     }
     ```
3. **Decoupled Payment Verification:**
   - Cash and UPI orders are created with `payment_status = 'PENDING'`.
   - Client-side UPI app links (`upi://pay?pa=...`) only launch external wallet applications; they have zero authority to alter database state.
   - Payments transition to `VERIFIED` only via explicit admin verification (`POST /api/v1/payments/admin/verify`).

---

## 4. Privacy & Data Minimization

1. **Customer Presence Concealment:**
   - Presence tracking broadcasts are sent exclusively to WebSocket clients with `role === 'ADMIN'`.
   - Customers never receive peer presence payloads.
2. **PII Shielding:**
   - Student contact numbers and hostel room numbers are accessible only to the seller for delivery execution.

---

## 5. Environment & Secret Management
- `.env` is ignored by Git; `.env.example` provides the approved configuration template.
- Real SMTP credentials (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`) must be provided via server environment variables.
