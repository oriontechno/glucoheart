import {
  IsEmail,
  IsNotEmpty,
  IsString,
  IsEnum,
  IsOptional,
} from 'class-validator';

export class CreateUserDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsNotEmpty()
  firstName: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(['USER', 'NURSE', 'ADMIN', 'SUPPORT'])
  @IsNotEmpty()
  role: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;
}
