
const functions = require("firebase-functions");
const admin = require("firebase-admin");
const express = require("express");
const cors = require("cors");
const axios = require("axios");
const { OAuth2Client } = require("google-auth-library");
const crypto = require("crypto");
// Stripe setup
const Stripe = require("stripe");

// Initialize Firebase Admin
admin.initializeApp();
const db = admin.firestore();

const app = express();

const GOOGLE_CLIENT_ID = "526639900692-s45r863nd7e32daprk110omgnkuvtr4s.apps.googleusercontent.com";
const authClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// --- DYNAMIC KEY MANAGEMENT ---

// 1. In-Memory Key Cache (Hot Cache) - Expires every 60s
let keyCache = null;
let keyCacheTime = 0;

/**
 * Fetch API Keys dynamically from Firestore or Fallback to Defaults.
 * Initializes Firestore document if missing.
 */
const getKeys = async () => {
    const now = Date.now();
    
    // Check Memory Cache (1 minute)
    if (keyCache && (now - keyCacheTime < 60000)) {
        return keyCache;
    }

    const docRef = db.collection('system_settings').doc('api_keys');
    
    try {
        const doc = await docRef.get();
        let keys = {
            polygon: functions.config().api?.polygon || process.env.POLYGON_API_KEY || "",
            twelve_data: functions.config().api?.twelve_data || process.env.TWELVE_DATA_API_KEY || "",
            financial_datasets: functions.config().api?.financial_datasets || process.env.FINANCIAL_DATASETS_API_KEY || "",
            news_api: functions.config().api?.news_api || process.env.NEWS_API_KEY || "",
            qandle: functions.config().api?.qandle || process.env.QANDLE_API_KEY || "",
            stripe_secret: functions.config().api?.stripe_secret || process.env.STRIPE_SECRET_KEY || "",
            stripe_webhook_secret: functions.config().api?.stripe_webhook_secret || process.env.STRIPE_WEBHOOK_SECRET || ""
        };

        if (doc.exists) {
            // Merge defaults with DB to ensure new fields (like stripe_secret) appear if missing
            keys = { ...keys, ...doc.data() };
        } else {
            // First run: Initialize DB
            console.log("Initializing API Keys in Firestore...");
            await docRef.set(keys);
        }

        keyCache = keys;
        keyCacheTime = now;
        return keys;

    } catch (e) {
        console.error("Failed to fetch keys from Firestore:", e);
        // Emergency Fallback
        return keyCache || {
            polygon: "", twelve_data: "", financial_datasets: "", news_api: "", qandle: "", stripe_secret: "", stripe_webhook_secret: ""
        };
    }
};

// Helper to get initialized Stripe instance
const getStripe = async () => {
    const keys = await getKeys();
    return new Stripe(keys.stripe_secret);
};

// Helper to find Internal Tier ID based on Stripe Price ID
const findTierByPriceId = async (stripePriceId) => {
    const doc = await db.collection("system_settings").doc("subscription_tiers").get();
    if (!doc.exists) {
        console.warn("System settings for tiers not found in DB.");
        return null;
    }
    
    const tiers = doc.data().tiers || [];
    const matched = tiers.find(t => t.stripePriceId === stripePriceId);
    if (!matched) {
        console.warn(`No internal tier matches Stripe Price ID: ${stripePriceId}. Available:`, tiers.map(t => `${t.id}:${t.stripePriceId}`));
    }
    return matched ? matched.id : null;
};

