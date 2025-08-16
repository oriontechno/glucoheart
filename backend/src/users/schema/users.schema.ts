import { z } from 'zod';

const userRoles = ['USER', 'NURSE', 'ADMIN', 'SUPPORT'] as const;

export const createUserSchema = z
  .object({
    email: z.string().email('Invalid email format').min(1, 'Email is required'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .optional(),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required').optional(),
    role: z.enum(userRoles, {
      message: 'Role must be one of: user, nurse, admin, support',
    }),
    profilePicture: z.string().optional(),
  })
  .required({
    email: true,
    firstName: true,
    role: true,
  });

export const updateUserSchema = z.object({
  email: z.string().email('Invalid email format').optional(),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .optional(),
  firstName: z.string().min(1, 'First name is required').optional(),
  lastName: z.string().min(1, 'Last name is required').optional(),
  role: z
    .enum(userRoles, {
      message: 'Role must be one of: user, nurse, admin, superadmin',
    })
    .optional(),
  profilePicture: z.string().optional(),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password cannot exceed 128 characters'),
  })
  .required();

export const adminResetPasswordSchema = z
  .object({
    userId: z
      .number()
      .int('User ID must be an integer')
      .positive('User ID must be positive'),
    newPassword: z
      .string()
      .min(8, 'New password must be at least 8 characters')
      .max(128, 'New password cannot exceed 128 characters'),
  })
  .required();

export type CreateUserDto = z.infer<typeof createUserSchema>;
export type UpdateUserDto = z.infer<typeof updateUserSchema>;
export type ChangePasswordDto = z.infer<typeof changePasswordSchema>;
export type AdminResetPasswordDto = z.infer<typeof adminResetPasswordSchema>;
