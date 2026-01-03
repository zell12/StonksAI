
import { GoogleGenAI, Type, FunctionDeclaration, Tool, FunctionCall } from "@google/genai";
import { AnalysisResult, OptionsStrategy, ScreenerResult, MarketSentiment, PortfolioAudit } from "../types";
import { 
  getCompanyFacts, 
  getStockPriceSnapshot, 
  getFinancialMetricsSnapshot, 
  getCompanyNews,
  getInsiderTrades,
  getQandleData,
  getPolygonHistoryContext
} from "./financialData";
import { 
  getMockStockAnalysis, 
  getMockOptions, 
  getMockScreener, 
  getMockPortfolio, 
  getMockSentiment 
} from "./mockData";
import { cacheService, CACHE_TIERS } from "./cacheService";

// Initialize Gemini Client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// DYNAMIC CONFIG HELPER
const getModelConfig = () => {
    let config = {
        agent_model: 'gemini-3-flash-preview',
        reasoning_model: 'gemini-3-flash-preview'
    };
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('quantai_model_config');
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                if (parsed.agent_model) config.agent_model = parsed.agent_model;
                if (parsed.reasoning_model) config.reasoning_model = parsed.reasoning_model;
            } catch(e) { console.warn("Failed to parse model config, using defaults"); }
        }
    }
    return config;
};

// --- DEMO UTILS ---
const isDemoMode = () => {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem('quantai_demo_mode') === 'true';
};
const simulateDelay = async (ms: number = 2000) => new Promise(resolve => setTimeout(resolve, ms));

// --- CACHE MANAGER ---
const CACHE_THRESHOLD = 32768; 
const CACHE_REGISTRY_KEY = 'quantai_gemini_cache_registry';

// Simple string hash
const generateCacheKey = (data: string): string => {
  let hash = 0, i, chr;
  if (data.length === 0) return hash.toString();
  for (i = 0; i < data.length; i++) {
    chr = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + chr;
    hash |= 0; 
  }
  return Math.abs(hash).toString(16);
};

const cacheRegistry = {
  get: (key: string): string | null => {
    if (typeof window === 'undefined') return null;
    try {
      const reg = JSON.parse(localStorage.getItem(CACHE_REGISTRY_KEY) || '{}');
      const record = reg[key];
      if (record && Date.now() < record.expiry) return record.name;
    } catch(e) {}
    return null;
  },
  set: (key: string, name: string, ttlSeconds: number) => {
    if (typeof window === 'undefined') return;
    try {
      const reg = JSON.parse(localStorage.getItem(CACHE_REGISTRY_KEY) || '{}');
      reg[key] = { name, expiry: Date.now() + (ttlSeconds * 1000) };
      localStorage.setItem(CACHE_REGISTRY_KEY, JSON.stringify(reg));
    } catch(e) {}
  }
};

async function getOrRegisterCache(
  model: string, 
  systemInstruction: string, 
  stableContent: string, 
  ttlSeconds: number = 300
): Promise<{ cachedContent?: string }> {
  // Fingerprint stable content
  const fingerprint = `${model}|${systemInstruction}|${stableContent}`;
  const cacheKey = generateCacheKey(fingerprint);

  try {
    const activeCacheName = cacheRegistry.get(cacheKey);
    if (activeCacheName) {
        console.log(`[Token Optimization] ⚡ CACHE HIT (Key: ${cacheKey.substring(0,8)}...).`);
        return { cachedContent: activeCacheName };
    }
    const contents = stableContent ? [{ role: 'user', parts: [{ text: stableContent }] }] : [];
    if (contents.length > 0) {
        const countResult = await ai.models.countTokens({ model, contents });
        const totalTokens = countResult.totalTokens;
        
        if (totalTokens >= CACHE_THRESHOLD) {
            console.log(`[Token Optimization] 🟢 Threshold Met (${totalTokens} tokens). Creating Cache...`);
            const cache = await ai.caches.create({
                model,
                config: {
                    displayName: `qai-${cacheKey}`,
                    systemInstruction,
                    contents,
                    ttl: `${ttlSeconds}s`
                }
            });
            cacheRegistry.set(cacheKey, cache.name, ttlSeconds);
            return { cachedContent: cache.name };
        }
    }
  } catch (e) {
      console.warn("[Token Optimization] Strategy failed, using standard context.", e);
  }
  return {};
}