// --- 1. SPECIAL WEBHOOK ROUTE (DEFINED FIRST) ---
app.post("/stripe/webhook", express.raw({type: 'application/json'}), async (req, res) => {
    const sig = req.headers['stripe-signature'];
    const keys = await getKeys();
    
    let event;

    try {
        // 1. Signature Verification Logic
        let payload = req.body;
        if (!Buffer.isBuffer(payload)) {
            if (req.rawBody) {
                payload = req.rawBody;
            } else {
                console.error("[Stripe] ❌ Critical: Payload is not a Buffer and req.rawBody is missing.");
                throw new Error("Payload is not a Buffer. Signature verification impossible.");
            }
        }

        if (keys.stripe_webhook_secret && sig) {
            const stripe = await getStripe();
            event = stripe.webhooks.constructEvent(payload, sig, keys.stripe_webhook_secret);
        } else {
            console.warn("[Stripe] ⚠️ Webhook Secret not configured. Skipping signature verification.");
            if (Buffer.isBuffer(payload)) {
                event = JSON.parse(payload.toString());
            } else {
                event = req.body;
            }
        }
    } catch (err) {
        console.error(`[Stripe] ❌ Webhook Signature Verification Failed: ${err.message}`);
        return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    console.log(`[Stripe Webhook] Verified event: ${event.type}`);

    try {
        // Handle Event Types
        if (event.type === 'checkout.session.completed') {
            const session = event.data.object;
            const email = session.client_reference_id; // User Email
            const stripeCustomerId = session.customer;
            const newSubscriptionId = session.subscription;
            
            console.log(`[Stripe] Checkout Completed for: ${email}, Customer: ${stripeCustomerId}`);

            // --- DUPLICATE CLEANUP LOGIC ---
            if (newSubscriptionId && stripeCustomerId) {
                const stripe = await getStripe();
                const activeSubs = await stripe.subscriptions.list({ customer: stripeCustomerId, status: 'active' });
                
                for (const sub of activeSubs.data) {
                    if (sub.id !== newSubscriptionId) {
                        console.log(`[Stripe] Canceling PREVIOUS active subscription to enforce Max 1: ${sub.id}`);
                        try {
                            await stripe.subscriptions.cancel(sub.id);
                        } catch(cancelErr) {
                            console.error(`[Stripe] Failed to cancel old subscription ${sub.id}:`, cancelErr);
                        }
                    }
                }
            }
            // -------------------------------

            // STRATEGY 1: Check Metadata (Most Robust)
            let internalTierId = session.metadata?.tierId;

            // STRATEGY 2: Check Price ID Mapping (Fallback)
            if (!internalTierId) {
                console.log("[Stripe] No tierId in metadata, attempting Price ID lookup...");
                const stripe = await getStripe();
                const sub = await stripe.subscriptions.retrieve(newSubscriptionId);
                const priceId = sub.items.data[0].price.id;
                internalTierId = await findTierByPriceId(priceId);
            }
            
            if (email) {
                if (internalTierId) {
                    console.log(`[Stripe] Upgrading ${email} to ${internalTierId}`);
                    
                    await db.collection("users").doc(email).set({
                        subscription: internalTierId, 
                        stripeCustomerId: stripeCustomerId,
                        stripeSubscriptionId: newSubscriptionId,
                        subscriptionStatus: 'active',
                        cancelAtPeriodEnd: false, // Reset on new sub
                        cycleStartDate: admin.firestore.FieldValue.serverTimestamp(),
                        // Reset limits on upgrade
                        usage: { sentiment: 0, screener: 0, analysis: 0, options: 0, portfolio: 0 }
                    }, { merge: true });
                } else {
                    console.error(`[Stripe] ERROR: Could not determine internal tier. Database NOT updated.`);
                }
            } else {
                console.error("[Stripe] ERROR: No client_reference_id (email) found in session.");
            }
        }
        else if (event.type === 'customer.subscription.updated') {
            const sub = event.data.object;
            const stripeCustomerId = sub.customer;
            const status = sub.status; // active, past_due, canceled
            const priceId = sub.items.data[0].price.id;
            const cancelAtPeriodEnd = sub.cancel_at_period_end || false;
            
            // Find user by stripeCustomerId
            const userQuery = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).limit(1).get();
            
            if (!userQuery.empty) {
                const userDoc = userQuery.docs[0];
                
                const internalTierId = await findTierByPriceId(priceId);
                
                const updates = { 
                    subscriptionStatus: status,
                    stripeSubscriptionId: sub.id,
                    cancelAtPeriodEnd: cancelAtPeriodEnd
                };
                const currentTier = userDoc.data().subscription;

                // If plan changed (upgrade/downgrade via portal or direct API)
                if (internalTierId && internalTierId !== currentTier) {
                    console.log(`[Stripe] Plan change detected for ${userDoc.id}: ${internalTierId}`);
                    updates.subscription = internalTierId;
                    // Reset usage on plan change
                    updates.usage = { sentiment: 0, screener: 0, analysis: 0, options: 0, portfolio: 0 };
                    updates.cycleStartDate = admin.firestore.FieldValue.serverTimestamp();
                }
                
                await userDoc.ref.update(updates);
                console.log(`[Stripe] Updated sub status for ${userDoc.id} to ${status} (CancelAtEnd: ${cancelAtPeriodEnd})`);
            } else {
                console.warn(`[Stripe] No user found with customer ID: ${stripeCustomerId}`);
            }
        }
        else if (event.type === 'customer.subscription.deleted') {
            const sub = event.data.object;
            const stripeCustomerId = sub.customer;
            const deletedSubId = sub.id;
            
            const userQuery = await db.collection("users").where("stripeCustomerId", "==", stripeCustomerId).limit(1).get();
            if (!userQuery.empty) {
                const userDoc = userQuery.docs[0];
                const userData = userDoc.data();

                // RACE CONDITION FIX
                if (userData.stripeSubscriptionId && userData.stripeSubscriptionId !== deletedSubId) {
                    console.log(`[Stripe] 🛡️ Ignoring deletion of stale subscription ${deletedSubId}.`);
                    res.json({received: true, status: 'ignored_stale'});
                    return;
                }

                await userDoc.ref.update({
                    subscription: 'tier0', // Revert to Free
                    subscriptionStatus: 'canceled',
                    cancelAtPeriodEnd: false
                });
                console.log(`[Stripe] Canceled sub for ${userDoc.id}`);
            }
        }

        res.json({received: true});
    } catch (e) {
        console.error("[Stripe] Webhook Logic Error", e);
        res.status(400).send(`Webhook Error: ${e.message}`);
    }
});

