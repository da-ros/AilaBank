# 🎨 FLORENCE'S DETAILED TASK BREAKDOWN
## Frontend UX, Contract Co-Development & Demo Experience

**Last Updated**: October 30, 2025  
**Target**: AI Agents on Arc with USDC Hackathon (Submission: Nov 8)  
**Your Role**: Frontend UX/UI, Smart Contract Co-Development, Demo Production

---

## 📋 TASK OVERVIEW

| Phase | Tasks | Est. Time | Priority |
|-------|-------|-----------|----------|
| **Contract Co-Development** | 8 tasks | 2-3 days | 🔴 Critical |
| **Design System** | 5 tasks | 1 day | 🟡 High |
| **Core Components** | 12 tasks | 3 days | 🔴 Critical |
| **Localization** | 4 tasks | 1 day | 🟡 High |
| **Demo Production** | 6 tasks | 2 days | 🔴 Critical |
| **Polish & Testing** | 5 tasks | 1 day | 🟡 High |

**Total Estimated Time**: 10-12 days

---

## 🔵 Updated Focus Areas (Blue Ocean Features)

1. Action affordances for key flows (non‑voice)
   - Quick actions for RateSweep adjustments (policy sliders/buttons)
   - Cross‑border send flow with guided steps and validation
   - Merchant invoice/subscription creation with templates

2. Cross‑border remittance optimizer (UX)
   - Quote comparison UI: cheapest/fastest + reliability score, proof‑of‑best‑execution drawer
   - Recipient claim UX: no‑app link, choose cash‑out (bank/mobile money/stablecoin)

3. Merchant toolkit
   - Invoices, subscriptions, refunds; on‑chain receipt viewer; accounting export (CSV/QuickBooks)
   - “Effective MDR” banner showing fee offset via settlement yield

4. Treasury dashboard (SME)
   - Policy editor: buffer %, APY thresholds, withdrawal priorities
   - Laddered stablecoin/RWA visualization; supplier autopay queue

5. Public reliability & cost dashboard
   - Corridor KPIs: median delivery time, all‑in cost on $200, success rate
   - Status page component for homepage

Deliverables will be reflected in components and pages within `frontend/src/components` and `frontend/src/pages`, wired to Pedro’s APIs and Ramspheld’s contract events.

---

## 📋 Task Overview — Full Checklist

1) Design System and Foundations (Day 1)
- Tailwind config and tokens (colors, spacing, elevation)
- Components baseline (Button, Input, Select, Modal, Toast)
- Dark mode + responsive grid primitives

2) Wallet and Account Basics (Days 2–3)
- `WalletConnect.tsx` (Metamask/Circle), network switch to Arc
- Account banner with address, network, balances
- Error/empty states for not-connected, wrong-network, permission prompts

3) Balance and Yield Surfaces (Days 2–3)
- `BalanceDisplay.tsx` with principal + yield + TVL stats
- `YieldStats.tsx` with allocation split (buffer vs yield), APY estimate
- Real-time refresh + event-driven updates (Indexer)

4) Transaction and Intent UX (Days 3–4)
- Command palette / quick actions (keyboard + UI), no microphone
- Clear confirmations and human‑readable reasoning returned from API
- Multilingual support (copy + locale switching)

5) Cross-Border Remittance Optimizer (Days 4–5)
- `QuoteCompare.tsx`: cheapest/fastest options, fees, ETA, reliability score
- `RouteDetailsDrawer.tsx`: corridor pack, PSPs used, compliance payload preview
- `BestExecutionReceiptModal.tsx`: show quote, route, FX, fees, spread, on-chain hash
- Recipient claim page (no-app flow): choose bank/mobile money/stablecoin

6) Merchant Toolkit (Days 5–6)
- `InvoiceCreate.tsx` (one-time), `SubscriptionCreate.tsx` (recurring)
- Payment link/QR generator + claim/receipt page
- `RefundModal.tsx` + receipt update; accounting export (CSV/QuickBooks)
- “Effective MDR” banner with yield-offset calculation

7) SME Treasury & Policy UX (Days 6–7)
- `PolicyEditor.tsx`: buffer %, APY thresholds, withdrawal priority rules
- `RwaLadder.tsx`: laddered stablecoin/RWA visualization
- `SupplierAutopayQueue.tsx`: due dates, amounts, rule-based scheduling

8) Public Reliability & Cost Dashboard (Days 7–8)
- `CorridorKPIs.tsx`: all-in cost on $200, median delivery, success rate
- Status page widget and API polling with caching

9) Accessibility, Localization, and Polish (Day 8)
- WCAG: focus order, aria labels, keyboard traps, color contrast
- i18n: EN + one additional locale (strings coverage ≥ 95%)
- Error boundaries, loading skeletons, optimistic toasts

10) Demo Experience (Day 9)
- Scripted flows: Grace deposit, cross-border send, merchant payment, policy tweak (voice handled by Pedro’s component)
- Hotkeys and safe demo data toggles
- Screenshots and short screen-capture snippets for README/deck

See complete Florence task documentation with all code examples, design patterns, voice interface implementations, and demo production guidelines in the full document.

This includes:
- Smart contract testing from UX perspective
- Complete design system with Tailwind config
- Reusable component library
-- Voice interface owned and shipped by Pedro (see Pedro doc)
- Transaction history with filters
- Balance visualization
- Localization setup
- Demo video scripting
- Accessibility features

**[Full document content available - truncated here for brevity]**
