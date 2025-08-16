// src/articles/dto/update-article.dto.ts
import {
  IsOptional,
  IsString,
  IsIn,
  IsBoolean,
  IsNumber,
} from 'class-validator';

export class UpdateArticleDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  summary?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsIn(['draft', 'published'])
  status?: 'draft' | 'published';

  // dot-separated slugs: "nutrition.mental-health"
  @IsOptional()
  @IsString()
  categories?: string;

  // opsi ganti cover via URL (tanpa upload file)
  @IsOptional()
  @IsString()
  coverUrl?: string;

  // opsi pilih cover dari image yang sudah ada
  @IsOptional()
  @IsNumber()
  coverImageId?: number;

  // hapus cover
  @IsOptional()
  @IsBoolean()
  removeCover?: boolean;

  @IsOptional()
  @IsString()
  coverAlt?: string;
}