// --- 2. GLOBAL MIDDLEWARE (AFTER WEBHOOK) ---
app.use(cors({ 
    origin: true, 
    exposedHeaders: ['Age', 'X-Cache', 'X-Cache-Layer', 'X-Response-Time'] 
}));

app.use(express.json());

// --- STRIPE ENDPOINTS ---

app.post("/stripe/create-checkout-session", async (req, res) => {
    try {
        const { email, priceId, tierId, successUrl, cancelUrl } = req.body;
        const stripe = await getStripe();
        
        let customer;
        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length > 0) {
            customer = customers.data[0];
        } else {
            customer = await stripe.customers.create({ email });
        }

        const session = await stripe.checkout.sessions.create({
            customer: customer.id,
            mode: 'subscription',
            payment_method_types: ['card'],
            line_items: [{ price: priceId, quantity: 1 }],
            success_url: successUrl,
            cancel_url: cancelUrl,
            client_reference_id: email,
            metadata: {
                tierId: tierId || '' 
            }
        });

        res.json({ url: session.url });
    } catch (e) {
        console.error("Stripe Checkout Error", e);
        res.status(500).json({ error: e.message });
    }
});

app.post("/stripe/create-portal-session", async (req, res) => {
    try {
        const { email, returnUrl } = req.body;
        const stripe = await getStripe();

        const customers = await stripe.customers.list({ email, limit: 1 });
        if (customers.data.length === 0) {
            return res.status(404).json({ error: "No billing account found" });
        }

        const session = await stripe.billingPortal.sessions.create({
            customer: customers.data[0].id,
            return_url: returnUrl,
        });

        res.json({ url: session.url });
    } catch (e) {
        console.error("Portal Error", e);
        res.status(500).json({ error: e.message });
    }
});

// NEW: Direct Change Subscription (For downgrades/cross-grades without Portal)
app.post("/stripe/change-subscription", async (req, res) => {
    try {
        const { email, newPriceId } = req.body;
        if (!email || !newPriceId) return res.status(400).json({ error: "Missing parameters" });

        const stripe = await getStripe();
        
        // 1. Get User from DB to find Sub ID
        const doc = await db.collection("users").doc(email).get();
        if (!doc.exists) return res.status(404).json({ error: "User not found" });
        
        const userData = doc.data();
        if (!userData.stripeSubscriptionId) return res.status(400).json({ error: "No active subscription to change" });

        // 2. Retrieve Subscription to get Item ID
        const sub = await stripe.subscriptions.retrieve(userData.stripeSubscriptionId);
        if (!sub || sub.status !== 'active' && sub.status !== 'trialing') {
             return res.status(400).json({ error: "Subscription is not active" });
        }
        
        const itemId = sub.items.data[0].id;

        // 3. Update Subscription
        // proration_behavior: 'always_invoice' creates an invoice immediately for the difference (or credit)
        // If downgrading, this usually results in a credit balance for the next cycle.
        const updatedSub = await stripe.subscriptions.update(userData.stripeSubscriptionId, {
            items: [{
                id: itemId,
                price: newPriceId,
            }],
            proration_behavior: 'always_invoice',
            cancel_at_period_end: false // Ensure we don't accidentally cancel
        });

        res.json({ status: "updated", sub: updatedSub });
    } catch (e) {
        console.error("Change Sub Error", e);
        res.status(500).json({ error: e.message });
    }
});

