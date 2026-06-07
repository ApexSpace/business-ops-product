import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RootConfig } from '@app/core/config/configuration';
import { ChatbotEmbedResponseDto } from '../dto/chatbot-response.dto';
import { toChatbotEmbed } from '../mappers/chatbot.mapper';

@Injectable()
export class ChatbotEmbedService {
  constructor(private readonly config: ConfigService<RootConfig, true>) {}

  buildEmbed(publicKey: string): ChatbotEmbedResponseDto {
    const backendPublicUrl = this.config.get('app.backendPublicUrl', {
      infer: true,
    });
    return toChatbotEmbed(backendPublicUrl, publicKey);
  }
}
