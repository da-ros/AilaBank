import Redis from 'ioredis';

/**
 * Redis Client for Upstash
 * Works with both Upstash Redis URL and local Redis
 */

function getRedisUrl(): string {
  // Priority order:
  // 1. UPSTASH_REDIS_URL (explicit Upstash)
  // 2. REDIS_URL (generic - works for Upstash or local)
  // 3. Default to localhost (for local development with local Redis)
  
  return (
    process.env.UPSTASH_REDIS_URL ||
    process.env.REDIS_URL ||
    'redis://localhost:6379'
  );
}

// Create Redis client
export const redis = new Redis(getRedisUrl(), {
  // Connection options
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  // For Upstash, TLS is usually required
  ...(process.env.UPSTASH_REDIS_URL?.includes('upstash.io') && {
    tls: {
      rejectUnauthorized: false
    }
  })
});

// Test connection on startup
redis.on('connect', () => {
  console.log('✅ Redis connected');
});

redis.on('error', (err) => {
  console.error('❌ Redis connection error:', err.message);
});

// Helper functions
export const redisHelpers = {
  /**
   * Get value by key
   */
  async get(key: string): Promise<string | null> {
    return redis.get(key);
  },

  /**
   * Set value with optional expiration (seconds)
   */
  async set(key: string, value: string, expireSeconds?: number): Promise<void> {
    if (expireSeconds) {
      await redis.setex(key, expireSeconds, value);
    } else {
      await redis.set(key, value);
    }
  },

  /**
   * Delete key
   */
  async del(key: string): Promise<void> {
    await redis.del(key);
  },

  /**
   * Check if key exists
   */
  async exists(key: string): Promise<boolean> {
    const result = await redis.exists(key);
    return result === 1;
  },

  /**
   * Set expiration on existing key
   */
  async expire(key: string, seconds: number): Promise<void> {
    await redis.expire(key, seconds);
  },

  /**
   * Increment counter
   */
  async incr(key: string): Promise<number> {
    return redis.incr(key);
  },

  /**
   * Get and set (atomic operation)
   */
  async getSet(key: string, value: string): Promise<string | null> {
    return redis.getset(key, value);
  }
};

export default redis;

