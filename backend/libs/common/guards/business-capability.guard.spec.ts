import { ExecutionContext, HttpStatus, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessMemberRole } from '@prisma/client';
import { CheckoutAdvancedSettingsController } from '@app/modules/finance/checkout-advanced-settings/controllers/checkout-advanced-settings.controller';
import { CustomFeesController } from '@app/modules/finance/custom-fees/controllers/custom-fees.controller';
import { BusinessIntegrationsController } from '@app/modules/integrations/integrations/business-integrations.controller';
import { BusinessWhatsAppController } from '@app/modules/integrations/integrations/controllers/business-whatsapp.controller';
import { BusinessCapabilityCheckService } from '@app/modules/platform/business/services/business-capability-check.service';
import type { RequestUser } from '../decorators/current-user.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code.enum';
import { BusinessCapabilityGuard } from './business-capability.guard';

describe('BusinessCapabilityGuard', () => {
  const businessId = 'biz-1';
  const owner: RequestUser = {
    id: 'user-1',
    email: 'owner@example.com',
    context: 'business',
    businessId,
    businessRole: BusinessMemberRole.OWNER,
  };

  function createGuard(check: Partial<BusinessCapabilityCheckService>) {
    return new BusinessCapabilityGuard(
      new Reflector(),
      check as BusinessCapabilityCheckService,
    );
  }

  function createContext(
    controller: Type<unknown>,
    handler: (...args: never[]) => unknown,
    user: RequestUser | undefined,
  ): ExecutionContext {
    const request = { user };
    return {
      getClass: () => controller,
      getHandler: () => handler,
      switchToHttp: () => ({
        getRequest: () => request,
      }),
    } as unknown as ExecutionContext;
  }

  async function expectForbidden(promise: Promise<boolean>): Promise<void> {
    try {
      await promise;
      throw new Error('expected AppException');
    } catch (error) {
      expect(error).toBeInstanceOf(AppException);
      const exception = error as AppException;
      expect(exception.getStatus()).toBe(HttpStatus.FORBIDDEN);
      expect(exception.code).toBe(ErrorCode.FEATURE_NOT_AVAILABLE);
    }
  }

  describe('C-P1-06 / CAP-09 sales module', () => {
    const cases: Array<{
      name: string;
      controller: Type<unknown>;
      handler: (...args: never[]) => unknown;
    }> = [
      {
        name: 'GET checkout-advanced-settings',
        controller: CheckoutAdvancedSettingsController,
        handler: CheckoutAdvancedSettingsController.prototype.get,
      },
      {
        name: 'PATCH checkout-advanced-settings',
        controller: CheckoutAdvancedSettingsController,
        handler: CheckoutAdvancedSettingsController.prototype.update,
      },
      {
        name: 'GET custom-fees',
        controller: CustomFeesController,
        handler: CustomFeesController.prototype.list,
      },
      {
        name: 'POST custom-fees',
        controller: CustomFeesController,
        handler: CustomFeesController.prototype.create,
      },
    ];

    it.each(cases)(
      'returns 403 when OWNER lacks sales for $name',
      async ({ controller, handler }) => {
        const hasModule = jest.fn().mockResolvedValue(false);
        const guard = createGuard({ hasModule, hasCapability: jest.fn() });

        await expectForbidden(
          guard.canActivate(createContext(controller, handler, owner)),
        );
        expect(hasModule).toHaveBeenCalledWith(businessId, 'sales');
      },
    );

    it.each(cases)(
      'allows entitled OWNER/ADMIN for $name',
      async ({ controller, handler }) => {
        const hasModule = jest.fn().mockResolvedValue(true);
        const guard = createGuard({ hasModule, hasCapability: jest.fn() });

        await expect(
          guard.canActivate(createContext(controller, handler, owner)),
        ).resolves.toBe(true);
        expect(hasModule).toHaveBeenCalledWith(businessId, 'sales');
      },
    );
  });

  describe('C-P1-07 / INT-06 settings.integrations capability', () => {
    const cases: Array<{
      name: string;
      controller: Type<unknown>;
      handler: (...args: never[]) => unknown;
    }> = [
      {
        name: 'GET integrations/business',
        controller: BusinessIntegrationsController,
        handler: BusinessIntegrationsController.prototype.list,
      },
      {
        name: 'POST integrations/business/:providerKey/connect',
        controller: BusinessIntegrationsController,
        handler: BusinessIntegrationsController.prototype.connect,
      },
      {
        name: 'GET integrations/business/whatsapp/overview',
        controller: BusinessWhatsAppController,
        handler: BusinessWhatsAppController.prototype.getOverview,
      },
      {
        name: 'GET integrations/business/whatsapp/numbers',
        controller: BusinessWhatsAppController,
        handler: BusinessWhatsAppController.prototype.listNumbers,
      },
    ];

    it.each(cases)(
      'returns 403 when OWNER lacks settings.integrations for $name',
      async ({ controller, handler }) => {
        const hasCapability = jest.fn().mockResolvedValue(false);
        const guard = createGuard({
          hasCapability,
          hasModule: jest.fn(),
        });

        await expectForbidden(
          guard.canActivate(createContext(controller, handler, owner)),
        );
        expect(hasCapability).toHaveBeenCalledWith(
          businessId,
          'settings.integrations',
        );
      },
    );

    it.each(cases)(
      'allows entitled OWNER/ADMIN for $name',
      async ({ controller, handler }) => {
        const hasCapability = jest.fn().mockResolvedValue(true);
        const guard = createGuard({
          hasCapability,
          hasModule: jest.fn(),
        });

        await expect(
          guard.canActivate(createContext(controller, handler, owner)),
        ).resolves.toBe(true);
        expect(hasCapability).toHaveBeenCalledWith(
          businessId,
          'settings.integrations',
        );
      },
    );
  });
});
