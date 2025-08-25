import { IsString, IsOptional, IsBoolean, MinLength } from 'class-validator';

export class UpdateRoomDto {
  @IsString()
  @MinLength(3)
  topic?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsBoolean()
  @IsOptional()
  isPublic?: boolean;
}
