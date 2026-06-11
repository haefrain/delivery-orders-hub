import {
  BadRequestException,
  Body,
  Controller,
  HttpCode,
  Post,
  RawBodyRequest,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Provider } from '@delivery-hub/shared';
import { Request } from 'express';

import { IngestionService } from '../ingestion/ingestion.service';
import { SignatureGuard } from './signature.guard';
import { WebhookProvider } from './webhook-provider.decorator';

/**
 * Thin by design: authenticate (guard), hand off, reply 202. Zero business
 * logic — providers expect a fast ack and processing happens in the worker.
 */
@Controller('webhooks')
@UseGuards(SignatureGuard)
export class WebhooksController {
  constructor(private readonly ingestion: IngestionService) {}

  @Post('rappi')
  @HttpCode(202)
  @WebhookProvider(Provider.RAPPI)
  rappi(@Body() payload: unknown, @Req() request: RawBodyRequest<Request>) {
    return this.ingestion.receive(Provider.RAPPI, payload, this.rawBodyOf(request));
  }

  @Post('ubereats')
  @HttpCode(202)
  @WebhookProvider(Provider.UBEREATS)
  ubereats(@Body() payload: unknown, @Req() request: RawBodyRequest<Request>) {
    return this.ingestion.receive(Provider.UBEREATS, payload, this.rawBodyOf(request));
  }

  @Post('didi')
  @HttpCode(202)
  @WebhookProvider(Provider.DIDI)
  didi(@Body() payload: unknown, @Req() request: RawBodyRequest<Request>) {
    return this.ingestion.receive(Provider.DIDI, payload, this.rawBodyOf(request));
  }

  private rawBodyOf(request: RawBodyRequest<Request>): Buffer {
    if (!request.rawBody) {
      throw new BadRequestException('Missing request body');
    }
    return request.rawBody;
  }
}
