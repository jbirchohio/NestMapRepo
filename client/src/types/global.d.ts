// Global type declarations for the application

// Add type definitions for environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    VITE_API_BASE_URL: string;
    VITE_APP_NAME: string;
    VITE_APP_VERSION: string;
  }
}

// Add type definitions for modules without type definitions
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.svg' {
  import * as React from 'react';
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}

// Add type definitions for window object
declare global {
  interface Window {
    __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: typeof compose;
    __INITIAL_STATE__?: any;
  }
}

// Make TypeScript aware of the global type augmentation
export {};
