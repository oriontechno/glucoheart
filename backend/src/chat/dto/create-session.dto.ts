import { IsInt, IsEnum } from 'class-validator';

export class CreateSessionDto {
  @IsInt()
  targetUserId!: number;
}

export enum ChatTargetRole {
  ADMIN = 'ADMIN',
  SUPPORT = 'SUPPORT',
}

export class CreateSessionByRoleDto {
  @IsEnum(ChatTargetRole)
  role!: ChatTargetRole;
}
