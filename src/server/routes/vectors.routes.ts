import { errorGuard } from '@/server/middleware/errorGuard';
import { withUserId } from '@/server/middleware/withUserId';
import { vectorService } from '@/server/services/vectors.service';
import {
  VectorSearchRequestSchema,
  VectorEmbeddingRequestSchema,
  VectorUpsertRequestSchema,
  VectorDeleteRequestSchema,
} from '@/shared/schemas/vectors';
import { ValidationError } from '@/server/errors';

export const vectorsRoutes = {
  search: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as Record<string, unknown>;
      const parseResult = VectorSearchRequestSchema.safeParse(body);
      if (!parseResult.success) {
        throw new ValidationError(parseResult.error.errors);
      }
      const result = await vectorService.search(parseResult.data);
      return Response.json(result);
    }),
  ),

  embed: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as Record<string, unknown>;
      const parseResult = VectorEmbeddingRequestSchema.safeParse(body);
      if (!parseResult.success) {
        throw new ValidationError(parseResult.error.errors);
      }
      const result = await vectorService.embed(parseResult.data);
      return Response.json(result);
    }),
  ),

  upsert: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as Record<string, unknown>;
      const parseResult = VectorUpsertRequestSchema.safeParse(body);
      if (!parseResult.success) {
        throw new ValidationError(parseResult.error.errors);
      }
      const result = await vectorService.upsert(parseResult.data);
      return Response.json(result);
    }),
  ),

  delete: errorGuard(
    withUserId(async (req: Request, userId: string): Promise<Response> => {
      const body = (await req.json()) as Record<string, unknown>;
      const parseResult = VectorDeleteRequestSchema.safeParse(body);
      if (!parseResult.success) {
        throw new ValidationError(parseResult.error.errors);
      }
      const result = await vectorService.delete(parseResult.data);
      return Response.json(result);
    }),
  ),
};
