import { ComponentType, AnchorHTMLAttributes, RefAttributes } from 'react';

declare module 'wouter' {
  export interface LinkProps extends AnchorHTMLAttributes<HTMLAnchorElement> {
    to: string;
    replace?: boolean;
    state?: unknown;
  }

  export const Link: ComponentType<LinkProps & RefAttributes<HTMLAnchorElement>>;
  export function useLocation(): [string, (to: string, replace?: boolean) => void];
}
