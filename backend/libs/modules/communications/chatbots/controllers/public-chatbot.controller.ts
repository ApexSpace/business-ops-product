import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@app/common/decorators/public.decorator';
import {
  ClaimChatbotSessionDto,
  SendChatbotMessageDto,
  StartChatbotSessionDto,
  UpdateChatbotSessionProfileDto,
} from '../dto/chatbot.dto';
import { PublicChatbotSessionService } from '../services/public-chatbot-session.service';

@ApiTags('public-chatbots')
@Controller('public/chatbots')
export class PublicChatbotController {
  constructor(
    private readonly publicSessionService: PublicChatbotSessionService,
  ) {}

  @Get(':publicKey/config')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  getConfig(@Param('publicKey') publicKey: string) {
    return this.publicSessionService.getConfig(publicKey);
  }

  @Post(':publicKey/sessions')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  startSession(
    @Param('publicKey') publicKey: string,
    @Body() dto: StartChatbotSessionDto,
    @Headers('user-agent') userAgent?: string,
    @Headers('referer') referer?: string,
    @Headers('authorization') authorization?: string,
    @Ip() ip?: string,
  ) {
    return this.publicSessionService.startSession(
      publicKey,
      { ...dto, referrer: dto.referrer ?? referer },
      {
        userAgent,
        referer,
        ip,
        authToken: bearerToken(authorization) ?? dto.authToken,
      },
    );
  }

  @Get(':publicKey/sessions/:sessionId')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  getSession(
    @Param('publicKey') publicKey: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.publicSessionService.getSession(publicKey, sessionId);
  }

  @Post(':publicKey/sessions/:sessionId/messages')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  sendMessage(
    @Param('publicKey') publicKey: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: SendChatbotMessageDto,
  ) {
    return this.publicSessionService.sendMessage(publicKey, sessionId, dto);
  }

  @Get(':publicKey/sessions/:sessionId/messages')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  listMessages(
    @Param('publicKey') publicKey: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Query('since') since?: string,
  ) {
    return this.publicSessionService.listMessages(publicKey, sessionId, since);
  }

  @Post(':publicKey/sessions/:sessionId/end')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  endSession(
    @Param('publicKey') publicKey: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
  ) {
    return this.publicSessionService.endSession(publicKey, sessionId);
  }

  @Patch(':publicKey/sessions/:sessionId/profile')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  updateSessionProfile(
    @Param('publicKey') publicKey: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: UpdateChatbotSessionProfileDto,
  ) {
    return this.publicSessionService.updateSessionProfile(
      publicKey,
      sessionId,
      dto,
    );
  }

  @Post(':publicKey/sessions/:sessionId/claim')
  @Public()
  @Throttle({ default: { limit: 30, ttl: 60000 } })
  claimSession(
    @Param('publicKey') publicKey: string,
    @Param('sessionId', ParseUUIDPipe) sessionId: string,
    @Body() dto: ClaimChatbotSessionDto,
    @Headers('authorization') authorization?: string,
  ) {
    return this.publicSessionService.claimSession(
      publicKey,
      sessionId,
      dto,
      bearerToken(authorization),
    );
  }
}

function bearerToken(authorization?: string): string | undefined {
  if (!authorization?.startsWith('Bearer ')) return undefined;
  const token = authorization.slice('Bearer '.length).trim();
  return token || undefined;
}
