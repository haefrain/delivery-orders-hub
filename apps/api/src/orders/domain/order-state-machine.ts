import { ORDER_TRANSITIONS, OrderStatus } from '@delivery-hub/shared';

export class InvalidTransitionError extends Error {
  constructor(
    readonly from: OrderStatus,
    readonly to: OrderStatus,
  ) {
    super(`Invalid order transition: ${from} -> ${to}`);
    this.name = 'InvalidTransitionError';
  }
}

/**
 * Pure domain rules for the order lifecycle. Framework-free on purpose:
 * no NestJS, no I/O — instantiable anywhere and testable in microseconds.
 */
export class OrderStateMachine {
  canTransition(from: OrderStatus, to: OrderStatus): boolean {
    return ORDER_TRANSITIONS[from].includes(to);
  }

  assertTransition(from: OrderStatus, to: OrderStatus): void {
    if (!this.canTransition(from, to)) {
      throw new InvalidTransitionError(from, to);
    }
  }

  nextStatuses(from: OrderStatus): readonly OrderStatus[] {
    return ORDER_TRANSITIONS[from];
  }

  isTerminal(status: OrderStatus): boolean {
    return ORDER_TRANSITIONS[status].length === 0;
  }
}
