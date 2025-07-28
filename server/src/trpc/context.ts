import type { inferAsyncReturnType } from '@trpc/server';
import { initTRPC } from '@trpc/server';
import type { Request, Response } from 'express';

export async function createContext({ req, res }: { req: Request; res: Response }) {
  return { req, res };
}
export type Context = inferAsyncReturnType<typeof createContext>;

export const t = initTRPC.context<Context>().create();
