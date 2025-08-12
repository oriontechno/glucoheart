import { z } from 'zod';

export const createRoomSchema = z
  .object({
    topic: z.string().min(3, 'Topic must be at least 3 characters').trim(),
    description: z.string().optional(),
    isPublic: z.boolean().optional().default(true),
  })
  .required({
    topic: true,
  });

export const discussionSendMessageSchema = z
  .object({
    content: z
      .string()
      .min(1, 'Message content is required')
      .max(4000, 'Message content cannot exceed 4000 characters')
      .trim(),
  })
  .required();

export type CreateRoomDto = z.infer<typeof createRoomSchema>;
export type DiscussionSendMessageDto = z.infer<
  typeof discussionSendMessageSchema
>;
