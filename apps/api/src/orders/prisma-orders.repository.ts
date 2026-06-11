import { Injectable } from '@nestjs/common';
import { OrderStatus } from '@delivery-hub/shared';

import { PrismaService } from '../prisma/prisma.service';
import { OrderRecord, OrdersRepository } from './orders.repository';

@Injectable()
export class PrismaOrdersRepository extends OrdersRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  findMany(filter?: { status?: OrderStatus }): Promise<OrderRecord[]> {
    return this.prisma.order.findMany({
      where: filter?.status ? { status: filter.status } : undefined,
      orderBy: { placedAt: 'desc' },
    });
  }

  findById(id: string): Promise<OrderRecord | null> {
    return this.prisma.order.findUnique({ where: { id } });
  }

  async applyTransition(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    actor: string,
  ): Promise<OrderRecord> {
    const [updated] = await this.prisma.$transaction([
      this.prisma.order.update({ where: { id: orderId }, data: { status: to } }),
      this.prisma.orderEvent.create({
        data: { orderId, fromStatus: from, toStatus: to, actor },
      }),
    ]);
    return updated;
  }

  async countByProvider(): Promise<Record<string, number>> {
    const rows = await this.prisma.order.groupBy({
      by: ['provider'],
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((row) => [row.provider, row._count._all]));
  }

  async countByStatus(): Promise<Record<string, number>> {
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      _count: { _all: true },
    });
    return Object.fromEntries(rows.map((row) => [row.status, row._count._all]));
  }
}
