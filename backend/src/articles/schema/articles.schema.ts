import { z } from 'zod';

export const createArticleSchema = z
  .object({
    title: z
      .string()
      .min(3, 'Title must be at least 3 characters')
      .max(200, 'Title cannot exceed 200 characters'),
    summary: z
      .string()
      .max(220, 'Summary cannot exceed 220 characters')
      .optional(),
    content: z.string().min(1, 'Content is required'),
    slug: z.string().optional(),
  })
  .required({
    title: true,
    content: true,
  });

export const updateArticleSchema = z.object({
  title: z
    .string()
    .min(3, 'Title must be at least 3 characters')
    .max(200, 'Title cannot exceed 200 characters')
    .optional(),
  summary: z
    .string()
    .max(220, 'Summary cannot exceed 220 characters')
    .optional(),
  content: z.string().min(1, 'Content is required').optional(),
  slug: z.string().optional(),
});

export const attachImageSchema = z.object({
  alt: z.string().optional(),
  isCover: z.boolean().optional(),
  position: z.number().int('Position must be an integer').optional(),
});

export type CreateArticleDto = z.infer<typeof createArticleSchema>;
export type UpdateArticleDto = z.infer<typeof updateArticleSchema>;
export type AttachImageDto = z.infer<typeof attachImageSchema>;
