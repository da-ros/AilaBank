import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import path from 'path';
import { initializeDatabase } from './db/supabase';
import intentRoutes from './routes/intent';
import authRoutes from './routes/auth';
import circleRoutes from './routes/circle';
import { redis } from './services/redis/redisClient';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files (audio responses)
app.use('/audio', express.static(path.join(__dirname, '../../public/audio')));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'AilaBank Backend',
    version: '1.0.0'
  });
});

// API Routes
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/circle', circleRoutes);
app.use('/api/v1', intentRoutes);

// Initialize database and Redis on startup
async function startServer() {
  try {
    console.log('🚀 Starting AilaBank Backend...\n');

    // Initialize Supabase database
    console.log('📊 Initializing database...');
    await initializeDatabase();
    
    // Test Redis connection
    console.log('🔴 Testing Redis connection...');
    await redis.ping();
    console.log('✅ Redis connected\n');

    // Verify API keys are set (but don't fail if missing - they'll fail when used)
    const requiredKeys = [
      'CLOUDFLARE_ACCOUNT_ID',
      'CLOUDFLARE_API_TOKEN',
      'OPENAI_API_KEY',
      'ELEVENLABS_API_KEY'
    ];

    const missingKeys = requiredKeys.filter(key => !process.env[key]);
    
    if (missingKeys.length > 0) {
      console.warn('⚠️  Missing API keys:', missingKeys.join(', '));
      console.warn('   Some features may not work. Check your .env file.\n');
    } else {
      console.log('✅ All API keys configured\n');
    }

    app.listen(PORT, () => {
      console.log('═══════════════════════════════════════════════════');
      console.log('🚀 AilaBank Backend is running!');
      console.log('═══════════════════════════════════════════════════');
      console.log(`📝 Health check: http://localhost:${PORT}/health`);
      console.log(`🔐 Auth API:     http://localhost:${PORT}/api/v1/auth`);
      console.log(`💳 Circle API:   http://localhost:${PORT}/api/v1/circle`);
      console.log(`🎤 Intent API:   http://localhost:${PORT}/api/v1/intent`);
      console.log(`🔊 Audio files:  http://localhost:${PORT}/audio/`);
      console.log('═══════════════════════════════════════════════════\n');
    });
  } catch (error: any) {
    console.error('❌ Failed to start server:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

startServer();
