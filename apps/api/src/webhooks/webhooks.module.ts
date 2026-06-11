import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { IngestionModule } from '../ingestion/ingestion.module';
import { SignatureGuard } from './signature.guard';
import { DidiSignatureVerifier } from './verifiers/didi.verifier';
import { RappiSignatureVerifier } from './verifiers/rappi.verifier';
import { SIGNATURE_VERIFIERS, SignatureVerifier } from './verifiers/signature-verifier.interface';
import { UberEatsSignatureVerifier } from './verifiers/ubereats.verifier';
import { WebhooksController } from './webhooks.controller';

@Module({
  imports: [IngestionModule],
  controllers: [WebhooksController],
  providers: [
    SignatureGuard,
    {
      // Adding a provider = one verifier class + one line here. The guard
      // depends on the token, never on a concrete verifier (OCP/DIP).
      provide: SIGNATURE_VERIFIERS,
      inject: [ConfigService],
      useFactory: (config: ConfigService): SignatureVerifier[] => [
        new RappiSignatureVerifier(config.getOrThrow('RAPPI_WEBHOOK_SECRET')),
        new UberEatsSignatureVerifier(config.getOrThrow('UBEREATS_WEBHOOK_SECRET')),
        new DidiSignatureVerifier(config.getOrThrow('DIDI_WEBHOOK_SECRET')),
      ],
    },
  ],
})
export class WebhooksModule {}
