export interface RateLimitConfig {
  requestsPerSecond: number;
  burstSize: number;
  windowMs: number;
  service: string;
}

export class RateLimiter {
  private kv: KVNamespace;
  private config: RateLimitConfig;
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  constructor(kv: KVNamespace, config: RateLimitConfig) {
    this.kv = kv;
    this.config = config;
  }

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await fn();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
      
      if (!this.processing) {
        this.processQueue();
      }
    });
  }

  private async processQueue() {
    if (this.queue.length === 0) {
      this.processing = false;
      return;
    }

    this.processing = true;
    const key = `rate_limit:${this.config.service}`;
    
    while (this.queue.length > 0) {
      const now = Date.now();
      const window = await this.getWindow(key);
      
      if (window.count >= this.config.requestsPerSecond) {
        const timeToWait = Math.max(0, window.resetAt - now);
        if (timeToWait > 0) {
          console.log(`[RateLimit] ${this.config.service}: Rate limit hit, skipping`);
          // Can't delay in Workers - just skip this iteration
          break;
        }
      }

      const batch = this.queue.splice(0, Math.min(
        this.config.burstSize,
        this.config.requestsPerSecond - window.count
      ));

      for (const task of batch) {
        await task();
        await this.incrementWindow(key);
        // No delay in Workers - rate limiting handled by window counting
      }
    }

    this.processing = false;
  }

  private async getWindow(key: string): Promise<{ count: number; resetAt: number }> {
    const data = await this.kv.get(key, 'json');
    const now = Date.now();
    
    if (!data || now >= (data as any).resetAt) {
      return { count: 0, resetAt: now + this.config.windowMs };
    }
    
    return data as { count: number; resetAt: number };
  }

  private async incrementWindow(key: string) {
    const window = await this.getWindow(key);
    window.count++;
    await this.kv.put(key, JSON.stringify(window), {
      expirationTtl: Math.ceil(this.config.windowMs / 1000)
    });
  }

  // Removed delay function - setTimeout doesn't work in Cloudflare Workers

  async getRemainingCapacity(): Promise<number> {
    const key = `rate_limit:${this.config.service}`;
    const window = await this.getWindow(key);
    return Math.max(0, this.config.requestsPerSecond - window.count);
  }
}