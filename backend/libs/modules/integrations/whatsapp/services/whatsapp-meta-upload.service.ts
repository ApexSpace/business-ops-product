import { Injectable } from '@nestjs/common';
import { MetaApiClient } from '../../integrations/meta/services/meta-api-client';
import { MetaConfigService } from '../../integrations/meta/services/meta-config.service';
import {
  assertAllowedTemplateMediaMime,
  resolveTemplateMediaMimeType,
} from '../utils/template-media-mime.util';

@Injectable()
export class WhatsAppMetaUploadService {
  constructor(
    private readonly metaApiClient: MetaApiClient,
    private readonly metaConfigService: MetaConfigService,
  ) {}

  async uploadHeaderSample(input: {
    accessToken: string;
    buffer: Buffer;
    mimeType?: string;
    filename?: string;
  }): Promise<string> {
    const mimeType = resolveTemplateMediaMimeType(
      input.mimeType,
      input.filename,
    );
    assertAllowedTemplateMediaMime(mimeType);

    const { appId } = this.metaConfigService.getMetaAppConfig();
    const session = await this.metaApiClient.createResumableUploadSession(
      appId,
      input.accessToken,
      input.buffer.length,
      mimeType,
    );

    return this.metaApiClient.uploadToResumableSession(
      session.id,
      input.accessToken,
      input.buffer,
    );
  }
}
