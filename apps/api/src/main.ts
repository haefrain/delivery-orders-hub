import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  // rawBody is required to verify webhook HMAC signatures against the exact
  // bytes the provider sent, not a re-serialized (and re-ordered) JSON object.
  const app = await NestFactory.create(AppModule, { rawBody: true });
  await app.listen(process.env.PORT ?? 3000);
}

void bootstrap();
