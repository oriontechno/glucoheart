import { IsEmail, IsString, IsEnum, IsOptional } from 'class-validator';

export class UpdateUserDto {
  @IsEmail()
  @IsOptional()
  email?: string;

  @IsString()
  @IsOptional()
  password?: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;

  @IsEnum(['user', 'nurse', 'admin', 'superadmin'])
  @IsOptional()
  role?: string;

  @IsString()
  @IsOptional()
  profilePicture?: string;
}
