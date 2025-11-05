# 🔴 Upstash Redis Setup Guide

## Quick Setup (2 minutes)

### 1. Sign Up
1. Go to https://upstash.com
2. Click "Sign Up" (free account)
3. Verify email

### 2. Create Redis Database
1. Click **"Create Database"**
2. Fill in:
   - **Name**: `ailabank-redis`
   - **Type**: **Regional** (faster, free tier)
   - **Region**: Choose closest to you
3. Click **"Create"**

### 3. Get Connection URL
1. Click on your database
2. Go to **"Details"** tab
3. Copy the **REST URL** (looks like):
   ```
   redis://default:xxxxx@xxx-xxx.upstash.io:6379
   ```

### 4. Add to `.env`
```bash
UPSTASH_REDIS_URL=redis://default:xxxxx@xxx-xxx.upstash.io:6379
```

### 5. Test
```bash
npm run dev
# Should see: "✅ Redis connected"
```

---

## Free Tier Limits
- **10,000 commands/day** (perfect for MVP)
- **256 MB storage**
- Unlimited databases

---

## Usage Examples

### Queue Jobs (BullMQ)
```typescript
import { Queue } from 'bullmq';
import { redis } from './services/redis/redisClient';

const queue = new Queue('intent-processing', {
  connection: redis
});
```

### Caching
```typescript
import { redisHelpers } from './services/redis/redisClient';

// Cache user balance
await redisHelpers.set(
  `user:${userId}:balance`,
  balance.toString(),
  300 // 5 minute cache
);

// Get cached balance
const cached = await redisHelpers.get(`user:${userId}:balance`);
```

### Rate Limiting
```typescript
import { redisHelpers } from './services/redis/redisClient';

async function rateLimit(userId: string): Promise<boolean> {
  const key = `rate_limit:${userId}`;
  const count = await redisHelpers.incr(key);
  
  if (count === 1) {
    await redisHelpers.expire(key, 60); // 1 minute window
  }
  
  return count <= 100; // 100 requests per minute
}
```

---

## Local Development Alternative

If you prefer local Redis for dev:

```bash
# Install Redis
brew install redis  # macOS
# or
sudo apt install redis-server  # Ubuntu

# Start Redis
brew services start redis  # macOS
# or
sudo systemctl start redis  # Ubuntu

# Use in .env
REDIS_URL=redis://localhost:6379
```

The code automatically detects and uses local Redis if `UPSTASH_REDIS_URL` is not set.

---

## Production (Replit)

On Replit, Redis is available automatically at `redis://localhost:6379`, but you can still use Upstash for:
- Consistency (same config everywhere)
- Better monitoring
- Production-grade reliability

Just use the same `UPSTASH_REDIS_URL` in Replit environment variables! 🚀

