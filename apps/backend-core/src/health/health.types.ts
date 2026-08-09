/**
 * `degraded` is the important one. Not every dependency being down means the
 * API cannot serve traffic — a Redis outage degrades to cache misses, and
 * RabbitMQ being down stops grading but leaves every read path working.
 * Returning 503 for those would pull the instance out of the load balancer and
 * turn a partial outage into a total one.
 *
 * Only services marked `critical` can produce a 503.
 */
export type ServiceStatus = 'up' | 'down' | 'degraded' | 'not_configured';

export interface ServiceCheck {
  status: ServiceStatus;
  /** Round-trip time of the probe itself, not of the service under load. */
  latencyMs?: number;
  /** When true, a non-`up` status makes the whole endpoint return 503. */
  critical?: boolean;
  message?: string;
  /** Indicator-specific detail (worker counts, backlog sizes, …). */
  [key: string]: unknown;
}

export interface DeepHealth {
  status: 'ok' | 'degraded' | 'error';
  service: string;
  timestamp: string;
  durationMs: number;
  services: Record<string, ServiceCheck>;
}

export interface HealthIndicator {
  /** Key this indicator appears under in the response. */
  readonly name: string;
  /**
   * Declared on the indicator, not returned from check(), because the runner
   * needs to know it even when check() throws — which is exactly when it
   * matters.
   */
  readonly critical: boolean;
  check(): Promise<ServiceCheck>;
}
