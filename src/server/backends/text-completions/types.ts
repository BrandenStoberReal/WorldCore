import type {
  TextCompletionSource,
  TextCompletionRequest,
} from '@/shared/types/backends/textcompletions';

export interface TextCompletionAdapter {
  source: TextCompletionSource;
  forwardRequest(req: TextCompletionRequest): Promise<Response>;
}
