/**
 * Ledger Hook
 * Manages ledger entries and statistics
 */

import { useState, useEffect } from 'react';
import { ledgerAPI } from '../lib/api-client';
import { useAuth } from '../contexts/AuthContext';

interface LedgerEntry {
  id: string;
  type: string;
  amount: number;
  currency: string;
  account: string;
  counterparty?: string;
  description?: string;
  timestamp: string;
  correlationId?: string;
}

interface LedgerStats {
  totalDeposits: number;
  totalWithdrawals: number;
  totalYield: number;
  totalFees: number;
  currentBalance: number;
  currency: string;
  breakdown: {
    byType: Record<string, number>;
    byAccount: Record<string, number>;
  };
}

export const useLedger = () => {
  const { user, isAuthenticated } = useAuth();
  const [stats, setStats] = useState<LedgerStats | null>(null);
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadStats = async (startDate?: string, endDate?: string) => {
    if (!isAuthenticated || !user) return;

    setLoading(true);
    setError(null);
    try {
      const response = await ledgerAPI.getStats(user.id, startDate, endDate);
      if (response.success && response.stats) {
        setStats(response.stats);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger stats');
    } finally {
      setLoading(false);
    }
  };

  const loadEntries = async (page: number = 1, limit: number = 50, entryType?: string, startDate?: string) => {
    if (!isAuthenticated || !user) return;

    setLoading(true);
    setError(null);
    try {
      const response = await ledgerAPI.getMyLedger(page, limit, entryType, startDate);
      if (response.success && response.entries) {
        setEntries(response.entries);
        return response.pagination;
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load ledger entries');
    } finally {
      setLoading(false);
    }
  };

  // Auto-load stats on mount
  useEffect(() => {
    if (isAuthenticated && user?.id) {
      loadStats();
      loadEntries();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.id]);

  return {
    stats,
    entries,
    loading,
    error,
    loadStats,
    loadEntries,
  };
};

