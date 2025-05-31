import { db } from './db-connection';
import { users } from '../shared/schema';
import { eq } from 'drizzle-orm';

// Simple authentication service without external dependencies
export async function authenticateUser(email: string, password: string) {
  try {
    console.log('Authenticating user with email:', email);
    
    // Find user by email
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (!user) {
      console.log('User not found for email:', email);
      return null;
    }

    // Simple password validation for development
    // In production, use proper password hashing
    const isValidPassword = password === 'password' || password === user.email;
    
    if (!isValidPassword) {
      console.log('Invalid password for email:', email);
      return null;
    }

    console.log('Successful authentication for user:', {
      id: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organization_id
    });

    return {
      id: user.id,
      email: user.email,
      role: user.role || 'user',
      organizationId: user.organization_id,
      displayName: user.display_name
    };
  } catch (error) {
    console.error('Authentication error:', error);
    return null;
  }
}

export async function getUserById(id: number) {
  try {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, id))
      .limit(1);

    if (user) {
      return {
        id: user.id,
        email: user.email,
        role: user.role || 'user',
        organizationId: user.organization_id,
        displayName: user.display_name
      };
    }
    return null;
  } catch (error) {
    console.error('Get user by ID error:', error);
    return null;
  }
}