// --- 1. TOOL REGISTRY ---
// Defines which function to call and whether its output is Volatile (Real-time) or Stable (Cacheable)

type ToolKey = 'price' | 'facts' | 'news' | 'metrics' | 'insider' | 'qandle' | 'polygonHistory';

const TOOL_REGISTRY: Record<ToolKey, { 
    fn: (ticker: string) => Promise<any>, 
    type: 'volatile' | 'stable',
    label: string 
}> = {
    'price': { fn: getStockPriceSnapshot, type: 'volatile', label: 'Real-time Price' },
    'facts': { fn: getCompanyFacts, type: 'stable', label: 'Company Facts' },
    'news': { fn: getCompanyNews, type: 'volatile', label: 'Recent News' },
    'metrics': { fn: getFinancialMetricsSnapshot, type: 'stable', label: 'Financial Fundamentals' },
    'insider': { fn: getInsiderTrades, type: 'volatile', label: 'Insider Trades' },
    'qandle': { fn: getQandleData, type: 'volatile', label: 'Qandle Technical Data' },
    'polygonHistory': { fn: getPolygonHistoryContext, type: 'volatile', label: 'Polygon Historical Bars (30d)' }
};

// --- 2. DATA PRE-FETCHER ---
// Runs the selected tools in parallel and sorts outputs

async function fetchContextData(ticker: string, tools: ToolKey[]) {
    const promises = tools.map(key => TOOL_REGISTRY[key].fn(ticker));
    const results = await Promise.all(promises);
    
    let heavyContext = '';
    let volatileContext = '';

    results.forEach((data, index) => {
        const key = tools[index];
        const def = TOOL_REGISTRY[key];
        
        if (data && !data.error) {
            const str = `\n[Source: ${def.label}]\n${JSON.stringify(data)}`;
            if (def.type === 'stable') {
                heavyContext += str;
            } else {
                volatileContext += str;
            }
        }
    });

    return { heavyContext, volatileContext };
}

// --- 3. UNIVERSAL SYNTHESIS RUNNER ---
// Standardized wrapper for Model Calls + Caching + Pre-fetching

async function runSynthesisAgent(
    userPrompt: string,
    schema: any,
    heavyContext: string,
    volatileContext: string,
    modelUsed: string = 'gemini-3-flash-preview',
    nativeTools: Tool[] = [] // Added nativeTools support
) {
    const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
    const systemInstruction = `You are a senior financial analyst agent.
    CURRENT DATE: ${today}.
    PROTOCOLS:
    1. SYNTHESIZE the provided data sources.
    2. Output JSON ONLY matching the schema.
    3. Do NOT hallucinate data not present in context.`;

    // Try Caching (Note: Caches only support stable text content, not dynamic tool configs usually)
    const stableData = heavyContext ? `\n\n[REFERENCE DATA - CACHED]\n${heavyContext}\n` : '';
    const configResult = await getOrRegisterCache(modelUsed, systemInstruction, stableData);

    let finalPrompt = '';
    let generateConfig: any = {
        responseMimeType: "application/json",
        responseSchema: schema,
    };

    if (configResult.cachedContent) {
        // Cached Path
        generateConfig.cachedContent = configResult.cachedContent;
        // NOTE: You cannot easily attach NEW tools to a CachedContent session that didn't have them.
        // If tools are needed (like Google Search), we might skip cache or ensure cache includes them.
        // For now, if we have a cache hit, we assume pure synthesis.
        finalPrompt = `${volatileContext}\n\nTASK: ${userPrompt}`;
    } else {
        // Standard Path
        generateConfig.systemInstruction = systemInstruction;
        
        // Attach native tools (e.g., Google Search) if provided
        if (nativeTools && nativeTools.length > 0) {
            generateConfig.tools = nativeTools;
        }

        finalPrompt = `${stableData}\n${volatileContext}\n\nTASK: ${userPrompt}`;
    }

    try {
        console.log(`[Gemini] Generating Synthesis (${modelUsed})... Tools: ${nativeTools.length}`);
        const response = await ai.models.generateContent({
            model: modelUsed,
            contents: finalPrompt,
            config: generateConfig
        });
        return cleanJsonOutput(response.text);
    } catch (e: any) {
        e.modelUsed = modelUsed;
        throw e;
    }
}