// NEW: Cancel Subscription (Downgrade to Free)
app.post("/stripe/cancel-subscription", async (req, res) => {
    try {
        const { email } = req.body;
        const stripe = await getStripe();

        const doc = await db.collection("users").doc(email).get();
        if (!doc.exists) return res.status(404).json({ error: "User not found" });
        
        const userData = doc.data();
        if (!userData.stripeSubscriptionId) return res.status(400).json({ error: "No active subscription" });

        // Set to cancel at end of period
        const updatedSub = await stripe.subscriptions.update(userData.stripeSubscriptionId, {
            cancel_at_period_end: true
        });

        res.json({ status: "canceled_at_period_end", sub: updatedSub });
    } catch (e) {
        console.error("Cancel Sub Error", e);
        res.status(500).json({ error: e.message });
    }
});

// --- CENTRALIZED CACHING SYSTEM ---

// 2. DATA HOT CACHE (In-Memory)
const hotCache = new Map();

// TTL Definitions (In Seconds)
const TTL = {
  REALTIME: 60,           // 1 min (Price)
  SHORT: 900,             // 15 mins (News, Intraday Bars)
  MEDIUM: 14400,          // 4 hours (Technicals)
  LONG: 86400,            // 24 hours (Metrics)
  WEEKLY: 604800          // 7 days (Company Facts, Insider)
};

/**
 * Standardized Response Header Helper
 */
const setDebugHeaders = (res, meta, userRole) => {
    // Standard Headers
    res.set('X-Response-Time', `${meta.duration}ms`);
    res.set('X-Cache', meta.hit ? 'HIT' : 'MISS');
    res.set('Age', meta.age ? Math.round(meta.age).toString() : '0');
    
    // Conditional Architecture Headers (Only for Superadmin)
    if (userRole === 'superadmin') {
        res.set('X-Cache-Layer', meta.layer); // MEMORY, DATABASE, ORIGIN
    }
};

/**
 * Orchestrator for 3-Layer Caching
 * Returns { payload, meta: { hit, layer, age, duration } }
 */
async function getCachedData(params) {
  const { key, ttlSeconds, fetcher } = params;
  const start = Date.now(); // Start timer
  const now = Date.now();
  const cacheKey = `api_cache_${key}`; // Namespace

  // --- LAYER 1: HOT CACHE (RAM) ---
  if (hotCache.has(cacheKey)) {
    const entry = hotCache.get(cacheKey);
    if (now < entry.expiry) {
      const duration = Date.now() - start;
      const age = (now - entry.createdAt) / 1000;
      console.log(`[HOT CACHE] Hit: ${key}`);
      return { 
          payload: entry.data, 
          meta: { hit: true, layer: 'MEMORY', age, duration } 
      };
    } else {
      hotCache.delete(cacheKey); // Expired
    }
  }

  // --- LAYER 2: FIRESTORE (Persistent) ---
  try {
    const docRef = db.collection('api_cache').doc(cacheKey);
    const doc = await docRef.get();

    if (doc.exists) {
      const data = doc.data();
      const expiry = data.expiry.toMillis(); 
      const updatedAt = data.updatedAt ? data.updatedAt.toMillis() : now;

      if (now < expiry) {
        console.log(`[DB CACHE] Hit: ${key}`);
        const duration = Date.now() - start;
        const age = (now - updatedAt) / 1000;
        
        // Populate Hot Cache for next time
        hotCache.set(cacheKey, { 
            data: data.payload, 
            expiry, 
            createdAt: updatedAt // Preserve original creation time
        });
        
        return { 
            payload: data.payload, 
            meta: { hit: true, layer: 'DATABASE', age, duration } 
        };
      } else {
        console.log(`[DB CACHE] Expired: ${key}`);
      }
    }
  } catch (e) {
    console.warn(`[CACHE] Firestore read failed: ${e.message}`);
  }

  // --- LAYER 3: EXTERNAL API ---
  console.log(`[API] Fetching: ${key}`);
  try {
    const result = await fetcher();
    const fetchDuration = Date.now() - start;

    // Validation Logic for Negative Caching
    let shouldCache = true;
    if (!result) {
        shouldCache = false;
    } else if (result.error) {
        const errStr = String(result.error).toLowerCase();
        if (errStr.includes("rate limit") || errStr.includes("too many requests") || errStr.includes("quota") || errStr.includes("50")) {
             shouldCache = false;
             console.warn(`[CACHE SKIP] Transient Error detected for ${key}: ${errStr}`);
        }
    }

    if (!shouldCache) {
        return { 
            payload: result, 
            meta: { hit: false, layer: 'ORIGIN', age: 0, duration: fetchDuration } 
        };
    }

    const expiryMillis = now + (ttlSeconds * 1000);

    // Save to Firestore
    db.collection('api_cache').doc(cacheKey).set({
      payload: result,
      expiry: admin.firestore.Timestamp.fromMillis(expiryMillis),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }).catch(e => console.error("Firestore write failed", e));

    // Save to Hot Cache
    hotCache.set(cacheKey, { 
        data: result, 
        expiry: expiryMillis,
        createdAt: now 
    });

    return { 
        payload: result, 
        meta: { hit: false, layer: 'ORIGIN', age: 0, duration: fetchDuration } 
    };

  } catch (e) {
    console.error(`[API] Fetch failed for ${key}:`, e.message);
    throw e;
  }
}

