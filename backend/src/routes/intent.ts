import express, { Request, Response } from 'express';
import multer from 'multer';
import { IntentOrchestrator } from '../services/ai/intentOrchestrator';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const intentOrchestrator = new IntentOrchestrator();

// Extend Request type to include file from multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * POST /api/v1/intent
 * Process voice or text intent
 * 
 * Body (multipart/form-data):
 * - audio: audio file (optional)
 * - text: text input (optional, if no audio)
 * - userId: user identifier
 * - locale: language code (default: 'en')
 */
router.post('/intent', upload.single('audio'), async (req: MulterRequest, res: Response) => {
  try {
    const { userId, locale = 'en' } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    let audioBuffer: Buffer | undefined;
    let textInput: string | undefined;

    // Check if audio file provided
    if (req.file) {
      audioBuffer = req.file.buffer;
    } else if (req.body.text) {
      textInput = req.body.text;
    } else {
      return res.status(400).json({ error: 'Either audio or text input is required' });
    }

    // Process intent
    const result = await intentOrchestrator.processIntent({
      userId,
      audio: audioBuffer,
      text: textInput,
      context: { locale }
    });

    // Get transcript (for audio, we need to extract from the pipeline)
    let transcript = textInput || '';
    if (audioBuffer) {
      // Transcript is stored in result.entities.originalText if we pass it through
      transcript = result.entities?.originalText || result.explanation;
    }

    // Return result
    res.json({
      transcript,
      intent: result.intent,
      entities: result.entities,
      confidence: result.confidence,
      explanation: result.explanation,
      audioResponseURL: result.audioResponseURL,
      actions: result.actions
    });

  } catch (error: any) {
    console.error('Intent processing error:', error);
    res.status(500).json({
      error: error.message || 'Intent processing failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

