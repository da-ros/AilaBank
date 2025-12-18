import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, TrendingUp, Loader2 } from "lucide-react";
import { useLedger } from "@/hooks/useLedger";
import { useWallet } from "@/hooks/useWallet";
import { walletAPI } from "@/lib/api-client";
import { formatDistanceToNow } from "date-fns";

const RecentTransactions = () => {
  const { entries, loading: ledgerLoading } = useLedger();
  const { wallet } = useWallet();
  const [circleTransactions, setCircleTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);
  const [displayEntries, setDisplayEntries] = useState<any[]>([]);

  // Load Circle transactions when wallet is available
  useEffect(() => {
    if (wallet?.id) {
      loadCircleTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wallet?.id]);

  const loadCircleTransactions = async () => {
    if (!wallet?.id) return;
    
    setLoadingTransactions(true);
    try {
      const response = await walletAPI.getTransactions(20);
      if (response.success && response.transactions) {
        setCircleTransactions(response.transactions);
      }
    } catch (error: any) {
      console.error('Failed to load Circle transactions:', error);
      // Don't show error - transactions might not be available yet
    } finally {
      setLoadingTransactions(false);
    }
  };

  // Merge ledger entries and Circle transactions, then sort by timestamp
  // Deduplicate: If a Circle transaction has a corresponding ledger entry (via transferId),
  // prefer the Circle transaction and skip the ledger entry
  useEffect(() => {
    // Extract transfer IDs from ledger entries that have them in metadata
    const ledgerTransferIds = new Set(
      entries
        .map(entry => {
          // Check if entry has transferId in metadata (from correlationId or metadata field)
          // Ledger entries for Circle transfers should have transferId in metadata
          const correlationId = (entry as any).correlationId;
          const metadata = (entry as any).metadata;
          return metadata?.transferId || correlationId;
        })
        .filter(Boolean)
    );

    // Deduplicate Circle transactions first (in case API returns duplicates)
    // Use a more robust key that includes ID, amount, and timestamp
    const uniqueCircleTxs = new Map<string, any>();
    circleTransactions.forEach((tx: any) => {
      const txId = tx.id || tx.transactionId;
      
      // Extract amount for deduplication
      let txAmount = 0;
      if (tx.amounts && Array.isArray(tx.amounts) && tx.amounts.length > 0) {
        txAmount = parseFloat(tx.amounts[0] || '0');
      } else if (tx.tokenAmounts && Array.isArray(tx.tokenAmounts) && tx.tokenAmounts.length > 0) {
        txAmount = parseFloat(tx.tokenAmounts[0]?.amount || '0');
      } else if (tx.amount?.amount) {
        txAmount = parseFloat(tx.amount.amount || '0');
      } else if (tx.amount) {
        txAmount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : parseFloat(tx.amount?.amount || '0');
      }
      
      // Create a unique key: ID + amount + timestamp (rounded to nearest second)
      const txTimestamp = tx.createDate || tx.createdAt || tx.timestamp || tx.updateDate;
      const timestampMs = txTimestamp ? new Date(txTimestamp).getTime() : Date.now();
      const timestampRounded = Math.floor(timestampMs / 1000) * 1000; // Round to nearest second
      
      const key = txId 
        ? `circle-${txId}-${txAmount.toFixed(6)}-${timestampRounded}`
        : `circle-${txAmount.toFixed(6)}-${timestampRounded}-${tx.source?.address || tx.destination?.address || 'unknown'}`;
      
      // Only keep the first occurrence
      if (!uniqueCircleTxs.has(key)) {
        uniqueCircleTxs.set(key, tx);
      } else {
        console.log('🔄 Duplicate Circle transaction detected:', key, tx);
      }
    });
    const deduplicatedCircleTxs = Array.from(uniqueCircleTxs.values());
    console.log(`📊 Deduplicated ${circleTransactions.length} Circle transactions to ${deduplicatedCircleTxs.length}`);
    
    // Map Circle transactions first
    const circleTxMap = new Map();
    deduplicatedCircleTxs.forEach((tx: any) => {
      const txId = tx.id || tx.transactionId;
      if (txId) {
        circleTxMap.set(txId, tx);
      }
    });

    // Map ledger entries, but skip ones that correspond to Circle transactions
    const ledgerTransactions = entries
      .filter((entry) => {
        // Skip ledger entries that correspond to Circle transactions
        // Check if this entry's transferId matches any Circle transaction
        const metadata = (entry as any).metadata;
        const transferId = metadata?.transferId;
        if (transferId && circleTxMap.has(transferId)) {
          return false; // Skip this ledger entry, we'll use the Circle transaction instead
        }
        return true; // Keep this ledger entry
      })
      .map((entry) => ({
        id: entry.id,
        type: entry.type || 'transaction',
        amount: entry.amount || 0,
        description: entry.description || entry.type?.replace('_', ' ') || 'Transaction',
        timestamp: entry.timestamp,
        source: 'ledger' as const,
        side: 'debit' as const, // Default to debit for ledger entries
      }));

    // Map Circle transactions (using deduplicated list)
    const circleTransactionsMapped = deduplicatedCircleTxs.map((tx: any) => {
      const txType = tx.type || tx.transactionType || tx.transactionType || 'transfer';
        const isDeposit = txType === 'deposit' || txType === 'mint' || (tx.destination?.address && !tx.source?.address);
        
        // Circle transactions can have amounts in different formats:
        // 1. tx.amounts (array) - for transfers: ["1.00"]
        // 2. tx.amount.amount (string) - nested amount object
        // 3. tx.amount (string) - direct amount
        // 4. tx.tokenAmounts (array) - array of { amount, tokenId }
        let amount = 0;
        
        if (tx.amounts && Array.isArray(tx.amounts) && tx.amounts.length > 0) {
          // Format: { amounts: ["1.00", "2.00"] }
          amount = parseFloat(tx.amounts[0] || '0');
        } else if (tx.tokenAmounts && Array.isArray(tx.tokenAmounts) && tx.tokenAmounts.length > 0) {
          // Format: { tokenAmounts: [{ amount: "1.00", tokenId: "..." }] }
          amount = parseFloat(tx.tokenAmounts[0]?.amount || '0');
        } else if (tx.amount?.amount) {
          // Format: { amount: { amount: "1.00", currency: "USDC" } }
          amount = parseFloat(tx.amount.amount || '0');
        } else if (tx.amount) {
          // Format: { amount: "1.00" } or { amount: { ... } }
          amount = typeof tx.amount === 'string' ? parseFloat(tx.amount) : parseFloat(tx.amount?.amount || '0');
        }
        
        return {
          id: tx.id || tx.transactionId,
          type: isDeposit ? 'deposit' : 'transfer',
          amount: amount,
          description: tx.description || `${isDeposit ? 'Deposit' : 'Transfer'} USDC`,
          timestamp: tx.createDate || tx.createdAt || tx.timestamp || tx.updateDate,
          source: 'circle' as const,
          side: isDeposit ? 'credit' : 'debit',
        };
      });

    // Combine and deduplicate using a Map to track unique transactions
    // Use amount + timestamp matching (within tolerance) to catch duplicates with different IDs
    const uniqueTransactionsMap = new Map<string, any>();
    const seenAmountTimestamp = new Map<string, any>(); // Track by amount + timestamp for cross-source deduplication
    
    // Add all transactions, using a more robust unique key
    [...ledgerTransactions, ...circleTransactionsMapped].forEach((tx) => {
      // Create a unique key: source + ID + amount (with precision) + timestamp (rounded)
      const timestampMs = tx.timestamp ? new Date(tx.timestamp).getTime() : Date.now();
      const timestampRounded = Math.floor(timestampMs / 1000) * 1000; // Round to nearest second
      const amountKey = tx.amount ? Math.abs(tx.amount).toFixed(6) : '0.000000'; // Use absolute value for matching
      
      const key = tx.id 
        ? `${tx.source}-${tx.id}-${amountKey}-${timestampRounded}`
        : `${tx.source}-${amountKey}-${timestampRounded}`;
      
      // Also create an amount+timestamp key for cross-source deduplication
      // This catches duplicates that have same amount and timestamp but different IDs or sources
      const amountTimestampKey = `${amountKey}-${timestampRounded}`;
      
      // Check if we've seen this exact transaction (by key)
      if (uniqueTransactionsMap.has(key)) {
        console.log('🔄 Duplicate transaction detected (by key):', key, tx);
        return; // Skip this transaction
      }
      
      // Check if we've seen a transaction with the same amount and timestamp (within 5 seconds)
      // This catches duplicates that might have different IDs or come from different sources
      let isDuplicate = false;
      for (const [seenKey, seenTx] of seenAmountTimestamp.entries()) {
        const [seenAmount, seenTimestamp] = seenKey.split('-');
        const timeDiff = Math.abs(timestampRounded - parseInt(seenTimestamp));
        const amountDiff = Math.abs(parseFloat(amountKey) - parseFloat(seenAmount));
        
        // Match if same amount (within 0.0001) and same timestamp (within 5 seconds)
        if (amountDiff < 0.0001 && timeDiff < 5000) {
          console.log('🔄 Duplicate transaction detected (by amount+timestamp):', {
            existing: seenTx,
            new: tx,
            amountDiff,
            timeDiff
          });
          isDuplicate = true;
          break;
        }
      }
      
      if (!isDuplicate) {
        uniqueTransactionsMap.set(key, tx);
        seenAmountTimestamp.set(amountTimestampKey, tx);
      }
    });
    
    console.log(`📊 Final deduplication: ${ledgerTransactions.length + circleTransactionsMapped.length} -> ${uniqueTransactionsMap.size} unique transactions`);
    console.log('📊 Transaction breakdown:', {
      ledger: ledgerTransactions.length,
      circle: circleTransactionsMapped.length,
      unique: uniqueTransactionsMap.size
    });
    
    // Convert map values to array
    const allTransactions = Array.from(uniqueTransactionsMap.values())
      .sort((a, b) => {
        // Sort by timestamp, most recent first
        const dateA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
        const dateB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
        return dateB - dateA;
      })
      .slice(0, 5); // Show only 5 most recent

    setDisplayEntries(allTransactions);
  }, [entries, circleTransactions]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return ArrowDownLeft;
      case 'withdraw':
      case 'transfer':
        return ArrowUpRight;
      case 'yield_accrued':
        return TrendingUp;
      case 'fx_conversion':
        return RefreshCw;
      default:
        return ArrowDownLeft;
    }
  };

  const getIconColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'yield_accrued':
        return 'text-success';
      case 'withdraw':
      case 'transfer':
        return 'text-primary';
      case 'fx_conversion':
        return 'text-accent';
      default:
        return 'text-muted-foreground';
    }
  };

  const formatAmount = (entry: any) => {
    const amount = parseFloat(entry.amount || '0');
    // Determine sign based on entry type or side
    const isCredit = entry.type === 'deposit' || entry.type === 'yield_accrued' || entry.side === 'credit';
    const sign = isCredit ? '+' : '-';
    return `${sign}$${Math.abs(amount).toFixed(2)}`;
  };

  const formatDate = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return timestamp;
    }
  };

  if ((ledgerLoading || loadingTransactions) && displayEntries.length === 0) {
    return (
      <Card className="glass p-6 rounded-2xl border-0">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </Card>
    );
  }

  if (displayEntries.length === 0) {
    return (
      <Card className="glass p-6 rounded-2xl border-0">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Recent Transactions</h3>
        </div>
        <p className="text-muted-foreground text-center py-8">No transactions yet</p>
      </Card>
    );
  }

  return (
    <Card className="glass p-6 rounded-2xl border-0">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Recent Transactions</h3>
        <a href="#" className="text-sm text-primary hover:underline">View All</a>
      </div>
      
      <div className="space-y-3">
        {displayEntries.map((entry) => {
          const Icon = getIcon(entry.type);
          const iconColor = getIconColor(entry.type);
          const amount = formatAmount(entry);
          const date = formatDate(entry.timestamp);
          
          return (
            <div
              key={entry.id}
              className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${iconColor}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div>
                  <p className="font-medium text-sm">
                    {entry.description || entry.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </p>
                  <p className="text-xs text-muted-foreground">{date}</p>
                  {entry.source === 'circle' && (
                    <Badge variant="outline" className="text-xs mt-1">
                      Circle
                    </Badge>
                  )}
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${amount.startsWith('+') ? 'text-success' : 'text-foreground'}`}>
                  {amount}
                </p>
                <Badge variant="secondary" className="text-xs">
                  {entry.type}
                </Badge>
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

export default RecentTransactions;
