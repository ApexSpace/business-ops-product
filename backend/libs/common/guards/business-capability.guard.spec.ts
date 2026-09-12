import { readFileSync } from 'fs';
import { join } from 'path';
import { ExecutionContext, HttpStatus, Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BusinessMemberRole } from '@prisma/client';
import { BusinessCapabilityCheckService } from '@app/modules/platform/business/services/business-capability-check.service';
import { RequireCapability } from '../decorators/require-capability.decorator';
import { RequireModule } from '../decorators/require-module.decorator';
import type { RequestUser } from '../decorators/current-user.decorator';
import { AppException } from '../exceptions/app.exception';
import { ErrorCode } from '../exceptions/error-code.enum';
import { BusinessCapabilityGuard } from './business-capability.guard';

@RequireModule('sales')
class SalesModuleController {
  get() {
    return undefined;
  }

  create() {
    return undefined;
  }
}

@RequireCapability('settings.integrations')
class IntegrationsCapabilityController {
  list() {
    return undefined;
  }

  connect() {
    return undefined;
  }
}

describe('BusinessCapabilityGuard', () => {
  const businessId = 'biz-1';
  const owner: RequestUser = {
    id: 'user-1',
    email: 'owner@example.com',
    context: 'business',
    businessId,
    businessRole: BusinessMemberRole.OWNER,
  };
  const admin: RequestUser = {
    ...owner,
    id: 'user-2',
    email: 'admin@example.com',
    businessRole: BusinessMemberRole.ADMIN,
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
    it('returns 403 when OWNER lacks the sales module', async () => {
      const hasModule = jest.fn().mockResolvedValue(false);
      const guard = createGuard({ hasModule, hasCapability: jest.fn() });

      await expectForbidden(
        guard.canActivate(
          createContext(
            SalesModuleController,
            SalesModuleController.prototype.get,
            owner,
          ),
        ),
      );
      expect(hasModule).toHaveBeenCalledWith(businessId, 'sales');
    });

    it.each([
      ['OWNER', owner],
      ['ADMIN', admin],
    ] as const)(
      'allows entitled %s when the sales module is present',
      async (_role, user) => {
        const hasModule = jest.fn().mockResolvedValue(true);
        const guard = createGuard({ hasModule, hasCapability: jest.fn() });

        await expect(
          guard.canActivate(
            createContext(
              SalesModuleController,
              SalesModuleController.prototype.create,
              user,
            ),
          ),
        ).resolves.toBe(true);
        expect(hasModule).toHaveBeenCalledWith(businessId, 'sales');
      },
    );

    it('wires @RequireModule(sales) and BusinessCapabilityGuard on checkout-advanced and custom-fees', () => {
      const checkout = controllerSource(
        'finance/checkout-advanced-settings/controllers/checkout-advanced-settings.controller.ts',
      );
      const customFees = controllerSource(
        'finance/custom-fees/controllers/custom-fees.controller.ts',
      );

      for (const source of [checkout, customFees]) {
        expect(source).toContain("@RequireModule('sales')");
        expect(source).toContain('BusinessCapabilityGuard');
      }
    });
  });

  describe('C-P1-07 / INT-06 settings.integrations capability', () => {
    it('returns 403 when OWNER lacks settings.integrations', async () => {
      const hasCapability = jest.fn().mockResolvedValue(false);
      const guard = createGuard({ hasCapability, hasModule: jest.fn() });

      await expectForbidden(
        guard.canActivate(
          createContext(
            IntegrationsCapabilityController,
            IntegrationsCapabilityController.prototype.connect,
            owner,
          ),
        ),
      );
      expect(hasCapability).toHaveBeenCalledWith(
        businessId,
        'settings.integrations',
      );
    });

    it.each([
      ['OWNER', owner],
      ['ADMIN', admin],
    ] as const)(
      'allows entitled %s when settings.integrations is present',
      async (_role, user) => {
        const hasCapability = jest.fn().mockResolvedValue(true);
        const guard = createGuard({ hasCapability, hasModule: jest.fn() });

        await expect(
          guard.canActivate(
            createContext(
              IntegrationsCapabilityController,
              IntegrationsCapabilityController.prototype.list,
              user,
            ),
          ),
        ).resolves.toBe(true);
        expect(hasCapability).toHaveBeenCalledWith(
          businessId,
          'settings.integrations',
        );
      },
    );

    it('wires @RequireCapability(settings.integrations) on business integrations and WhatsApp APIs', () => {
      const integrations = controllerSource(
        'integrations/integrations/business-integrations.controller.ts',
      );
      const whatsapp = controllerSource(
        'integrations/integrations/controllers/business-whatsapp.controller.ts',
      );

      for (const source of [integrations, whatsapp]) {
        expect(source).toContain("@RequireCapability('settings.integrations')");
        expect(source).toContain('BusinessCapabilityGuard');
      }
    });
  });
});

function controllerSource(relativeFromModules: string): string {
  return readFileSync(
    join(__dirname, '../../modules', relativeFromModules),
    'utf8',
  );
}
