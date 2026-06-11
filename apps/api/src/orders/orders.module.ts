import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module';
import { EventBridgeModule } from '../realtime/event-bridge.module';
import { OrderStateMachine } from './domain/order-state-machine';
import { MetricsController } from './metrics.controller';
import { OrdersController } from './orders.controller';
import { OrdersRepository } from './orders.repository';
import { OrdersService } from './orders.service';
import { PrismaOrdersRepository } from './prisma-orders.repository';

@Module({
  imports: [PrismaModule, EventBridgeModule],
  controllers: [OrdersController, MetricsController],
  providers: [
    OrdersService,
    { provide: OrdersRepository, useClass: PrismaOrdersRepository },
    // Pure domain class, framework-free on purpose; provided as a value
    { provide: OrderStateMachine, useValue: new OrderStateMachine() },
  ],
  exports: [OrdersService],
})
export class OrdersModule {}
