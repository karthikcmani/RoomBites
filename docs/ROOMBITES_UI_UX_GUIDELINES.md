# RoomBites — UI/UX Design System & Experience Guidelines

- **Version:** 1.0.0
- **Status:** Approved
- **Document ID:** DOC-UI-004

---

## 1. Design Philosophy: Built by Students, for Students
RoomBites delivers a polished, modern, tactile food ordering experience inspired by consumer favorites like Swiggy and Zomato, but stripped of commercial bloat, dark patterns, ad banners, and unnecessary marketing overlays.

### Core Tenets
1. **Speed & Clarity:** A hungry student at 2:00 AM wants tea and biscuits in fewer than 3 taps.
2. **Night-Friendly Aesthetics:** Warm, cozy midnight ambiance with high-contrast accessibility (easy on tired eyes during late study sessions).
3. **Tactile Reassurance:** Real-time visual status steppers, immediate optimistic UI toggles, and clear order receipts.
4. **Distinct Admin Workflow:** The seller interface is a high-density, mission-control command center designed for one-handed operation while cooking.

---

## 2. Color Palette & Theming

```
Primary Brand:
  - Amber Gold (Warm Brew): #F59E0B (Tailwind amber-500)
  - Deep Tangerine:        #EA580C (Tailwind orange-600)
  - Dark Midnight Slate:   #0F172A (Tailwind slate-900)
  - Soft Card Dark:        #1E293B (Tailwind slate-800)
  - Border Subtle:         #334155 (Tailwind slate-700)

Status & Feedback:
  - Success / Available:   #10B981 (Emerald 500)
  - Pending / Warning:     #F59E0B (Amber 500)
  - Out of Stock / Alert:  #EF4444 (Red 500)
  - Busy / Sleeping:       #6366F1 (Indigo 500)

Typography & Text:
  - Heading & Primary:     #F8FAFC (Slate 50)
  - Body & Muted:          #94A3B8 (Slate 400)
  - Accent / Links:        #FBBF24 (Amber 400)
```

---

## 3. Typography & Spacing System
- **Font Stack:** `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, Helvetica, Arial, sans-serif`
- **Scale:**
  - `Display / Banner`: 24px–28px, Bold (700)
  - `H1 Page Title`: 20px–22px, Bold (700)
  - `H2 Section Header`: 16px–18px, Semi-Bold (600)
  - `Body / Product Name`: 14px–15px, Medium (500)
  - `Captions & Badges`: 11px–12px, Regular/Medium (400/500)
- **Touch Targets:** Minimum 44x44px touch targets on all interactive buttons, steppers, and inputs for seamless thumb navigation on mobile screens.

---

## 4. Key Customer Screens & Workflows

1. **Splash & Institutional Login:**
   - Quick input for `@rit.ac.in` student email.
   - 6-digit numeric OTP input with auto-focus and resend countdown.
2. **Midnight Menu (Home):**
   - Live Shop Status Banner at top (`OPEN & BREWING`, `BUSY (15m delay)`, `SLEEPING`).
   - Sticky category pills (All, Tea, Coffee, Health Drinks, Instant Food, Snacks).
   - Product Cards featuring crisp photo, title, price badge, stock indicator, and immediate `+ ADD` or quantity stepper.
   - Floating Cart Pill showing total item count and price with instant slide-up checkout sheet.
3. **Cart & Room Delivery Checkout:**
   - Saved hostel room number (editable).
   - Special cooking/delivery notes ("Make it extra sweet", "Don't knock, call me").
   - Payment Selector: `Cash (Visit room)`, `UPI (QR/Intent)`, `Credit (Owe balance)`.
4. **Live Order Tracker:**
   - Progress stepper: `Placed` → `Accepted` → `Preparing` → `Out for Delivery` → `Delivered`.
   - Admin alternative proposal modal with instant one-tap Accept/Decline.
5. **Customer Profile & Dues Ledger:**
   - Displays current outstanding dues in rupees.
   - Unpaid orders breakdown with clear status badges.
   - Credit eligibility status banner.

---

## 5. Dedicated Admin Command Center

1. **Top Metric Bar:**
   - Today's Orders, Today's Sales (₹), Active Orders in Kitchen, Online Students Browsing.
2. **Emergency Store Override Control:**
   - Single-tap toggle to switch between `AVAILABLE`, `BUSY`, and `SLEEPING`.
3. **Live Order Feed:**
   - Audio chime on every incoming order.
   - Prominent Accept (Green), Reject (Red), and Suggest Alternative (Amber) buttons.
4. **Real-Time Customer Presence Roster:**
   - Live list of hostel students currently online, their room number, and what they are viewing.
5. **Inventory & Fast Price Editor:**
   - Instant toggle for item availability (`In Stock` / `Sold Out`).
6. **Credit Ledger & Settlement Drawer:**
   - View student balances, record cash repayments, and grant/revoke credit permissions.
