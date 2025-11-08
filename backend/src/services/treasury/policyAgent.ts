/**
 * Policy Evaluation Agent
 * Uses LangChain to evaluate treasury policies with AI reasoning
 */

import { ChatOpenAI } from '@langchain/openai';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { PolicyEvaluation, PolicyRule, BalanceSnapshot, IdleBalance, TreasuryPolicy } from './types';

export class PolicyAgent {
  private llm: ChatOpenAI;

  constructor() {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error('OPENAI_API_KEY is required for PolicyAgent');
    }

    this.llm = new ChatOpenAI({
      modelName: 'gpt-5-nano', // Using gpt-5-nano
      // temperature: 0.3, // Lower temperature for more consistent policy decisions
      openAIApiKey: apiKey,
    });
  }

  /**
   * Evaluate a treasury policy against current balances and conditions
   */
  async evaluatePolicy(
    policy: TreasuryPolicy,
    balances: BalanceSnapshot[],
    idleBalances: IdleBalance[]
  ): Promise<PolicyEvaluation> {
    try {
      // Build context for the agent
      const context = this.buildContext(balances, idleBalances);

      // Create prompt template
      const prompt = ChatPromptTemplate.fromMessages([
        ['system', this.getSystemPrompt()],
        ['human', this.getEvaluationPrompt(policy, context)],
      ]);

      // Get AI evaluation
      const chain = prompt.pipe(this.llm);
      const response = await chain.invoke({});

      // Parse response
      const evaluation = this.parseEvaluation(response.content as string, policy);

      return evaluation;
    } catch (error: any) {
      console.error('❌ Policy evaluation failed:', error);
      
      // Fallback to rule-based evaluation
      return this.fallbackEvaluation(policy, balances, idleBalances);
    }
  }

  /**
   * Build context string from balances
   */
  private buildContext(balances: BalanceSnapshot[], idleBalances: IdleBalance[]): string {
    const balanceSummary = balances.map(b => 
      `- ${b.source}: ${b.balance} ${b.currency}`
    ).join('\n');

    const idleSummary = idleBalances.map(ib =>
      `- ${ib.source}: ${ib.amount} ${ib.currency} (idle for ${Math.floor(ib.idleDuration / 3600)} hours)`
    ).join('\n');

    const totalIdle = idleBalances.reduce((sum, ib) => sum + ib.amount, 0);
    const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);

    return `
Current Balances:
${balanceSummary}

Idle Balances:
${idleSummary || 'None'}

Summary:
- Total Balance: ${totalBalance} USDC
- Total Idle: ${totalIdle} USDC
- Idle Percentage: ${totalBalance > 0 ? ((totalIdle / totalBalance) * 100).toFixed(2) : 0}%
`;
  }

  /**
   * Get system prompt for policy evaluation
   */
  private getSystemPrompt(): string {
    return `You are a treasury management AI agent responsible for evaluating financial policies and making allocation recommendations.

Your role:
1. Analyze current balance distributions across Circle and Arc
2. Identify idle balances that could be better utilized
3. Evaluate policy rules against current conditions
4. Recommend optimal allocation actions (allocate_to_yield, topup_buffer, rebalance, no_action)
5. Provide clear reasoning for your recommendations

Key considerations:
- Buffer should maintain 10-20% of TVL for instant withdrawals
- Yield allocation should target 80% of idle funds
- De-peg risk: If USDC deviates >0.5% from $1, prioritize safety
- APY thresholds: Only allocate if expected APY > 3%
- Idle balance threshold: Funds idle >1 hour should be considered for allocation

Return your evaluation in JSON format with:
- triggered: boolean (whether policy should be activated)
- matchedRules: array of rule IDs that matched
- recommendedAction: one of ["allocate_to_yield", "topup_buffer", "rebalance", "no_action"]
- reasoning: detailed explanation
- confidence: number between 0 and 1
- parameters: object with action-specific parameters (e.g., {amount: 1000, targetBufferPercent: 15})`;
  }

  /**
   * Get evaluation prompt for specific policy
   */
  private getEvaluationPrompt(policy: TreasuryPolicy, context: string): string {
    const rulesDescription = policy.rules.map((rule, idx) => 
      `${idx + 1}. ${rule.type}: ${rule.condition} → ${rule.action}`
    ).join('\n');

    return `Evaluate the following treasury policy:

Policy: ${policy.name}
Description: ${policy.description}
Priority: ${policy.priority}

Rules:
${rulesDescription}

${context}

Evaluate whether this policy should be triggered and what action to take.`;
  }

  /**
   * Parse AI response into PolicyEvaluation
   */
  private parseEvaluation(response: string, policy: TreasuryPolicy): PolicyEvaluation {
    try {
      // Try to extract JSON from response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          policyId: policy.id,
          policyName: policy.name,
          triggered: parsed.triggered || false,
          matchedRules: policy.rules.filter((_, idx) => 
            parsed.matchedRules?.includes(idx + 1) || parsed.matchedRules?.includes(idx)
          ),
          recommendedAction: parsed.recommendedAction || 'no_action',
          reasoning: parsed.reasoning || response,
          confidence: parsed.confidence || 0.5,
          parameters: parsed.parameters || {},
        };
      }
    } catch (error) {
      console.warn('⚠️  Failed to parse AI response, using fallback');
    }

    // Fallback: extract key information from text
    const triggered = response.toLowerCase().includes('trigger') || 
                     response.toLowerCase().includes('activate');
    const actionMatch = response.match(/(allocate_to_yield|topup_buffer|rebalance|no_action)/i);
    const recommendedAction = actionMatch ? actionMatch[1].toLowerCase() as any : 'no_action';

    return {
      policyId: policy.id,
      policyName: policy.name,
      triggered,
      matchedRules: [],
      recommendedAction,
      reasoning: response,
      confidence: 0.5,
    };
  }

  /**
   * Fallback rule-based evaluation if AI fails
   */
  private fallbackEvaluation(
    policy: TreasuryPolicy,
    balances: BalanceSnapshot[],
    idleBalances: IdleBalance[]
  ): PolicyEvaluation {
    const totalBalance = balances.reduce((sum, b) => sum + b.balance, 0);
    const totalIdle = idleBalances.reduce((sum, ib) => sum + ib.amount, 0);
    
    const bufferBalance = balances.find(b => b.source === 'arc_buffer')?.balance || 0;
    const bufferPercent = totalBalance > 0 ? (bufferBalance / totalBalance) * 100 : 0;

    // Simple rule matching
    const matchedRules: PolicyRule[] = [];
    let recommendedAction: any = 'no_action';

    for (const rule of policy.rules) {
      let matches = false;

      switch (rule.type) {
        case 'buffer_percent':
          const targetPercent = rule.parameters?.targetPercent || 15;
          if (bufferPercent < targetPercent) {
            matches = true;
            recommendedAction = 'topup_buffer';
          }
          break;

        case 'idle_balance':
          if (totalIdle > (rule.parameters?.threshold || 100)) {
            matches = true;
            recommendedAction = 'allocate_to_yield';
          }
          break;

        case 'apy_threshold':
          // Would need APY data - assume it meets threshold for now
          if (totalIdle > 0) {
            matches = true;
            recommendedAction = 'allocate_to_yield';
          }
          break;
      }

      if (matches) {
        matchedRules.push(rule);
      }
    }

    return {
      policyId: policy.id,
      policyName: policy.name,
      triggered: matchedRules.length > 0,
      matchedRules,
      recommendedAction,
      reasoning: `Rule-based evaluation: ${matchedRules.length} rules matched. Buffer: ${bufferPercent.toFixed(2)}%, Idle: ${totalIdle} USDC`,
      confidence: 0.7,
    };
  }
}

