import type { AxiosError } from 'axios';
import type { AuthErrorException } from './auth/auth.js';

export type SharedErrorType = 
  | Error
  | AuthErrorException
  | AxiosError
  | string
  | null
  | undefined;
