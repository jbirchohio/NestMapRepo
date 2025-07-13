// Type definitions for modules without @types

declare module 'csv-stringify' {
  import { Transform } from 'stream';
  
  interface StringifyOpts {
    delimiter?: string;
    header?: boolean;
    columns?: string[] | Record<string, string>;
    quoted?: boolean;
    quotedString?: boolean;
  }

  function stringify(
    data: any[],
    options?: StringifyOpts,
    callback?: (err: Error | undefined, output: string) => void
  ): Transform;
  
  export = stringify;
}

declare module 'puppeteer' {
  // Basic types for Puppeteer
  export interface LaunchOptions {
    headless?: boolean | 'new';
    args?: string[];
    defaultViewport?: {
      width: number;
      height: number;
      deviceScaleFactor?: number;
      isMobile?: boolean;
      hasTouch?: boolean;
      isLandscape?: boolean;
    };
  }

  export interface Browser {
    newPage(): Promise<Page>;
    close(): Promise<void>;
  }

  export interface Page {
    goto(url: string, options?: { timeout?: number; waitUntil?: 'load' | 'domcontentloaded' | 'networkidle0' | 'networkidle2' }): Promise<void>;
    content(): Promise<string>;
    close(): Promise<void>;
    // Add other Page methods as needed
  }

  export function launch(options?: LaunchOptions): Promise<Browser>;
}
