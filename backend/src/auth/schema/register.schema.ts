import { z } from 'zod';

export const createRegisterSchema = z
  .object({
    email: z.email('Invalid email format'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    firstName: z.string().min(1, 'First name is required'),
    lastName: z.string().min(1, 'Last name is required'),
  })
  .required();

export const createLoginSchema = z
  .object({
    email: z.email('Invalid email format'),
    password: z.string().min(1, 'Password is required'),
  })
  .required();

export type CreateRegisterDto = z.infer<typeof createRegisterSchema>;
export type CreateLoginDto = z.infer<typeof createLoginSchema>;
