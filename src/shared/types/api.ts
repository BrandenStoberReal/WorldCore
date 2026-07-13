import type { z } from "zod";
import { ApiSuccessSchema, ApiErrorSchema, PaginatedSchema } from "@/shared/schemas/api";

export type ApiSuccess<T> = z.infer<ReturnType<typeof ApiSuccessSchema<z.ZodTypeAny>>> & { data: T };
export type ApiErrorBody = z.infer<typeof ApiErrorSchema>;
export type ApiResult<T> = ApiSuccess<T> | ApiErrorBody;
export type Paginated<T> = z.infer<ReturnType<typeof PaginatedSchema<z.ZodTypeAny>>> & { items: T[] };
