import SharedUtf8Type from '@/types/SharedUtf8Type';
import SharedEncodingType from '@/types/SharedEncodingType';
declare module 'crypto-js' {
  export const CryptoJS: {
    AES: {
      encrypt(message: string, key: string): { toString(): string };
      decrypt(encrypted: string, key: string): { toString(encoding: SharedEncodingType): string };
    };
    enc: {
      Utf8: SharedUtf8Type;
    };
  };
}
