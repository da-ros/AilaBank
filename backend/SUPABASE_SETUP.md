# 🗄️ Supabase Setup Guide

## Quick Setup Steps

### 1. Create Supabase Project
1. Go to https://supabase.com → Sign up
2. Click "New Project"
3. Fill in:
   - Project name: `ailabank`
   - Database password: (save this, you'll need it)
   - Region: Choose closest to you
4. Wait ~2 minutes for project to initialize

### 2. Get Your API Keys
1. Go to **Settings** → **API**
2. Copy:
   - **Project URL** → `SUPABASE_URL`
   - **service_role** key → `SUPABASE_SERVICE_KEY` (⚠️ Keep secret!)
   - **anon** key → `SUPABASE_ANON_KEY`

### 3. Create Database Tables
1. Go to **SQL Editor** in Supabase Dashboard
2. Click **New Query**
3. Copy entire contents of `backend/src/db/schema.sql`
4. Paste and click **Run**
5. ✅ Tables created!

### 4. Update Your `.env`
```bash
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### 5. Test Connection
```bash
npm run dev
# Should see: "✅ Supabase database connection verified"
```

---

## What Changed from Postgres

### Before (Postgres):
```typescript
import { Pool } from 'pg';
const pool = new Pool({...});
await pool.query('SELECT * FROM users');
```

### After (Supabase):
```typescript
import { supabase } from './db/supabase';
const { data, error } = await supabase
  .from('users')
  .select('*');
```

---

## Authentication Flow

### Frontend (React):
```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// Sign up
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'password123'
});

// Sign in
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'password123'
});

// Use token in API calls
const token = data.session?.access_token;
fetch('/api/v1/intent', {
  headers: {
    'Authorization': `Bearer ${token}`
  }
});
```

### Backend (Express):
```typescript
import { authenticateUser } from './middleware/auth';

// Protect route
router.post('/protected', authenticateUser, (req, res) => {
  const userId = req.user!.id; // Authenticated user
  // ...
});
```

---

## Row Level Security (RLS)

Supabase automatically enforces RLS policies:
- Users can only see their own data
- Service role (backend) can see everything
- Anonymous users can't access protected tables

To disable RLS for a table (not recommended):
```sql
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
```

---

## Common Operations

### Insert
```typescript
const { data, error } = await supabase
  .from('ledger')
  .insert({
    user_id: userId,
    action_type: 'deposit',
    amount: 100.50,
    currency: 'USDC'
  });
```

### Select
```typescript
const { data, error } = await supabase
  .from('ledger')
  .select('*')
  .eq('user_id', userId)
  .order('created_at', { ascending: false });
```

### Update
```typescript
const { data, error } = await supabase
  .from('ledger')
  .update({ status: 'completed' })
  .eq('id', ledgerId);
```

### Delete
```typescript
const { error } = await supabase
  .from('ledger')
  .delete()
  .eq('id', ledgerId);
```

---

## Troubleshooting

### Error: "relation does not exist"
- Run the schema SQL in Supabase SQL Editor

### Error: "permission denied"
- Check RLS policies
- Make sure you're using `SUPABASE_SERVICE_KEY` for backend operations

### Error: "Invalid API key"
- Double-check you copied the full key (starts with `eyJ...`)
- Make sure it's the right key (service_role for backend)

---

## Free Tier Limits
- **Database**: 500 MB storage
- **Auth**: Unlimited users
- **API**: 50,000 requests/month
- **Storage**: 1 GB (for audio files, receipts, etc.)

Perfect for MVP! 🚀

