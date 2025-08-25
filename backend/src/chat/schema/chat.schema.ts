import { z } from 'zod';

export const chatTargetRoles = ['ADMIN', 'SUPPORT'] as const;

export const createSessionSchema = z
  .object({
    targetUserId: z
      .number()
      .int('Target user ID must be an integer')
      .positive('Target user ID must be positive'),
  })
  .required();

export const createSessionByRoleSchema = z
  .object({
    role: z.enum(chatTargetRoles, {
      message: 'Role must be one of: ADMIN, SUPPORT',
    }),
  })
  .required();

export const sendMessageSchema = z
  .object({
    content: z.string().min(1, 'Message content is required').trim(),
  })
  .required();

export const assignNurseSchema = z
  .object({
    nurseId: z
      .number()
      .int('Nurse ID must be an integer')
      .positive('Nurse ID must be positive'),
  })
  .required();

export type CreateSessionDto = z.infer<typeof createSessionSchema>;
export type CreateSessionByRoleDto = z.infer<typeof createSessionByRoleSchema>;
export type SendMessageDto = z.infer<typeof sendMessageSchema>;
export type AssignNurseDto = z.infer<typeof assignNurseSchema>;
