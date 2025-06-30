import type { JwtPayload } from 'jsonwebtoken';

export const verify = jest.fn(
  (token: string): JwtPayload => ({
    userId: 'test-user-id',
  })
);

export const decode = jest.fn(
  (token: string): JwtPayload | string => ({
    userId: 'test-user-id',
  })
);

export const sign = jest.fn(
  (payload: Record<string, unknown>): string => 'mocked-jwt-token'
);
