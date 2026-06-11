import { Module } from '@nestjs/common';

import { AdapterRegistry } from './adapter.registry';
import { DidiAdapter } from './didi/didi.adapter';
import { PROVIDER_ADAPTERS, ProviderAdapter } from './provider-adapter.interface';
import { RappiAdapter } from './rappi/rappi.adapter';
import { UberEatsAdapter } from './ubereats/ubereats.adapter';

@Module({
  providers: [
    RappiAdapter,
    UberEatsAdapter,
    DidiAdapter,
    {
      // Adding a provider = one adapter class + one line here (OCP)
      provide: PROVIDER_ADAPTERS,
      useFactory: (...adapters: ProviderAdapter[]) => adapters,
      inject: [RappiAdapter, UberEatsAdapter, DidiAdapter],
    },
    {
      provide: AdapterRegistry,
      useFactory: (adapters: ProviderAdapter[]) => new AdapterRegistry(adapters),
      inject: [PROVIDER_ADAPTERS],
    },
  ],
  exports: [AdapterRegistry],
})
export class ProvidersModule {}
