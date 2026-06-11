import { describe, expect, it } from '@jest/globals';
import { OrderStatus } from '@delivery-hub/shared';

import { InvalidTransitionError, OrderStateMachine } from './order-state-machine';

const { RECEIVED, ACCEPTED, IN_PREPARATION, READY, DISPATCHED, DELIVERED, CANCELLED, REJECTED } =
  OrderStatus;

// Business source of truth, written out by hand on purpose: the production
// transition map must match THIS table, not the other way around.
const VALID_TRANSITIONS: ReadonlyArray<[OrderStatus, OrderStatus]> = [
  [RECEIVED, ACCEPTED],
  [RECEIVED, REJECTED],
  [RECEIVED, CANCELLED],
  [ACCEPTED, IN_PREPARATION],
  [ACCEPTED, CANCELLED],
  [IN_PREPARATION, READY],
  [IN_PREPARATION, CANCELLED],
  [READY, DISPATCHED],
  [READY, CANCELLED],
  [DISPATCHED, DELIVERED],
];

const ALL_STATUSES = Object.values(OrderStatus);

const INVALID_PAIRS: ReadonlyArray<[OrderStatus, OrderStatus]> = ALL_STATUSES.flatMap((from) =>
  ALL_STATUSES.map((to) => [from, to] as [OrderStatus, OrderStatus]),
).filter(([from, to]) => !VALID_TRANSITIONS.some(([vf, vt]) => vf === from && vt === to));

describe('OrderStateMachine', () => {
  const machine = new OrderStateMachine();

  describe('valid transitions', () => {
    it.each(VALID_TRANSITIONS)('allows %s -> %s', (from, to) => {
      expect(machine.canTransition(from, to)).toBe(true);
      expect(() => machine.assertTransition(from, to)).not.toThrow();
    });
  });

  describe('invalid transitions (every other pair, including self-transitions)', () => {
    it.each(INVALID_PAIRS)('rejects %s -> %s', (from, to) => {
      expect(machine.canTransition(from, to)).toBe(false);
      expect(() => machine.assertTransition(from, to)).toThrow(InvalidTransitionError);
    });
  });

  describe('terminal statuses', () => {
    it.each([[DELIVERED], [CANCELLED], [REJECTED]])('%s is terminal', (status) => {
      expect(machine.isTerminal(status)).toBe(true);
    });

    it.each([[RECEIVED], [ACCEPTED], [IN_PREPARATION], [READY], [DISPATCHED]])(
      '%s is not terminal',
      (status) => {
        expect(machine.isTerminal(status)).toBe(false);
      },
    );
  });

  it('exposes the next valid statuses so operator UIs can render actions', () => {
    expect(machine.nextStatuses(RECEIVED)).toEqual([ACCEPTED, REJECTED, CANCELLED]);
    expect(machine.nextStatuses(DISPATCHED)).toEqual([DELIVERED]);
    expect(machine.nextStatuses(DELIVERED)).toEqual([]);
  });

  it('describes the rejected transition in the error', () => {
    let caught: unknown;
    try {
      machine.assertTransition(DELIVERED, ACCEPTED);
    } catch (error) {
      caught = error;
    }

    expect(caught).toBeInstanceOf(InvalidTransitionError);
    const typed = caught as InvalidTransitionError;
    expect(typed.from).toBe(DELIVERED);
    expect(typed.to).toBe(ACCEPTED);
    expect(typed.message).toContain('DELIVERED');
    expect(typed.message).toContain('ACCEPTED');
  });
});
