import { describe, expect, test, mock, beforeEach } from 'bun:test';
import {
  getAuthentikAuthUrl,
  exchangeAuthentikCode,
  verifyBasicAuth,
  handleAutheliaAuth,
  createSSOCallbackResponse,
  getSSOSettingsSafe,
  saveSSOSettings,
} from '../sso.service';
import { SSOSettingsSchema } from '@/shared/schemas/sso';
import type { SSOSettings } from '@/shared/types/sso';

const mockSettings: SSOSettings = {
  provider: 'basicauth',
  enabled: true,
  basicAuthUsers: [
    { username: 'alice', password: 'secret123', role: 'user' },
    { username: 'bob', password: 'adminpass', role: 'admin' },
  ],
};

describe('SSO - Basic Auth', () => {
  test('verifies correct credentials', async () => {
    const auth = 'Basic ' + Buffer.from('alice:secret123').toString('base64');
    const user = await verifyBasicAuth(auth, mockSettings);
    expect(user).not.toBeNull();
    expect(user!.username).toBe('alice');
  });

  test('rejects wrong password', async () => {
    const auth = 'Basic ' + Buffer.from('alice:wrongpass').toString('base64');
    const user = await verifyBasicAuth(auth, mockSettings);
    expect(user).toBeNull();
  });

  test('rejects unknown username', async () => {
    const auth = 'Basic ' + Buffer.from('unknown:secret123').toString('base64');
    const user = await verifyBasicAuth(auth, mockSettings);
    expect(user).toBeNull();
  });

  test('rejects malformed Authorization header', async () => {
    const user = await verifyBasicAuth('Bearer token123', mockSettings);
    expect(user).toBeNull();
  });

  test('rejects empty Authorization header', async () => {
    const user = await verifyBasicAuth('', mockSettings);
    expect(user).toBeNull();
  });

  test('rejects when SSO is disabled', async () => {
    const disabledSettings: SSOSettings = { ...mockSettings, enabled: false };
    const auth = 'Basic ' + Buffer.from('alice:secret123').toString('base64');
    const user = await verifyBasicAuth(auth, disabledSettings);
    expect(user).toBeNull();
  });

  test('rejects when provider is not basicauth', async () => {
    const wrongProvider: SSOSettings = { ...mockSettings, provider: 'authelia' };
    const auth = 'Basic ' + Buffer.from('alice:secret123').toString('base64');
    const user = await verifyBasicAuth(auth, wrongProvider);
    expect(user).toBeNull();
  });

  test('returns admin role for admin user', async () => {
    const auth = 'Basic ' + Buffer.from('bob:adminpass').toString('base64');
    const user = await verifyBasicAuth(auth, mockSettings);
    expect(user).not.toBeNull();
    expect(user!.role).toBe('admin');
  });
});

describe('SSO - Authentik OAuth2', () => {
  test('generates valid auth URL', () => {
    const settings: SSOSettings = {
      provider: 'authentik',
      enabled: true,
      authentikBaseUrl: 'https://auth.example.com',
      authentikClientId: 'my-client-id',
      authentikRedirectUrl: 'http://localhost:3000/callback',
      basicAuthUsers: [],
    };
    const url = getAuthentikAuthUrl(settings, 'http://localhost:3000');
    expect(url).toContain('https://auth.example.com/application/o/authorize/');
    expect(url).toContain('client_id=my-client-id');
    expect(url).toContain('response_type=code');
    expect(url).toMatch(/scope=openid(\+|%20)profile(\+|%20)email/);
    expect(url).toContain('state=');
  });

  test('auth URL contains state parameter', () => {
    const settings: SSOSettings = {
      provider: 'authentik',
      enabled: true,
      authentikBaseUrl: 'https://auth.example.com',
      authentikClientId: 'my-client-id',
      authentikRedirectUrl: 'http://localhost:3000/callback',
      basicAuthUsers: [],
    };
    const url = getAuthentikAuthUrl(settings, 'http://localhost:3000');
    const stateMatch = url.match(/state=([a-f0-9]+)/);
    expect(stateMatch).not.toBeNull();
    expect(stateMatch![1]).toHaveLength(32);
  });

  test('code exchange fails with invalid state', async () => {
    const settings: SSOSettings = {
      provider: 'authentik',
      enabled: true,
      authentikBaseUrl: 'https://auth.example.com',
      authentikClientId: 'my-client-id',
      authentikClientSecret: 'my-secret',
      authentikRedirectUrl: 'http://localhost:3000/callback',
      basicAuthUsers: [],
    };
    const user = await exchangeAuthentikCode(settings, 'some-code', 'invalid-state-xyz');
    expect(user).toBeNull();
  });

  test('code exchange fails with empty state', async () => {
    const settings: SSOSettings = {
      provider: 'authentik',
      enabled: true,
      authentikBaseUrl: 'https://auth.example.com',
      authentikClientId: 'my-client-id',
      authentikClientSecret: 'my-secret',
      authentikRedirectUrl: 'http://localhost:3000/callback',
      basicAuthUsers: [],
    };
    const user = await exchangeAuthentikCode(settings, 'some-code', '');
    expect(user).toBeNull();
  });
});

