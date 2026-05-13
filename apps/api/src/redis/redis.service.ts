import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  private readonly logger = new Logger(RedisService.name);
  readonly client: Redis | null;

  constructor() {
    const url = process.env.REDIS_URL;
    if (url) {
      this.client = new Redis(url, { lazyConnect: true, maxRetriesPerRequest: 3 });
      this.client.on('error', (err) => this.logger.warn(`Redis error: ${err.message}`));
      this.client.on('connect', () => this.logger.log('Redis connected'));
    } else {
      this.client = null;
      this.logger.warn('REDIS_URL not set — using in-memory fallbacks');
    }
  }

  get enabled(): boolean {
    return this.client !== null;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    await this.client?.setex(key, ttlSeconds, value);
  }

  async get(key: string): Promise<string | null> {
    return this.client?.get(key) ?? null;
  }

  async del(key: string): Promise<void> {
    await this.client?.del(key);
  }

  async has(key: string): Promise<boolean> {
    const count = await this.client?.exists(key);
    return count === 1;
  }

  onModuleDestroy() {
    this.client?.disconnect();
  }
}
