import { createHmac } from 'node:crypto';

import { describe, expect, it } from '@jest/globals';
import { Provider } from '@delivery-hub/shared';

import { DidiSignatureVerifier } from './didi.verifier';
import { RappiSignatureVerifier } from './rappi.verifier';
import { SignatureVerifier } from './signature-verifier.interface';
import { UberEatsSignatureVerifier } from './ubereats.verifier';

const SECRET = 'test-secret';
const BODY = Buffer.from(JSON.stringify({ order: { id: 'ord-123' } }));

const hmacHex = (secret: string, payload: Buffer): string =>
  createHmac('sha256', secret).update(payload).digest('hex');

const didiSignature = (secret: string, timestamp: string, payload: Buffer): string =>
  createHmac('sha256', secret)
    .update(`${timestamp}.${payload.toString('utf8')}`)
    .digest('base64');

interface VerifierCase {
  name: string;
  provider: Provider;
  build: () => SignatureVerifier;
  validHeaders: () => Record<string, string>;
  signatureHeader: string;
}

const TIMESTAMP = '1760000000000';

const CASES: VerifierCase[] = [
  {
    name: 'Rappi (hex digest, X-Rappi-Signature)',
    provider: Provider.RAPPI,
    build: () => new RappiSignatureVerifier(SECRET),
    validHeaders: () => ({ 'x-rappi-signature': hmacHex(SECRET, BODY) }),
    signatureHeader: 'x-rappi-signature',
  },
  {
    name: 'Uber Eats (hex digest, X-Uber-Signature)',
    provider: Provider.UBEREATS,
    build: () => new UberEatsSignatureVerifier(SECRET),
    validHeaders: () => ({ 'x-uber-signature': hmacHex(SECRET, BODY) }),
    signatureHeader: 'x-uber-signature',
  },
  {
    name: 'DiDi (base64 digest over timestamp.body)',
    provider: Provider.DIDI,
    build: () => new DidiSignatureVerifier(SECRET),
    validHeaders: () => ({
      'x-didi-signature': didiSignature(SECRET, TIMESTAMP, BODY),
      'x-didi-timestamp': TIMESTAMP,
    }),
    signatureHeader: 'x-didi-signature',
  },
];

describe.each(CASES)('$name', ({ provider, build, validHeaders, signatureHeader }) => {
  const verifier = build();

  it(`identifies itself as ${provider}`, () => {
    expect(verifier.provider).toBe(provider);
  });

  it('accepts a payload signed with the right secret', () => {
    expect(verifier.verify(BODY, validHeaders())).toBe(true);
  });

  it('rejects a payload signed with a different secret', () => {
    const headers = { ...validHeaders() };
    const wrong = build();
    void wrong; // signature computed with an unrelated secret below
    headers[signatureHeader] = hmacHex('another-secret', BODY);
    expect(verifier.verify(BODY, headers)).toBe(false);
  });

  it('rejects a tampered body', () => {
    const tampered = Buffer.from(JSON.stringify({ order: { id: 'ord-999' } }));
    expect(verifier.verify(tampered, validHeaders())).toBe(false);
  });

  it('rejects when the signature header is missing', () => {
    const headers = { ...validHeaders() };
    delete headers[signatureHeader];
    expect(verifier.verify(BODY, headers)).toBe(false);
  });

  it('rejects malformed signatures without throwing', () => {
    const headers = { ...validHeaders() };
    headers[signatureHeader] = 'not-a-real-signature';
    expect(verifier.verify(BODY, headers)).toBe(false);
  });
});

describe('DiDi timestamp handling', () => {
  const verifier = new DidiSignatureVerifier(SECRET);

  it('rejects when the timestamp header is missing', () => {
    expect(
      verifier.verify(BODY, { 'x-didi-signature': didiSignature(SECRET, TIMESTAMP, BODY) }),
    ).toBe(false);
  });

  it('rejects when the timestamp does not match the signed one', () => {
    expect(
      verifier.verify(BODY, {
        'x-didi-signature': didiSignature(SECRET, TIMESTAMP, BODY),
        'x-didi-timestamp': '1760000099999',
      }),
    ).toBe(false);
  });
});