// Helper: Sanitize keys
const sanitizeKey = (str) => str.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();

// --- ROUTES ---

// 1. Auth Endpoint
app.post("/auth/google", async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).send({ error: "Token required" });

    const ticket = await authClient.verifyIdToken({
      idToken: token,
      audience: GOOGLE_CLIENT_ID, 
    });
    
    const payload = ticket.getPayload();
    const { email, name, picture, sub: uid } = payload;

    const userRef = db.collection("users").doc(email);
    const userDoc = await userRef.get();

    let userData;
    if (!userDoc.exists) {
      // Default to Free Tier on creation
      userData = {
        email, name, picture, uid,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        lastLogin: admin.firestore.FieldValue.serverTimestamp(),
        subscription: "tier0", 
        usage: { sentiment: 0, screener: 0, analysis: 0, options: 0, portfolio: 0 },
        cycleStartDate: admin.firestore.FieldValue.serverTimestamp(),
        level: 1, 
        xp: 0,
        betauser: false 
      };
      await userRef.set(userData);
    } else {
      await userRef.update({ lastLogin: admin.firestore.FieldValue.serverTimestamp() });
      userData = userDoc.data();
    }

    if (userData.createdAt && userData.createdAt.toDate) userData.createdAt = userData.createdAt.toDate();
    if (userData.lastLogin && userData.lastLogin.toDate) userData.lastLogin = userData.lastLogin.toDate();
    if (userData.cycleStartDate && userData.cycleStartDate.toDate) userData.cycleStartDate = userData.cycleStartDate.toDate();

    return res.status(200).send({ user: userData, status: "Authenticated" });
  } catch (error) {
    console.error("Auth Error:", error);
    return res.status(401).send({ error: "Invalid Token" });
  }
});

// 2. Refresh User Profile Endpoint
app.get("/user/profile", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).send({ error: "Email required" });
        
        res.set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
        
        const doc = await db.collection("users").doc(email).get();
        if (!doc.exists) return res.status(404).send({ error: "User not found" });
        
        const userData = doc.data();
        
        if (userData.createdAt && userData.createdAt.toDate) userData.createdAt = userData.createdAt.toDate();
        if (userData.lastLogin && userData.lastLogin.toDate) userData.lastLogin = userData.lastLogin.toDate();
        if (userData.cycleStartDate && userData.cycleStartDate.toDate) userData.cycleStartDate = userData.cycleStartDate.toDate();
        
        return res.status(200).json(userData);
    } catch (e) { 
        return res.status(500).send({ error: e.message }); 
    }
});

// Admin/System Routes
app.post("/admin/toggle-beta", async (req, res) => {
  try {
    const { targetEmail, enable } = req.body;
    const userRef = db.collection("users").doc(targetEmail);
    await userRef.update({ betauser: enable });
    return res.status(200).send({ status: "Success", betauser: enable });
  } catch (error) {
    return res.status(500).send({ error: "Update failed" });
  }
});

app.get("/admin/list-users", async (req, res) => {
    try {
        const { limit = 20, filter, lastCreated } = req.query;
        let query = db.collection("users").orderBy("createdAt", "desc");
        if (filter === 'pending') query = query.where("betauser", "==", false);
        if (lastCreated && lastCreated !== "undefined") {
            const lastDate = new Date(lastCreated);
            if (!isNaN(lastDate.getTime())) query = query.startAfter(lastDate);
        }
        const snapshot = await query.limit(parseInt(limit)).get();
        const users = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            if (data.createdAt && data.createdAt.toDate) data.createdAt = data.createdAt.toDate();
            if (data.lastLogin && data.lastLogin.toDate) data.lastLogin = data.lastLogin.toDate();
            if (data.cycleStartDate && data.cycleStartDate.toDate) data.cycleStartDate = data.cycleStartDate.toDate();
            users.push(data);
        });
        return res.status(200).json({ users, hasMore: users.length === parseInt(limit) });
    } catch (e) { return res.status(500).send({ error: e.message }); }
});

