import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class ConnectBusinessTwilioDto {
  @ApiProperty()
  @IsString()
  @MinLength(34)
  @MaxLength(34)
  accountSid!: string;

  @ApiProperty()
  @IsString()
  @MinLength(16)
  authToken!: string;

  @ApiProperty()
  @IsString()
  @MinLength(34)
  @MaxLength(34)
  phoneNumberSid!: string;
}

export class ListTwilioPhoneNumbersDto {
  @ApiProperty()
  @IsString()
  @MinLength(34)
  @MaxLength(34)
  accountSid!: string;

  @ApiProperty()
  @IsString()
  @MinLength(16)
  authToken!: string;
}
