import { ArgumentsHost, Catch, ExceptionFilter, HttpStatus } from '@nestjs/common';
import { Response } from 'express';

import { InvalidTransitionError } from './domain/order-state-machine';

/** Translates the pure domain error into HTTP 409 at the boundary. */
@Catch(InvalidTransitionError)
export class InvalidTransitionFilter implements ExceptionFilter {
  catch(exception: InvalidTransitionError, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();
    response.status(HttpStatus.CONFLICT).json({
      statusCode: HttpStatus.CONFLICT,
      error: 'Conflict',
      message: exception.message,
    });
  }
}
