export class RateLimiter {
  constructor(windowMs = 60000, maxRequests = 100) {
    this.windowMs = windowMs;
    this.maxRequests = maxRequests;
    this.clients = new Map();
  }

  pruneStale(now) {
    for (const [ip, client] of this.clients.entries()) {
      if (now - client.startTime > this.windowMs * 2) {
        this.clients.delete(ip);
      }
    }
  }

  check(ip) {
    const now = Date.now();
    this.pruneStale(now);

    if (!this.clients.has(ip)) {
      this.clients.set(ip, { count: 1, startTime: now });
      return { allowed: true };
    }

    const client = this.clients.get(ip);
    if (now - client.startTime > this.windowMs) {
      client.count = 1;
      client.startTime = now;
      return { allowed: true };
    }

    client.count++;
    if (client.count > this.maxRequests) {
      return { allowed: false, retryAfter: Math.ceil((this.windowMs - (now - client.startTime)) / 1000) };
    }

    return { allowed: true };
  }
}

export const rateLimiter = new RateLimiter();
