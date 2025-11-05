import { CloudflareAIService } from './cloudflareAI';
import { ElevenLabsService } from './elevenLabs';
import { OpenAIService } from './openAIService';

export interface IntentRequest {
  userId: string;
  audio?: Buffer;
  text?: string;
  context?: Record<string, any>;
}

export interface IntentResult {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  explanation: string;
  audioResponseURL?: string;
  actions: Action[];
}

export interface Action {
  type: 'deposit' | 'withdraw' | 'allocate' | 'transfer' | 'invoice' | 'subscription' | 'policy';
  params: Record<string, any>;
}

export class IntentOrchestrator {
  private cloudflareAI: CloudflareAIService;
  private elevenLabs: ElevenLabsService;
  private openAI: OpenAIService;

  constructor() {
    // Initialize services with error handling
    try {
      this.cloudflareAI = new CloudflareAIService();
      this.elevenLabs = new ElevenLabsService();
      this.openAI = new OpenAIService();
    } catch (error: any) {
      console.error('❌ Failed to initialize AI services:', error.message);
      throw new Error(`AI service initialization failed: ${error.message}`);
    }
  }

  /**
   * Main intent processing pipeline
   * Flow: Audio → STT (Cloudflare) → Intent Parse (OpenAI GPT-5-nano) → Explanation (OpenAI GPT-5-nano) → TTS (ElevenLabs)
   */
  async processIntent(request: IntentRequest): Promise<IntentResult> {
    let inputText: string;
    let transcript = '';

    try {
      // Step 1: Convert audio to text if needed (Cloudflare Workers AI)
      if (request.audio) {
        console.log('🎤 Processing audio with Cloudflare STT...');
        const sttResult = await this.cloudflareAI.speechToText(request.audio);
        inputText = sttResult.text;
        transcript = sttResult.text;
        console.log('✅ Transcribed:', transcript);
      } else if (request.text) {
        inputText = request.text;
        transcript = request.text;
        console.log('📝 Processing text input:', inputText);
      } else {
        throw new Error('No audio or text input provided');
      }

      // Step 2: Parse intent using OpenAI GPT-5-nano
      console.log('🤖 Parsing intent with OpenAI...');
      const intentResult = await this.openAI.parseIntent(inputText);
      console.log('✅ Intent parsed:', intentResult.intent, intentResult.confidence);
      
      // Store transcript in entities for API response
      intentResult.entities.originalText = transcript;

      // Step 3: Build actions based on intent
      const actions = this.buildActions(intentResult);
      console.log('✅ Actions generated:', actions.length);

      // Step 4: Generate explanation using OpenAI GPT-5-nano
      console.log('💬 Generating explanation...');
      const explanation = await this.openAI.generateExplanation(
        intentResult.intent,
        { ...intentResult.entities, originalText: inputText }
      );
      console.log('✅ Explanation:', explanation);

      // Step 5: Generate audio response using ElevenLabs
      console.log('🔊 Generating audio response...');
      const audioURL = await this.elevenLabs.generateAudioResponse(
        explanation,
        request.userId
      );
      console.log('✅ Audio generated:', audioURL);

      return {
        intent: intentResult.intent,
        entities: intentResult.entities,
        confidence: intentResult.confidence,
        explanation,
        audioResponseURL: audioURL,
        actions,
      };
    } catch (error: any) {
      console.error('❌ Intent processing error:', error);
      throw error;
    }
  }

  /**
   * Build executable actions from parsed intent
   */
  private buildActions(intent: { intent: string; entities: Record<string, any> }): Action[] {
    const actions: Action[] = [];

    switch (intent.intent) {
      case 'deposit':
        actions.push({
          type: 'deposit',
          params: {
            amount: intent.entities.amount,
            currency: intent.entities.currency || 'USDC',
          },
        });
        // Auto-allocate after deposit
        actions.push({
          type: 'allocate',
          params: {
            bufferPercent: 20,
            yieldPercent: 80,
          },
        });
        break;

      case 'withdraw':
        actions.push({
          type: 'withdraw',
          params: {
            amount: intent.entities.amount,
            currency: intent.entities.currency || 'USDC',
            target: intent.entities.target,
          },
        });
        break;

      case 'transfer':
        actions.push({
          type: 'transfer',
          params: {
            amount: intent.entities.amount,
            to: intent.entities.target,
            currency: intent.entities.currency || 'USDC',
          },
        });
        break;

      case 'create_invoice':
        actions.push({
          type: 'invoice',
          params: {
            amount: intent.entities.amount,
            currency: intent.entities.currency || 'USDC',
            description: intent.entities.description || 'Invoice',
          },
        });
        break;

      case 'create_subscription':
        actions.push({
          type: 'subscription',
          params: {
            amount: intent.entities.amount,
            currency: intent.entities.currency || 'USDC',
            frequency: intent.entities.frequency || 'monthly',
          },
        });
        break;

      case 'update_policy':
        actions.push({
          type: 'policy',
          params: {
            bufferPercent: intent.entities.bufferPercent,
            yieldPercent: intent.entities.yieldPercent,
          },
        });
        break;

      default:
        // No action for status checks, balance queries, etc.
        break;
    }

    return actions;
  }

  /**
   * Get allocation recommendation using OpenAI (Advanced Reasoning)
   */
  async getSmartAllocation(
    userId: string,
    balance: number,
    activity: any[]
  ) {
    return this.openAI.recommendAllocation(userId, balance, activity);
  }

  /**
   * Get liquidity forecast using OpenAI (Advanced Reasoning)
   */
  async forecastUserLiquidity(userId: string, historicalData: any[]) {
    return this.openAI.forecastLiquidity(userId, historicalData, 7);
  }
}

// Re-export types for convenience
export type { IntentResponse, AllocationRecommendation, ForecastResponse } from './openAIService';
