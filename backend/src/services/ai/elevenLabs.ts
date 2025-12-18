import axios from 'axios';
import * as fs from 'fs';
import * as path from 'path';

interface TTSOptions {
  text: string;
  voiceId?: string;
  stability?: number;
  similarityBoost?: number;
}

export class ElevenLabsService {
  private apiKey: string;
  private voiceId: string;
  private baseURL = 'https://api.elevenlabs.io/v1';

  constructor() {
    this.apiKey = process.env.ELEVENLABS_API_KEY!;
    this.voiceId = process.env.ELEVENLABS_VOICE_ID || '21m00Tcm4TlvDq8ikWAM';
    
    if (!this.apiKey) {
      throw new Error('ELEVENLABS_API_KEY is required');
    }
  }

  /**
   * Convert text to speech
   * @param options TTS configuration
   * @returns Audio buffer
   */
  async textToSpeech(options: TTSOptions): Promise<Buffer> {
    const {
      text,
      voiceId = this.voiceId,
      stability = 0.5,
      similarityBoost = 0.75,
    } = options;

    try {
      const response = await axios.post(
        `${this.baseURL}/text-to-speech/${voiceId}`,
        {
          text,
          model_id: 'eleven_monolingual_v1',
          voice_settings: {
            stability,
            similarity_boost: similarityBoost,
          },
        },
        {
          headers: {
            'xi-api-key': this.apiKey,
            'Content-Type': 'application/json',
            'Accept': 'audio/mpeg',
          },
          responseType: 'arraybuffer',
          timeout: 30000,
        }
      );

      return Buffer.from(response.data);
    } catch (error: any) {
      console.error('ElevenLabs TTS Error:', error.response?.data || error.message);
      throw new Error('Text to speech conversion failed');
    }
  }

  /**
   * Stream TTS directly to response
   * @param text Text to convert
   * @param outputPath Path to save audio file
   */
  async textToSpeechFile(text: string, outputPath: string): Promise<string> {
    const audioBuffer = await this.textToSpeech({ text });
    
    // Ensure directory exists
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, audioBuffer);
    return outputPath;
  }

  /**
   * Get available voices
   */
  async getVoices(): Promise<any[]> {
    try {
      const response = await axios.get(`${this.baseURL}/voices`, {
        headers: {
          'xi-api-key': this.apiKey,
        },
        timeout: 10000,
      });

      return response.data.voices || [];
    } catch (error: any) {
      console.error('Get voices error:', error.response?.data || error.message);
      return [];
    }
  }

  /**
   * Convert response text to audio URL (for frontend)
   * Saves audio file and returns URL
   */
  async generateAudioResponse(text: string, userId: string): Promise<string> {
    const filename = `audio_${userId}_${Date.now()}.mp3`;
    
    // Use public directory relative to project root
    // When running with ts-node, __dirname is backend/src/services/ai
    // So ../../../public/audio = backend/public/audio
    // When compiled, __dirname is backend/dist/services/ai
    // So ../../../public/audio = backend/public/audio (same)
    const publicDir = path.join(__dirname, '../../../public/audio');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
      console.log(`📁 Created audio directory: ${publicDir}`);
    }
    
    const outputPath = path.join(publicDir, filename);
    console.log(`💾 Saving audio to: ${outputPath}`);
    console.log(`📂 Public dir: ${publicDir}`);
    console.log(`📂 __dirname: ${__dirname}`);

    try {
      await this.textToSpeechFile(text, outputPath);
      
      // Verify file was created
      if (fs.existsSync(outputPath)) {
        const stats = fs.statSync(outputPath);
        console.log(`✅ Audio file created: ${filename} (${(stats.size / 1024).toFixed(2)} KB)`);
      } else {
        console.error(`❌ Audio file not found after creation: ${outputPath}`);
      }
      
      // Return URL for frontend to fetch
      // The backend serves static files at /audio, so return /audio/filename
      const audioUrl = `/audio/${filename}`;
      console.log(`🔊 Audio URL returned: ${audioUrl}`);
      return audioUrl;
    } catch (error: any) {
      console.error('❌ Error generating audio response:', error);
      // Return empty string if TTS fails - frontend can handle gracefully
      return '';
    }
  }
}

