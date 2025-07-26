// Add type declarations for modules that don't have them
declare module 'csv-stringify' {
  const content: any;
  export = content;
}

declare module 'puppeteer' {
  const content: any;
  export = content;
}

// Add type declarations for .js imports in ESM
declare module '*.js' {
  const content: any;
  export default content;
}

// Add type declarations for @nestjs/common
declare module '@nestjs/common' {
  import { Module } from '@nestjs/common/decorators/modules';
  import { Global, Injectable, NestModule, OnModuleInit } from '@nestjs/common/interfaces';
  
  export { Module, Global, Injectable, NestModule, OnModuleInit };
  // Add other exports as needed
  export * from '@nestjs/common/decorators';
  export * from '@nestjs/common/interfaces';
}

// Add type declarations for @nestjs/config
declare module '@nestjs/config' {
  import { ConfigModule as NestConfigModule } from '@nestjs/config/dist/config.module';
  
  export const ConfigModule: typeof NestConfigModule;
  export * from '@nestjs/config/dist/interfaces';
}

// Add type declarations for express
declare module 'express' {
  export * from 'express';
}

// Add type declarations for path
declare module 'path' {
  export * from 'path';
}

// Add type declarations for fs
declare module 'fs' {
  export * from 'fs';
}

// Add type declarations for url
declare module 'url' {
  export * from 'url';
}

// Add type declarations for handlebars
declare module 'handlebars' {
  export * from 'handlebars';
}

// Add type declarations for nodemailer
declare module 'nodemailer' {
  export * from 'nodemailer';
}

// Add type declarations for drizzle-orm
declare module 'drizzle-orm' {
  export * from '../utils/drizzle-shim';
}

// Add type declarations for @shared/schema
declare module '@shared/schema' {
  export * from '@shared/schema';
}

