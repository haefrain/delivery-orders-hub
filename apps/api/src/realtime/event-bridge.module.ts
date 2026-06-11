import { Module } from '@nestjs/common';

import { DomainEventPublisher } from './domain-event-publisher';
import { EventBridgeService } from './event-bridge.service';

@Module({
  providers: [{ provide: DomainEventPublisher, useClass: EventBridgeService }],
  exports: [DomainEventPublisher],
})
export class EventBridgeModule {}
