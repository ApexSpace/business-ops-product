import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength, MinLength } from 'class-validator';

export class CreateConversationNoteDto {
  @ApiProperty()
  @IsString()
  @MinLength(1)
  @MaxLength(4000)
  body!: string;
}

export class ConversationNoteAuthorDto {
  id!: string;
  firstName!: string | null;
  lastName!: string | null;
  email!: string;
}

export class ConversationNoteResponseDto {
  id!: string;
  conversationId!: string;
  body!: string;
  author!: ConversationNoteAuthorDto;
  createdAt!: string;
  updatedAt!: string;
}
