/// <reference types="react-scripts" />

// Add type definitions for JSX elements
declare namespace JSX {
  interface IntrinsicElements {
    // HTML elements
    div: React.DetailedHTMLProps<React.HTMLAttributes<HTMLDivElement>, HTMLDivElement>;
    span: React.DetailedHTMLProps<React.HTMLAttributes<HTMLSpanElement>, HTMLSpanElement>;
    button: React.DetailedHTMLProps<React.ButtonHTMLAttributes<HTMLButtonElement>, HTMLButtonElement>;
    a: React.DetailedHTMLProps<React.AnchorHTMLAttributes<HTMLAnchorElement>, HTMLAnchorElement>;
    h1: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    h2: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    h3: React.DetailedHTMLProps<React.HTMLAttributes<HTMLHeadingElement>, HTMLHeadingElement>;
    p: React.DetailedHTMLProps<React.HTMLAttributes<HTMLParagraphElement>, HTMLParagraphElement>;
    nav: React.DetailedHTMLProps<React.HTMLAttributes<HTMLElement>, HTMLElement>;
    
    // SVG elements
    svg: React.SVGProps<SVGSVGElement>;
    path: React.SVGProps<SVGPathElement>;
    circle: React.SVGProps<SVGCircleElement>;
    polyline: React.SVGProps<SVGPolylineElement>;
    g: React.SVGProps<SVGGElement>;
    rect: React.SVGProps<SVGRectElement>;
    line: React.SVGProps<SVGLineElement>;
  }
}

// Declare module for sonner
declare module 'sonner' {
  export const toast: {
    (message: string, options?: any): void;
    success(message: string, options?: any): void;
    error(message: string, options?: any): void;
    warning(message: string, options?: any): void;
    info(message: string, options?: any): void;
    promise<T>(promise: Promise<T>, msgs: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((err: any) => string);
    }, opts?: any): Promise<T>;
  };
}
