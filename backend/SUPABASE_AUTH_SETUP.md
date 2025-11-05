# 🔐 Supabase Auth Configuration for Testing

## Problem: Email Validation Error

If you get `"Email address is invalid"` when signing up, it's because Supabase blocks certain email domains.

## Solution 1: Use a Real Email Domain (Recommended)

Instead of `test@example.com`, use a real email domain:

```bash
# ✅ Good - real email domains
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@gmail.com",
    "password": "test123",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

# Or use a temporary email service
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@temp-mail.org",
    "password": "test123",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

## Solution 2: Configure Supabase to Allow Test Emails

1. Go to your Supabase Dashboard
2. Navigate to **Authentication** → **Settings**
3. Scroll to **Email Auth** section
4. Under **Email Templates**, you can:
   - **Disable email confirmation** (for testing):
     - Set "Confirm email" to **OFF**
     - This allows signup without email verification
   - **Allow test domains**:
     - Add `example.com` to allowed domains (if this option exists)
     - Or use a custom SMTP that doesn't validate domains

## Solution 3: Use Your Own Email Domain

If you have a domain, add it to Supabase:
1. Go to **Authentication** → **Settings** → **Email Templates**
2. Configure custom SMTP (optional)
3. Use emails from your domain: `test@yourdomain.com`

## Quick Fix: Disable Email Confirmation

For **development/testing only**:

1. **Supabase Dashboard** → **Authentication** → **Settings**
2. Find **"Enable email confirmations"**
3. **Toggle OFF**
4. Save

Now you can use any email format (including `test@example.com`), but note:
- ⚠️ **Security**: Only do this in development!
- ✅ **Convenience**: No email verification needed

## Recommended Test Email Format

For testing, use a format that's clearly a test but won't be blocked:

```bash
# Pattern: test-{timestamp}@gmail.com
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test-ailabank-2025@gmail.com",
    "password": "test123",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'
```

Or use a temporary email service:
- https://temp-mail.org
- https://10minutemail.com
- https://mailinator.com

## Testing Without Email Confirmation

If you disable email confirmation:

1. Sign up works immediately
2. User is created and can login right away
3. No need to check email for verification link

## Production Setup

For production:
- ✅ Keep email confirmation **ON**
- ✅ Use real email addresses
- ✅ Configure custom email templates
- ✅ Set up proper SMTP (SendGrid, AWS SES, etc.)

---

## Quick Test Commands

```bash
# Test with Gmail (if you have access)
curl -X POST http://localhost:3000/api/v1/auth/signup \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourname@gmail.com",
    "password": "test123",
    "address": "0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb"
  }'

# Then login
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "yourname@gmail.com",
    "password": "test123"
  }'
```

---

**Note**: The easiest solution is to **disable email confirmation in Supabase** for development, then use any email format you want!