// Helper to clean JSON
function cleanJsonOutput(text: string): string {
    if (!text) return "{}";
    let clean = text.trim();
    const match = clean.match(/```json\s*([\s\S]*?)\s*```/);
    if (match) clean = match[1].trim();
    return clean;
}

// ============================================================================
// --- EXPORTED MODULE FUNCTIONS ---
// ============================================================================

// 3. ANALYZE STOCK -> Uses ALL tools + Pure Synthesis (No native tools)
export const analyzeStock = async (ticker: string): Promise<AnalysisResult> => {
    if (isDemoMode()) { await simulateDelay(2500); return getMockStockAnalysis(ticker); }
    const { agent_model } = getModelConfig();

    // Pick Tools - Polygon Historical data is fetched on stockanalysis.ts so tool is not here
    const tools: ToolKey[] = ['price', 'qandle', 'facts', 'news', 'metrics', 'insider']; 
    
    // Fetch Data
    const { heavyContext, volatileContext } = await fetchContextData(ticker, tools);
    
    // Define Prompt
    const prompt = `Analyze ${ticker}. 
    Tasks:
    1. Technical Analysis (Use Qandle & Price).
    2. Fundamental Analysis (Use Metrics & Facts).
    3. Sentiment (Use News & Insider).`;
  
    // REMOVED supportLevels/resistanceLevels from schema to rely on deterministic algorithm
    const schema = {
        type: Type.OBJECT,
        properties: {
          symbol: { type: Type.STRING },
          price: { type: Type.STRING },
          technicalAnalysis: { type: Type.STRING },
          fundamentalAnalysis: { type: Type.STRING },
          recommendation: { type: Type.STRING, enum: ['Buy', 'Sell', 'Hold'] },
          priceTarget: { type: Type.STRING }
        },
        required: ['symbol', 'price', 'technicalAnalysis', 'fundamentalAnalysis', 'recommendation', 'priceTarget']
    };

    // Pass [] for nativeTools
    const json = await runSynthesisAgent(prompt, schema, heavyContext, volatileContext, agent_model, []);
    return JSON.parse(json);
};

// 4. OPTIONS STRATEGY -> Uses Qandle + Polygon Aggregates + Pure Synthesis
export const generateOptionsStrategies = async (ticker: string, outlook: string): Promise<OptionsStrategy[]> => {
    if (isDemoMode()) { await simulateDelay(2000); return getMockOptions(ticker, outlook); }
    const { reasoning_model } = getModelConfig();

    // Pick Tools
    const tools: ToolKey[] = ['qandle', 'polygonHistory', 'news', 'metrics', 'insider', 'facts', 'price']; 

    // Fetch Data
    const { heavyContext, volatileContext } = await fetchContextData(ticker, tools);

    const prompt = `Generate 3 options strategies for ${ticker} with a ${outlook} outlook.
    Use the provided Historical Bars (Polygon) and Qandle Technicals to determine optimal strikes and expiries.
    
    Requirements:
    1. Realistic strikes based on recent price range.
    2. Include one LEAPS strategy if Bullish.`;

    const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            name: { type: Type.STRING },
            riskProfile: { type: Type.STRING },
            outlook: { type: Type.STRING },
            description: { type: Type.STRING },
            setup: {
              type: Type.OBJECT,
              properties: {
                legs: { type: Type.ARRAY, items: { type: Type.STRING } },
                entryPrice: { type: Type.STRING },
                exitTarget: { type: Type.STRING },
                stopLoss: { type: Type.STRING },
                expiry: { type: Type.STRING }
              },
              required: ['legs', 'entryPrice', 'exitTarget', 'stopLoss', 'expiry']
            },
            greeks: {
              type: Type.OBJECT,
              properties: { delta: { type: Type.STRING }, theta: { type: Type.STRING } },
              required: ['delta', 'theta']
            },
            rationale: { type: Type.STRING }
          },
          required: ['name', 'riskProfile', 'outlook', 'description', 'setup', 'greeks', 'rationale']
        }
    };

    // Pass [] for nativeTools
    const json = await runSynthesisAgent(prompt, schema, heavyContext, volatileContext, reasoning_model, []);
    return JSON.parse(json);
};

