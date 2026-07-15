import { errorGuard } from '@/server/middleware/errorGuard';
import { TokenizeRequestSchema, TokenizeResponseSchema } from '@/shared/schemas/tokenizers';
import { TiktokenTokenizer } from '@/server/tokenizers/tiktoken';
import { ValidationError } from '@/server/errors';

export const tokenizersRoutes = {
  count: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = TokenizeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors);
    }
    const tokenizer = new TiktokenTokenizer(parsed.data.model);
    const count = tokenizer.countTokens(parsed.data.text);
    return Response.json({ count });
  }),

  encode: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>;
    const parsed = TokenizeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError(parsed.error.errors);
    }
    const tokenizer = new TiktokenTokenizer(parsed.data.model);
    const tokens = tokenizer.encode(parsed.data.text);
    const result = TokenizeResponseSchema.parse({
      tokens,
      text: parsed.data.text,
      count: tokens.length,
    });
    return Response.json(result);
  }),

  decode: errorGuard(async (req: Request): Promise<Response> => {
    const body = (await req.json()) as Record<string, unknown>;
    const model = typeof body.model === 'string' ? body.model : null;
    const tokens = body.tokens;
    if (!model || !Array.isArray(tokens)) {
      throw new ValidationError([{ message: 'model and tokens are required' }]);
    }
    const tokenizer = new TiktokenTokenizer(model);
    const text = tokenizer.decode(tokens as number[]);
    return Response.json({ text, count: (tokens as number[]).length });
  }),
};
