declare module 'crypto-js' {
  export const CryptoJS: {
    AES: {
      encrypt(message: string, key: string): { toString(): string };
      decrypt(encrypted: string, key: string): { toString(encoding: any): string };
    };
    enc: {
      Utf8: any;
    };
  };
}
