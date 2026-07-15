import type {
  ChatCompletionSource,
  ChatCompletionRequest,
} from '@/shared/types/backends/chatcompletions';

export interface ChatCompletionAdapter {
  source: ChatCompletionSource;
  forwardRequest(req: ChatCompletionRequest): Promise<Response>;
}
