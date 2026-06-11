import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Connects lazily on first query (PrismaClient default) instead of at boot:
 * the API can start and serve /health during a brief database outage, and
 * HTTP-layer tests can boot the app without a database at all.
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
