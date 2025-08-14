import { IsArray, ArrayMinSize, IsString, Matches } from 'class-validator';

export class SetArticleCategoriesDto {
  @IsArray()
  @ArrayMinSize(0)
  @IsString({ each: true })
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
    each: true,
    message: 'category slug must be kebab-case',
  })
  categories!: string[]; // daftar slug
}
