/**
 * @jest-environment node
 */
import { POST } from '../route';
import type { NextRequest } from 'next/server';

const login = (password: string) =>
  POST(
    new Request('http://localhost/api/admin/auth', {
      method: 'POST',
      body: JSON.stringify({ password }),
    }) as unknown as NextRequest
  );

describe('POST /api/admin/auth', () => {
  const saved = process.env.ADMIN_PASSWORD;
  afterEach(() => {
    if (saved === undefined) delete process.env.ADMIN_PASSWORD;
    else process.env.ADMIN_PASSWORD = saved;
  });

  it('refuses every login when ADMIN_PASSWORD is unset', async () => {
    delete process.env.ADMIN_PASSWORD;
    const res = await login('anything');
    expect(res.status).toBe(503);
    expect((await res.json()).success).toBe(false);
  });

  it('accepts only the configured password', async () => {
    process.env.ADMIN_PASSWORD = 'configured-test-password';
    expect((await (await login('configured-test-password')).json()).success).toBe(true);
    const bad = await login('wrong');
    expect(bad.status).toBe(401);
  });
});
