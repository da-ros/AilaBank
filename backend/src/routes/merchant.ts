/**
 * Merchant Toolkit API Routes
 * Invoices, subscriptions, yield-share, and accounting exports
 */

import express, { Request, Response } from 'express';
import { authenticateUser } from '../middleware/auth';
import { getInvoiceService } from '../services/merchant/invoiceService';
import { getSubscriptionService } from '../services/merchant/subscriptionService';
import { getYieldShareService } from '../services/merchant/yieldShareService';
import { getAccountingService } from '../services/merchant/accountingService';

const router = express.Router();

// ==================== INVOICES ====================

/**
 * POST /api/v1/merchant/invoices
 * Create a new invoice
 */
router.post('/merchant/invoices', authenticateUser, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { customerId, amount, currency, description, lineItems, dueDate, metadata } = req.body;

    if (!amount || !description) {
      return res.status(400).json({
        success: false,
        error: 'Amount and description are required',
      });
    }

    const invoiceService = getInvoiceService();
    const invoice = await invoiceService.createInvoice({
      merchantId,
      customerId,
      amount: parseFloat(amount),
      currency,
      description,
      lineItems,
      dueDate,
      metadata,
    });

    res.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error('Create invoice error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create invoice',
    });
  }
});

/**
 * GET /api/v1/merchant/invoices/:id
 * Get invoice by ID
 */
router.get('/merchant/invoices/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const invoiceService = getInvoiceService();
    const invoice = await invoiceService.getInvoice(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    // Check access (merchant or customer)
    const userId = (req as any).user.id;
    if (invoice.merchantId !== userId && invoice.customerId !== userId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    res.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error('Get invoice error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get invoice',
    });
  }
});

/**
 * GET /api/v1/merchant/invoices
 * Get merchant's invoices
 */
router.get('/merchant/invoices', authenticateUser, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { status, page, limit } = req.query;

    const invoiceService = getInvoiceService();
    const result = await invoiceService.getMerchantInvoices(
      merchantId,
      status as any,
      parseInt(page as string) || 1,
      parseInt(limit as string) || 50
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Get invoices error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get invoices',
    });
  }
});

/**
 * POST /api/v1/merchant/invoices/:id/pay
 * Pay an invoice
 */
router.post('/merchant/invoices/:id/pay', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customerId = (req as any).user.id;
    const { paymentMethod, amount } = req.body;

    const invoiceService = getInvoiceService();
    const invoice = await invoiceService.payInvoice({
      invoiceId: id,
      customerId,
      paymentMethod,
      amount: amount ? parseFloat(amount) : undefined,
    });

    res.json({
      success: true,
      invoice,
    });
  } catch (error: any) {
    console.error('Pay invoice error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to pay invoice',
    });
  }
});

/**
 * POST /api/v1/merchant/invoices/:id/refund
 * Refund an invoice
 */
router.post('/merchant/invoices/:id/refund', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = (req as any).user.id;
    const { amount, reason } = req.body;

    const invoiceService = getInvoiceService();
    const invoice = await invoiceService.getInvoice(id);

    if (!invoice) {
      return res.status(404).json({
        success: false,
        error: 'Invoice not found',
      });
    }

    if (invoice.merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const refundedInvoice = await invoiceService.refundInvoice({
      invoiceId: id,
      amount: amount ? parseFloat(amount) : undefined,
      reason,
    });

    res.json({
      success: true,
      invoice: refundedInvoice,
    });
  } catch (error: any) {
    console.error('Refund invoice error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to refund invoice',
    });
  }
});

// ==================== SUBSCRIPTIONS ====================

/**
 * POST /api/v1/merchant/subscriptions/plans
 * Create a subscription plan
 */
router.post('/merchant/subscriptions/plans', authenticateUser, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { name, description, amount, currency, frequency, trialDays, metadata } = req.body;

    if (!name || !amount || !frequency) {
      return res.status(400).json({
        success: false,
        error: 'Name, amount, and frequency are required',
      });
    }

    const subscriptionService = getSubscriptionService();
    const plan = await subscriptionService.createPlan({
      merchantId,
      name,
      description,
      amount: parseFloat(amount),
      currency,
      frequency,
      trialDays,
      metadata,
    });

    res.json({
      success: true,
      plan,
    });
  } catch (error: any) {
    console.error('Create plan error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to create plan',
    });
  }
});

/**
 * GET /api/v1/merchant/subscriptions/plans/:id
 * Get subscription plan by ID
 */
router.get('/merchant/subscriptions/plans/:id', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const subscriptionService = getSubscriptionService();
    const plan = await subscriptionService.getPlan(id);

    if (!plan) {
      return res.status(404).json({
        success: false,
        error: 'Plan not found',
      });
    }

    res.json({
      success: true,
      plan,
    });
  } catch (error: any) {
    console.error('Get plan error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get plan',
    });
  }
});

/**
 * POST /api/v1/merchant/subscriptions
 * Subscribe to a plan
 */
