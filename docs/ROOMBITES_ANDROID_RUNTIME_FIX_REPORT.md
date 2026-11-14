# RoomBites — Android Runtime Bug Fix & Verification Report

- **Date:** 2026-11-15
- **Branch:** `feature/android-runtime-fixes`
- **Release:** v1.1.0-android-fix
- **Document ID:** DOC-REP-010
- **Status:** Verified on Android Runtime Environment

---

## 1. Executive Summary

Following local device testing on a physical Android device, three critical runtime issues were observed:
1. **OTP Authentication Failure:** SyntaxError `Unexpected token '<', "<!doctype "... is not valid JSON` when entering institutional `@rit.ac.in` addresses.
2. **Product Catalogue Not Loading:** The home screen rendered `0 items available` and `No items match your search` despite seed data existing in the backend.
3. **Android Status Bar & Safe Area Overlap:** Top header branding, logo, RIT badge, and Sign In button collided directly with the Android system status bar (clock, battery, cellular icons).

This report details the root causes discovered through live debugging, the architectural and code-level fixes implemented, and the verification results on the Android runtime environment.

---

## 2. Issues, Root Causes & Implemented Fixes

### 2.1 OTP Authentication & Catalogue Loading Failure (Shared Root Causes)

#### Identified Root Causes:
1. **Hardcoded Relative API Path in Native WebView:**
   - In `apps/web/src/services/api.ts`, the API base was hardcoded to `const API_BASE = '/api/v1'`.
   - On web desktop development, Vite proxies `/api` to `http://localhost:4000`.
   - On Android within Capacitor, the application is bundled locally into `android/app/src/main/assets/public/` and served at `http://localhost/` (or `https://localhost/`).
   - Relative requests (`fetch('/api/v1/auth/request-otp')`) resolved against the local WebView asset loader (`http://localhost/api/v1/...`). Because no static asset matches `/api/v1/...`, Capacitor's local server served `index.html` (the Single Page Application fallback).
2. **Blind JSON Parsing:**
   - `ApiClient.request` executed `const data = await response.json()` without checking `Content-Type`.
   - When the WebView served `index.html` (`<!doctype html>...`), `JSON.parse` threw `SyntaxError: Unexpected token '<', "<!doctype "... is not valid JSON`.
   - In `CustomerHome.tsx`, the catalogue loader caught this error and set products and categories to `[]`, erroneously rendering the "No items match your search" empty state instead of alerting the user to a network/backend failure.
3. **Chromium Mixed Content Blocking:**
   - Capacitor's default `androidScheme: "https"` forced the WebView to run under HTTPS (`https://localhost`).
   - When attempting to communicate with a local PC backend over HTTP (`http://<LAN_IP>:4000`), the Chromium WebView blocked all requests with `Mixed Content: The page at 'https://localhost/' was loaded over HTTPS, but requested an insecure resource 'http://...'. This request has been blocked`.
4. **Missing Cleartext Permission in Android Manifest:**
   - Android 9+ (API 28+) blocks unencrypted HTTP traffic by default unless `android:usesCleartextTraffic="true"` is declared on `<application>`.
5. **Backend Server Inactivity:**
   - The backend server on the developer's PC was not running during the initial device test.

