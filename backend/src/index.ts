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
import quotesRoutes from './routes/quotes';
import routesRoutes from './routes/routes';
import receiptsRoutes from './routes/receipts';
import ledgerRoutes from './routes/ledger';
import merchantRoutes from './routes/merchant';
import treasuryRoutes from './routes/treasury';
import publicRoutes from './routes/public';
import { redis } from './services/redis/redisClient';

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors({
  origin: '*', // Allow all origins in development
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: false
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));

// Serve static files (audio responses)
// Files are saved to backend/public/audio by elevenLabs service
// When running with ts-node, __dirname is backend/src
// So ../public/audio = backend/public/audio (one level up from src)
// When compiled, __dirname is backend/dist
// So ../public/audio = backend/public/audio (one level up from dist)
const audioDir = path.join(__dirname, '../public/audio');
console.log(`🔊 Serving audio files from: ${audioDir}`);
console.log(`🔊 __dirname: ${__dirname}`);
if (!require('fs').existsSync(audioDir)) {
  require('fs').mkdirSync(audioDir, { recursive: true });
  console.log(`📁 Created audio directory: ${audioDir}`);
}
// Serve audio files with proper CORS headers and content type
app.use('/audio', (req, res, next) => {
  // Set CORS headers explicitly
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.header('Access-Control-Expose-Headers', 'Content-Length, Content-Type');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  
  // Log audio requests for debugging
  const filename = req.path.replace('/', '');
  const filePath = path.join(audioDir, filename);
  console.log(`🔊 Audio request: ${req.path} -> ${filePath}`);
  console.log(`🔊 File exists: ${require('fs').existsSync(filePath)}`);
  
  next();
}, express.static(audioDir, {
  setHeaders: (res, filePath) => {
    // Set proper content type for MP3 files
    if (filePath.endsWith('.mp3')) {
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
    }
  },
  // Enable range requests for audio streaming
  dotfiles: 'ignore',
  etag: true,
  lastModified: true
}));

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
app.use('/api/v1', quotesRoutes);
app.use('/api/v1', routesRoutes);
app.use('/api/v1', receiptsRoutes);
app.use('/api/v1', ledgerRoutes);
app.use('/api/v1', merchantRoutes);
app.use('/api/v1', treasuryRoutes);
app.use('/api/v1', publicRoutes);

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
      console.log(`💱 Quotes API:   http://localhost:${PORT}/api/v1/quotes`);
      console.log(`🛣️  Routes API:   http://localhost:${PORT}/api/v1/route`);
      console.log(`📋 Receipts API:  http://localhost:${PORT}/api/v1/receipts`);
      console.log(`📊 Ledger API:    http://localhost:${PORT}/api/v1/ledger`);
      console.log(`🏪 Merchant API:  http://localhost:${PORT}/api/v1/merchant`);
      console.log(`💰 Treasury API:  http://localhost:${PORT}/api/v1/treasury`);
      console.log(`🔄 RateSweep API: http://localhost:${PORT}/api/v1/ratesweep`);
      console.log(`🌐 Public API:    http://localhost:${PORT}/api/v1/public`);
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
