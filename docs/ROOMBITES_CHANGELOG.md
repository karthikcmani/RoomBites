# RoomBites — Changelog

All notable changes to the RoomBites project will be documented in this file.
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-11-15

### Added
- **Full Backend API & Real-time Server:**
  - Node.js 22 + TypeScript + Express backend with WebSocket (`ws`) broker.
  - Institutional `@rit.ac.in` domain verification with OTP authentication.
  - Double-entry integer-paise financial ledger (eliminating floating-point inaccuracy).
  - Strict Credit Management implementing Rule 15 (maximum 2 unpaid dues allowed).
  - Order state machine supporting `PLACED`, `ACCEPTED`, `REJECTED`, `PREPARING`, `OUT_FOR_DELIVERY`, `DELIVERED`, and `CANCELLED`.
  - Alternative product suggestion workflow allowing seller substitution with customer acceptance.
  - Real-time customer presence tracking shielded strictly to authenticated administrators.
  - Shop availability states (`AVAILABLE`, `BUSY`, `CLOSED`, `SLEEPING`) with emergency contact display.
  - 15 automated tests executed via native test runner with 100% pass rate.
- **Cross-Platform Client & Admin Application:**
  - Modern, mobile-first React 18 + TypeScript + Vite + Tailwind CSS frontend.
  - Audio synthesizer using HTML5 Web Audio API for order chimes with zero external audio assets.
  - PWA manifest and mobile viewport configuration.
  - Native Android wrapper generated via Capacitor for clean APK generation and F-Droid eligibility.
  - Swiggy/Zomato inspired midnight design system with category pill bar, item customizer modal, slide-up cart sheet, and live order tracker stepper.
  - Dedicated Admin Command Center with live order feed, customer presence roster, inventory stock toggles, credit settlement, and announcement broadcasting.
- **DevOps & Infrastructure:**
  - Docker Compose configuration for PostgreSQL and Node.js backend.
  - Dockerfile for production containerization.
  - GitHub Actions CI workflow running backend tests and frontend builds on every commit.
  - Complete documentation suite across 12 permanent documents in `docs/`.
