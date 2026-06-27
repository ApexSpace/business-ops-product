import { IsIn, IsOptional, IsString } from 'class-validator';

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

  /** `business_app` = WhatsApp Business mobile app coexistence onboarding */
  @IsOptional()
  @IsIn(['business_app', 'cloud_api'])
  onboardingType?: 'business_app' | 'cloud_api';
}
