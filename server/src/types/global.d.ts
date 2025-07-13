// Minimal Express types to avoid compilation errors
declare module 'express' {
  export interface Request {
    body?: any;
    query?: any;
    params?: any;
    headers?: any;
    ip?: string;
    method?: string;
    path?: string;
    cookies?: any;
    socket?: any;
    user?: any;
    [key: string]: any;
  }

  export interface Response {
    status(code: number): Response;
    json(data: any): Response;
    send(data: any): Response;
    setHeader(name: string, value: string): void;
    getHeader(name: string): string | undefined;
    cookie(name: string, value: string, options?: any): Response;
    clearCookie(name: string, options?: any): Response;
    [key: string]: any;
  }

  export interface NextFunction {
    (error?: any): void;
  }

  export interface RequestHandler {
    (req: Request, res: Response, next: NextFunction): void | Promise<void>;
  }

  export interface Router {
    get(path: string, ...handlers: RequestHandler[]): void;
    post(path: string, ...handlers: RequestHandler[]): void;
    put(path: string, ...handlers: RequestHandler[]): void;
    delete(path: string, ...handlers: RequestHandler[]): void;
    patch(path: string, ...handlers: RequestHandler[]): void;
  }
}

declare module 'bcrypt' {
  export function compare(password: string, hash: string): Promise<boolean>;
  export function hash(password: string, rounds: number): Promise<string>;
}

declare module 'jsonwebtoken' {
  export function sign(payload: any, secret: string, options?: any): string;
  export function verify(token: string, secret: string, options?: any): any;
  export function decode(token: string, options?: any): any;
}

declare module 'drizzle-orm' {
  export function eq(field: any, value: any): any;
}

declare module 'uuid' {
  export function v4(): string;
}

declare module 'winston' {
  export default class Logger {
    static createLogger(options: any): Logger;
    info(message: string): void;
    error(message: string, error?: any): void;
    warn(message: string): void;
    log(message: string): void;
  }
}

declare module 'ioredis' {
  export default class Redis {
    constructor(options?: any);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<string>;
  }
}

declare module 'ioredis-mock' {
  export default class Redis {
    constructor(options?: any);
    get(key: string): Promise<string | null>;
    set(key: string, value: string, ...args: any[]): Promise<string>;
  }
}

declare module 'morgan' {
  export interface StreamOptions {
    write(str: string): void;
  }
}

declare module 'logform' {
  export interface TransformableInfo {
    level: string;
    message: string;
    [key: string]: any;
  }
}

declare module '@nestjs/common' {
  export function Module(config: any): any;
}

declare module '@nestjs/config' {
  export function ConfigModule(config?: any): any;
  export class ConfigService {
    get(key: string): string | undefined;
  }
}

declare module '@nestjs/core' {
  export class NestFactory {
    static create(module: any): any;
  }
}

declare module '@nestjs/jwt' {
  export class JwtService {
    sign(payload: any): string;
    verify(token: string): any;
  }
}

// Global types
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      NODE_ENV?: string;
      JWT_SECRET?: string;
      JWT_ISSUER?: string;
      JWT_AUDIENCE?: string;
      REDIS_URL?: string;
      LOG_LEVEL?: string;
    }
  }
}