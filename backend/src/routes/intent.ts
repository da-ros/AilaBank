import express, { Request, Response } from 'express';
import multer from 'multer';
import { IntentOrchestrator } from '../services/ai/intentOrchestrator';
import { CloudflareAIService } from '../services/ai/cloudflareAI';

const router = express.Router();
const upload = multer({ storage: multer.memoryStorage() });
const intentOrchestrator = new IntentOrchestrator();

// Extend Request type to include file from multer
interface MulterRequest extends Request {
  file?: Express.Multer.File;
}

/**
 * POST /api/v1/intent
 * Process voice or text intent with streaming transcript
 * 
 * Body (multipart/form-data):
 * - audio: audio file (optional)
 * - text: text input (optional, if no audio)
 * - userId: user identifier
 * - locale: language code (default: 'en')
 * - stream: 'true' to enable SSE streaming (optional)
 * 
 * If stream=true, uses Server-Sent Events to send transcript immediately,
 * then sends the full result when complete.
 * Otherwise, returns JSON response as before.
 */
router.post('/intent', upload.single('audio'), async (req: MulterRequest, res: Response) => {
  try {
    const { userId, locale = 'en', stream } = req.body;
    
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

    // If streaming is requested, use SSE
    if (stream === 'true' || stream === true) {
      // Set SSE headers
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering

      // Process intent with streaming callback
      try {
        // Step 1: Transcribe audio first (if audio provided)
        let transcript = textInput || '';
        if (audioBuffer) {
          console.log('🎤 Processing audio with Cloudflare STT (streaming)...');
          const cloudflareAI = new CloudflareAIService();
          const sttResult = await cloudflareAI.speechToText(audioBuffer);
          transcript = sttResult.text;
          console.log('✅ Transcribed (streaming):', transcript);
          
          // Send transcript immediately via SSE
          res.write(`data: ${JSON.stringify({ type: 'transcript', transcript })}\n\n`);
        } else if (textInput) {
          // Send text input as transcript immediately
          res.write(`data: ${JSON.stringify({ type: 'transcript', transcript: textInput })}\n\n`);
        }

        // Step 2: Process the rest of the intent pipeline
        const result = await intentOrchestrator.processIntent({
          userId,
          audio: audioBuffer,
          text: textInput,
          context: { locale }
        });

        // Send final result
        res.write(`data: ${JSON.stringify({
          type: 'complete',
          transcript,
          intent: result.intent,
          entities: result.entities,
          confidence: result.confidence,
          explanation: result.explanation,
          audioResponseURL: result.audioResponseURL,
          actions: result.actions
        })}\n\n`);
        
        res.end();
      } catch (error: any) {
        console.error('Intent processing error (streaming):', error);
        res.write(`data: ${JSON.stringify({
          type: 'error',
          error: error.message || 'Intent processing failed'
        })}\n\n`);
        res.end();
      }
    } else {
      // Non-streaming mode (original behavior)
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
    }

  } catch (error: any) {
    console.error('Intent processing error:', error);
    res.status(500).json({
      error: error.message || 'Intent processing failed',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;

