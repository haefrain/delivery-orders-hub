/* eslint-disable no-console */
import { ALL_PROVIDERS, isOrderStatus, ORDER_TRANSITIONS, Provider } from '@delivery-hub/shared';

import { buildWebhookPayload } from './payload-factories';
import { signWebhook } from './sign';

/**
 * Standalone traffic generator: fires signed webhooks for random providers
 * and nudges existing orders through their lifecycle so the kanban moves.
 *
 *   pnpm --filter @delivery-hub/api simulate -- --count 20 --rate 2
 */
interface Options {
  count: number;
  rate: number;
  target: string;
}

const SECRETS: Record<Provider, string> = {
  [Provider.RAPPI]: process.env.RAPPI_WEBHOOK_SECRET ?? 'local-rappi-secret',
  [Provider.UBEREATS]: process.env.UBEREATS_WEBHOOK_SECRET ?? 'local-ubereats-secret',
  [Provider.DIDI]: process.env.DIDI_WEBHOOK_SECRET ?? 'local-didi-secret',
};

const WEBHOOK_PATHS: Record<Provider, string> = {
  [Provider.RAPPI]: '/webhooks/rappi',
  [Provider.UBEREATS]: '/webhooks/ubereats',
  [Provider.DIDI]: '/webhooks/didi',
};

const parseArgs = (argv: string[]): Options => {
  const get = (flag: string): string | undefined => {
    const index = argv.indexOf(flag);
    return index >= 0 ? argv[index + 1] : undefined;
  };
  return {
    count: Number(get('--count') ?? 20),
    rate: Number(get('--rate') ?? 2),
    target: get('--target') ?? 'http://localhost:3000',
  };
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const sendWebhook = async (target: string): Promise<void> => {
  const provider = ALL_PROVIDERS[Math.floor(Math.random() * ALL_PROVIDERS.length)];
  const body = JSON.stringify(buildWebhookPayload(provider));
  const headers = {
    'content-type': 'application/json',
    ...signWebhook(provider, body, SECRETS[provider]),
  };

  const response = await fetch(`${target}${WEBHOOK_PATHS[provider]}`, {
    method: 'POST',
    headers,
    body,
  });
  console.log(`-> ${provider.padEnd(8)} webhook ${response.status}`);
};

/** Advance one random non-terminal order so the board stays alive. */
const nudgeRandomOrder = async (target: string): Promise<void> => {
  const orders = (await (await fetch(`${target}/orders`)).json()) as Array<{
    id: string;
    status: string;
  }>;
  const movable = orders.filter(
    (order) => isOrderStatus(order.status) && ORDER_TRANSITIONS[order.status].length > 0,
  );
  if (movable.length === 0) {
    return;
  }

  const order = movable[Math.floor(Math.random() * movable.length)];
  if (!isOrderStatus(order.status)) {
    return;
  }
  const nextStatuses = ORDER_TRANSITIONS[order.status];
  // Bias toward the happy path: cancellations exist but should be rare
  const to = Math.random() < 0.9 ? nextStatuses[0] : nextStatuses[nextStatuses.length - 1];

  const response = await fetch(`${target}/orders/${order.id}/transition`, {
    method: 'PATCH',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ to }),
  });
  console.log(`   ${order.id.slice(0, 8)} ${order.status} -> ${to} (${response.status})`);
};

async function main(): Promise<void> {
  const options = parseArgs(process.argv.slice(2));
  console.log(
    `Simulating ${options.count} orders at ~${options.rate}/s against ${options.target}\n`,
  );

  for (let sent = 0; sent < options.count; sent += 1) {
    try {
      await sendWebhook(options.target);
      if (sent % 2 === 1) {
        await nudgeRandomOrder(options.target);
      }
    } catch (error) {
      console.error(`   request failed: ${String(error)}`);
    }
    await sleep(1000 / options.rate);
  }

  console.log('\nDone. Watch the kanban board move in real time.');
}

void main();
