import { Redis } from 'ioredis';
import { IBulkAction } from '../models/BulkAction';

export class RateLimiter {
  private redis: Redis;
  private readonly RATE_LIMIT = 10000; // 10k events per minute
  private readonly WINDOW_SIZE = 60; // 1 minute in seconds

  constructor(redis: Redis) {
    this.redis = redis;
  }

  async checkRateLimit(accountId: string): Promise<{ allowed: boolean; remaining: number }> {
    const key = `rate_limit:${accountId}`;
    const now = Math.floor(Date.now() / 1000);
    const windowStart = now - this.WINDOW_SIZE;

    // Get all events in the current window
    const events = await this.redis.zrangebyscore(key, windowStart, now);
    
    // Count events in the current window
    const currentCount = events.length;

    if (currentCount >= this.RATE_LIMIT) {
      return { allowed: false, remaining: 0 };
    }

    // Add new event
    await this.redis.zadd(key, now, now.toString());
    // Remove old events
    await this.redis.zremrangebyscore(key, 0, windowStart);
    // Set expiration
    await this.redis.expire(key, this.WINDOW_SIZE);

    return { allowed: true, remaining: this.RATE_LIMIT - currentCount - 1 };
  }

  async canProcessBulkAction(accountId: string, totalRecords: number): Promise<boolean> {
    const { allowed, remaining } = await this.checkRateLimit(accountId);
    return allowed && remaining >= totalRecords;
  }
} 