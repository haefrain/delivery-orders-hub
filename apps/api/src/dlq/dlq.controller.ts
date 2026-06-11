import { Controller, Get, HttpCode, Param, Post } from '@nestjs/common';

import { DlqService } from './dlq.service';

/**
 * Operational visibility: what failed permanently, why, and a one-call
 * requeue once the cause is fixed. Resilience features you can't see
 * might as well not exist.
 */
@Controller('dlq')
export class DlqController {
  constructor(private readonly dlq: DlqService) {}

  @Get()
  list() {
    return this.dlq.list();
  }

  @Post(':id/retry')
  @HttpCode(202)
  retry(@Param('id') id: string) {
    return this.dlq.retry(id);
  }
}