app.get("/admin/get-user", async (req, res) => {
    try {
        const { email } = req.query;
        if (!email) return res.status(400).send({ error: "Email required" });
        const doc = await db.collection("users").doc(email).get();
        if (!doc.exists) return res.status(404).send({ error: "User not found" });
        return res.status(200).json(doc.data());
    } catch (e) { return res.status(500).send({ error: e.message }); }
});
app.get("/system/status", async (req, res) => {
    try {
        const doc = await db.collection("system_settings").doc("config").get();
        if (!doc.exists) return res.status(200).json({ beta_active: true });
        return res.status(200).json(doc.data());
    } catch (e) { return res.status(500).send({ error: e.message }); }
});
app.post("/admin/system/update", async (req, res) => {
    try {
        await db.collection("system_settings").doc("config").set(req.body, { merge: true });
        return res.status(200).json({ status: "System Config Updated" });
    } catch (e) { return res.status(500).send({ error: e.message }); }
});
app.get("/system/model-options", async (req, res) => {
    try {
        const docRef = db.collection("system_settings").doc("model_options");
        const doc = await docRef.get();
        const defaults = [
            { id: 'gemini-3-flash-preview', label: 'Gemini 3.0 Flash', desc: 'Fastest' },
            { id: 'gemini-3-pro-preview', label: 'Gemini 3.0 Pro', desc: 'Highest Reasoning' }
        ];
        if (!doc.exists) return res.status(200).json({ options: defaults });
        return res.status(200).json(doc.data());
    } catch (e) { return res.status(500).send({ error: e.message }); }
});

// NEW: Subscription Tiers Management
app.get("/system/subscription-tiers", async (req, res) => {
    try {
        const docRef = db.collection("system_settings").doc("subscription_tiers");
        const doc = await docRef.get();
        const defaults = [
            { 
                id: 'tier0', name: 'Beta / Free', enabled: true,
                description: 'Essential tools for casual market observers.', price: 0, 
                limits: { sentiment: 40, screener: 40, analysis: 20, options: 20, portfolio: 40 } 
            },
            { 
                id: 'tier1', name: 'Explorer', enabled: true,
                description: 'Ideal for active traders seeking daily opportunities.', price: 29, 
                limits: { sentiment: 40, screener: 40, analysis: 15, options: 15, portfolio: 20 } 
            },
            { 
                id: 'tier2', name: 'Analyst', enabled: true,
                description: 'Professional grade data for serious portfolio management.', price: 59, 
                limits: { sentiment: 120, screener: 120, analysis: 40, options: 40, portfolio: 40 } 
            },
            { 
                id: 'tier3', name: 'Strategist', enabled: true,
                description: 'Unlimited institutional power and reasoning capabilities.', price: 99, 
                limits: { sentiment: 200, screener: 200, analysis: 60, options: 60, portfolio: 60 } 
            }
        ];
        if (!doc.exists) { return res.status(200).json({ tiers: defaults }); }
        return res.status(200).json(doc.data());
    } catch (e) { return res.status(500).send({ error: e.message }); }
});

app.post("/admin/subscription-tiers/update", async (req, res) => {
    try {
        const { tiers } = req.body;
        if (!tiers || !Array.isArray(tiers)) return res.status(400).send({ error: "Invalid data format" });
        await db.collection("system_settings").doc("subscription_tiers").set({ tiers }, { merge: true });
        return res.status(200).json({ status: "Tiers Updated" });
    } catch (e) { return res.status(500).send({ error: e.message }); }
});

// NEW: Admin Key Management Endpoints
app.get("/admin/system/keys", async (req, res) => {
    try {
        const keys = await getKeys();
        return res.status(200).json(keys);
    } catch (e) {
        return res.status(500).send({ error: "Failed to fetch keys" });
    }
});

app.post("/admin/system/keys", async (req, res) => {
    try {
        const newKeys = req.body;
        // Merge with existing
        const currentKeys = await getKeys();
        const updatedKeys = { ...currentKeys, ...newKeys };
        
        await db.collection("system_settings").doc("api_keys").set(updatedKeys);
        
        // Invalidate Memory Cache
        keyCache = updatedKeys;
        keyCacheTime = Date.now();
        
        return res.status(200).json({ status: "Keys Updated" });
    } catch (e) {
        return res.status(500).send({ error: "Failed to update keys" });
    }
});

