import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { connect, Socket } from 'net';
import { connect as tlsConnect } from 'tls';
import { HealthIndicator, ServiceCheck } from '../health.types';

const CONNECT_TIMEOUT_MS = 2_000;

/**
 * Broker reachability check.
 *
 * This opens a TCP (or TLS) socket to the AMQP host and closes it. It proves
 * the broker is listening and routable — it does NOT prove credentials or the
 * vhost are correct, because doing so would mean completing an AMQP handshake
 * and pulling in an AMQP client this app doesn't yet have.
 *
 * Once the RabbitMQ migration lands and `AmqpConnection` from
 * @golevelup/nestjs-rabbitmq is available, replace the body with a real
 * connection-state read. Until then this catches the failure that actually
 * happens — the broker being down or the URL being wrong.
 *
 * Not critical: the broker being unreachable stops grading, but every read
 * path still works.
 */
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
      // Be explicit that a green light here is weaker than it looks.
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
