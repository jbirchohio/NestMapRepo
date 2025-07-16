// Type declarations for Next.js modules
declare module 'next/link';
declare module 'next/navigation' {
  export function useRouter(): {
    push: (url: string) => void;
    replace: (url: string) => void;
    back: () => void;
    forward: () => void;
    refresh: () => void;
    prefetch: (url: string) => Promise<void>;
  };
  
  export function usePathname(): string | null;
}

declare module 'next/router' {
  export function useRouter(): {
    push: (url: string) => Promise<boolean>;
    replace: (url: string) => Promise<boolean>;
    back: () => void;
    pathname: string;
    query: Record<string, string | string[]>;
    asPath: string;
    events: {
      on: (event: string, callback: (...args: any[]) => void) => void;
      off: (event: string, callback: (...args: any[]) => void) => void;
    };
    prefetch: (url: string) => Promise<void>;
  };
}
