import { z } from 'zod';
import { SHARED_CONST } from '@/shared/constants';

export const ChatCompletionSourceSchema = z.enum([...SHARED_CONST.CHAT_COMPLETION_SOURCES] as [
  string,
  ...string[],
]);

export const ChatCompletionRoleSchema = z.enum(['system', 'user', 'assistant', 'tool']);

export const ChatCompletionMessageSchema = z.object({
  role: ChatCompletionRoleSchema,
  content: z.string(),
  name: z.string().optional(),
  tool_calls: z.array(z.unknown()).optional(),
  tool_call_id: z.string().optional(),
});

export const ChatCompletionRequestSchema = z
  .object({
    chat_completion_source: ChatCompletionSourceSchema,
    model: z.string(),
    messages: z.array(ChatCompletionMessageSchema),
    stream: z.boolean().default(false),
    /**
     * User's preference on whether to use token streaming. Distinct from `stream`
     * (the OpenAI wire flag sent upstream): `streaming` is the user's transport
     * choice surfaced through the UI. When false, the server should return a single
     * JSON response instead of an SSE stream.
     */
    streaming: z.boolean().optional(),
    temperature: z.number().optional(),
    max_tokens: z.number().int().optional(),
    min_tokens: z.number().int().optional(),
    top_p: z.number().optional(),
    top_k: z.number().int().optional(),
    frequency_penalty: z.number().optional(),
    presence_penalty: z.number().optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
    seed: z.number().int().optional(),
    logprobs: z.boolean().optional(),
    top_logprobs: z.number().int().optional(),
    response_format: z.unknown().optional(),
    tools: z.array(z.unknown()).optional(),
    tool_choice: z.unknown().optional(),
  })
  .catchall(z.unknown());
