import { z } from 'zod';

export const ThemeSchema = z
  .object({
    name: z.string().optional(),
    colors: z.record(z.string()).optional(),
    fonts: z.record(z.string()).optional(),
  })
  .catchall(z.unknown());
