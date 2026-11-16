# RoomBites Design System Specification
**Document ID:** `DOC-RB-DESIGN-SYS-2026-11-16`  
**Phase:** Phase 2 — Design System & Semantic Token Architecture  
**Author:** Principal Product Designer & Design Systems Architect  

---

## 1. Visual Identity & Brand Philosophy

* **Brand Statement:** *Effortless midnight dining for hostelites.*
* **Aesthetic Direction:** Minimalist, calm, warm commercial commerce interface. Every element must justify the screen pixels it occupies. No superfluous decorations, neon glows, or visual clutter.

---

## 2. Color Palette & Semantic Token Architecture

RoomBites uses semantic CSS custom properties defined on `:root` and `.dark` so that all components consume abstract tokens instead of hardcoded hex values.

### 2.1. Light Theme Token Palette (Warm Off-White / Ivory)
* **Background (`--bg-canvas`):** `#FAF9F6` (Warm ivory off-white)
* **Main Surface (`--bg-surface`):** `#FFFFFF` (Pure crisp white)
* **Elevated Surface (`--bg-elevated`):** `#F3F2EE` (Soft warm grey)
* **Subtle Surface (`--bg-muted`):** `#EAE8E2` (Neutral tint)
* **Border & Dividers (`--border-subtle`):** `#E5E3DC` (Very soft neutral border)
* **Border Strong (`--border-strong`):** `#D2CFC7`
* **Text Primary (`--text-primary`):** `#1F2124` (Deep charcoal, WCAG AAA compliant)
* **Text Secondary (`--text-secondary`):** `#6B7077` (Muted neutral)
* **Text Tertiary (`--text-tertiary`):** `#9AA0A6` (Light metadata)
* **Accent Primary (`--accent-primary`):** `#E69500` (Warm refined amber)
* **Accent Hover (`--accent-hover`):** `#D08500`
* **Accent Surface (`--accent-surface`):** `rgba(230, 149, 0, 0.08)` (Pale amber tint)
* **Accent Text (`--accent-text`):** `#C47D00`
* **Success (`--state-success`):** `#16A34A` / surface: `rgba(22, 163, 74, 0.08)`
* **Warning (`--state-warning`):** `#D97706` / surface: `rgba(217, 119, 6, 0.08)`
* **Danger/Error (`--state-danger`):** `#DC2626` / surface: `rgba(220, 38, 38, 0.08)`

### 2.2. Dark Theme Token Palette (Premium Deep Charcoal)
* **Background (`--bg-canvas`):** `#101318` (Deep midnight charcoal — avoiding pure `#000000`)
* **Main Surface (`--bg-surface`):** `#171C24` (Distinct card surface)
* **Elevated Surface (`--bg-elevated`):** `#202733` (Modals, popovers, active controls)
* **Subtle Surface (`--bg-muted`):** `#2A3342`
* **Border & Dividers (`--border-subtle`):** `rgba(255, 255, 255, 0.08)`
* **Border Strong (`--border-strong`):** `rgba(255, 255, 255, 0.14)`
* **Text Primary (`--text-primary`):** `#F4F5F7` (Soft white, high contrast)
* **Text Secondary (`--text-secondary`):** `#9DA5B2` (Readable muted grey)
* **Text Tertiary (`--text-tertiary`):** `#687182`
* **Accent Primary (`--accent-primary`):** `#F0AB32` (Refined luminous amber)
* **Accent Hover (`--accent-hover`):** `#F5B84B`
* **Accent Surface (`--accent-surface`):** `rgba(240, 171, 50, 0.12)`
* **Accent Text (`--accent-text`):** `#F0AB32`
* **Success (`--state-success`):** `#22C55E` / surface: `rgba(34, 197, 94, 0.12)`
* **Warning (`--state-warning`):** `#F59E0B` / surface: `rgba(245, 158, 11, 0.12)`
* **Danger/Error (`--state-danger`):** `#EF4444` / surface: `rgba(239, 68, 68, 0.12)`

---

## 3. Typography Scale

* **Font Family:** `system-ui, -apple-system, BlinkMacSystemFont, 'Inter', 'Segoe UI', Roboto, sans-serif`
* **Display / Hero:** 22px / line-height 28px, Weight 700
* **Title:** 17px / line-height 22px, Weight 700
* **Subhead / Large Body:** 14px / line-height 20px, Weight 600
* **Body Standard:** 13px / line-height 18px, Weight 400 & 500
* **Caption / Metadata:** 11px / line-height 15px, Weight 500
* **Micro:** 10px / line-height 13px, Weight 600 (Uppercase only for status badges)

---

## 4. Spacing Scale

* `4px` (`space-1`): Micro padding, badge offsets.
* `8px` (`space-2`): Inline element gaps, card interior micro gaps.
* `12px` (`space-3`): Standard padding inside cards and inputs.
* `16px` (`space-4`): Page gutter, section padding.
* `20px` (`space-5`): Distance between primary sections.
* `24px` (`space-6`): Modal padding, major header gaps.

---

## 5. Elevation & Corner Radii

* **Micro Elements (Chips, Buttons, Badges):** `rounded-lg` (8px)
* **Cards & Inputs:** `rounded-xl` (12px)
* **Modals & Bottom Drawers:** `rounded-2xl` (16px) or `rounded-t-3xl` (24px)
* **Shadows:** Restrained micro-shadows; dark mode relies on surface luminosity contrast rather than blur shadows.

---

## 6. Mobile Safe-Area & Ergonomics (Capacitor Android)

* **Top App Inset:** `max(env(safe-area-inset-top, 0px), 0px)`
* **Bottom App Inset:** `max(env(safe-area-inset-bottom, 0px), 0px)`
* **Touch Target Rule:** Every interactive control must have at least `44px x 44px` touchable area.
* **Bottom Navigation:** Fixed bottom navigation bar with thumb-friendly tabs:
  1. **Menu** (Shop & food catalog)
  2. **Orders** (Live order tracking & history)
  3. **Credit** (Ledger, dues, and requests)
  4. **Profile** (Account, settings, appearance)
* **Floating Cart Pill:** Positioned right above the bottom navigation bar when items are in cart.
