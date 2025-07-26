import jwt from 'jsonwebtoken';

// Define the types we need
interface JwtPayload {
  [key: string]: string | number | boolean | object | null | undefined;
  iss?: string;
  sub?: string;
  aud?: string | string[];
  exp?: number;
  nbf?: number;
  iat?: number;
  jti?: string;
}

type SignOptions = {
  algorithm?: string;
  keyid?: string;
  expiresIn?: string | number;
  notBefore?: string | number;
  audience?: string | string[];
  issuer?: string;
  jwtid?: string;
  subject?: string;
  noTimestamp?: boolean;
  header?: object;
  encoding?: string;
};

type VerifyOptions = {
  algorithms?: string[];
  audience?: string | RegExp | Array<string | RegExp>;
  complete?: boolean;
  issuer?: string | string[];
  ignoreExpiration?: boolean;
  ignoreNotBefore?: boolean;
  jwtid?: string;
  nonce?: string;
  subject?: string;
  clockTimestamp?: number;
  clockTolerance?: number;
  maxAge?: string | number;
};

type DecodeOptions = {
  complete?: boolean;
  json?: boolean;
};

// Helper function to promisify jwt.sign
const signAsync = (
  payload: string | object | Buffer,
  secret: string,
  options?: SignOptions
): Promise<string> => {
  return new Promise((resolve, reject) => {
    try {
      const token = jwt.sign(payload, secret, options || {});
      if (!token) return reject(new Error('Failed to sign token'));
      resolve(token);
    } catch (err) {
      reject(err);
    }
  });
};

// Helper function to promisify jwt.verify
const verifyAsync = (
  token: string,
  secret: string,
  options?: VerifyOptions
): Promise<string | JwtPayload> => {
  return new Promise((resolve, reject) => {
    try {
      const decoded = jwt.verify(token, secret, options || {});
      if (!decoded) return reject(new Error('Failed to verify token'));
      resolve(decoded as string | JwtPayload);
    } catch (err) {
      reject(err);
    }
  });
};

export const jwtUtils = {
  sign: signAsync,
  verify: verifyAsync,
  decode: (token: string, options?: DecodeOptions) => {
    return jwt.decode(token, options);
  }
};

