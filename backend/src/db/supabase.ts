import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Supabase Database Client
 * Replaces PostgreSQL Pool with Supabase client
 */

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_KEY) {
  throw new Error('SUPABASE_URL and SUPABASE_SERVICE_KEY must be set in .env');
}

// Service role client (for backend operations - bypasses RLS)
export const supabase: SupabaseClient = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Anon client (for user-facing operations - respects RLS)
export const supabaseAnon = process.env.SUPABASE_ANON_KEY
  ? createClient(
      process.env.SUPABASE_URL,
      process.env.SUPABASE_ANON_KEY
    )
  : null;

/**
 * Initialize database schema
 * Run this once to create tables in Supabase
 */
export async function initializeDatabase() {
  try {
    console.log('📊 Initializing Supabase database schema...');
    
    // Check if tables exist by querying users table
    const { error: checkError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === 'PGRST116') {
      // Tables don't exist - need to create via Supabase SQL Editor
      console.log('⚠️  Tables not found. Please run the schema SQL in Supabase SQL Editor:');
      console.log('   1. Go to Supabase Dashboard → SQL Editor');
      console.log('   2. Copy schema from backend/src/db/schema.sql');
      console.log('   3. Run the SQL');
      console.log('   4. Restart server');
      
      // Still return success - schema will be created manually
      return;
    }

    console.log('✅ Supabase database connection verified');
    return;
  } catch (error: any) {
    console.error('❌ Database initialization failed:', error.message);
    throw error;
  }
}

export default supabase;

