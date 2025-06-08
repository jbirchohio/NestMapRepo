import { JWTUser } from '../../../server/middleware/jwtAuth';

declare global {
  namespace Express {
    interface Request {
      id?: string;
      user?: JWTUser;
      organizationFilter?: { organization_id: number };
      file?: {
        fieldname: string;
        originalname: string;
        encoding: string;
        mimetype: string;
        size: number;
        destination: string;
        filename: string;
        path: string;
      };
    }
  }
}

export {};
