
// Configuration for Backend Services

// When you run 'firebase deploy --only functions', you will get a URL like:
// https://us-central1-YOUR-PROJECT-ID.cloudfunctions.net/api
// Paste that URL here.

// For local development (firebase emulators:start), use:
// export const API_BASE_URL = 'http://127.0.0.1:5001/YOUR-PROJECT-ID/us-central1/api';

// UPDATE THIS WITH YOUR ACTUAL FIREBASE FUNCTIONS URL AFTER DEPLOYMENT
// Ensure there are no spaces inside the quotes
export const API_BASE_URL = 'https://us-central1-stonksai-7c836.cloudfunctions.net/api'; 

// Helper to switch between Direct Browser Calls (Legacy) and Backend Proxy (Production)
// Set to TRUE to use the Node.js backend proxies (solves CORS and enables Centralized Caching)
export const USE_BACKEND_PROXY = true;

// Set to TRUE to use Firebase Admin verification for Google Login
export const ENABLE_BACKEND_AUTH = true;
