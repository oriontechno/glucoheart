import { pgEnum } from 'drizzle-orm/pg-core';

// Define and export the enum type and its possible values
export const ROLES = {
  USER: 'USER',
  NURSE: 'NURSE',
  ADMIN: 'ADMIN',
  SUPPORT: 'SUPPORT',
} as const;

export type Role = (typeof ROLES)[keyof typeof ROLES];

export const roleEnum = pgEnum(
  'role',
  Object.values(ROLES) as [string, ...string[]],
);
