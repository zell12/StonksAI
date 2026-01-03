
# StonksAI - Institutional-Grade Algorithmic Trading Agent

![Version](https://img.shields.io/badge/version-2.5.0--beta-blue.svg)
![Engine](https://img.shields.io/badge/AI_Engine-Gemini_3.0_Pro-violet.svg)
![Status](https://img.shields.io/badge/status-Active_Development-success.svg)

**StonksAI** is a next-generation financial research terminal designed to bridge the gap between retail traders and institutional-grade analytics. By leveraging the **Google Gemini 3.0** reasoning engine, StonksAI synthesizes real-time market data, technical indicators, and global sentiment into actionable, hallucination-resistant trading strategies.

---

## ⚡ Core Capabilities

### 1. 📡 Command Deck (Market Situational Awareness)
The dashboard serves as the central nervous system for the trader.
*   **Real-time Sentiment Gauge**: A visual "Fear & Greed" meter derived from processing thousands of global news headlines and social signals in real-time.
*   **Live Market Pulse**: An infinite-scroll ticker tape displaying real-time price action and system status logs.
*   **Gamified Progression**: Users earn XP and level up (from "Novice Analyst" to "Apex Predator") by performing high-quality research, encouraging daily engagement and disciplined analysis.

### 2. 🎯 Alpha Hunter (Semantic Screener)
Unlike traditional screeners that require complex filter configurations, Alpha Hunter accepts **Natural Language Queries**.
*   *Example:* "Find me undervalued biotech stocks with FDA approvals pending next month."
*   **Deep Grounding**: The AI utilizes Google Search tooling to verify catalysts (e.g., earnings dates, product launches) that are not yet reflected in structured financial datasets.
*   **Automated Scoring**: Candidates are ranked 0-10 based on the strength of their technical setup and fundamental catalysts.

### 3. 🔬 Market X-Ray (Deep Dive Analysis)
A multi-modal synthesis engine that aggregates disparate data sources into a single coherent report.
*   **Technical & Fundamental Fusion**: Combines hard numbers (P/E, EPS, Beta) with chart patterns (MACD, RSI, Support/Resistance).
*   **Visual Intelligence**: Interactive, lightweight candlestick charts with AI-plotted key levels.
*   **Consensus Engine**: Generates a clear Buy/Sell/Hold recommendation with specific price targets derived from Wall Street analyst consensus and algorithmic projection.

### 4. ⚡ Volatility Labs (Options Strategist)
The most advanced module, designed to turn market outlooks into executable derivatives contracts.
*   **Outlook-Based Generation**: Users define an outlook (Bullish, Bearish, Neutral, Volatile), and the AI constructs multi-leg strategies (Iron Condors, Spreads, LEAPS).
*   **Greek Optimization**: Strategies are mathematically optimized for Delta (directional exposure) and Theta (time decay).
*   **Risk Profiles**: Every strategy is tagged with a risk level (Conservative vs. Aggressive) and includes specific entry prices, exit targets, and stop-loss levels.

### 5. 🛡️ Risk Guardian (Portfolio Audit)
A defensive module for stress-testing asset allocation.
*   **Macro-Simulation**: Tests how a portfolio would perform under specific scenarios (e.g., "High Inflation," "Tech Sector Correction").
*   **Correlation Detection**: Identifies hidden risks where seemingly different assets move in lockstep.
*   **Hedge Recommendations**: Suggests specific instruments (e.g., Puts, Inverse ETFs, Commodities) to neutralize detected risks.

---

## 💎 Subscription & Economy

StonksAI operates on a tiered access model managed via Stripe.

| Tier | Target User | Key Features | Monthly Price |
| :--- | :--- | :--- | :--- |
| **Beta / Free** | Casual Observers | Basic Quotes, Limited Scans | **$0** |
| **Explorer** | Active Traders | Daily AI Analysis, Basic Options | **$29** |
| **Analyst** | Professionals | High-Volume Scanning, Deep Dives | **$59** |
| **Strategist** | Institutions | Unlimited AI Reasoning, Portfolio Stress Tests | **$99** |

*Note: During the Closed Beta phase, selected users are granted "Strategist" level access for testing purposes.*

---

## 🏗️ Technology Stack

StonksAI is built on a serverless, event-driven architecture designed for high availability and security.

*   **Frontend**: React 19, TypeScript, Tailwind CSS, Vite.
*   **Backend**: Firebase Cloud Functions (Node.js 18).
*   **Database**: Google Cloud Firestore (NoSQL).
*   **AI Core**: Google Gemini 1.5 Pro / 3.0 Flash Preview via Google GenAI SDK.
*   **Auth**: Google OAuth 2.0 (Identity Platform).
*   **Payments**: Stripe (Custom Checkout & Portal Integration).

---

## 🌍 Data Partners & Integrations

We do not rely on a single source of truth. Our "Mesh Network" of data providers ensures redundancy and accuracy.

1.  **Polygon.io**: Historical price aggregates and previous close data.
2.  **Twelve Data**: Real-time intraday quotes and currency pairs.
3.  **FinancialDatasets.ai**: Institutional-grade fundamentals (Balance Sheets, Insider Trades).
4.  **NewsAPI**: Global financial news aggregation for sentiment analysis.
5.  **Qandle.ai**: Alternative data and quantitative metrics.

---

*Disclaimer: StonksAI is a research tool for informational purposes only. It does not constitute financial advice. Trading stocks and options involves significant risk.*
