// These types used to be defined locally but now live in the shared package.
// Re-export them here for backwards compatibility so existing imports continue
// to work while keeping a single source of truth for the structures.

export type { User } from '@shared/types/auth/user';
export type { JwtPayload } from '@shared/types/auth/jwt';
