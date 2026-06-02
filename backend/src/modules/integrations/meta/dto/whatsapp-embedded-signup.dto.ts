import { IsOptional, IsString } from 'class-validator';

export class WhatsAppEmbeddedSignupCompleteDto {
  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  wabaId?: string;

  @IsOptional()
  @IsString()
  phoneNumberId?: string;

  @IsOptional()
  @IsString()
  displayPhoneNumber?: string;

  @IsOptional()
  @IsString()
  verifiedName?: string;
}
