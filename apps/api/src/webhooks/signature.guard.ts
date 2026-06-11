import {
  CanActivate,
  ExecutionContext,
  Inject,
  Injectable,
  RawBodyRequest,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Provider } from '@delivery-hub/shared';
import { Request } from 'express';

import { SIGNATURE_VERIFIERS, SignatureVerifier } from './verifiers/signature-verifier.interface';
import { WEBHOOK_PROVIDER_KEY } from './webhook-provider.decorator';

@Injectable()
export class SignatureGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(SIGNATURE_VERIFIERS) private readonly verifiers: SignatureVerifier[],
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const provider = this.reflector.get<Provider | undefined>(
      WEBHOOK_PROVIDER_KEY,
      context.getHandler(),
    );
    if (!provider) {
      throw new Error('SignatureGuard requires a @WebhookProvider() decorator on the handler');
    }

    const verifier = this.verifiers.find((candidate) => candidate.provider === provider);
    if (!verifier) {
      throw new Error(`No signature verifier registered for provider ${provider}`);
    }

    const request = context.switchToHttp().getRequest<RawBodyRequest<Request>>();
    if (!request.rawBody || !verifier.verify(request.rawBody, request.headers)) {
      throw new UnauthorizedException('Invalid webhook signature');
    }
    return true;
  }
}
