import { describe, it, expect, mock, spyOn, afterEach } from 'bun:test';
import { toastError, toastSuccess, toastInfo } from '@/lib/toast';
import { toast } from 'sonner';

const errorSpy = spyOn(toast, 'error');
const successSpy = spyOn(toast, 'success');
const messageSpy = spyOn(toast, 'message');

afterEach(() => {
  errorSpy.mockClear();
  successSpy.mockClear();
  messageSpy.mockClear();
});

mock.module('sonner', () => ({
  toast: { error: errorSpy, success: successSpy, message: messageSpy },
}));

describe('toastError', () => {
  it('parses API error envelope with code+message', () => {
    const err = new Error(
      'API error 404: {"error":{"code":"NOT_FOUND","message":"Theme \'foo\' not found"}}',
    );
    toastError(err);
    expect(errorSpy).toHaveBeenCalledTimes(1);
    const [title, options] = errorSpy.mock.calls[0]!;
    expect(title).toBe("Theme 'foo' not found");
    expect(options).toEqual({ description: 'NOT_FOUND (404)' });
  });

  it('uses Status N description when code is INTERNAL_ERROR', () => {
    const err = new Error(
      'API error 500: {"error":{"code":"INTERNAL_ERROR","message":"Internal server error"}}',
    );
    toastError(err);
    const [title, options] = errorSpy.mock.calls[0]!;
    expect(title).toBe('Internal server error');
    expect(options).toEqual({ description: 'Status 500' });
  });

  it('uses Status N description when envelope has no code', () => {
    const err = new Error('API error 502: {"error":{"message":"Bad gateway"}}');
    toastError(err);
    const [title, options] = errorSpy.mock.calls[0]!;
    expect(title).toBe('Bad gateway');
    expect(options).toEqual({ description: 'Status 502' });
  });

  it('falls back to body text when envelope has no message', () => {
    const err = new Error('API error 400: raw text without JSON');
    toastError(err);
    const [title, options] = errorSpy.mock.calls[0]!;
    expect(title).toBe('raw text without JSON');
    expect(options).toBeUndefined();
  });

  it('falls back to status-only when body is empty', () => {
    const err = new Error('API error 503: ');
    toastError(err);
    const [title, options] = errorSpy.mock.calls[0]!;
    expect(title).toBe('Request failed (503)');
    expect(options).toBeUndefined();
  });

  it('handles generic Error with non-API-shaped message', () => {
    const err = new Error('Something else went wrong');
    toastError(err);
    const [title, options] = errorSpy.mock.calls[0]!;
    expect(title).toBe('Something else went wrong');
    expect(options).toBeUndefined();
  });

  it('handles string error directly', () => {
    toastError('a plain string error');
    const [title] = errorSpy.mock.calls[0]!;
    expect(title).toBe('a plain string error');
  });

  it('handles null with default message', () => {
    toastError(null);
    const [title] = errorSpy.mock.calls[0]!;
    expect(title).toBe('Something went wrong');
  });

  it('handles empty string with default message', () => {
    toastError('');
    const [title] = errorSpy.mock.calls[0]!;
    expect(title).toBe('Something went wrong');
  });

  it('handles non-Error non-string unknown (number)', () => {
    toastError(42 as unknown);
    const [title] = errorSpy.mock.calls[0]!;
    expect(title).toBe('Something went wrong');
  });

  it('handles malformed JSON body in API error envelope', () => {
    const err = new Error('API error 500: {not valid json');
    toastError(err);
    const [title, options] = errorSpy.mock.calls[0]!;
    expect(title).toBe('{not valid json');
    expect(options).toBeUndefined();
  });
});

describe('toastSuccess', () => {
  it('calls toast.success with message only', () => {
    toastSuccess('Saved');
    expect(successSpy).toHaveBeenCalledTimes(1);
    const [title, options] = successSpy.mock.calls[0]!;
    expect(title).toBe('Saved');
    expect(options).toBeUndefined();
  });

  it('calls toast.success with message and description', () => {
    toastSuccess('Saved', 'profile updated');
    const [title, options] = successSpy.mock.calls[0]!;
    expect(title).toBe('Saved');
    expect(options).toEqual({ description: 'profile updated' });
  });
});

describe('toastInfo', () => {
  it('calls toast.message with message only', () => {
    toastInfo('Notice');
    expect(messageSpy).toHaveBeenCalledTimes(1);
    const [title, options] = messageSpy.mock.calls[0]!;
    expect(title).toBe('Notice');
    expect(options).toBeUndefined();
  });

  it('calls toast.message with message and description', () => {
    toastInfo('Notice', 'tip text');
    const [title, options] = messageSpy.mock.calls[0]!;
    expect(title).toBe('Notice');
    expect(options).toEqual({ description: 'tip text' });
  });
});
