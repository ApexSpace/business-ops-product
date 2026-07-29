import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RootConfig } from '@app/core/config/configuration';
import { ChatbotEmbedResponseDto } from '../dto/chatbot-response.dto';
import { toChatbotEmbed } from '../mappers/chatbot.mapper';

@Injectable()
export class ChatbotEmbedService {
  constructor(private readonly config: ConfigService<RootConfig, true>) {}

  buildEmbed(
    publicKey: string,
    options?: {
      position?: 'BOTTOM_RIGHT' | 'BOTTOM_LEFT';
      launcherIcon?: 'message' | 'chat' | 'help';
      primaryColor?: string;
    },
  ): ChatbotEmbedResponseDto {
    const backendPublicUrl = this.config.get('app.backendPublicUrl', {
      infer: true,
    });
    const frontendUrl = this.config.get('app.frontendUrl', { infer: true });
    return toChatbotEmbed(backendPublicUrl, frontendUrl, publicKey, options);
  }
}
