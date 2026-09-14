import { HttpStatus } from '@nestjs/common';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { StripeWebhookController } from './stripe-webhook.controller';

describe('StripeWebhookController Connect ack (SALE-AUD-01)', () => {
  const rawBody = Buffer.from('{"id":"evt_1"}');
  const req = { rawBody } as never;

  function createController(handleConnected = jest.fn().mockResolvedValue(undefined)) {
    const stripeWebhookService = {
      handleConnectedAccountWebhook: handleConnected,
      handlePlatformWebhook: jest.fn(),
    };
    const controller = new StripeWebhookController(stripeWebhookService as never);
    return { controller, stripeWebhookService };
  }

  it('awaits verify+persist before returning 200', async () => {
    const { controller, stripeWebhookService } = createController();

    const result = await controller.handleConnect(req, 'sig_test');

    expect(
      stripeWebhookService.handleConnectedAccountWebhook,
    ).toHaveBeenCalledWith(rawBody, 'sig_test');
    expect(result).toEqual({ received: true });
  });

  it('does not ack success when persist/enqueue fails (5xx)', async () => {
    const { controller } = createController(
      jest.fn().mockRejectedValue(new Error('redis down')),
    );

    const error = await controller.handleConnect(req, 'sig_test').then(
      () => {
        throw new Error('expected persist failure');
      },
      (err: unknown) => err,
    );

    expect(error).toBeInstanceOf(AppException);
    const appError = error as AppException;
    expect(appError.code).toBe(ErrorCode.INTERNAL_ERROR);
    expect(appError.getStatus()).toBe(HttpStatus.INTERNAL_SERVER_ERROR);
  });

  it('preserves 4xx AppException from signature verification', async () => {
    const verificationError = new AppException(
      ErrorCode.BAD_REQUEST,
      'Missing Stripe signature header',
      HttpStatus.BAD_REQUEST,
    );
    const { controller } = createController(
      jest.fn().mockRejectedValue(verificationError),
    );

    await expect(controller.handleConnect(req, undefined)).rejects.toBe(
      verificationError,
    );
  });
});
