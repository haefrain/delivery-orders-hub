import { Provider } from '@delivery-hub/shared';

import { ProviderAdapter } from './provider-adapter.interface';

export class UnsupportedProviderError extends Error {
  constructor(readonly provider: string) {
    super(`No adapter registered for provider: ${provider}`);
    this.name = 'UnsupportedProviderError';
  }
}

/** Indexes adapters by provider; consumers depend on this, never on concrete adapters (DIP). */
export class AdapterRegistry {
  private readonly byProvider: ReadonlyMap<Provider, ProviderAdapter>;

  constructor(adapters: ProviderAdapter[]) {
    this.byProvider = new Map(adapters.map((adapter) => [adapter.provider, adapter]));
  }

  get(provider: Provider): ProviderAdapter {
    const adapter = this.byProvider.get(provider);
    if (!adapter) {
      throw new UnsupportedProviderError(provider);
    }
    return adapter;
  }
}
