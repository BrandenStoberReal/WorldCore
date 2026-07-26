import { toast } from 'sonner';

interface ApiErrorEnvelope {
  error?: { code?: string; message?: string };
}

function extractApiErrorEnvelope(text: string): ApiErrorEnvelope | null {
  try {
    const parsed = JSON.parse(text) as ApiErrorEnvelope;
    if (parsed && typeof parsed === 'object' && 'error' in parsed) {
      return parsed;
    }
  } catch {
    // not JSON — fall through
  }
  return null;
}

function toastFromError(err: unknown): void {
  let title = 'Something went wrong';
  let description: string | undefined;

  if (err instanceof Error) {
    const match = err.message.match(/^API error (\d+):\s*(.*)$/s);
    if (match) {
      const status = match[1];
      const body = match[2]?.trim() ?? '';
      const env = extractApiErrorEnvelope(body);
      if (env?.error?.message) {
        title = env.error.message;
        if (env.error.code && env.error.code !== 'INTERNAL_ERROR') {
          description = `${env.error.code} (${status})`;
        } else {
          description = `Status ${status}`;
        }
      } else {
        title = body || `Request failed (${status})`;
        description = undefined;
      }
    } else {
      title = err.message;
    }
  } else if (typeof err === 'string' && err.length > 0) {
    title = err;
  }

  toast.error(title, description ? { description } : undefined);
}

export const toastError = (err: unknown): void => toastFromError(err);

export const toastSuccess = (message: string, description?: string): void => {
  toast.success(message, description ? { description } : undefined);
};

export const toastInfo = (message: string, description?: string): void => {
  toast.message(message, description ? { description } : undefined);
};
