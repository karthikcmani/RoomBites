# RoomBites — Technical Blueprint & Architecture Specification

- **Version:** 1.0.0
- **Status:** Approved
- **Document ID:** DOC-TECH-002

---

## 1. System Topology Overview

```
                      ┌──────────────────────────────────────┐
                      │    Client Applications (Frontend)    │
                      │  - React 19 + TypeScript + Vite      │
                      │  - Tailwind CSS + Lucide Icons       │
                      │  - PWA Service Worker + Manifest     │
                      │  - Capacitor Android APK (F-Droid)   │
                      └──────────────────┬───────────────────┘
                                         │
                   HTTPS REST API        │        Bidirectional WebSocket
                   (JSON Payloads)       │        (WSS / Presence / Chimes)
                                         ▼
                      ┌──────────────────────────────────────┐
                      │        RoomBites Backend API         │
                      │  - Node.js v22 + Express             │
                      │  - TypeScript Core Business Logic    │
                      │  - JWT Auth & Role Access Control    │
                      │  - Order State Machine Engine        │
                      │  - Integer-Paise Ledger Engine       │
                      │  - WebSocket Presence Hub (`ws`)     │
                      └──────────────────┬───────────────────┘
                                         │
                                         ▼
                      ┌──────────────────────────────────────┐
                      │          Data Storage Tier           │
                      │  - PostgreSQL 16+ (Supabase/Docker)  │
                      │  - SQLite (Local Dev / In-Memory CI) │
                      │  - ACID Transactions                 │
                      │  - Strict Referential Integrity      │
                      └──────────────────────────────────────┘
```

---

## 2. Real-Time Protocol Specification (WebSocket)

### 2.1 Connection Lifecycle
- **Endpoint:** `ws://<HOST>:<PORT>/ws`
- **Handshake:** Token passed either via query param `?token=<JWT>` or initial authentication frame:
```json
{
  "type": "AUTH",
  "payload": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI..."
  }
}
```
- **Connection Registry:**
  - Upon authentication, socket is mapped in `ConnectionManager` with metadata: `userId`, `role` (`CUSTOMER` or `ADMIN`), `roomNumber`, `name`, `connectedAt`, `lastPingAt`.

### 2.2 Client-to-Server Message Frames
1. **Heartbeat / Activity Ping (Every 25s):**
```json
{
  "type": "HEARTBEAT",
  "payload": {
    "activity": "browsing_menu", // options: "browsing_menu", "viewing_item", "cart", "checkout", "order_tracking"
    "metadata": { "productId": "prod_tea_01" }
  }
}
```

2. **Presence State Switch:**
```json
{
  "type": "PRESENCE_STATE",
  "payload": {
    "status": "online" // or "away" when tab loses focus
  }
}
```

### 2.3 Server-to-Client Message Frames
1. **Admin Broadcast: Customer Presence Updated:**
   *Sent exclusively to connected sockets with `role === 'ADMIN'`.*
```json
{
  "type": "PRESENCE_UPDATE",
  "payload": {
    "userId": "usr_9981",
    "name": "Abhishek Nair",
    "roomNumber": "B-304",
    "status": "online",
    "activity": "viewing_item",
    "lastSeen": "2026-11-15T02:50:00.000Z"
  }
}
```

2. **New Order Event (Triggering Admin Chime):**
   *Broadcast to all active Admin sockets.*
```json
{
  "type": "ORDER_CREATED",
  "payload": {
    "orderId": "ord_10029",
    "customerName": "Rahul K",
    "roomNumber": "A-112",
    "totalPaise": 3500,
    "paymentMethod": "UPI",
    "itemsCount": 2,
    "placedAt": "2026-11-15T02:51:10.000Z"
  }
}
```

3. **Order Status Change (Targeted to Specific Customer & Admin):**
```json
{
  "type": "ORDER_STATUS_CHANGED",
  "payload": {
    "orderId": "ord_10029",
    "previousStatus": "PLACED",
    "newStatus": "ACCEPTED",
    "estimatedPrepMinutes": 10,
    "updatedAt": "2026-11-15T02:52:00.000Z"
  }
}
```

4. **Alternative Product Suggestion:**
```json
{
  "type": "ALTERNATIVE_SUGGESTED",
  "payload": {
    "orderId": "ord_10029",
    "originalItemName": "Boost",
    "suggestedItemId": "prod_horlicks_01",
    "suggestedItemName": "Horlicks",
    "priceDifferencePaise": 0,
    "note": "Boost is finished tonight, can I serve Horlicks?"
  }
}
```

---

## 3. Financial Computation & Data Formats

### 3.1 Strict Integer Currency Policy
- All monetary values are maintained in Indian Paise (\(1\text{ Rupee} = 100\text{ Paise}\)).
- In JavaScript/TypeScript, standard `number` safely represents integers up to \(2^{53} - 1\) (\(> 90\text{ trillion rupees}\)).
- Rounding issues commonly introduced by floating-point arithmetic (`0.1 + 0.2 = 0.30000000000000004`) are eliminated by design.

### 3.2 Double-Entry Ledger Structure
Every financial interaction creates an immutable entry in the `credit_ledger` table:
- **Debit:** Adding an unpaid credit order increases student balance liability.
- **Credit:** Customer cash payment or verified UPI settlement records a payment entry reducing student balance liability.
- Outstanding balance is dynamically computed or materialized:
  $$\text{Current Balance} = \sum \text{Unpaid Debits} - \sum \text{Settled Credits}$$

---

## 4. Security Architecture & RLS Emulation
1. **Authentication Token (JWT):**
   - Issued upon verified OTP or Google OAuth callback.
   - Contains: `{ sub: userId, email: string, role: 'CUSTOMER' | 'ADMIN', roomNumber: string }`.
   - Expiration: Access token 7 days; refreshed smoothly via standard refresh token endpoint.
2. **Access Control Middleware:**
   - `requireAuth`: Guarantees valid JWT.
   - `requireAdmin`: Enforces `req.user.role === 'ADMIN'`. Blocks customer queries with `403 Forbidden`.
   - `enforceCustomerOwnership`: Verifies that `order.customer_id === req.user.id` so students cannot query or modify peer records.
3. **Password & Secret Hygiene:**
   - Passwordless email OTP verification via cryptographically secure 6-digit numeric tokens expiring in 10 minutes.
   - Admin credentials initialized via CLI migration or secure master seed token.

---

## 5. Offline & Network Resilience Strategy
- **Service Worker (PWA):**
  - Caches app shell, fonts, static assets, and catalog JSON.
  - Intercepts fetch requests when offline to serve the cached menu with an informative "Offline Mode — Real-time updates paused" banner.
- **Order Protection:**
  - Order submission buttons are disabled if the WebSocket / network state is offline. Orders cannot be confirmed locally without a verified server receipt (`orderId`).
