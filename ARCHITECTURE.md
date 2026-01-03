
# 🔒 Internal Architecture & Confidential Specs

**CONFIDENTIAL:** This document contains internal implementation details, database schemas, and infrastructure configurations. Do not share publicly.

---

## 1. Cloud Infrastructure (Firebase)

### Backend Services (`functions/index.js`)
The backend is a monolithic Express app hosted on Firebase Cloud Functions (`us-central1`).

**Base URL:** `https://us-central1-stonksai-7c836.cloudfunctions.net/api`

### API Endpoints

#### Authentication & User Management
*   `POST /auth/google`: Verifies Google ID Tokens and syncs user to Firestore.
*   `GET /user/profile`: Fetches fresh user data (Tier, Usage, Limits).
*   `POST /user/update-stats`: Syncs client-side gamification stats (XP, Level) to DB.

#### Admin & System
*   `POST /admin/toggle-beta`: Grants/Revokes access to the Beta Gate.
*   `GET /admin/list-users`: Paginated user registry view.
*   `POST /admin/system/update`: Updates global feature flags (e.g., `beta_active`).
*   `POST /admin/system/keys`: Hot-swaps API keys without redeploying code.

#### Financial Data Proxies (Layer 2 Caching)
*   `GET /polygon/*`: Proxies requests to Polygon.io.
*   `GET /twelvedata/*`: Proxies requests to Twelve Data.
*   `GET /financial-datasets-proxy`: Proxies requests to FinancialDatasets.ai.
*   `GET /news`: Aggregates NewsAPI data.

#### Billing (Stripe)
*   `POST /stripe/create-checkout-session`: Initiates upgrading.
*   `POST /stripe/create-portal-session`: Opens Stripe management portal.
*   `POST /stripe/change-subscription`: **[Internal]** Direct downgrades/cross-grades.
*   `POST /stripe/cancel-subscription`: **[Internal]** Schedules cancellation at period end.
*   `POST /stripe/webhook`: Handles events `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`.

---

## 2. Database Schema (Firestore)

### Collection: `users`
Document ID: `email` (e.g., `user@example.com`)

| Field | Type | Description |
| :--- | :--- | :--- |
| `uid` | String | Google Auth UID. |
| `betauser` | Boolean | **Critical:** Controls access to the app past the landing page. |
| `superadmin` | Boolean | Grants access to `/admin` panel. |
| `subscription` | String | Tier ID (`tier0`, `tier1`, `tier2`, `tier3`). |
| `subscriptionStatus` | String | Stripe status (`active`, `past_due`, `canceled`). |
| `stripeCustomerId` | String | Link to Stripe Customer. |
| `stripeSubscriptionId` | String | Link to active Stripe Subscription. |
| `cancelAtPeriodEnd` | Boolean | True if user has requested cancellation. |
| `usage` | Map | Usage counters: `{ sentiment: 5, analysis: 12, ... }`. |
| `cycleStartDate` | Timestamp | Date when `usage` counters reset (Monthly). |
| `xp`, `level`, `streak` | Number | Gamification stats. |

### Collection: `system_settings`
*   `doc: api_keys`: Stores encrypted API keys for 3rd party services.
*   `doc: config`: Global flags (`beta_active`).
*   `doc: subscription_tiers`: JSON definition of pricing and limits.

### Collection: `api_cache`
Stores cached JSON responses from external APIs to reduce costs.
*   `payload`: JSON data.
*   `expiry`: Timestamp.

---

## 3. Caching Strategy (Layered)

To minimize API costs (specifically Financial Datasets and Polygon), we use a 3-layer strategy defined in `services/cacheService.ts` and `functions/index.js`.

**TTL Definitions:**
*   **Real-time (60s):** Stock Prices (Quote/Snapshot).
*   **Short-Term (15m):** News, Intraday Bars.
*   **Medium-Term (4h):** Qandle Technical Data.
*   **Long-Term (24h):** Financial Metrics (P/E, Beta).
*   **Weekly (7d):** Company Facts (Sector, Description), Insider Trades.

**Logic:**
1.  **L1 Memory:** Checks Node.js `Map` (Hot Cache).
2.  **L2 Firestore:** Checks `api_cache` collection.
3.  **L3 Origin:** Calls external API -> Writes to L2 & L1.

---

## 4. AI Prompt Engineering (`services/gemini.ts`)

### Context Injection
We do not rely on the LLM's training data for prices. We use a **RAG-lite** approach:
1.  **Pre-fetch:** Identify tickers in prompt.
2.  **Tooling:** Fetch Price, News, and Technicals via our Proxy.
3.  **Injection:** Append raw JSON data to the System Instruction.
    *   *Prompt Format:* "You are a financial analyst. Context: [JSON_DATA]. Task: {User_Query}."

### Hallucination Control
*   **Schema Enforcement:** We use `responseSchema` (JSON Mode) for all critical outputs (Analysis, Screener) to ensure the UI never breaks.
*   **Grounding:** For the "Alpha Hunter" screener, we explicitly enable the `googleSearch` tool to allow the model to find real-time catalysts not in our DB.

---

## 5. Deployment Keys (Environment)

**Production (Firebase Config):**
```bash
firebase functions:config:set api.polygon="KEY" api.twelve_data="KEY" ...
```

**Client-Side (Local Fallback):**
If backend services fail, the client falls back to `localStorage` keys injected via `index.tsx` bootstrapping or the Admin Panel.
