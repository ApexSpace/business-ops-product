import { Injectable, Logger } from '@nestjs/common';
import type { Response } from 'express';
import type { MetaFlowType } from '../constants/meta-provider.config';
import {
  verifyMetaOAuthState,
} from '../utils/meta-oauth-state.util';
import { MetaConfigService } from './meta-config.service';
import { MetaEmbeddedSignupService } from './meta-embedded-signup.service';
import { MetaOAuthService } from './meta-oauth.service';

@Injectable()
export class MetaOAuthCallbackRouter {
  private readonly logger = new Logger(MetaOAuthCallbackRouter.name);

  constructor(
    private readonly metaConfigService: MetaConfigService,
    private readonly metaOAuthService: MetaOAuthService,
    private readonly metaEmbeddedSignupService: MetaEmbeddedSignupService,
  ) {}

  async routeCallback(
    code: string | undefined,
    state: string | undefined,
    error: string | undefined,
    res: Response,
  ): Promise<void> {
    const flowType = this.resolveCallbackFlow(state, error);

    this.logger.log(
      `Meta OAuth callback flowType=${flowType ?? 'unknown'} hasState=${Boolean(state)} hasError=${Boolean(error)}`,
    );

    if (flowType === 'WHATSAPP_EMBEDDED_SIGNUP') {
      await this.metaEmbeddedSignupService.handleCallback(
        code,
        state,
        error,
        res,
      );
      return;
    }

    await this.metaOAuthService.handleCallback(code, state, error, res);
  }

  private resolveCallbackFlow(
    state: string | undefined,
    error: string | undefined,
  ): MetaFlowType | null {
    if (!state) {
      return null;
    }

    try {
      const payload = verifyMetaOAuthState(
        state,
        this.metaConfigService.getStateSecret(),
      );
      this.logger.log(
        `Meta OAuth callback state providerKey=${payload.providerKey} flowType=${payload.flowType}`,
      );
      return payload.flowType;
    } catch (err) {
      this.logger.warn(
        `Meta OAuth callback could not verify state: ${err instanceof Error ? err.message : 'unknown'}`,
      );
      return null;
    }
  }

}
