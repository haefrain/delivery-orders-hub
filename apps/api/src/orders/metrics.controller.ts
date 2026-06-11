import { Controller, Get } from '@nestjs/common';

import { OrdersService } from './orders.service';

@Controller('metrics')
export class MetricsController {
  constructor(private readonly orders: OrdersService) {}

  @Get('summary')
  summary() {
    return this.orders.metricsSummary();
  }
}
