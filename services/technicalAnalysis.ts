
import { CandleData } from '../types';

/**
 * Technical Analysis Algorithm to identify robust Support and Resistance levels.
 * 
 * Logic:
 * 1. Identifies "Fractal Pivots" (Local Maxima/Minima) over a rolling window.
 * 2. Clusters these pivots based on price proximity (using an ATR-like % threshold).
 * 3. Ranks clusters by "Strength" (Number of touches + Volume weight).
 * 4. Separates into Support (Below Current Price) and Resistance (Above Current Price).
 * 
 * This avoids AI hallucination by using pure quantitative data.
 */

interface PivotCluster {
    priceSum: number;
    count: number;
    avgPrice: number;
    maxVol: number;
}

export function calculateSupportResistance(candles: CandleData[]): { supports: number[], resistances: number[] } {
    if (!candles || candles.length < 20) {
        return { supports: [], resistances: [] };
    }

    const currentPrice = candles[candles.length - 1].close;
    
    // Config: How many bars to look left/right to confirm a pivot
    // A standard fractal is usually 2 bars left, 2 bars right (5 bar window)
    // We use 5 left/right for stronger levels on daily charts
    const range = 5; 
    
    const highPivots: number[] = [];
    const lowPivots: number[] = [];
    const pivotVolumes: Record<number, number> = {}; // Map price -> volume at that pivot

    // 1. Identify Pivot Points
    for (let i = range; i < candles.length - range; i++) {
        const candle = candles[i];
        let isHigh = true;
        let isLow = true;

        for (let j = 1; j <= range; j++) {
            if (candles[i - j].high > candle.high || candles[i + j].high > candle.high) isHigh = false;
            if (candles[i - j].low < candle.low || candles[i + j].low < candle.low) isLow = false;
        }

        if (isHigh) {
            highPivots.push(candle.high);
            pivotVolumes[candle.high] = candle.volume || 0;
        }
        if (isLow) {
            lowPivots.push(candle.low);
            pivotVolumes[candle.low] = candle.volume || 0;
        }
    }

    // Combine all significant levels
    const allPivots = [...highPivots, ...lowPivots];

    // 2. Clustering Logic
    // We group levels that are within X% of each other.
    // For stocks, 1-1.5% is a reasonable "zone" width.
    const clusterThreshold = currentPrice * 0.015; 
    const clusters: PivotCluster[] = [];

    allPivots.forEach(price => {
        // Find existing cluster
        const match = clusters.find(c => Math.abs(c.avgPrice - price) < clusterThreshold);
        
        if (match) {
            match.priceSum += price;
            match.count += 1;
            match.avgPrice = match.priceSum / match.count;
            // Accumulate volume weight logic could go here, for now just taking max volume of any pivot in cluster
            const vol = pivotVolumes[price] || 0;
            if (vol > match.maxVol) match.maxVol = vol;
        } else {
            clusters.push({
                priceSum: price,
                count: 1,
                avgPrice: price,
                maxVol: pivotVolumes[price] || 0
            });
        }
    });

    // 3. Ranking and Sorting
    // Strength = Number of touches. 
    // We can also weigh by volume if available, or recentness (not implemented here for simplicity)
    const sortedClusters = clusters
        .filter(c => c.count >= 2) // Filter weak levels (noise)
        .sort((a, b) => b.count - a.count); // Strongest first

    // 4. Separation
    const supports = sortedClusters
        .filter(c => c.avgPrice < currentPrice)
        .sort((a, b) => b.avgPrice - a.avgPrice) // Closest to current price first (Descending)
        .slice(0, 3) // Take top 3 closest significant levels
        .map(c => parseFloat(c.avgPrice.toFixed(2)));

    const resistances = sortedClusters
        .filter(c => c.avgPrice > currentPrice)
        .sort((a, b) => a.avgPrice - b.avgPrice) // Closest to current price first (Ascending)
        .slice(0, 3) // Take top 3 closest significant levels
        .map(c => parseFloat(c.avgPrice.toFixed(2)));

    return { supports, resistances };
}