// --- CACHED PROXY ROUTES ---

// 6. NewsAPI Proxy
app.get("/news", async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).send({ error: "Symbol required" });

    const keys = await getKeys();
    const key = `NEWS_${sanitizeKey(symbol)}`;
    const { payload, meta } = await getCachedData({
        key,
        ttlSeconds: TTL.SHORT,
        fetcher: async () => {
            const response = await axios.get(`https://newsapi.org/v2/everything`, {
                params: { q: symbol, sortBy: "publishedAt", language: "en", apiKey: keys.news_api },
            });
            // Optimization Logic: Truncate and map BEFORE returning to be cached
            const raw = response.data.articles || [];
            const optimized = raw.slice(0, 50).map(a => ({
                headline: a.title,
                date: a.publishedAt ? a.publishedAt : 'N/A',
                outlet: a.source?.name || 'Unknown',
                // Keep brief summary, drop huge content block
                summary: (a.description || a.content || '').substring(0, 200).replace(/[\r\n]+/g, ' ').trim()
            }));
            return { news: optimized };
        }
    });

    setDebugHeaders(res, meta, req.get('X-User-Role'));
    return res.json(payload);
  } catch (error) {
    return res.json({ news: [] });
  }
});

// 7. Financial Datasets Proxy
app.get("/financial-datasets-proxy", async (req, res) => {
  try {
    const { endpoint, ticker, ...otherParams } = req.query;
    if (!endpoint) return res.status(400).json({ error: "Endpoint required" });

    const keys = await getKeys();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint.substring(1) : endpoint;
    const tickerKey = ticker ? sanitizeKey(ticker) : 'GLOBAL';
    const endpointKey = sanitizeKey(cleanEndpoint);
    const key = `FD_${endpointKey}_${tickerKey}`;

    let ttl = TTL.LONG; 
    if (cleanEndpoint.includes('insider') || cleanEndpoint.includes('facts')) {
        ttl = TTL.WEEKLY; 
    } else if (cleanEndpoint.includes('price')) {
        ttl = TTL.REALTIME; 
    } else if (cleanEndpoint.includes('news')) {
        ttl = TTL.SHORT; 
    }

    const { payload, meta } = await getCachedData({
        key,
        ttlSeconds: ttl,
        fetcher: async () => {
            const targetUrl = `https://api.financialdatasets.ai/${cleanEndpoint}`;
            const response = await axios.get(targetUrl, {
                params: { ticker, ...otherParams, apikey: keys.financial_datasets },
                headers: { 'User-Agent': 'QuantAI-Backend/1.0', 'X-API-KEY': keys.financial_datasets },
                validateStatus: (status) => status < 600
            });
            return response.data;
        }
    });

    setDebugHeaders(res, meta, req.get('X-User-Role'));
    return res.json(payload);
  } catch (error) {
    return res.status(200).json({ error: "Proxy Execution Failed", details: error.message });
  }
});

// 8. Polygon - Previous Close
app.get("/polygon/prev", async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    const keys = await getKeys();
    const key = `POLY_PREV_${sanitizeKey(symbol)}`;
    const { payload, meta } = await getCachedData({
        key,
        ttlSeconds: TTL.REALTIME,
        fetcher: async () => {
            const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol.toUpperCase()}/prev`, {
                params: { adjusted: true, apiKey: keys.polygon }
            });
            return response.data;
        }
    });
    
    setDebugHeaders(res, meta, req.get('X-User-Role'));
    return res.json(payload);
  } catch (error) {
    return res.status(500).send({ error: "Polygon Error" });
  }
});

// 9. Polygon - Historical Aggregates
app.get("/polygon/aggs", async (req, res) => {
  try {
    const { ticker, multiplier, timespan, from, to } = req.query;
    if (!ticker || !multiplier || !timespan || !from || !to) {
        return res.status(400).json({ error: "Missing historical parameters" });
    }

    const keys = await getKeys();
    const paramString = `${ticker}_${multiplier}_${timespan}_${from}_${to}`;
    const hash = crypto.createHash('md5').update(paramString).digest('hex');
    const key = `POLY_AGGS_${hash}`;

    const { payload, meta } = await getCachedData({
        key,
        ttlSeconds: TTL.SHORT,
        fetcher: async () => {
            const url = `https://api.polygon.io/v2/aggs/ticker/${ticker.toUpperCase()}/range/${multiplier}/${timespan}/${from}/${to}`;
            // Use 'desc' sorting to prioritize the NEWEST data.
            // If the query limit is hit (5000), we drop the oldest records, not the newest.
            // The client must reverse the array for charting.
            const response = await axios.get(url, {
                params: { adjusted: true, sort: 'desc', limit: 5000, apiKey: keys.polygon }
            });
            return response.data;
        }
    });

    setDebugHeaders(res, meta, req.get('X-User-Role'));
    return res.json(payload);
  } catch (error) {
    return res.status(500).send({ error: "Polygon Historical Error" });
  }
});

