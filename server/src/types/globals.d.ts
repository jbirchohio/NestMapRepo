// Type stubs for missing modules
declare module 'express' {
  export interface Request {
    user?: any;
    organizationId?: string;
    params?: Record<string, string>;
    body?: Record<string, any>;
    query?: Record<string, any>;
    headers?: Record<string, string | string[]>;
    path?: string;
    ip?: string;
  }
  
  export interface Response {
    json(data: any): void;
    status(code: number): Response;
    send(data: any): void;
  }
  
  export interface NextFunction {
    (err?: any): void;
  }
}

declare module 'drizzle-orm' {
  export const eq: any;
  export const and: any;
  export const or: any;
  export const inArray: any;
  export const sql: any;
  export interface SQL<T = any> {}
  export interface Column<T = any> {}
}

declare module 'drizzle-orm/pg-core' {
  export const pgTable: any;
  export const uuid: any;
  export const text: any;
  export const timestamp: any;
  export const boolean: any;
  export const integer: any;
  export const jsonb: any;
  export const pgEnum: any;
  export const index: any;
  export type AnyPgColumn = any;
}

declare module 'drizzle-orm/postgres-js' {
  export const drizzle: any;
}

declare module 'postgres' {
  export default function postgres(config: any): any;
}

declare module '@supabase/supabase-js' {
  export const createClient: any;
}

declare module 'zod' {
  export const z: any;
}

declare module 'drizzle-zod' {
  export const createInsertSchema: any;
  export const createSelectSchema: any;
}

declare global {
  const process: {
    env: Record<string, string | undefined>;
  };
  
  const console: {
    log(...args: any[]): void;
    error(...args: any[]): void;
    warn(...args: any[]): void;
  };
  
  class URL {
    constructor(url: string);
    hostname: string;
    port: string;
    pathname: string;
  }
}

export {};

