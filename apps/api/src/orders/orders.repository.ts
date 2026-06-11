import { OrderStatus, Provider } from '@delivery-hub/shared';

export interface OrderRecord {
  id: string;
  provider: Provider;
  externalId: string;
  status: OrderStatus;
  customerName: string;
  items: unknown;
  totalCents: number;
  currency: string;
  placedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * Persistence port for orders. The service layer depends on this abstraction,
 * never on @prisma/client (DIP) — swapping the store touches one file.
 */
export abstract class OrdersRepository {
  abstract findMany(filter?: { status?: OrderStatus }): Promise<OrderRecord[]>;
  abstract findById(id: string): Promise<OrderRecord | null>;
  abstract applyTransition(
    orderId: string,
    from: OrderStatus,
    to: OrderStatus,
    actor: string,
  ): Promise<OrderRecord>;
  abstract countByProvider(): Promise<Record<string, number>>;
  abstract countByStatus(): Promise<Record<string, number>>;
}
