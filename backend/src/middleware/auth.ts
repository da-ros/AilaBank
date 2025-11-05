import { Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';

/**
 * Supabase Auth Middleware
 * Validates JWT tokens from Supabase Auth
 * Replaces custom JWT implementation
 */

// Create Supabase client for auth verification
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
    address?: string;
  };
}

/**
 * Verify Supabase JWT token from Authorization header
 */
export async function authenticateUser(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Missing or invalid Authorization header' 
      });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify token with Supabase
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      console.error('❌ Auth verification failed:', error?.message || 'User not found');
      return res.status(401).json({ 
        error: 'Unauthorized',
        message: 'Invalid or expired token' 
      });
    }

    console.log(`✅ User authenticated: ${user.id} (${user.email})`);

    // Attach user to request
    req.user = {
      id: user.id,
      email: user.email,
      // You can fetch additional user data from your users table here
    };

    next();
  } catch (error: any) {
    console.error('Auth middleware error:', error);
    return res.status(401).json({ 
      error: 'Unauthorized',
      message: 'Authentication failed' 
    });
  }
}

/**
 * Optional auth - doesn't fail if no token, but attaches user if valid
 */
export async function optionalAuth(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.replace('Bearer ', '');
      const { data: { user }, error } = await supabaseAuth.auth.getUser(token);
      
      if (!error && user) {
        req.user = {
          id: user.id,
          email: user.email,
        };
      }
    }
    
    next();
  } catch (error) {
    // Continue even if auth fails
    next();
  }
}

/**
 * Extract user ID from request (for use after authentication)
 */
export function getUserId(req: AuthenticatedRequest): string {
  if (!req.user?.id) {
    throw new Error('User not authenticated');
  }
  return req.user.id;
}