// 10. Twelve Data Proxy
app.get("/twelvedata/quote", async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    const keys = await getKeys();
    const key = `TD_QUOTE_${sanitizeKey(symbol)}`;
    const { payload, meta } = await getCachedData({
        key,
        ttlSeconds: TTL.REALTIME, 
        fetcher: async () => {
            const response = await axios.get(`https://api.twelvedata.com/quote`, {
                params: { symbol: symbol, apikey: keys.twelve_data }
            });
            return response.data;
        }
    });

    setDebugHeaders(res, meta, req.get('X-User-Role'));
    return res.json(payload);
  } catch (error) {
    return res.status(500).send({ error: "TwelveData Error" });
  }
});

// 11. User Stats Sync (Enhanced for Usage & Tiers)
app.post("/user/update-stats", async (req, res) => {
  try {
    const { email, stats } = req.body;
    if (!email || !stats) return res.status(400).send({ error: "Missing data" });
    const userRef = db.collection("users").doc(email);

    const updatePayload = { lastActive: admin.firestore.FieldValue.serverTimestamp() };
    if (stats.xp !== undefined) updatePayload.xp = stats.xp;
    if (stats.level !== undefined) updatePayload.level = stats.level;
    if (stats.streak !== undefined) updatePayload.streak = stats.streak;
    
    // Usage Tracking
    if (stats.usage !== undefined) updatePayload.usage = stats.usage;
    
    // Check both for updates to ensure consistency
    if (stats.subscription !== undefined) {
        updatePayload.subscription = stats.subscription;
    }
    // Backward compat: if old client sends subscriptionTier, map to subscription
    else if (stats.subscriptionTier !== undefined) {
        updatePayload.subscription = stats.subscriptionTier;
    }
    
    if (stats.cycleStartDate !== undefined) {
        let d = new Date(stats.cycleStartDate);
        if (isNaN(d.getTime())) {
             if (typeof stats.cycleStartDate === 'object' && stats.cycleStartDate._seconds) {
                 d = new Date(stats.cycleStartDate._seconds * 1000);
             } else if (typeof stats.cycleStartDate === 'object' && stats.cycleStartDate.seconds) {
                 d = new Date(stats.cycleStartDate.seconds * 1000);
             }
        }
        if (!isNaN(d.getTime())) {
            updatePayload.cycleStartDate = admin.firestore.Timestamp.fromDate(d);
        }
    }
    
    await userRef.update(updatePayload);
    return res.status(200).send({ status: "Updated" });
  } catch (error) { return res.status(500).send({ error: "Update failed" }); }
});

// 12. Qandle AI Proxy
app.get("/qandle/asset", async (req, res) => {
  try {
    const { symbol } = req.query;
    if (!symbol) return res.status(400).json({ error: "Symbol required" });

    const keys = await getKeys();
    const key = `QANDLE_${sanitizeKey(symbol)}`;
    const { payload, meta } = await getCachedData({
        key,
        ttlSeconds: TTL.MEDIUM,
        fetcher: async () => {
            const response = await axios.get(`https://api.qandle.ai/asset`, {
                params: { symbol: symbol },
                headers: { 'x-api-key': keys.qandle }
            });
            return response.data;
        }
    });

    setDebugHeaders(res, meta, req.get('X-User-Role'));
    return res.json(payload);
  } catch (error) {
    return res.status(500).send({ error: "Qandle API Error" });
  }
});

// 13. Error Logging
app.post("/system/log-error", async (req, res) => {
    try {
        const { email, module, errorMessage, context, model, technicalDetails } = req.body;
        await db.collection("error_logs").add({
            email: email || 'anonymous',
            module: module || 'unknown',
            errorMessage: errorMessage || 'Unknown error',
            model: model || 'unspecified',
            technicalDetails: technicalDetails || 'N/A',
            context: context || {},
            timestamp: admin.firestore.FieldValue.serverTimestamp(),
            userAgent: req.get('User-Agent') || 'unknown'
        });
        return res.sendStatus(200);
    } catch (e) {
        return res.sendStatus(500);
    }
});

exports.api = functions.https.onRequest(app);
