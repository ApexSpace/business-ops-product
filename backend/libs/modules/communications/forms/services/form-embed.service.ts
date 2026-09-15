import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { FormStatus } from '@prisma/client';
import { RootConfig } from '@app/core/config/configuration';
import { FormEmbedResponseDto } from '../dto/form-embed.dto';
import { toFormEmbed } from '../mappers/form.mapper';

@Injectable()
export class FormEmbedService {
  constructor(private readonly config: ConfigService<RootConfig, true>) {}

  buildEmbed(params: {
    publicKey: string;
    slug: string | null;
    status: FormStatus;
  }): FormEmbedResponseDto {
    const backendPublicUrl = this.config.get('app.backendPublicUrl', {
      infer: true,
    });
    const frontendUrl = this.config.get('app.frontendUrl', { infer: true });
    return toFormEmbed({
      backendPublicUrl,
      frontendUrl,
      publicKey: params.publicKey,
      slug: params.slug,
      isPublished: params.status === FormStatus.PUBLISHED,
    });
  }
}
