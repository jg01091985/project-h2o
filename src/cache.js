import crypto from 'crypto';

export class InferenceCache {
  constructor(maxSize = 500, ttlMs = 3600000) {
    this.maxSize = maxSize;
    this.ttlMs = ttlMs;
    this.store = new Map();
  }

  generateHash(prompt) {
    return crypto.createHash('sha256').update(prompt.trim().toLowerCase()).digest('hex');
  }

  pruneStale() {
    const now = Date.now();
    for (const [key, entry] of this.store.entries()) {
      if (now - entry.timestamp > this.ttlMs) {
        this.store.delete(key);
      }
    }
  }

  get(prompt) {
    this.pruneStale();
    const key = this.generateHash(prompt);
    if (!this.store.has(key)) return null;

    const entry = this.store.get(key);
    return entry.response;
  }

  set(prompt, response) {
    this.pruneStale();
    const key = this.generateHash(prompt);
    if (this.store.size >= this.maxSize) {
      const oldestKey = this.store.keys().next().value;
      this.store.delete(oldestKey);
    }
    this.store.set(key, { response, timestamp: Date.now() });
  }

  clear() {
    this.store.clear();
  }
}

export const inferenceCache = new InferenceCache();
