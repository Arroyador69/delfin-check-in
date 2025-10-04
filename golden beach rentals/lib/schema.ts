import { z } from 'zod';

export const LodgingFilterSchema = z.object({
  type: z.enum(['HOSTAL', 'HOTEL', 'APARTAMENTO']).optional(),
  city: z.string().optional(),
});

export type LodgingFilter = z.infer<typeof LodgingFilterSchema>;
