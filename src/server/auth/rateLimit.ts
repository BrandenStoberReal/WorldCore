import { RateLimiterMemory } from 'rate-limiter-flexible';

const loginLimiter = new RateLimiterMemory({ points: 5, duration: 60 });
const registerLimiter = new RateLimiterMemory({ points: 30, duration: 60 });

export async function consumeLogin(ip: string): Promise<void> {
  await loginLimiter.consume(ip);
}

export async function consumeRegister(ip: string): Promise<void> {
  await registerLimiter.consume(ip);
}

export async function resetLogin(ip: string): Promise<void> {
  await loginLimiter.delete(ip);
}
