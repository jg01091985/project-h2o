import { browserBridge } from './browser-bridge.js';
import { inferenceCache } from './cache.js';
import { CONFIG } from './config.js';

export class H2ORouter {
  constructor() {
    this.totalRouted = 0;
    this.cacheHits = 0;
  }

  async route(promptText) {
    this.totalRouted++;

    // 1. Check Inference Cache (0ms response for repeat prompts)
    const cachedResponse = inferenceCache.get(promptText);
    if (cachedResponse) {
      this.cacheHits++;
      if (CONFIG.DEBUG) console.log(`[H2O Router] Cache hit for prompt hash. Serving instantly.`);
      return { content: cachedResponse, cached: true, engine: 'memory-cache' };
    }

    // 2. Dispatch through intelligent Browser Bridge Worker Pool
    const responseText = await browserBridge.executePrompt(promptText);

    // 3. Store in cache
    inferenceCache.set(promptText, responseText);

    return { content: responseText, cached: false, engine: 'browser-bridge' };
  }

  getMetrics() {
    return {
      totalRouted: this.totalRouted,
      cacheHits: this.cacheHits,
      hitRate: this.totalRouted > 0 ? ((this.cacheHits / this.totalRouted) * 100).toFixed(2) + '%' : '0%'
    };
  }
}

export const h2oRouter = new H2ORouter();
