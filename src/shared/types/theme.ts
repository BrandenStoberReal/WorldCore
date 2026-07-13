import type { z } from "zod";
import { ThemeSchema } from "@/shared/schemas/theme";

export type Theme = z.infer<typeof ThemeSchema>;