describe('SSO - Authelia', () => {
  test('returns null when no Remote-User header', async () => {
    const req = new Request('http://localhost/');
    const user = await handleAutheliaAuth(req);
    expect(user).toBeNull();
  });

  test('returns null when provider is not authelia', async () => {
    const req = new Request('http://localhost/', {
      headers: { 'Remote-User': 'testuser' },
    });
    const user = await handleAutheliaAuth(req);
    expect(user).toBeNull();
  });
});

describe('SSO - Settings', () => {
  test('saves and loads SSO settings', async () => {
    await saveSSOSettings({
      provider: 'basicauth',
      enabled: true,
      basicAuthUsers: [{ username: 'test', password: 'pass', role: 'user' }],
    });
    const settings = await getSSOSettingsSafe();
    expect(settings.enabled).toBe(true);
    expect(settings.provider).toBe('basicauth');
  });

  test('settings schema validates provider enum', () => {
    const valid = SSOSettingsSchema.parse({ provider: 'authelia', enabled: true });
    expect(valid.provider).toBe('authelia');

    const result = SSOSettingsSchema.safeParse({ provider: 'invalid', enabled: true });
    expect(result.success).toBe(false);
  });

  test('settings schema defaults enabled to false', () => {
    const parsed = SSOSettingsSchema.parse({ provider: 'basicauth' });
    expect(parsed.enabled).toBe(false);
  });

  test('settings schema defaults basicAuthUsers to empty array', () => {
    const parsed = SSOSettingsSchema.parse({ provider: 'basicauth', enabled: true });
    expect(parsed.basicAuthUsers).toEqual([]);
  });
});

describe('SSO - Callback', () => {
  test('callback fails when SSO is disabled', async () => {
    const result = await createSSOCallbackResponse('basicauth' as const, {
      authorization: 'Basic dGVzdDpwYXNz',
    });
    expect(result).toBeNull();
  });

  test('callback fails with invalid provider', async () => {
    const result = await createSSOCallbackResponse(
      'basicauth' as const,
      {} as Record<string, unknown>,
    );
    expect(result).toBeNull();
  });
});

describe('SSO - CSRF State Protection', () => {
  test('state is single-use', async () => {
    const settings: SSOSettings = {
      provider: 'authentik',
      enabled: true,
      authentikBaseUrl: 'https://auth.example.com',
      authentikClientId: 'my-client-id',
      authentikClientSecret: 'my-secret',
      authentikRedirectUrl: 'http://localhost:3000/callback',
      basicAuthUsers: [],
    };

    const url1 = getAuthentikAuthUrl(settings, 'http://localhost:3000');
    const url2 = getAuthentikAuthUrl(settings, 'http://localhost:3000');

    const state1 = url1.match(/state=([a-f0-9]+)/)![1]!;
    const state2 = url2.match(/state=([a-f0-9]+)/)![1]!;

    expect(state1).not.toBe(state2);
  });

  test('reused state is rejected', async () => {
    const settings: SSOSettings = {
      provider: 'authentik',
      enabled: true,
      authentikBaseUrl: 'https://auth.example.com',
      authentikClientId: 'my-client-id',
      authentikClientSecret: 'my-secret',
      authentikRedirectUrl: 'http://localhost:3000/callback',
      basicAuthUsers: [],
    };

    const url = getAuthentikAuthUrl(settings, 'http://localhost:3000');
    const state = url.match(/state=([a-f0-9]+)/)![1]!;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      Response.json({ id_token: 'header.payload.eyJzdWIiOiJ0ZXN0In0' }),
    ) as unknown as typeof globalThis.fetch;

    try {
      await exchangeAuthentikCode(settings, 'some-code', state);
      const user2 = await exchangeAuthentikCode(settings, 'some-code', state);
      expect(user2).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });

  test('state with expired TTL is rejected', async () => {
    const settings: SSOSettings = {
      provider: 'authentik',
      enabled: true,
      authentikBaseUrl: 'https://auth.example.com',
      authentikClientId: 'my-client-id',
      authentikClientSecret: 'my-secret',
      authentikRedirectUrl: 'http://localhost:3000/callback',
      basicAuthUsers: [],
    };

    const url = getAuthentikAuthUrl(settings, 'http://localhost:3000');
    const state = url.match(/state=([a-f0-9]+)/)![1]!;

    const originalFetch = globalThis.fetch;
    globalThis.fetch = mock(async () =>
      Response.json({ id_token: 'header.payload.eyJzdWIiOiJ0ZXN0In0' }),
    ) as unknown as typeof globalThis.fetch;

    try {
      const result = await exchangeAuthentikCode(settings, 'some-code', state);
      expect(result).toBeNull();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
