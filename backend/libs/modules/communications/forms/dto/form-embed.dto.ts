import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { FormDefinitionDto } from './form-definition.dto';

export class FormEmbedResponseDto {
  @ApiProperty()
  publicKey!: string;

  @ApiPropertyOptional({ nullable: true })
  slug!: string | null;

  @ApiProperty()
  scriptUrl!: string;

  @ApiProperty()
  iframeUrl!: string;

  @ApiProperty()
  hostedPageUrl!: string;

  @ApiProperty()
  embedCode!: string;

  @ApiProperty()
  iframeEmbed!: string;

  @ApiProperty()
  isPublished!: boolean;
}

export class PublicFormConfigDto {
  @ApiProperty()
  publicKey!: string;

  @ApiPropertyOptional({ nullable: true })
  slug!: string | null;

  @ApiProperty()
  name!: string;

  @ApiProperty({ type: FormDefinitionDto })
  definition!: FormDefinitionDto;
}
