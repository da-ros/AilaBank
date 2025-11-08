/**
 * FX Quotes API Routes
 * GET /api/v1/quotes?from=EUR&to=USDC&amount=100
 */

import express, { Request, Response } from 'express';
import { getQuoteService } from '../services/fx/quoteService';
import { QuoteRequest } from '../services/fx/types';

const router = express.Router();
const quoteService = getQuoteService();

/**
 * GET /api/v1/quotes
 * Get best FX quote for currency conversion
 * 
 * Query parameters:
 * - from: Source currency (e.g., 'EUR', 'USD')
 * - to: Destination currency (e.g., 'USDC', 'USD')
 * - amount: Amount to convert (number)
 * - corridor: Optional corridor identifier (e.g., 'EUR-US')
 * - all: Optional flag to return all provider quotes (default: false)
 */
router.get('/quotes', async (req: Request, res: Response) => {
  try {
    const { from, to, amount, corridor, all } = req.query;

    // Validate required parameters
    if (!from || !to || !amount) {
      return res.status(400).json({
        success: false,
        error: 'Missing required parameters: from, to, and amount are required',
        example: '/api/v1/quotes?from=EUR&to=USDC&amount=100',
      });
    }

    // Parse amount
    const amountNum = parseFloat(amount as string);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({
        success: false,
        error: 'amount must be a positive number',
      });
    }

    // Build quote request
    const quoteRequest: QuoteRequest = {
      from: from as string,
      to: to as string,
      amount: amountNum,
      corridor: corridor as string | undefined,
    };

    // Get quote(s)
    if (all === 'true' || all === '1') {
      // Return all provider quotes for comparison
      const quotes = await quoteService.getAllQuotes(quoteRequest);
      
      return res.json({
        success: true,
        quotes,
        count: quotes.length,
        best: quotes[0], // Best quote is first (sorted)
      });
    } else {
      // Return best quote only
      const quote = await quoteService.getQuote(quoteRequest);
      
      return res.json({
        success: true,
        quote,
      });
    }
  } catch (error: any) {
    console.error('Quote error:', error);
    res.status(400).json({
      success: false,
      error: error.message || 'Failed to get quote',
    });
  }
});

/**
 * GET /api/v1/quotes/providers
 * Get list of available FX providers
 */
router.get('/quotes/providers', async (req: Request, res: Response) => {
  try {
    const providers = await quoteService.getAvailableProviders();
    
    res.json({
      success: true,
      providers,
      count: providers.length,
    });
  } catch (error: any) {
    console.error('Providers error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get providers',
    });
  }
});

/**
 * GET /api/v1/quotes/currencies
 * Get list of supported currencies
 */
router.get('/quotes/currencies', async (req: Request, res: Response) => {
  try {
    const currencies = await quoteService.getSupportedCurrencies();
    
    res.json({
      success: true,
      currencies,
      count: currencies.length,
    });
  } catch (error: any) {
    console.error('Currencies error:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Failed to get currencies',
    });
  }
});

export default router;

