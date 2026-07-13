import type { z } from "zod";
import {
  ChatCompletionSourceSchema,
  ChatCompletionRoleSchema,
  ChatCompletionMessageSchema,
  ChatCompletionRequestSchema,
} from "@/shared/schemas/backends/chatcompletions";

export type ChatCompletionSource = z.infer<typeof ChatCompletionSourceSchema>;
export type ChatCompletionRole = z.infer<typeof ChatCompletionRoleSchema>;
export type ChatCompletionMessage = z.infer<typeof ChatCompletionMessageSchema>;
export type ChatCompletionRequest = z.infer<typeof ChatCompletionRequestSchema>;
