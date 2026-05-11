import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { getRedisConnection } from '@litecode/queue';
import Redis from 'ioredis';

@Injectable()
export class CacheService implements OnModuleDestroy {
  private readonly logger = new Logger(CacheService.name);
  private readonly client: Redis;

  constructor(config: ConfigService) {
    const conn = getRedisConnection(config.get<string>('REDIS_URL'));
    // Separate connection from BullMQ — queue clients need maxRetriesPerRequest=null,
    // which is wrong for general request-path reads.
    this.client = new Redis({
      ...conn,
      lazyConnect: false,
      enableAutoPipelining: true,
    });
    this.client.on('error', (err) => {
      this.logger.error(`Redis error: ${err.message}`);
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit().catch(() => undefined);
  }

  async get<T>(key: string): Promise<T | null> {
    let raw: string | null;
    try {
      raw = await this.client.get(key);
    } catch (err) {
      this.logger.warn(`GET ${key} failed: ${(err as Error).message}`);
      return null;
    }
    if (raw === null) return null;
    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.warn(`Failed to JSON.parse cached value at ${key}; treating as miss`);
      return null;
    }
  }

  async set<T>(key: string, value: T, ttlSec: number): Promise<void> {
    try {
      await this.client.set(key, JSON.stringify(value), 'EX', ttlSec);
    } catch (err) {
      this.logger.warn(`SET ${key} failed: ${(err as Error).message}`);
    }
  }

  async del(key: string): Promise<void> {
    try {
      await this.client.del(key);
    } catch (err) {
      this.logger.warn(`DEL ${key} failed: ${(err as Error).message}`);
    }
  }

  // SCAN-based pattern delete. Never use KEYS — it blocks Redis on large key spaces.
  async delPattern(pattern: string): Promise<void> {
    let cursor = '0';
    try {
      do {
        const [next, keys] = await this.client.scan(
          cursor,
          'MATCH',
          pattern,
          'COUNT',
          200,
        );
        cursor = next;
        if (keys.length > 0) {
          await this.client.del(...keys);
        }
      } while (cursor !== '0');
    } catch (err) {
      this.logger.warn(`SCAN/DEL ${pattern} failed: ${(err as Error).message}`);
    }
  }

  // Cache-aside helper. If the loader returns null/undefined, no entry is written
  // (so a 404 path won't poison the cache).
  async getOrSet<T>(
    key: string,
    ttlSec: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.get<T>(key);
    if (cached !== null) return cached;
    const fresh = await loader();
    if (fresh !== null && fresh !== undefined) {
      await this.set(key, fresh, ttlSec);
    }
    return fresh;
  }
}
