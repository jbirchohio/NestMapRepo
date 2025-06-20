import { RequestHandler } from 'express';
import { z } from 'zod';

declare module './validators' {
  export const userBaseSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    display_name: z.ZodString;
    role: z.ZodEnum<[string, ...string[]]>;
    organization_id: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<''>]>>;
  }>;

  export const createUserSchema: z.ZodObject<{
    email: z.ZodString;
    username: z.ZodString;
    display_name: z.ZodString;
    role: z.ZodEnum<[string, ...string[]]>;
    organization_id: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<''>]>>;
    password: z.ZodString;
    confirm_password: z.ZodString;
  }>;

  export const updateUserSchema: z.ZodObject<{
    email: z.ZodOptional<z.ZodString>;
    username: z.ZodOptional<z.ZodString>;
    display_name: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodEnum<[string, ...string[]]>>;
    organization_id: z.ZodOptional<z.ZodString>;
    avatar_url: z.ZodOptional<z.ZodUnion<[z.ZodString, z.ZodLiteral<''>]>>;
    password: z.ZodOptional<z.ZodString>;
  }>;

  export const userListQuerySchema: z.ZodObject<{
    page: z.ZodNumber;
    limit: z.ZodNumber;
    role: z.ZodOptional<z.ZodString>;
    search: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodString>;
  }>;

  export const validateUserId: RequestHandler;
  export const createUser: RequestHandler;
  export const updateUser: RequestHandler;
  export const validateUserListQuery: RequestHandler;
}