#### Implemented Fixes:
1. **Dynamic Multi-Tier API Base URL Resolver ([`apiConfig.ts`](file:///d:/RoomBites/apps/web/src/config/apiConfig.ts)):**
   - Tier 1: User/tester override in `localStorage.getItem('roombites_api_server')` (editable live in-app).
   - Tier 2: Build-time environment variable `import.meta.env.VITE_API_URL` (injected via `npm run build:android` or `.env.android`).
   - Tier 3: Native Android detection fallback defaulting to the active PC LAN IP (`http://172.16.9.243:4000`) or ADB loopback.
   - Tier 4: Browser relative path fallback (`/api/v1`).
2. **Unified WebSocket URL Resolver:**
   - `getWebSocketUrl()` derives `ws://` / `wss://` dynamically from the active API server address.
3. **Strict Content-Type Validation & Network Error Interception:**
   - `ApiClient.request` inspects `response.headers.get('content-type')`. If non-JSON or HTML is returned, it extracts diagnostic text and raises a descriptive error explaining that the server returned HTML instead of crashing JSON parser.
   - Network disconnections and fetch failures produce user-friendly guidance indicating the exact target URL and instructions to check network connectivity.
4. **In-App Server Settings Modal ([`ServerSettingsModal.tsx`](file:///d:/RoomBites/apps/web/src/components/ServerSettingsModal.tsx)):**
   - Accessible via the status indicator in the navbar or the error banner on the home screen.
   - Allows testers to change the backend IP (e.g., when switching Wi-Fi networks or using USB `adb reverse tcp:4000 tcp:4000`), test `/health` connectivity with one click, and reload without reinstalling the APK.
5. **Capacitor Configuration & Cleartext Policy:**
   - Updated `apps/web/capacitor.config.json` with `"androidScheme": "http"` to prevent Chromium Mixed Content blocking when communicating with local development backends.
   - Added `android:usesCleartextTraffic="true"` to `apps/web/android/app/src/main/AndroidManifest.xml`.
6. **Backend CORS Support:**
   - Updated `backend/src/index.ts` to authorize `https://localhost`, `capacitor://localhost`, `http://localhost`, and local private subnet ranges (`192.168.*`, `172.*`, `10.*`).

---

### 2.2 Status Bar & Layout Overlap

#### Identified Root Causes:
1. In `apps/web/index.html`, `<meta name="viewport" content="... viewport-fit=cover" />` forces the Android WebView to draw edge-to-edge behind the Android system status bar.
2. In `apps/web/src/components/Navbar.tsx`, the `<header>` element only had standard vertical padding `py-3` (12px).
3. The Android system status bar on modern Android devices (e.g., Nothing Phone (3a) with hole-punch camera or Redmi Note 8 with teardrop notch) occupies 28dp to 38dp (~35px to 48px).
4. Because the header had no safe-area inset top padding, the logo, RoomBites text, and Sign In button rendered underneath the system clock, battery, and cellular indicators.
5. Floating cart bar at the bottom had standard `bottom-4` (16px), colliding with Android 10+ gesture navigation pill bars.

#### Implemented Fixes:
1. **CSS Safe-Area Inset Handling ([`apps/web/src/index.css`](file:///d:/RoomBites/apps/web/src/index.css)):**
   - Defined `--sat: env(safe-area-inset-top, 0px)` and `--app-safe-top: 0px`.
   - In `apps/web/src/main.tsx`, if running on Android/Capacitor, initialized a guaranteed minimum `--app-safe-top: 28px` fallback so devices where WebViews report 0px insets still protect the status bar.
2. **Navbar Header Padding ([`Navbar.tsx`](file:///d:/RoomBites/apps/web/src/components/Navbar.tsx)):**
   - Configured `paddingTop: calc(max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px)) + 0.75rem)` and `pb-3`.
   - The header background (`bg-slate-900/95`) extends to the top of the physical screen behind the status bar, creating a unified dark status bar, while all interactive branding and controls start cleanly below system icons.
3. **Toast Alert Banners ([`App.tsx`](file:///d:/RoomBites/apps/web/src/App.tsx)):**
   - Adjusted top offset to `calc(max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px)) + 4.25rem)`.
4. **Floating Cart Bar Safe Inset ([`FloatingCartBar.tsx`](file:///d:/RoomBites/apps/web/src/components/FloatingCartBar.tsx)):**
   - Adjusted bottom positioning to `calc(max(env(safe-area-inset-bottom, 0px), 0.75rem) + 0.5rem)` to remain clear of the Android gesture navigation pill.
5. **Android Native Theme ([`styles.xml`](file:///d:/RoomBites/apps/web/android/app/src/main/res/values/styles.xml)):**
   - Specified `<item name="android:statusBarColor">#0f172a</item>` and `<item name="android:windowLightStatusBar">false</item>` for crisp white status bar indicators matching RoomBites theme.

---

## 3. Files Modified

| File | Changes Made |
| :--- | :--- |
| `apps/web/src/config/apiConfig.ts` | **Created.** Multi-tier resolver for API base URL and WebSocket URL with localStorage, env, and native fallbacks. |
| `apps/web/src/components/ServerSettingsModal.tsx` | **Created.** In-app server URL configuration, health testing, and preset picker modal. |
| `apps/web/src/vite-env.d.ts` | **Created.** TypeScript environment type declarations for `VITE_API_URL`. |
| `apps/web/.env.android` | **Created.** Android build-time configuration (`VITE_API_URL=http://172.16.9.243:4000`). |
| `apps/web/.env.example` | **Created.** Documentation template for frontend environment variables. |
| `apps/web/src/services/api.ts` | Replaced hardcoded `/api/v1` with dynamic base URL; added strict `Content-Type` verification and human-readable network error messages. |
| `apps/web/src/contexts/RealtimeContext.tsx` | Switched hardcoded WebSocket URL to dynamic `getWebSocketUrl()`. |
| `apps/web/src/pages/CustomerHome.tsx` | Added `loadError` state, connection failure banner with retry/settings buttons, and safe bottom padding. |
| `apps/web/src/components/Navbar.tsx` | Added safe-area status bar padding, mobile connection status indicator, and server settings trigger. |
| `apps/web/src/components/FloatingCartBar.tsx` | Added safe-area bottom offset for gesture navigation bars. |
| `apps/web/src/App.tsx` | Offset toast alert banner container below the padded navbar. |
| `apps/web/src/main.tsx` | Added Android runtime detection and `--app-safe-top` fallback. |
| `apps/web/src/index.css` | Added safe-area CSS variables and utility classes. |
| `apps/web/capacitor.config.json` | Set `"androidScheme": "http"` to prevent Chromium Mixed Content blocking. |
| `apps/web/android/app/src/main/AndroidManifest.xml` | Added `android:usesCleartextTraffic="true"`. |
| `apps/web/android/app/src/main/res/values/styles.xml` | Configured status bar color `#0f172a` and light status bar icons. |
| `apps/web/package.json` | Added `"build:android": "tsc -b && vite build --mode android"`. |
| `backend/src/index.ts` | Updated CORS configuration to accept mobile Capacitor origins and local private subnets. |

---

## 4. Verification & Testing Results

### 4.1 Backend Test Suite
Executed: `cd backend && npm test`
- **Result:** 24/24 tests passed across 8 suites (`pass 24, fail 0` in 536ms).
- Verified domain quarantine, rate limits, OTP hashing with pepper, order lifecycle, and shop availability.

### 4.2 Frontend Compilation
Executed: `cd apps/web && npm run build:android`
- **Result:** Built successfully in 4.43s with TypeScript checks passing.

### 4.3 Native Android Compilation
Executed: `cd apps/web/android && .\gradlew.bat assembleDebug` (with JDK 21)
- **Result:** `BUILD SUCCESSFUL in 3s` (85 actionable tasks).
- Generated: `apps/web/android/app/build/outputs/apk/debug/app-debug.apk` (4.43 MB).

### 4.4 Android Device & Runtime Verification
- **APK Installation:** `adb install -r app-debug.apk` succeeded (`Success`).
- **App Launch:** Started `in.ac.rit.roombites/.MainActivity` cleanly.
- **Logcat Inspection:** Zero Mixed Content errors, zero JSON syntax exceptions.
- **Visual Inspection via ADB Screencap:**
  - Status bar icons (time, battery, Wi-Fi) have clear margin above RoomBites logo and controls.
  - Full product catalogue (10 items across 6 categories) rendered with accurate pricing and badges.
  - Category filter pills functional.
  - Product customization sheet ("Normal Tea", Sugar, Strength) operational.
  - Floating cart bar floats above gesture bar (`Your Cart ₹12 | CHECKOUT ->`).
  - OTP authentication input tested: entered `25mp2576@rit.ac.in`, backend generated OTP, rate limits recorded in SQLite `otps` table, frontend seamlessly transitioned to verification screen.
  - Invalid OTP error handling tested: entering `000000` rendered clean red banner `INVALID_OTP: The entered verification code is incorrect.` without crashes.

---

## 5. Verification Matrix Summary

| Issue | Root Cause | Fix | Verification |
| :--- | :--- | :--- | :--- |
| **OTP Authentication** | Hardcoded relative `/api/v1` path routed to Android WebView local root; WebView served `index.html`; `response.json()` crashed with `Unexpected token '<'`. | Multi-tier API resolver (`apiConfig.ts`), strict Content-Type checking, descriptive network error handling, and `androidScheme: http`. | **FIXED & VERIFIED ON ANDROID.** OTP requested, stored in SQLite `otps`, transitioned to code entry; invalid code returned clean error. |
| **Product Catalogue** | Same API resolution failure caused `getCategories()` and `getProducts()` to throw SyntaxError, falling through to empty array state. | Dynamic API base URL, cleartext traffic permission, and dedicated offline catalogue error banner with retry/settings. | **FIXED & VERIFIED ON ANDROID.** All 10 products and 6 categories rendered with images, prices, customization schemas. |
| **Android Header Overlap** | `viewport-fit=cover` drew edge-to-edge behind system status bar without safe-area inset top padding in navbar. | Added `calc(max(env(safe-area-inset-top, 0px), var(--app-safe-top, 0px)) + 0.75rem)` padding, dark status bar color, and bottom safe-area insets. | **FIXED & VERIFIED ON ANDROID.** Verified via screenshot capture; header sits comfortably below status bar on modern Android display. |

---

## 6. Remaining Limitations & Production Notes

1. **Live Email Delivery Awaiting SMTP Credentials:**
   - In test/dev mode, OTPs are recorded securely in the database and email stream transport. Delivery to physical student inboxes requires configuring production SMTP credentials in `backend/.env`.
2. **Production Domain Configuration:**
   - For public release, `VITE_API_URL` should point to the public HTTPS domain (e.g., `https://api.roombites.rit.ac.in`). The local LAN IP is intended strictly for local Wi-Fi device testing.
