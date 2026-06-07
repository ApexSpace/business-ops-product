import {
  Body,
  Controller,
  Get,
  Headers,
  Ip,
  Param,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Public } from '@app/common/decorators/public.decorator';
import {
  SendChatbotMessageDto,
  StartChatbotSessionDto,
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
    @Ip() ip?: string,
  ) {
    return this.publicSessionService.startSession(
      publicKey,
      { ...dto, referrer: dto.referrer ?? referer },
      { userAgent, referer, ip },
    );
  }

  @Post('sessions/:sessionId/messages')
  @Public()
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  sendMessage(
    @Param('sessionId') sessionId: string,
    @Body() dto: SendChatbotMessageDto,
  ) {
    return this.publicSessionService.sendMessage(sessionId, dto);
  }

  @Get('sessions/:sessionId/messages')
  @Public()
  @Throttle({ default: { limit: 120, ttl: 60000 } })
  listMessages(
    @Param('sessionId') sessionId: string,
    @Query('since') since?: string,
  ) {
    return this.publicSessionService.listMessages(sessionId, since);
  }
}
