export interface User {
    id: number;
    email: string;
    username: string;
    role: string;
    organization_id: number | null;
    email_verified?: boolean;
    is_active?: boolean;
}
export interface JwtPayload {
    id: string;
    email: string;
    role: string;
    organization_id?: number;
    iat: number;
    exp: number;
    [key: string]: any;
}
