import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Wallet as WalletIcon, 
  Copy, 
  Check, 
  ArrowDownLeft, 
  ArrowUpRight, 
  RefreshCw, 
  QrCode,
  Loader2,
  Eye,
  EyeOff,
  TrendingUp
} from "lucide-react";
import { useWallet } from "@/hooks/useWallet";
import { useLedger } from "@/hooks/useLedger";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import HamburgerMenu from "@/components/HamburgerMenu";
import { walletAPI } from "@/lib/api-client";

const Wallet = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const {
    wallet,
    balances,
    usdcBalance,
    loading: walletLoading,
    createWallet,
    loadBalance,
    transferToArc,
    createDepositAddress,
  } = useWallet();
  const { entries, loading: ledgerLoading, loadEntries } = useLedger();

  const [showBalance, setShowBalance] = useState(true);
  const [copiedAddress, setCopiedAddress] = useState<string | null>(null);
  const [depositAddress, setDepositAddress] = useState<string | null>(null);
  const [transferForm, setTransferForm] = useState({
    destinationAddress: "",
    amount: "",
  });
  const [transferring, setTransferring] = useState(false);
  const [loadingDepositAddress, setLoadingDepositAddress] = useState(false);
  const [circleTransactions, setCircleTransactions] = useState<any[]>([]);
  const [loadingTransactions, setLoadingTransactions] = useState(false);

  // Remove auto-wallet creation - let useWallet handle it
  // useEffect(() => {
  //   if (user?.id && !wallet) {
  //     createWallet();
  //   }
  // }, [user?.id, wallet, createWallet]);

  useEffect(() => {
    if (user?.id) {
      loadEntries(1, 20);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

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
      const response = await walletAPI.getTransactions(50);
      if (response.success && response.transactions) {
        setCircleTransactions(response.transactions);
      }
    } catch (error: any) {
      console.error('Failed to load Circle transactions:', error);
      // Don't show error toast - transactions might not be available yet
    } finally {
      setLoadingTransactions(false);
    }
  };

  const handleCopyAddress = (address: string, type: 'wallet' | 'deposit') => {
    navigator.clipboard.writeText(address);
    setCopiedAddress(type);
    toast({
      title: "Copied!",
      description: "Address copied to clipboard",
    });
    setTimeout(() => setCopiedAddress(null), 2000);
  };

  const handleCreateDepositAddress = async () => {
    setLoadingDepositAddress(true);
    try {
      const response = await createDepositAddress();
      if (response?.address) {
        setDepositAddress(response.address);
        toast({
          title: "Deposit Address Created",
          description: "Use this address to deposit funds",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create deposit address",
        variant: "destructive",
      });
    } finally {
      setLoadingDepositAddress(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transferForm.destinationAddress || !transferForm.amount) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    setTransferring(true);
    try {
      await transferToArc(transferForm.destinationAddress, transferForm.amount);
      toast({
        title: "Transfer Initiated",
        description: `Transferring ${transferForm.amount} USDC to ${transferForm.destinationAddress.slice(0, 8)}...`,
      });
      setTransferForm({ destinationAddress: "", amount: "" });
      // Reload balance and entries
      await loadBalance();
      await loadEntries(1, 20);
    } catch (error: any) {
      toast({
        title: "Transfer Failed",
        description: error.message || "Failed to initiate transfer",
        variant: "destructive",
      });
    } finally {
      setTransferring(false);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "Not available";
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'deposit':
        return ArrowDownLeft;
      case 'withdraw':
      case 'transfer':
        return ArrowUpRight;
      case 'yield_accrued':
        return TrendingUp;
      default:
        return RefreshCw;
    }
  };

  const getTransactionColor = (type: string) => {
    switch (type) {
      case 'deposit':
      case 'yield_accrued':
        return 'text-success';
      case 'withdraw':
      case 'transfer':
        return 'text-primary';
      default:
        return 'text-muted-foreground';
    }
  };

  if (walletLoading && !wallet) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto mb-4" />
          <p className="text-muted-foreground">Loading wallet...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4 md:p-8 relative overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse-glow" />
        <div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent/10 rounded-full blur-3xl animate-pulse-glow" 
          style={{ animationDelay: "1s" }} 
        />
      </div>

      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">My Wallet</h1>
            <p className="text-muted-foreground mt-1">Manage your USDC balance and transactions</p>
          </div>
          <HamburgerMenu />
        </div>

        {/* Balance Card */}
        <Card className="glass-strong p-8 rounded-3xl border-0 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <WalletIcon className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Balance</p>
                  <p className="text-xs text-muted-foreground">USDC on Circle</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              {walletLoading ? (
                <div className="flex items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="text-lg text-muted-foreground">Loading balance...</span>
                </div>
              ) : showBalance ? (
                <>
                  <h2 className="text-5xl md:text-6xl font-bold mb-2">
                    ${(usdcBalance ?? 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </h2>
                  <p className="text-sm text-muted-foreground">USDC</p>
                </>
              ) : (
                <h2 className="text-5xl md:text-6xl font-bold mb-2">••••••</h2>
              )}
            </div>

            {/* Wallet Address */}
            {wallet?.id && (
              <div className="pt-6 border-t border-border/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Wallet ID</p>
                    <p className="font-mono text-sm">{formatAddress(wallet.id)}</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleCopyAddress(wallet.id, 'wallet')}
                    className="gap-2"
                  >
                    {copiedAddress === 'wallet' ? (
                      <>
                        <Check className="h-4 w-4 text-success" />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy className="h-4 w-4" />
                        Copy
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </Card>

        {/* Actions Tabs */}
        <Tabs defaultValue="deposit" className="w-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="deposit">Deposit</TabsTrigger>
            <TabsTrigger value="transfer">Transfer</TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          {/* Deposit Tab */}
          <TabsContent value="deposit" className="space-y-6">
            <Card className="glass-strong p-6 rounded-2xl border-0">
              <div className="flex items-center gap-2 mb-4">
                <ArrowDownLeft className="h-5 w-5 text-success" />
                <h3 className="text-lg font-semibold">Deposit USDC</h3>
              </div>

              {!depositAddress ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Generate a deposit address to receive USDC in your Circle wallet.
                  </p>
                  <Button
                    onClick={handleCreateDepositAddress}
                    disabled={loadingDepositAddress}
                    className="w-full"
                  >
                    {loadingDepositAddress ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <QrCode className="h-4 w-4 mr-2" />
                        Generate Deposit Address
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="glass p-4 rounded-xl">
                    <Label className="text-xs text-muted-foreground mb-2 block">Deposit Address</Label>
                    <div className="flex items-center gap-2">
                      <p className="font-mono text-sm flex-1 break-all">{depositAddress}</p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleCopyAddress(depositAddress, 'deposit')}
                        className="gap-2"
                      >
                        {copiedAddress === 'deposit' ? (
                          <Check className="h-4 w-4 text-success" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="glass p-4 rounded-xl bg-destructive/5 border border-destructive/20">
                    <p className="text-sm text-muted-foreground">
                      <strong className="text-foreground">Important:</strong> Send only USDC to this address. 
                      Sending other tokens may result in permanent loss.
                    </p>
                  </div>
                  <Button
                    variant="outline"
                    onClick={() => setDepositAddress(null)}
                    className="w-full"
                  >
                    Generate New Address
                  </Button>
                </div>
              )}
            </Card>
          </TabsContent>

          {/* Transfer Tab */}
          <TabsContent value="transfer" className="space-y-6">
            <Card className="glass-strong p-6 rounded-2xl border-0">
              <div className="flex items-center gap-2 mb-4">
                <ArrowUpRight className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold">Transfer to Arc</h3>
              </div>

              <form onSubmit={handleTransfer} className="space-y-4">
                <div>
                  <Label>Destination Address</Label>
                  <Input
                    placeholder="0x..."
                    value={transferForm.destinationAddress}
                    onChange={(e) => setTransferForm({ ...transferForm, destinationAddress: e.target.value })}
                    required
                    className="glass mt-1.5 rounded-xl border-0 font-mono"
                  />
                </div>

                <div>
                  <Label>Amount (USDC)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    required
                    className="glass mt-1.5 rounded-xl border-0 text-2xl font-semibold"
                  />
                  {(usdcBalance ?? 0) > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Available: ${(usdcBalance ?? 0).toFixed(2)} USDC
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={transferring || !transferForm.destinationAddress || !transferForm.amount}
                >
                  {transferring ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Transferring...
                    </>
                  ) : (
                    <>
                      <ArrowUpRight className="h-4 w-4 mr-2" />
                      Transfer to Arc
                    </>
                  )}
                </Button>
              </form>
            </Card>
          </TabsContent>

          {/* History Tab */}
          <TabsContent value="history" className="space-y-6">
            <Card className="glass-strong p-6 rounded-2xl border-0">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Transaction History</h3>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    loadEntries(1, 20);
                    loadCircleTransactions();
                  }}
                  disabled={ledgerLoading || loadingTransactions}
                >
                  <RefreshCw className={`h-4 w-4 ${(ledgerLoading || loadingTransactions) ? 'animate-spin' : ''}`} />
                </Button>
              </div>

              {(ledgerLoading || loadingTransactions) && entries.length === 0 && circleTransactions.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : entries.length === 0 && circleTransactions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No transactions yet</p>
              ) : (
                <div className="space-y-3">
                  {/* Combine ledger entries and Circle transactions, deduplicate */}
                  {(() => {
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
                    
                    // Log transaction details for debugging
                    if (deduplicatedCircleTxs.length > 0) {
                      console.log('📋 Sample Circle transactions:', deduplicatedCircleTxs.slice(0, 3).map(tx => ({
                        id: tx.id || tx.transactionId,
                        amount: tx.amounts?.[0] || tx.amount?.amount || tx.amount,
                        timestamp: tx.createDate || tx.createdAt || tx.timestamp,
                        type: tx.type || tx.transactionType
                      })));
                    }
                    
                    // Create a map of Circle transaction IDs to avoid duplicates with ledger
                    const circleTxMap = new Map();
                    deduplicatedCircleTxs.forEach((tx: any) => {
                      const txId = tx.id || tx.transactionId;
                      if (txId) {
                        circleTxMap.set(txId, tx);
                      }
                    });

                    // Filter ledger entries - skip ones that correspond to Circle transactions
                    const ledgerTransactions = entries
                      .filter((entry) => {
                        const metadata = (entry as any).metadata;
                        const transferId = metadata?.transferId;
                        // Skip if this ledger entry corresponds to a Circle transaction
                        if (transferId && circleTxMap.has(transferId)) {
                          return false;
                        }
                        return true;
                      })
                      .map((entry) => ({
                        id: entry.id,
                        type: entry.type || 'transaction',
                        amount: entry.amount || 0,
                        description: entry.description || entry.type?.replace('_', ' ') || 'Transaction',
                        timestamp: entry.timestamp,
                        source: 'ledger' as const,
                      }));

                    // Map Circle transactions (using deduplicated list)
                    const circleTransactionsMapped = deduplicatedCircleTxs.map((tx: any, index: number) => {
                      // Log first few transactions for debugging
                      if (index < 3) {
                        console.log(`📋 Mapping Circle transaction ${index}:`, {
                          id: tx.id || tx.transactionId,
                          amounts: tx.amounts,
                          amount: tx.amount,
                          tokenAmounts: tx.tokenAmounts,
                          createDate: tx.createDate,
                          timestamp: tx.timestamp
                        });
                      }
                      // Determine transaction type from Circle transaction
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
                        state: tx.state || tx.status,
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
                    .slice(0, 20)
                    .map((transaction) => {
                      const Icon = getTransactionIcon(transaction.type);
                      const iconColor = getTransactionColor(transaction.type);
                      const amount = parseFloat(String(transaction.amount || '0'));
                      const isCredit = transaction.type === 'deposit' || transaction.type === 'yield_accrued';
                      const sign = isCredit ? '+' : '-';
                      const date = transaction.timestamp ? formatDistanceToNow(new Date(transaction.timestamp), { addSuffix: true }) : 'N/A';

                      return (
                        <div
                          key={`${transaction.source}-${transaction.id}`}
                          className="flex items-center justify-between p-3 rounded-xl hover:bg-muted/50 transition-colors glass"
                        >
                          <div className="flex items-center gap-3">
                            <div className={`h-10 w-10 rounded-full bg-muted flex items-center justify-center ${iconColor}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <p className="font-medium text-sm">
                                {transaction.description || transaction.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </p>
                              <p className="text-xs text-muted-foreground">{date}</p>
                              {transaction.source === 'circle' && (
                                <Badge variant="outline" className="text-xs mt-1">
                                  Circle
                                </Badge>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`font-semibold ${amount > 0 ? 'text-success' : 'text-foreground'}`}>
                              {sign}${Math.abs(amount).toFixed(2)}
                            </p>
                            <Badge variant="secondary" className="text-xs mt-1">
                              {transaction.type}
                            </Badge>
                          </div>
                        </div>
                      );
                    });
                    
                    return allTransactions;
                  })()}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="glass p-4 rounded-xl border-0">
            <p className="text-xs text-muted-foreground mb-1">Wallet Status</p>
            <p className="font-semibold">
              {wallet?.state === 'active' ? (
                <Badge className="bg-success/10 text-success border-0">Active</Badge>
              ) : (
                <Badge variant="outline">Inactive</Badge>
              )}
            </p>
          </Card>
          <Card className="glass p-4 rounded-xl border-0">
            <p className="text-xs text-muted-foreground mb-1">Total Transactions</p>
            <p className="font-semibold text-lg">{entries.length + circleTransactions.length}</p>
          </Card>
          <Card className="glass p-4 rounded-xl border-0">
            <p className="text-xs text-muted-foreground mb-1">Currency</p>
            <p className="font-semibold">USDC</p>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Wallet;

