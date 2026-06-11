import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  DOMAIN_EVENTS_CHANNEL,
  DomainEventEnvelope,
  OrderEventPayload,
  WsEventName,
} from '@delivery-hub/shared';
import Redis from 'ioredis';

import { DomainEventPublisher } from './domain-event-publisher';

/**
 * Redis pub/sub bridge between processes: the worker publishes here and the
 * API's gateway relays to websockets. Chosen over @socket.io/redis-adapter
 * because only one process owns sockets — a channel is all we need (ADR 0003).
 */
@Injectable()
export class EventBridgeService extends DomainEventPublisher implements OnModuleDestroy {
  private readonly publisher: Redis;

  constructor(config: ConfigService) {
    super();
    this.publisher = new Redis(config.getOrThrow<string>('REDIS_URL'));
  }

  async publish(event: WsEventName, payload: OrderEventPayload): Promise<void> {
    const envelope: DomainEventEnvelope = { event, payload };
    await this.publisher.publish(DOMAIN_EVENTS_CHANNEL, JSON.stringify(envelope));
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher.quit();
  }
}
