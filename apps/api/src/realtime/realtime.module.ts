import { Module } from '@nestjs/common';

import { EventBridgeModule } from './event-bridge.module';
import { OrdersGateway } from './orders.gateway';

@Module({
  imports: [EventBridgeModule],
  providers: [OrdersGateway],
  exports: [EventBridgeModule],
})
export class RealtimeModule {}
