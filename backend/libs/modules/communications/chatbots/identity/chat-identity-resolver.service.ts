import { HttpStatus, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { ChatbotIdentityRefType, BusinessType } from '@prisma/client';
import { AppException } from '@app/common/exceptions/app.exception';
import { ErrorCode } from '@app/common/exceptions/error-code.enum';
import { RootConfig } from '@app/core/config/configuration';
import { PrismaService } from '@app/core/database/prisma.service';
import { JwtAccessPayload } from '@app/modules/platform/auth/interfaces/jwt-payload.interface';
import { INTERNAL_OPS_BUSINESS_ID } from '@app/modules/platform/business/utils/tenant-business-scope.util';
import type {
  ChatIdentityResolver,
  ResolvedChatIdentity,
} from './chat-identity-resolver';

/**
 * Resolves a business-context JWT to a CRM Contact within the chatbot's tenant.
 */
@Injectable()
export class ContactIdentityResolver implements ChatIdentityResolver {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async resolve(
    jwt: string,
    chatbotBusinessId: string,
  ): Promise<ResolvedChatIdentity> {
    const payload = await this.verify(jwt);
    if (payload.context !== 'business' || !payload.businessId) {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'Business authentication is required for this chatbot',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (payload.businessId !== chatbotBusinessId) {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'Authentication does not match this chatbot business',
        HttpStatus.FORBIDDEN,
      );
    }

    const email = payload.email?.trim().toLowerCase();
    if (!email) {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'Authenticated user has no email',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const contact = await this.prisma.contact.findFirst({
      where: {
        businessId: chatbotBusinessId,
        deletedAt: null,
        email: { equals: email, mode: 'insensitive' },
      },
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    });

    if (!contact) {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'No contact found for authenticated user',
        HttpStatus.NOT_FOUND,
      );
    }

    const displayName =
      contact.displayName?.trim() ||
      [contact.firstName, contact.lastName].filter(Boolean).join(' ').trim() ||
      contact.email ||
      'Customer';

    return {
      id: contact.id,
      refType: ChatbotIdentityRefType.CONTACT,
      displayName,
      profile: {
        email: contact.email,
        firstName: contact.firstName,
        lastName: contact.lastName,
      },
    };
  }

  private async verify(jwt: string): Promise<JwtAccessPayload> {
    try {
      const secret = this.configService.get('jwt.accessSecret', { infer: true });
      return await this.jwtService.verifyAsync<JwtAccessPayload>(jwt, {
        secret,
      });
    } catch {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'Invalid or expired authentication token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}

/**
 * Resolves a platform (or marketing-site) JWT to a PandaCue platform customer/user.
 * Used when chatbot.businessId is the INTERNAL ops tenant.
 */
@Injectable()
export class PlatformCustomerIdentityResolver implements ChatIdentityResolver {
  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService<RootConfig, true>,
    private readonly prisma: PrismaService,
  ) {}

  async resolve(
    jwt: string,
    _chatbotBusinessId: string,
  ): Promise<ResolvedChatIdentity> {
    const payload = await this.verify(jwt);
    const user = await this.prisma.user.findFirst({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
      },
    });
    if (!user) {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'Authenticated user not found',
        HttpStatus.UNAUTHORIZED,
      );
    }

    const displayName =
      [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
      user.email ||
      'Customer';

    return {
      id: user.id,
      refType: ChatbotIdentityRefType.PLATFORM_CUSTOMER,
      displayName,
      profile: {
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        context: payload.context,
        businessId: payload.businessId ?? null,
      },
    };
  }

  private async verify(jwt: string): Promise<JwtAccessPayload> {
    try {
      const secret = this.configService.get('jwt.accessSecret', { infer: true });
      return await this.jwtService.verifyAsync<JwtAccessPayload>(jwt, {
        secret,
      });
    } catch {
      throw new AppException(
        ErrorCode.CHATBOT_AUTH_INVALID,
        'Invalid or expired authentication token',
        HttpStatus.UNAUTHORIZED,
      );
    }
  }
}

@Injectable()
export class ChatIdentityResolverService {
  constructor(
    private readonly contactResolver: ContactIdentityResolver,
    private readonly platformResolver: PlatformCustomerIdentityResolver,
    private readonly prisma: PrismaService,
  ) {}

  async resolveForChatbot(
    jwt: string,
    chatbotBusinessId: string,
  ): Promise<ResolvedChatIdentity> {
    const isOps =
      chatbotBusinessId === INTERNAL_OPS_BUSINESS_ID ||
      (await this.isInternalBusiness(chatbotBusinessId));
    if (isOps) {
      return this.platformResolver.resolve(jwt, chatbotBusinessId);
    }
    return this.contactResolver.resolve(jwt, chatbotBusinessId);
  }

  private async isInternalBusiness(businessId: string): Promise<boolean> {
    const row = await this.prisma.business.findFirst({
      where: { id: businessId, type: BusinessType.INTERNAL, deletedAt: null },
      select: { id: true },
    });
    return !!row;
  }
}
