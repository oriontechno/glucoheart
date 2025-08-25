import { IsString, IsOptional, IsBoolean, IsInt } from 'class-validator';

export class AttachImageDto {
  @IsString()
  @IsOptional()
  alt?: string;

  @IsBoolean()
  @IsOptional()
  isCover?: boolean;

  @IsInt()
  @IsOptional()
  position?: number;
}
