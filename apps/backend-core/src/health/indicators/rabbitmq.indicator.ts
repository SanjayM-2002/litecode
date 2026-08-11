import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, Socket } from 'net';
import { connect as tlsConnect } from 'tls';
import { HealthIndicator, ServiceCheck } from '../health.types';

const CONNECT_TIMEOUT_MS = 2_000;


@Injectable()
export class RabbitMqIndicator implements HealthIndicator {
  readonly name = 'rabbitmq';
  readonly critical = false;

  constructor(private readonly config: ConfigService) {}

  async check(): Promise<ServiceCheck> {
    const url = this.config.get<string>('AMQP_URL');
    if (!url) {
      return { status: 'not_configured', critical: false, message: 'AMQP_URL is not set' };
    }

    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      return { status: 'down', critical: false, message: 'AMQP_URL is not a valid URL' };
    }

    const secure = parsed.protocol === 'amqps:';
    const port = Number(parsed.port) || (secure ? 5671 : 5672);
    const host = parsed.hostname;

    const started = Date.now();
    await this.probe(host, port, secure);

    return {
      status: 'up',
      latencyMs: Date.now() - started,
      critical: false,
      host,
      port,
      tls: secure,
      probe: 'tcp-connect',
    };
  }

  private probe(host: string, port: number, secure: boolean): Promise<void> {
    return new Promise((resolve, reject) => {
      const socket: Socket = secure
        ? tlsConnect({ host, port, servername: host })
        : connect({ host, port });

      const done = (err?: Error) => {
        socket.removeAllListeners();
        socket.destroy();
        err ? reject(err) : resolve();
      };

      socket.setTimeout(CONNECT_TIMEOUT_MS, () =>
        done(new Error(`connect timed out after ${CONNECT_TIMEOUT_MS}ms`)),
      );
      socket.once(secure ? 'secureConnect' : 'connect', () => done());
      socket.once('error', done);
    });
  }
}
