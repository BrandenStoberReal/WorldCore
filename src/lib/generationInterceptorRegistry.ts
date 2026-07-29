import type {
  WorldCoreGenerationContext,
  GenerationInterceptorHandler,
} from '@/shared/types/worldcore-api';

export interface GenerationInterceptorEntry {
  id: string;
  handler: GenerationInterceptorHandler;
  extId: string;
}

const interceptorsById = new Map<string, GenerationInterceptorEntry>();

export function registerGenerationInterceptor(
  id: string,
  handler: GenerationInterceptorHandler,
  extId: string,
): void {
  if (!id || !id.trim()) {
    throw new Error('GenerationInterceptor.id must be a non-empty string');
  }
  if (typeof handler !== 'function') {
    throw new Error('GenerationInterceptor.handler must be a function');
  }
  interceptorsById.set(id, { id, handler, extId });
}

export function unregisterGenerationInterceptor(id: string): void {
  if (!interceptorsById.has(id)) return;
  interceptorsById.delete(id);
}

export function getGenerationInterceptors(): GenerationInterceptorEntry[] {
  return [...interceptorsById.values()];
}

export function clearGenerationInterceptorsForExtId(extId: string): number {
  let removed = 0;
  for (const [id, entry] of interceptorsById) {
    if (entry.extId === extId) {
      interceptorsById.delete(id);
      removed++;
    }
  }
  return removed;
}

export function clearAllGenerationInterceptors(): void {
  interceptorsById.clear();
}
