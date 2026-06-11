import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseFilters,
} from '@nestjs/common';
import { isOrderStatus } from '@delivery-hub/shared';

import { InvalidTransitionFilter } from './invalid-transition.filter';
import { OrdersService } from './orders.service';

@Controller('orders')
@UseFilters(InvalidTransitionFilter)
export class OrdersController {
  constructor(private readonly orders: OrdersService) {}

  @Get()
  list(@Query('status') status?: string) {
    if (status !== undefined && !isOrderStatus(status)) {
      throw new BadRequestException(`Unknown order status: ${status}`);
    }
    return this.orders.list(status);
  }

  @Patch(':id/transition')
  transition(@Param('id') id: string, @Body() body: { to?: unknown }) {
    if (!isOrderStatus(body?.to)) {
      throw new BadRequestException('"to" must be a valid order status');
    }
    return this.orders.transition(id, body.to, 'operator');
  }
}
