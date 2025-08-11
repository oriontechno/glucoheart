import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class DiscussionSendMessageDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(4000)
  content!: string;
}
