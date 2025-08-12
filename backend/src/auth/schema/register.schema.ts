import { z } from 'zod';

export const createRegisterSchema = z
  .object({
    email: z.email(),
    password: z.string(),
    firstName: z.string(),
    lastName: z.string(),
  })
  .required();

export type CreateRegisterDto = z.infer<typeof createRegisterSchema>;
