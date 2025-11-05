import axios from 'axios';

/**
 * Cloudflare Workers AI Service
 * ONLY handles Speech-to-Text (STT)
 * Intent parsing and explanations moved to OpenAI
 * 
 * Note: Cloudflare Workers AI Whisper requires audio as base64 encoded JSON
 */

interface CloudflareAIConfig {
  accountId: string;
  apiToken: string;
}

interface STTResponse {
  text: string;
  confidence: number;
}

export class CloudflareAIService {
  private config: CloudflareAIConfig;
  private baseURL: string;

  constructor() {
    this.config = {
      accountId: process.env.CLOUDFLARE_ACCOUNT_ID!,
      apiToken: process.env.CLOUDFLARE_API_TOKEN!,
    };
    this.baseURL = `https://api.cloudflare.com/client/v4/accounts/${this.config.accountId}/ai/run`;
  }

  /**
   * Convert speech audio to text using Cloudflare Workers AI (Whisper Large v3 Turbo)
   * @param audioBuffer Audio file buffer (mp3, wav, webm, etc.)
   * @returns Transcribed text
   */
  async speechToText(audioBuffer: Buffer): Promise<STTResponse> {
    try {
      // Check file size (Cloudflare has limits, base64 increases size by ~33%)
      const fileSizeMB = audioBuffer.length / (1024 * 1024);
      const base64SizeMB = (audioBuffer.length * 4 / 3) / (1024 * 1024);
      
      if (base64SizeMB > 10) {
        console.warn(`Large audio file detected: ${fileSizeMB.toFixed(2)}MB (${base64SizeMB.toFixed(2)}MB base64). Processing may be slow.`);
      }
      
      // Cloudflare Workers AI Whisper expects audio as base64 encoded string in JSON format
      const base64Audio = audioBuffer.toString('base64');
      
      console.log(`Transcribing audio (${base64SizeMB.toFixed(2)}MB base64, ${audioBuffer.length} bytes raw)...`);
      
      const response = await axios.post(
        `${this.baseURL}/@cf/openai/whisper-large-v3-turbo`,
        {
          audio: base64Audio,
        },
        {
          headers: {
            'Authorization': `Bearer ${this.config.apiToken}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000, // 60 second timeout (increased for large files)
          maxContentLength: Infinity,
          maxBodyLength: Infinity,
        }
      );

      return {
        text: response.data.result?.text || response.data.text || '',
        confidence: response.data.result?.confidence || 0.9,
      };
    } catch (error: any) {
      if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
        console.error('Cloudflare STT Timeout: Audio file may be too large or service is slow');
        throw new Error('Speech to text conversion timed out. The audio file may be too large.');
      }
      console.error('Cloudflare STT Error:', error.response?.data || error.message);
      throw new Error('Speech to text conversion failed');
    }
  }
}

