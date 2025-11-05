import axios from 'axios';

/**
 * OpenAI Service
 * Handles Intent Parsing, Explanation Generation, and Advanced Reasoning
 * Uses GPT-5-nano (or GPT-4o-mini as fallback)
 */

export interface IntentResponse {
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}

export interface AllocationRecommendation {
  bufferPercent: number;
  yieldPercent: number;
  reasoning: string;
}

export interface ForecastResponse {
  predictions: {
    date: string;
    expectedWithdrawal: number;
    confidence: number;
  }[];
}

export class OpenAIService {
  private apiKey: string;
  private baseURL = 'https://api.openai.com/v1';
  private model = 'gpt-5-nano'; // Primary model (cost-effective)
  private fallbackModel = 'gpt-4o-mini'; // Fallback if unavailable

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY!;
    if (!this.apiKey) {
      throw new Error('OPENAI_API_KEY is required');
    }
  }

  /**
   * Parse intent from text using OpenAI GPT-5-nano
   * @param text User input text
   * @returns Parsed intent and entities
   */
  async parseIntent(text: string): Promise<IntentResponse> {
    const prompt = this.buildIntentPrompt(text);

    try {
      let response;
      try {
        // Log request for debugging
        console.log('OpenAI API Request:', {
          model: this.model,
          hasPrompt: !!prompt,
          promptLength: prompt.length,
          responseFormat: 'json_object'
        });
        
        response = await axios.post(
          `${this.baseURL}/chat/completions`,
          {
            model: this.model,
            messages: [
              {
                role: 'system',
                content: 'You are a banking assistant. Parse user commands into structured JSON. Return ONLY valid JSON, no explanation.',
              },
              {
                role: 'user',
                content: prompt,
              },
            ],
            response_format: { type: 'json_object' }, // Force JSON output
            // temperature not supported for gpt-5-nano (defaults to 1)
            // Note: gpt-5-nano uses reasoning tokens internally (can use 1024+ tokens), need much more room
            max_completion_tokens: 3072, // Increased to allow reasoning (up to 1024) + output (512+) with buffer
          },
          {
            headers: {
              'Authorization': `Bearer ${this.apiKey}`,
              'Content-Type': 'application/json',
            },
            timeout: 30000, // 30 second timeout (increased for reasoning tokens)
          }
        );
      } catch (modelError: any) {
        // Log the error for debugging
        console.error('OpenAI API Request Error:', {
          status: modelError.response?.status,
          statusText: modelError.response?.statusText,
          data: modelError.response?.data,
          message: modelError.message
        });
        
        // If primary model fails, try fallback
        if (modelError.response?.status === 404 || modelError.response?.status === 400) {
          console.warn(`Model ${this.model} not available, trying fallback ${this.fallbackModel}`);
          response = await axios.post(
            `${this.baseURL}/chat/completions`,
            {
              model: this.fallbackModel,
              messages: [
                {
                  role: 'system',
                  content: 'You are a banking assistant. Parse user commands into structured JSON. Return ONLY valid JSON, no explanation.',
                },
                {
                  role: 'user',
                  content: prompt,
                },
              ],
              response_format: { type: 'json_object' },
              temperature: 0.3,
              max_tokens: 512, // Increased for fallback model
            },
            {
              headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json',
              },
              timeout: 30000, // 30 second timeout (increased for fallback)
            }
          );
        } else {
          throw modelError;
        }
      }

      // Debug: log full response structure
      console.log('OpenAI API Response Status:', response.status);
      console.log('OpenAI API Response Headers:', response.headers);
      
      // Check different possible response structures
      if (!response.data) {
        console.error('No response.data found');
        return this.fallbackIntentParse(text);
      }
      
      if (response.data.error) {
        console.error('OpenAI API Error in response:', response.data.error);
        return this.fallbackIntentParse(text);
      }
      
      // Log response structure for debugging
      console.log('Response data keys:', Object.keys(response.data));
      console.log('Choices array length:', response.data.choices?.length);
      
      if (response.data.choices && response.data.choices.length > 0) {
        console.log('First choice structure:', {
          index: response.data.choices[0].index,
          finish_reason: response.data.choices[0].finish_reason,
          message_role: response.data.choices[0].message?.role,
          has_content: !!response.data.choices[0].message?.content,
          content_length: response.data.choices[0].message?.content?.length
        });
      }
      
      const content = response.data.choices?.[0]?.message?.content;
      
      if (!content || content.trim() === '') {
        console.error('OpenAI Intent Parse Error: Empty response from API');
        console.error('Full response object:', JSON.stringify(response.data, null, 2));
        console.error('Response choices:', response.data.choices);
        console.error('Response usage:', response.data.usage);
        
        // Check for API errors in response
        if (response.data.error) {
          console.error('OpenAI API Error:', response.data.error);
        }
        
        return this.fallbackIntentParse(text);
      }

      let parsed;
      try {
        parsed = JSON.parse(content);
      } catch (parseError: any) {
        console.error('OpenAI Intent Parse Error: Invalid JSON response:', content);
        console.error('Parse error:', parseError.message);
        return this.fallbackIntentParse(text);
      }

      return {
        intent: parsed.intent || 'unknown',
        entities: {
          amount: parsed.amount || 0,
          currency: parsed.currency || 'USDC',
          target: parsed.target || null,
        },
        confidence: parsed.confidence || 0.8,
      };
    } catch (error: any) {
      console.error('OpenAI Intent Parse Error:', error.response?.data || error.message);
      // Fallback to regex parsing
      return this.fallbackIntentParse(text);
    }
  }

  /**
   * Generate explanation for AI decision using OpenAI
   * @param action Action name
   * @param inputs Action inputs
   * @returns Human-readable explanation
   */
  async generateExplanation(
    action: string,
    inputs: Record<string, any>
  ): Promise<string> {
    const prompt = `
Explain the following banking action in simple, friendly language (1-2 sentences):

Action: ${action}
Details: ${JSON.stringify(inputs, null, 2)}

Be concise and reassuring. Speak as Aila, the friendly banking assistant.
`;

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are Aila, a helpful banking assistant. Keep responses friendly and concise (1-2 sentences max).',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          // temperature not supported for gpt-5-nano (defaults to 1)
          // Note: gpt-5-nano uses reasoning tokens internally (can use 1024+ tokens), need much more room
          max_completion_tokens: 3072, // Increased to allow reasoning (up to 1024) + output (512+) with buffer
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000, // 30 second timeout (increased for reasoning tokens)
        }
      );

      const content = response.data.choices?.[0]?.message?.content;
      
      if (!content || content.trim() === '') {
        console.error('OpenAI Explanation Error: Empty response');
        console.error('Response data:', JSON.stringify(response.data, null, 2));
        return `Action completed: ${action}`;
      }

      return content.trim();
    } catch (error: any) {
      console.error('OpenAI Explanation Error:', error.response?.data || error.message);
      return `Action completed: ${action}`;
    }
  }

  /**
   * Get allocation recommendation based on user behavior (Advanced Reasoning)
   * @param userId User identifier
   * @param balance User balance in USDC
   * @param recentActivity Recent transaction history
   * @returns Recommended allocation strategy
   */
  async recommendAllocation(
    userId: string,
    balance: number,
    recentActivity: any[]
  ): Promise<AllocationRecommendation> {
    const prompt = `
Analyze user financial behavior and recommend allocation strategy:

User Balance: $${balance} USDC
Recent Transactions: ${JSON.stringify(recentActivity.slice(0, 10), null, 2)}

Recommend what % should go to:
1. Liquidity Buffer (instant withdrawal) - recommend higher % if frequent withdrawals
2. Yield Generation (earn interest) - recommend higher % if stable balance

Return JSON: { "bufferPercent": 20, "yieldPercent": 80, "reasoning": "brief explanation" }
`;

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a treasury management AI. Analyze financial behavior and recommend optimal allocation. Return ONLY valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          // temperature not supported for gpt-5-nano (defaults to 1)
          // Note: gpt-5-nano uses reasoning tokens internally (can use 1024+ tokens), need much more room
          max_completion_tokens: 3072, // Increased to allow reasoning (up to 1024) + output (512+) with buffer
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        bufferPercent: parsed.bufferPercent || 20,
        yieldPercent: parsed.yieldPercent || 80,
        reasoning: parsed.reasoning || 'Standard allocation for balanced liquidity and yield.',
      };
    } catch (error: any) {
      console.error('OpenAI Allocation Recommendation Error:', error.response?.data || error.message);
      // Default fallback
      return {
        bufferPercent: 20,
        yieldPercent: 80,
        reasoning: 'Default allocation strategy.',
      };
    }
  }

  /**
   * Forecast user liquidity needs (Advanced Reasoning)
   * @param userId User identifier
   * @param historicalData Transaction history
   * @param horizon Days to forecast
   * @returns Forecast predictions
   */
  async forecastLiquidity(
    userId: string,
    historicalData: { date: string; amount: number }[],
    horizon: number = 7
  ): Promise<ForecastResponse> {
    const prompt = `
Analyze the following transaction history and predict liquidity needs for the next ${horizon} days:

Historical Data:
${JSON.stringify(historicalData, null, 2)}

Return predictions in JSON format:
{
  "predictions": [
    { "date": "2025-11-01", "expectedWithdrawal": 50, "confidence": 0.85 }
  ]
}
`;

    try {
      const response = await axios.post(
        `${this.baseURL}/chat/completions`,
        {
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are a financial forecasting AI. Analyze transaction patterns and predict future liquidity needs. Return ONLY valid JSON.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          // temperature not supported for gpt-5-nano (defaults to 1)
          // Note: gpt-5-nano uses reasoning tokens internally (can use 1024+ tokens), need much more room
          max_completion_tokens: 4096, // Increased significantly to allow reasoning (up to 1024) + multiple prediction outputs
        },
        {
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 20000,
        }
      );

      const content = response.data.choices[0].message.content;
      const parsed = JSON.parse(content);

      return {
        predictions: parsed.predictions || this.generateFallbackForecast(historicalData, horizon),
      };
    } catch (error: any) {
      console.error('OpenAI Forecast Error:', error.response?.data || error.message);
      return {
        predictions: this.generateFallbackForecast(historicalData, horizon),
      };
    }
  }

  /**
   * Build prompt for intent parsing
   */
  private buildIntentPrompt(text: string): string {
    return `
Parse the following user command into JSON format with these fields:
- intent: one of [deposit, withdraw, transfer, check_balance, allocate_yield, create_invoice, create_subscription, update_policy, get_status]
- amount: numeric value if mentioned
- currency: currency code if mentioned (default USDC)
- target: recipient address or account if transfer
- confidence: 0-1 score of how confident you are

User command: "${text}"

Return JSON only, no explanation.
`;
  }

  /**
   * Fallback intent parsing using regex (if OpenAI fails)
   */
  private fallbackIntentParse(text: string): IntentResponse {
    const lowerText = text.toLowerCase();
    let intent = 'unknown';
    let amount = 0;
    let currency = 'USDC';

    // Pattern matching
    if (lowerText.includes('deposit') || lowerText.includes('add')) {
      intent = 'deposit';
    } else if (lowerText.includes('withdraw') || lowerText.includes('send')) {
      intent = 'withdraw';
    } else if (lowerText.includes('balance') || lowerText.includes('how much')) {
      intent = 'check_balance';
    } else if (lowerText.includes('transfer')) {
      intent = 'transfer';
    } else if (lowerText.includes('invoice')) {
      intent = 'create_invoice';
    } else if (lowerText.includes('subscription')) {
      intent = 'create_subscription';
    } else if (lowerText.includes('policy') || lowerText.includes('allocate')) {
      intent = 'update_policy';
    }

    // Extract amount
    const amountMatch = text.match(/(\d+(?:\.\d+)?)/);
    if (amountMatch) {
      amount = parseFloat(amountMatch[1]);
    }

    // Extract currency
    const currencyMatch = text.match(/\b(USD|USDC|EUR|KES|NGN|GBP)\b/i);
    if (currencyMatch) {
      currency = currencyMatch[1].toUpperCase();
    }

    return {
      intent,
      entities: { amount, currency },
      confidence: 0.6,
    };
  }

  /**
   * Generate simple fallback forecast
   */
  private generateFallbackForecast(
    historicalData: { date: string; amount: number }[],
    horizon: number
  ): ForecastResponse['predictions'] {
    if (historicalData.length === 0) {
      return [];
    }

    const avgWithdrawal =
      historicalData.reduce((sum, d) => sum + Math.abs(d.amount), 0) / historicalData.length;

    const predictions = [];
    for (let i = 1; i <= horizon; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      predictions.push({
        date: date.toISOString().split('T')[0],
        expectedWithdrawal: avgWithdrawal,
        confidence: 0.5,
      });
    }

    return predictions;
  }
}

