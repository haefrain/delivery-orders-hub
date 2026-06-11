import { Injectable, NotFoundException } from '@nestjs/common';
import { OrderStatus, WS_EVENTS } from '@delivery-hub/shared';

import { DomainEventPublisher } from '../realtime/domain-event-publisher';
import { toWireOrder } from '../realtime/wire-order';
import { OrderStateMachine } from './domain/order-state-machine';
import { OrderRecord, OrdersRepository } from './orders.repository';

@Injectable()
export class OrdersService {
  constructor(
    private readonly orders: OrdersRepository,
    private readonly stateMachine: OrderStateMachine,
    private readonly events: DomainEventPublisher,
  ) {}

  list(status?: OrderStatus): Promise<OrderRecord[]> {
    return this.orders.findMany({ status });
  }

  async transition(orderId: string, to: OrderStatus, actor: string): Promise<OrderRecord> {
    const order = await this.orders.findById(orderId);
    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found`);
    }

    // Domain rules decide; InvalidTransitionError maps to 409 via filter
    this.stateMachine.assertTransition(order.status, to);

    const updated = await this.orders.applyTransition(orderId, order.status, to, actor);
    await this.events.publish(WS_EVENTS.ORDER_UPDATED, { order: toWireOrder(updated) });
    return updated;
  }

  async metricsSummary(): Promise<{
    byProvider: Record<string, number>;
    byStatus: Record<string, number>;
  }> {
    const [byProvider, byStatus] = await Promise.all([
      this.orders.countByProvider(),
      this.orders.countByStatus(),
    ]);
    return { byProvider, byStatus };
  }
}
