import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class DiscussionSendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  content!: string;
}
