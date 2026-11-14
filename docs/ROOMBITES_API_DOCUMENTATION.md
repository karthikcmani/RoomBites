# RoomBites — REST & WebSocket API Documentation

- **Version:** 1.0.0
- **Base URL:** `/api/v1`
- **Protocol:** HTTPS (REST) & WSS (WebSocket `/ws`)
- **Authentication:** Bearer JWT in `Authorization: Bearer <token>` header

---

## 1. Authentication Endpoints (`/api/v1/auth`)

### 1.1 Request OTP
- **POST** `/auth/request-otp`
- **Access:** Public
- **Body:**
```json
{
  "email": "student@rit.ac.in"
}
```
- **Validation & Rate Limits:**
  - Must match `/^[a-zA-Z0-9._%+-]+@rit\.ac\.in$/i`.
  - 60-second cooldown between consecutive requests.
  - Maximum 5 requests per 15-minute rolling window.
- **Response 200 OK:**
```json
{
  "success": true,
  "message": "If this is a valid institutional address, a verification code has been dispatched to your institutional inbox."
}
```
- **Response 400 Bad Request (Rate Limited):**
```json
{
  "success": false,
  "error": "RATE_LIMITED: Please wait 45 seconds before requesting a new verification code."
}
```

### 1.2 Verify OTP & Session Handshake
- **POST** `/auth/verify-otp`
- **Access:** Public
- **Body:**
```json
{
  "email": "student@rit.ac.in",
  "otp": "492018"
}
```
- **Response 200 OK:**
```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "usr_9921",
    "email": "student@rit.ac.in",
    "role": "CUSTOMER",
    "hasProfile": true,
    "profile": {
      "fullName": "Kiran Kumar",
      "roomNumber": "B-214",
      "phoneNumber": "+919876543210",
      "creditStatus": "APPROVED",
      "unpaidOrdersCount": 1,
      "outstandingBalancePaise": 3500
    }
  }
}
```

### 1.3 Register / Update Profile
- **POST** `/auth/profile`
- **Access:** Authenticated Customer
- **Body:**
```json
{
  "fullName": "Kiran Kumar",
  "roomNumber": "B-214",
  "phoneNumber": "+919876543210"
}
```

---

## 2. Product & Catalog Endpoints (`/api/v1/products`)

### 2.1 Get Active Menu (Customer)
- **GET** `/products`
- **Access:** Public / Authenticated
- **Response 200 OK:**
```json
[
  {
    "id": "prod_tea_01",
    "name": "Normal Tea",
    "category": "Tea",
    "pricePaise": 1200,
    "priceFormatted": "₹12.00",
    "stockStatus": "IN_STOCK",
    "isAvailable": true,
    "customizations": {
      "sugar": ["None", "Normal", "Extra"],
      "strength": ["Light", "Medium", "Strong"]
    }
  }
]
```

### 2.2 Create / Update Product (Admin)
- **POST** `/products` (or **PATCH** `/products/:id`)
- **Access:** Admin only
- **Body:**
```json
{
  "name": "Bru Coffee",
  "categoryId": "cat_coffee",
  "pricePaise": 1500,
  "stockStatus": "IN_STOCK",
  "isAvailable": true,
  "description": "Hot brewed south Indian filter style Bru coffee",
  "hasCustomization": true,
  "customizationSchema": { "sugar": ["Less", "Normal", "More"] }
}
```

---

## 3. Order Management Endpoints (`/api/v1/orders`)

### 3.1 Place New Order
- **POST** `/orders`
- **Access:** Authenticated Customer
- **Body:**
```json
{
  "deliveryRoom": "B-214",
  "specialInstructions": "Please knock twice softly",
  "paymentMethod": "UPI", // "CASH", "UPI", "CREDIT"
  "isScheduled": false,
  "scheduledFor": null,
  "items": [
    {
      "productId": "prod_tea_01",
      "quantity": 2,
      "selectedOptions": { "sugar": "Normal", "strength": "Strong" }
    },
    {
      "productId": "prod_biscuits_01",
      "quantity": 1,
      "selectedOptions": {}
    }
  ]
}
```
- **Validation Rules Enforced on Server:**
  1. If `paymentMethod === 'CREDIT'`, check `user.creditStatus === 'APPROVED'` and `user.unpaidOrdersCount <= 2`. If unpaid count > 2, return `403 Forbidden` (`CREDIT_LIMIT_EXCEEDED`).
  2. Shop status must be `AVAILABLE` (or scheduled slot within operating hours).
  3. Prices snapshot computed from database prices (client total ignored).

### 3.2 List Customer Orders
- **GET** `/orders/my-orders`
- **Access:** Authenticated Customer

### 3.3 Admin Order Management
- **GET** `/admin/orders` (Filter by status: `ACTIVE`, `PENDING`, `COMPLETED`)
- **PATCH** `/admin/orders/:id/status`
- **Body:**
```json
{
  "status": "ACCEPTED", // "ACCEPTED", "REJECTED", "PREPARING", "OUT_FOR_DELIVERY", "DELIVERED"
  "rejectionReason": null
}
```

### 3.4 Propose Alternative Item
- **POST** `/admin/orders/:id/suggest-alternative`
- **Access:** Admin only
- **Body:**
```json
{
  "originalProductId": "prod_boost_01",
  "suggestedProductId": "prod_horlicks_01",
  "note": "Boost ran out, shall I make Horlicks?"
}
```

### 3.5 Respond to Alternative (Customer)
- **POST** `/orders/:id/respond-alternative`
- **Access:** Order Owner
- **Body:**
```json
{
  "action": "ACCEPT" // or "REJECT"
}
```

---

## 4. Payment & Credit Endpoints (`/api/v1/payments`)

### 4.1 Confirm Cash / UPI Payment (Admin)
- **POST** `/admin/payments/verify`
- **Access:** Admin only
- **Body:**
```json
{
  "orderId": "ord_10029",
  "paymentMethod": "UPI",
  "transactionRef": "UPI/632190821/GPAY",
  "amountPaise": 3500
}
```

### 4.2 Request Credit Privilege (Customer)
- **POST** `/credit/request`
- **Access:** Authenticated Customer

### 4.3 Approve / Revoke Credit (Admin)
- **POST** `/admin/credit/:userId/status`
- **Body:** `{ "status": "APPROVED" }`

### 4.4 Record Credit Settlement Payment (Admin)
- **POST** `/admin/credit/:userId/settle`
- **Body:**
```json
{
  "amountPaise": 3500,
  "description": "Cash settled by student in Room 102"
}
```

---

## 5. Shop Settings & Presence Endpoints

### 5.1 Shop Availability
- **GET** `/shop/status` (Public)
- **PATCH** `/admin/shop/status` (Admin)
  - Body: `{ "status": "BUSY", "statusNote": "Back in 20 minutes" }`

### 5.2 Live Admin Presence Roster
- **GET** `/admin/presence/online`
- **Access:** Admin only
- **Response:**
```json
[
  {
    "userId": "usr_9921",
    "name": "Kiran Kumar",
    "roomNumber": "B-214",
    "activity": "browsing_menu",
    "lastSeen": "2026-11-15T02:54:10.000Z"
  }
]
```
