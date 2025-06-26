// This file helps TypeScript understand your path aliases
declare module '@/pages/NotFound' {
  import { FC } from 'react';
  const NotFound: FC;
  export default NotFound;
}

declare module '@/pages/Unauthorized' {
  import { FC } from 'react';
  const Unauthorized: FC;
  export default Unauthorized;
}
