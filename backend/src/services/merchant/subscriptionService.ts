/**
 * Subscription Service
 * Create plans, subscribe, charge, and cancel subscriptions
 */

import { v4 as uuidv4 } from 'uuid';
import { supabase } from '../../db/supabase';
import { getLedgerService } from '../ledger/ledgerService';
import {
  SubscriptionPlan,
  Subscription,
  SubscriptionStatus,
  SubscriptionFrequency,
  CreateSubscriptionPlanRequest,
  SubscribeRequest,
} from './types';
import CircleService from '../circle/circleService';

export class SubscriptionService {
  /**
   * Create a subscription plan
   */
  async createPlan(request: CreateSubscriptionPlanRequest): Promise<SubscriptionPlan> {
    try {
      const plan: SubscriptionPlan = {
        id: uuidv4(),
        merchantId: request.merchantId,
        name: request.name,
        description: request.description,
        amount: request.amount,
        currency: request.currency || 'USDC',
        frequency: request.frequency,
        trialDays: request.trialDays,
        metadata: request.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('subscription_plans')
        .insert({
          id: plan.id,
          merchant_id: plan.merchantId,
          name: plan.name,
          description: plan.description,
          amount: plan.amount.toString(),
          currency: plan.currency,
          frequency: plan.frequency,
          trial_days: plan.trialDays,
          metadata: plan.metadata,
          created_at: plan.createdAt,
          updated_at: plan.updatedAt,
        });

      if (error) {
        throw new Error(`Failed to create plan: ${error.message}`);
      }

      console.log(`✅ Subscription plan created: ${plan.name} (${plan.id})`);
      return plan;
    } catch (error: any) {
      console.error('❌ Failed to create subscription plan:', error);
      throw error;
    }
  }

  /**
   * Get subscription plan by ID
   */
  async getPlan(planId: string): Promise<SubscriptionPlan | null> {
    try {
      const { data, error } = await supabase
        .from('subscription_plans')
        .select('*')
        .eq('id', planId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get plan: ${error.message}`);
      }

      return this.mapDbToPlan(data);
    } catch (error: any) {
      console.error('❌ Failed to get plan:', error);
      throw error;
    }
  }

  /**
   * Subscribe a customer to a plan
   */
  async subscribe(request: SubscribeRequest): Promise<Subscription> {
    try {
      const plan = await this.getPlan(request.planId);
      if (!plan) {
        throw new Error('Subscription plan not found');
      }

      // Calculate billing dates
      const now = new Date();
      const currentPeriodStart = now.toISOString();
      const currentPeriodEnd = this.calculateNextBillingDate(now, plan.frequency);
      const nextBillingDate = currentPeriodEnd;

      // If trial period, adjust dates
      if (plan.trialDays && plan.trialDays > 0) {
        const trialEnd = new Date(now);
        trialEnd.setDate(trialEnd.getDate() + plan.trialDays);
        // First billing is after trial
      }

      const subscription: Subscription = {
        id: uuidv4(),
        planId: plan.id,
        merchantId: plan.merchantId,
        customerId: request.customerId,
        status: 'active',
        currentPeriodStart,
        currentPeriodEnd,
        nextBillingDate,
        amount: plan.amount,
        currency: plan.currency,
        frequency: plan.frequency,
        metadata: request.metadata || {},
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const { error } = await supabase
        .from('subscriptions')
        .insert({
          id: subscription.id,
          plan_id: subscription.planId,
          merchant_id: subscription.merchantId,
          customer_id: subscription.customerId,
          status: subscription.status,
          current_period_start: subscription.currentPeriodStart,
          current_period_end: subscription.currentPeriodEnd,
          next_billing_date: subscription.nextBillingDate,
          amount: subscription.amount.toString(),
          currency: subscription.currency,
          frequency: subscription.frequency,
          metadata: subscription.metadata,
          created_at: subscription.createdAt,
          updated_at: subscription.updatedAt,
        });

      if (error) {
        throw new Error(`Failed to create subscription: ${error.message}`);
      }

      // If no trial, charge immediately
      if (!plan.trialDays || plan.trialDays === 0) {
        await this.chargeSubscription(subscription.id);
      }

      console.log(`✅ Subscription created: ${subscription.id}`);
      return subscription;
    } catch (error: any) {
      console.error('❌ Failed to subscribe:', error);
      throw error;
    }
  }

  /**
   * Charge a subscription
   */
  async chargeSubscription(subscriptionId: string): Promise<void> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status !== 'active') {
        throw new Error(`Cannot charge subscription with status: ${subscription.status}`);
      }

      // Check if billing date has passed
      const now = new Date();
      const nextBilling = new Date(subscription.nextBillingDate);
      if (now < nextBilling) {
        console.log(`⏳ Subscription ${subscriptionId} not yet due for billing`);
        return;
      }

      // Get customer wallet
      const { data: customer } = await supabase
        .from('users')
        .select('circle_wallet_id, address')
        .eq('id', subscription.customerId)
        .single();

      if (!customer?.circle_wallet_id) {
        throw new Error('Customer wallet not found');
      }

      // Get merchant wallet
      const { data: merchant } = await supabase
        .from('users')
        .select('circle_wallet_id, address')
        .eq('id', subscription.merchantId)
        .single();

      if (!merchant?.circle_wallet_id) {
        throw new Error('Merchant wallet not found');
      }

      // Initiate transfer
      const circleService = new CircleService();
      const transfer = await circleService.transferToArc({
        walletId: customer.circle_wallet_id,
        destinationAddress: merchant.address!,
        amount: subscription.amount.toString(),
        userId: subscription.customerId,
      });

      // Update subscription billing dates
      const newPeriodStart = subscription.currentPeriodEnd;
      const newPeriodEnd = this.calculateNextBillingDate(new Date(newPeriodStart), subscription.frequency);

      const { error: updateError } = await supabase
        .from('subscriptions')
        .update({
          current_period_start: newPeriodStart,
          current_period_end: newPeriodEnd,
          next_billing_date: newPeriodEnd,
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscription.id);

      if (updateError) {
        throw new Error(`Failed to update subscription: ${updateError.message}`);
      }

      // Create ledger entries
      const ledgerService = getLedgerService();

      // Customer: debit wallet
      await ledgerService.createEntry(
        subscription.customerId,
        'transfer',
        'debit',
        subscription.amount,
        subscription.currency,
        'wallet',
        `Subscription charge: ${subscription.id}`,
        subscription.merchantId,
        transfer.id,
        {
          subscriptionId: subscription.id,
          planId: subscription.planId,
        }
      );

      // Merchant: credit wallet
      await ledgerService.createEntry(
        subscription.merchantId,
        'transfer',
        'credit',
        subscription.amount,
        subscription.currency,
        'wallet',
        `Subscription payment received: ${subscription.id}`,
        subscription.customerId,
        transfer.id,
        {
          subscriptionId: subscription.id,
          planId: subscription.planId,
        }
      );

      // Create yield-share accumulator
      const { getYieldShareService } = await import('./yieldShareService');
      const yieldShareService = getYieldShareService();
      
      await yieldShareService.createAccumulator({
        merchantId: subscription.merchantId,
        subscriptionId: subscription.id,
        transactionId: transfer.id,
        settlementAmount: subscription.amount,
      });

      console.log(`✅ Subscription charged: ${subscription.id} - ${subscription.amount} ${subscription.currency}`);
    } catch (error: any) {
      console.error('❌ Failed to charge subscription:', error);
      throw error;
    }
  }

  /**
   * Cancel a subscription
   */
  async cancelSubscription(subscriptionId: string): Promise<Subscription> {
    try {
      const subscription = await this.getSubscription(subscriptionId);
      if (!subscription) {
        throw new Error('Subscription not found');
      }

      if (subscription.status === 'cancelled') {
        return subscription; // Already cancelled
      }

      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          cancelled_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', subscriptionId);

      if (error) {
        throw new Error(`Failed to cancel subscription: ${error.message}`);
      }

      console.log(`✅ Subscription cancelled: ${subscriptionId}`);
      return (await this.getSubscription(subscriptionId))!;
    } catch (error: any) {
      console.error('❌ Failed to cancel subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscription by ID
   */
  async getSubscription(subscriptionId: string): Promise<Subscription | null> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('id', subscriptionId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null;
        }
        throw new Error(`Failed to get subscription: ${error.message}`);
      }

      return this.mapDbToSubscription(data);
    } catch (error: any) {
      console.error('❌ Failed to get subscription:', error);
      throw error;
    }
  }

  /**
   * Get subscriptions for a customer
   */
  async getCustomerSubscriptions(customerId: string): Promise<Subscription[]> {
    try {
      const { data, error } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('customer_id', customerId)
        .order('created_at', { ascending: false });

      if (error) {
        throw new Error(`Failed to get subscriptions: ${error.message}`);
      }

      return (data || []).map(row => this.mapDbToSubscription(row));
    } catch (error: any) {
      console.error('❌ Failed to get customer subscriptions:', error);
      throw error;
    }
  }

  /**
   * Calculate next billing date based on frequency
   */
  private calculateNextBillingDate(startDate: Date, frequency: SubscriptionFrequency): string {
    const date = new Date(startDate);

    switch (frequency) {
      case 'daily':
        date.setDate(date.getDate() + 1);
        break;
      case 'weekly':
        date.setDate(date.getDate() + 7);
        break;
      case 'monthly':
        date.setMonth(date.getMonth() + 1);
        break;
      case 'quarterly':
        date.setMonth(date.getMonth() + 3);
        break;
      case 'yearly':
        date.setFullYear(date.getFullYear() + 1);
        break;
    }

    return date.toISOString();
  }

  /**
   * Map database row to SubscriptionPlan
   */
  private mapDbToPlan(row: any): SubscriptionPlan {
    return {
      id: row.id,
      merchantId: row.merchant_id,
      name: row.name,
      description: row.description,
      amount: parseFloat(row.amount),
      currency: row.currency,
      frequency: row.frequency as SubscriptionFrequency,
      trialDays: row.trial_days,
      metadata: row.metadata || {},
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }

  /**
   * Map database row to Subscription
   */
  private mapDbToSubscription(row: any): Subscription {
    return {
      id: row.id,
      planId: row.plan_id,
      merchantId: row.merchant_id,
      customerId: row.customer_id,
      status: row.status as SubscriptionStatus,
      currentPeriodStart: row.current_period_start,
      currentPeriodEnd: row.current_period_end,
      nextBillingDate: row.next_billing_date,
      amount: parseFloat(row.amount),
      currency: row.currency,
      frequency: row.frequency as SubscriptionFrequency,
      metadata: row.metadata || {},
      cancelledAt: row.cancelled_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  }
}

// Singleton instance
let subscriptionServiceInstance: SubscriptionService | null = null;

export function getSubscriptionService(): SubscriptionService {
  if (!subscriptionServiceInstance) {
    subscriptionServiceInstance = new SubscriptionService();
  }
  return subscriptionServiceInstance;
}