// 5. ANALYZE PORTFOLIO -> Uses Qandle for EACH stock + Pure Synthesis
export const analyzePortfolio = async (holdings: string): Promise<PortfolioAudit> => {
    if (isDemoMode()) { await simulateDelay(2200); return getMockPortfolio(holdings); }
    const { reasoning_model } = getModelConfig();

    // 1. Extract Tickers (Simple Regex)
    const tickers = holdings.match(/\b[A-Z]{1,5}\b/g);
    const uniqueTickers = [...new Set(tickers || [])].slice(0, 10); // Limit to 10 for perf

    let volatileContext = `User Holdings Input: "${holdings}"\n`;
    
    // 2. Fetch Qandle Data for Batch
    if (uniqueTickers.length > 0) {
        console.log(`[Portfolio] Batch fetching Qandle for:`, uniqueTickers);
        const qResults = await Promise.all(uniqueTickers.map(t => getQandleData(t)));
        
        qResults.forEach((qData, i) => {
            if (qData) {
                volatileContext += `\n[${uniqueTickers[i]} Technicals]: ${JSON.stringify(qData)}`;
            }
        });
    }

    const prompt = `Analyze this portfolio. Use the technical data provided for individual assets to assess correlation and risk.
    
    Tasks:
    1. Stress Test (Recession, Inflation).
    2. Suggest Hedges.
    3. Audit Beta exposure.`;

    const schema = {
        type: Type.OBJECT,
        properties: {
          healthScore: { type: Type.NUMBER },
          riskAssessment: { type: Type.STRING, description: "Detailed narrative of the stress test results." },
          diversificationStatus: { type: Type.STRING },
          suggestedHedges: { type: Type.ARRAY, items: { type: Type.STRING } },
          actionableMoves: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                action: { type: Type.STRING },
                asset: { type: Type.STRING },
                reason: { type: Type.STRING }
              }
            }
          }
        },
        required: ['healthScore', 'riskAssessment', 'diversificationStatus', 'suggestedHedges', 'actionableMoves']
    };

    // Pass [] for nativeTools
    const json = await runSynthesisAgent(prompt, schema, '', volatileContext, reasoning_model, []);
    return JSON.parse(json);
};

// 2. SCREENER -> Model + Deep Search
export const screenStocks = async (criteria: string): Promise<ScreenerResult[]> => {
    if (isDemoMode()) { await simulateDelay(1800); return getMockScreener(criteria); }
    const { reasoning_model } = getModelConfig();

    const prompt = `Find 5 real stocks matching: "${criteria}".
    Do thorough research to find current prices and catalysts.
    Ensure prices are up-to-date.`;

    const schema = {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            symbol: { type: Type.STRING },
            name: { type: Type.STRING },
            sector: { type: Type.STRING },
            price: { type: Type.STRING },
            catalyst: { type: Type.STRING },
            score: { type: Type.NUMBER }
          }
        }
    };

    const tools: Tool[] = [{ googleSearch: {} }];
    
    const json = await runSynthesisAgent(prompt, schema, '', '', reasoning_model, tools);
    return JSON.parse(json);
};

// 1. MARKET SENTIMENT -> Model Only
export const getMarketSentiment = async (forceRefresh: boolean = false): Promise<MarketSentiment> => {
    if (isDemoMode()) { await simulateDelay(1500); return getMockSentiment(); }
    
    // Check Cache
    const cacheKey = 'market_sentiment_dashboard';
    if (!forceRefresh) {
      const cached = cacheService.get<MarketSentiment>(cacheKey);
      if (cached) return cached;
    }

    const { reasoning_model } = getModelConfig();
    const prompt = "Provide a real-time market sentiment analysis for the US Stock Market.";
    
    const schema = {
        type: Type.OBJECT,
        properties: {
          outlook: { type: Type.STRING, enum: ['Bullish', 'Bearish', 'Neutral'] },
          score: { type: Type.NUMBER },
          summary: { type: Type.STRING },
          keyEvents: { type: Type.ARRAY, items: { type: Type.STRING } }
        },
        required: ['outlook', 'score', 'summary', 'keyEvents']
    };

    // Pass [] for nativeTools
    const json = await runSynthesisAgent(prompt, schema, '', '', reasoning_model, []);
    const data = JSON.parse(json);
    
    // Post-process
    if (data.score > 0 && data.score < 1) data.score = Math.round(data.score * 100);
    cacheService.set(cacheKey, data, CACHE_TIERS.SHORT_TERM);
    
    return data;
};
