import { OrderStatus } from './order-status';
import { Provider } from './provider';

export interface CanonicalOrderItem {
  name: string;
  quantity: number;
  /** Money is always integer minor units (cents); never floats. */
  unitPriceCents: number;
}

/**
 * The provider-agnostic order shape every adapter normalizes into.
 * This is the single contract the rest of the system (queue, DB, dashboard)
 * knows about — provider payload quirks never leak past the adapters.
 */
export interface CanonicalOrder {
  provider: Provider;
  /** Order id in the provider's own system. */
  externalId: string;
  customerName: string;
  items: CanonicalOrderItem[];
  totalCents: number;
  /** ISO 4217 code, e.g. COP, MXN, USD. */
  currency: string;
  /** ISO 8601 timestamp of when the customer placed the order. */
  placedAt: string;
}

export interface HubOrder extends CanonicalOrder {
  /** Internal hub id (uuid). */
  id: string;
  status: OrderStatus;
  createdAt: string;
  updatedAt: string;
}
