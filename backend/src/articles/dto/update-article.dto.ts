import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateArticleDto {
  @IsString()
  @IsOptional()
  @MinLength(3)
  @MaxLength(200)
  title?: string;

  @IsString()
  @IsOptional()
  @MaxLength(220)
  summary?: string;

  @IsString()
  @IsOptional()
  content?: string;

  @IsString()
  @IsOptional()
  slug?: string;
}
