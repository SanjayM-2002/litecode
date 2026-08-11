
export type ServiceStatus = 'up' | 'down' | 'degraded' | 'not_configured';

export interface ServiceCheck {
  status: ServiceStatus;
  latencyMs?: number;
  critical?: boolean;
  message?: string;
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
  readonly name: string;
  readonly critical: boolean;
  check(): Promise<ServiceCheck>;
}
