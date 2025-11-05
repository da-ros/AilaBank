import express, { Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import { supabase } from '../db/supabase';

const router = express.Router();

// Create Supabase client for auth operations
const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_KEY!;

const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);

/**
 * POST /api/v1/auth/signup
 * Sign up new user with email/password
 */
router.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, address } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    // Sign up user in Supabase Auth
    // Note: Use a real email domain or configure Supabase to allow test emails
    const { data, error } = await supabaseAuth.auth.signUp({
      email,
      password,
      options: {
        // Disable email confirmation for testing (if enabled in Supabase)
        emailRedirectTo: undefined,
      },
    });

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    // Create user record in your users table (if address provided)
    if (data.user && address) {
      // Basic address validation (Ethereum/EVM format: 0x + 40 hex chars)
      if (!address.startsWith('0x') || address.length !== 42) {
        console.warn('⚠️  Invalid address format, but continuing with signup');
      }
      
      await supabase
        .from('users')
        .insert({
          id: data.user.id, // Use Supabase auth user ID
          address,
        });
    }

    res.json({
      user: data.user,
      session: data.session,
      message: 'User created successfully. Check email for verification.',
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ error: error.message || 'Signup failed' });
  }
});

/**
 * POST /api/v1/auth/login
 * Login with email/password
 */
router.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required' });
    }

    const { data, error } = await supabaseAuth.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return res.status(401).json({ error: error.message });
    }

    res.json({
      user: data.user,
      session: data.session,
      token: data.session?.access_token, // Return as 'token' for consistency
      accessToken: data.session?.access_token, // Also include for compatibility
    });
  } catch (error: any) {
    console.error('Login error:', error);
    res.status(500).json({ error: error.message || 'Login failed' });
  }
});

/**
 * POST /api/v1/auth/logout
 * Logout user (requires authentication)
 */
router.post('/logout', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { error } = await supabaseAuth.auth.signOut();

    if (error) {
      return res.status(400).json({ error: error.message });
    }

    res.json({ message: 'Logged out successfully' });
  } catch (error: any) {
    console.error('Logout error:', error);
    res.status(500).json({ error: error.message || 'Logout failed' });
  }
});

/**
 * GET /api/v1/auth/me
 * Get current user (requires authentication)
 */
router.get('/me', async (req: Request, res: Response) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error } = await supabaseAuth.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Fetch additional user data from your users table
    const { data: userData } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    res.json({
      user: {
        id: user.id,
        email: user.email,
        ...userData,
      },
    });
  } catch (error: any) {
    console.error('Get user error:', error);
    res.status(500).json({ error: error.message || 'Failed to get user' });
  }
});

export default router;

