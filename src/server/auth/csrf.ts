import { generateCsrfToken } from './session';

export { generateCsrfToken };

export function verifyCsrfToken(req: Request, sessionCsrfToken: string): boolean {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    return true;
  }

  const token = req.headers.get('X-CSRF-Token');
  if (!token) return false;

  return timingSafeEqual(token, sessionCsrfToken);
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let c = 0;
  for (let i = 0; i < a.length; i++) {
    c |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return c === 0;
}
