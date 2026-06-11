import { OrderEventPayload, WsEventName } from '@delivery-hub/shared';

/**
 * Port for emitting domain events. Application code (processor, services)
 * depends on this abstraction; the Redis pub/sub implementation is a detail
 * swapped in by the module (DIP).
 */
export abstract class DomainEventPublisher {
  abstract publish(event: WsEventName, payload: OrderEventPayload): Promise<void>;
}
