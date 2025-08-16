import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class CreateArticleDto {
  @IsString()
  @MinLength(3)
  @MaxLength(200)
  title!: string;

  @IsString()
  @IsOptional()
  @MaxLength(220)
  summary?: string;

  @IsString()
  @MinLength(1)
  content!: string;

  @IsString()
  @IsOptional()
  slug?: string; // optional; will be generated if missing

  @IsOptional()
  status?: 'draft' | 'published';

  @IsOptional()
  categories?: string | null; // "slug1.slug2"

  @IsOptional()
  coverAlt?: string | null;

  @IsOptional()
  coverUrl?: string | null; // Opsi B (tanpa file)
}
