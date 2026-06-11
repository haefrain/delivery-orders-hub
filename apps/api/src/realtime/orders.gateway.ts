import { Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { DOMAIN_EVENTS_CHANNEL, DomainEventEnvelope } from '@delivery-hub/shared';
import Redis from 'ioredis';
import { Server } from 'socket.io';

/**
 * Relay, not a brain: subscribes to the Redis domain-events channel and
 * fans out to every connected dashboard. A dedicated connection is required
 * because a Redis connection in subscribe mode can't issue other commands.
 */
@WebSocketGateway({ cors: { origin: '*' } })
export class OrdersGateway implements OnModuleInit, OnModuleDestroy {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(OrdersGateway.name);
  private subscriber?: Redis;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    this.subscriber = new Redis(this.config.getOrThrow<string>('REDIS_URL'));
    await this.subscriber.subscribe(DOMAIN_EVENTS_CHANNEL);
    this.subscriber.on('message', (_channel, raw) => {
      try {
        const { event, payload } = JSON.parse(raw) as DomainEventEnvelope;
        this.server.emit(event, payload);
      } catch (error) {
        this.logger.warn(`Dropped malformed domain event: ${String(error)}`);
      }
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.subscriber?.quit();
  }
}