router.post('/merchant/subscriptions', authenticateUser, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.id;
    const { planId, paymentMethod, metadata } = req.body;

    if (!planId) {
      return res.status(400).json({
        success: false,
        error: 'Plan ID is required',
      });
    }

    const subscriptionService = getSubscriptionService();
    const subscription = await subscriptionService.subscribe({
      planId,
      customerId,
      paymentMethod,
      metadata,
    });

    res.json({
      success: true,
      subscription,
    });
  } catch (error: any) {
    console.error('Subscribe error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to subscribe',
    });
  }
});

/**
 * GET /api/v1/merchant/subscriptions
 * Get customer's subscriptions
 */
router.get('/merchant/subscriptions', authenticateUser, async (req: Request, res: Response) => {
  try {
    const customerId = (req as any).user.id;
    const subscriptionService = getSubscriptionService();
    const subscriptions = await subscriptionService.getCustomerSubscriptions(customerId);

    res.json({
      success: true,
      subscriptions,
    });
  } catch (error: any) {
    console.error('Get subscriptions error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get subscriptions',
    });
  }
});

/**
 * POST /api/v1/merchant/subscriptions/:id/cancel
 * Cancel a subscription
 */
router.post('/merchant/subscriptions/:id/cancel', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const customerId = (req as any).user.id;

    const subscriptionService = getSubscriptionService();
    const subscription = await subscriptionService.getSubscription(id);

    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: 'Subscription not found',
      });
    }

    if (subscription.customerId !== customerId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const cancelledSubscription = await subscriptionService.cancelSubscription(id);

    res.json({
      success: true,
      subscription: cancelledSubscription,
    });
  } catch (error: any) {
    console.error('Cancel subscription error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to cancel subscription',
    });
  }
});

// ==================== YIELD-SHARE ====================

/**
 * GET /api/v1/merchant/yield-share
 * Get merchant's yield-share accumulators
 */
router.get('/merchant/yield-share', authenticateUser, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { status } = req.query;

    const yieldShareService = getYieldShareService();
    const accumulators = await yieldShareService.getMerchantAccumulators(
      merchantId,
      status as any
    );

    const totalYield = await yieldShareService.getTotalYieldAccumulated(merchantId);

    res.json({
      success: true,
      accumulators,
      totalYield,
    });
  } catch (error: any) {
    console.error('Get yield-share error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get yield-share',
    });
  }
});

/**
 * POST /api/v1/merchant/yield-share/:id/payout
 * Request payout for yield-share accumulator
 */
router.post('/merchant/yield-share/:id/payout', authenticateUser, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const merchantId = (req as any).user.id;

    const yieldShareService = getYieldShareService();
    const accumulator = await yieldShareService.getAccumulator(id);

    if (!accumulator) {
      return res.status(404).json({
        success: false,
        error: 'Accumulator not found',
      });
    }

    if (accumulator.merchantId !== merchantId) {
      return res.status(403).json({
        success: false,
        error: 'Access denied',
      });
    }

    const payoutAccumulator = await yieldShareService.requestPayout(id);

    res.json({
      success: true,
      accumulator: payoutAccumulator,
    });
  } catch (error: any) {
    console.error('Request payout error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to request payout',
    });
  }
});

// ==================== ACCOUNTING EXPORTS ====================

/**
 * POST /api/v1/merchant/accounting/export/csv
 * Generate CSV export
 */
router.post('/merchant/accounting/export/csv', authenticateUser, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { startDate, endDate } = req.body;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        error: 'Start date and end date are required',
      });
    }

    const accountingService = getAccountingService();
    const { csv, exportId } = await accountingService.generateCSVExport(
      merchantId,
      startDate,
      endDate
    );

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="accounting-export-${exportId}.csv"`);
    res.send(csv);
  } catch (error: any) {
    console.error('Generate CSV export error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to generate CSV export',
    });
  }
});

/**
 * POST /api/v1/merchant/accounting/export/quickbooks
 * Send export to QuickBooks webhook
 */
router.post('/merchant/accounting/export/quickbooks', authenticateUser, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const { startDate, endDate, webhookUrl } = req.body;

    if (!startDate || !endDate || !webhookUrl) {
      return res.status(400).json({
        success: false,
        error: 'Start date, end date, and webhook URL are required',
      });
    }

    const accountingService = getAccountingService();
    const result = await accountingService.sendToQuickBooks(
      merchantId,
      startDate,
      endDate,
      webhookUrl
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Send to QuickBooks error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to send to QuickBooks',
    });
  }
});

/**
 * GET /api/v1/merchant/accounting/exports
 * Get accounting exports
 */
router.get('/merchant/accounting/exports', authenticateUser, async (req: Request, res: Response) => {
  try {
    const merchantId = (req as any).user.id;
    const accountingService = getAccountingService();
    const exports = await accountingService.getMerchantExports(merchantId);

    res.json({
      success: true,
      exports,
    });
  } catch (error: any) {
    console.error('Get exports error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get exports',
    });
  }
});

export default router;

