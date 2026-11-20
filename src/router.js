import { browserBridge } from './browser-bridge.js';
import { inferenceCache } from './cache.js';
import { TokenOptimizer } from './token-optimizer.js';
import { CONFIG } from './config.js';

export class H2ORouter {
  constructor() {
    this.totalRouted = 0;
    this.cacheHits = 0;
  }

  async route(rawPromptText) {
    this.totalRouted++;
    const promptText = TokenOptimizer.optimizePrompt(rawPromptText);

    // 1. Check Inference Cache (0ms response for repeat prompts)
    const cachedResponse = inferenceCache.get(promptText);
    if (cachedResponse) {
      this.cacheHits++;
      if (CONFIG.DEBUG) console.log(`[H2O Router] Cache hit for prompt hash. Serving instantly.`);
      return { content: cachedResponse, cached: true, engine: 'memory-cache' };
    }

    // 2. Dispatch through intelligent Browser Bridge Worker Pool with retry logic
    let responseText = null;
    let attempts = 0;
    const maxAttempts = 2;

    while (attempts < maxAttempts) {
      try {
        attempts++;
        responseText = await browserBridge.executePrompt(promptText);
        if (responseText) break;
      } catch (err) {
        if (attempts >= maxAttempts) throw err;
        await new Promise(r => setTimeout(r, 1000));
      }
    }

    // 3. Store in cache
    if (responseText) {
      inferenceCache.set(promptText, responseText);
    }

    return { content: responseText || 'Error: Inference bridge timeout.', cached: false, engine: 'browser-bridge' };
  }

  getMetrics() {
    return {
      totalRouted: this.totalRouted,
      cacheHits: this.cacheHits,
      hitRate: this.totalRouted > 0 ? ((this.cacheHits / this.totalRouted) * 100).toFixed(2) + '%' : '0%',
      activeWorkers: browserBridge.workers.length,
      queueLength: browserBridge.queue.length
    };
  }
}

export const h2oRouter = new H2ORouter();
