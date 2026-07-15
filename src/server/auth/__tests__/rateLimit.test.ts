import { describe, expect, test } from 'bun:test';
import { consumeLogin, resetLogin } from '../rateLimit';

describe('rateLimit', () => {
  test('5 successful consumeLogin calls', async () => {
    const ip = 'test-ip-rate-limit-' + Date.now();
    for (let i = 0; i < 5; i++) {
      await expect(consumeLogin(ip)).resolves.toBeUndefined();
    }
  });

  test('6th call throws', async () => {
    const ip = 'test-ip-rate-limit-2-' + Date.now();
    for (let i = 0; i < 5; i++) {
      await consumeLogin(ip);
    }
    await expect(consumeLogin(ip)).rejects.toThrow();
  });

  test('after reset can consume again', async () => {
    const ip = 'test-ip-rate-limit-3-' + Date.now();
    for (let i = 0; i < 5; i++) {
      await consumeLogin(ip);
    }
    await resetLogin(ip);
    await expect(consumeLogin(ip)).resolves.toBeUndefined();
  });
});
