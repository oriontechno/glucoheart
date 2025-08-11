import { IsInt, IsString, MinLength, MaxLength } from 'class-validator';

export class AdminResetPasswordDto {
  @IsInt()
  userId!: number;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
