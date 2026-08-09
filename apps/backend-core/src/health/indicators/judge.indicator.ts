import { Injectable } from '@nestjs/common';
import { CacheService, cacheKeys } from '@litecode/cache';
import { HealthIndicator, ServiceCheck } from '../health.types';

/** Shape the Go worker writes to judge:heartbeat:v1:{workerId}. */
interface Heartbeat {
  workerId: string;
  sandbox: string;
  slots: number;
  ts: string; // RFC3339
}

/**
 * Judge worker liveness, observed through Redis rather than by calling the
 * workers directly.
 *
 * A heartbeat key is the right mechanism here because the workers run on a
 * separate machine, have no HTTP server, and execute untrusted code — opening
 * a network path from the API to them would be the wrong direction. Each
 * worker writes its key on a ticker with a TTL slightly longer than the
 * interval, so a stopped worker simply expires.
 *
 * Not critical: no workers means grading stalls, not that the API is unusable.
 */
@Injectable()
export class JudgeIndicator implements HealthIndicator {
  readonly name = 'judge';
  readonly critical = false;

  constructor(private readonly cache: CacheService) {}

  async check(): Promise<ServiceCheck> {
    const started = Date.now();
    const keys = await this.cache.scanKeys(cacheKeys.judgeHeartbeatPattern(), 50);

    if (keys.length === 0) {
      return {
        status: 'down',
        latencyMs: Date.now() - started,
        critical: false,
        workers: 0,
        message: 'no judge worker is reporting a heartbeat',
      };
    }

    const beats = (await Promise.all(keys.map((k) => this.cache.get<Heartbeat>(k))))
      .filter((b): b is Heartbeat => b !== null);

    const now = Date.now();
    const ages = beats.map((b) => Math.round((now - Date.parse(b.ts)) / 1000));
    const oldest = ages.length > 0 ? Math.max(...ages) : null;

    return {
      status: 'up',
      latencyMs: Date.now() - started,
      critical: false,
      workers: beats.length,
      totalSlots: beats.reduce((n, b) => n + (b.slots ?? 0), 0),
      oldestHeartbeatSec: oldest,
      // A worker in `local` sandbox mode has NO isolation. Surfacing it here
      // makes it impossible to leave that on by accident in a real deployment.
      sandboxes: [...new Set(beats.map((b) => b.sandbox))],
    };
  }
}
