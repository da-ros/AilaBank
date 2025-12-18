import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wallet, Eye, EyeOff, TrendingUp, Loader2, RefreshCw } from "lucide-react";
import { useState } from "react";
import { useWallet } from "@/hooks/useWallet";
import { useLedger } from "@/hooks/useLedger";

const BalanceCard = () => {
  const [showBalance, setShowBalance] = useState(true);
  const { usdcBalance, loading: walletLoading, loadBalance } = useWallet();
  const { stats, loading: ledgerLoading } = useLedger();

  // Prioritize actual wallet balance from Circle over ledger stats
  // This ensures we show the real blockchain balance (including faucet tokens)
  // Use nullish coalescing (??) instead of || to allow 0 values from Circle
  // Only fall back to ledger if Circle balance is undefined/null (not loaded yet)
  const totalBalance = usdcBalance !== undefined && usdcBalance !== null 
    ? usdcBalance 
    : (stats?.currentBalance ?? 0);
  const walletBalance = usdcBalance !== undefined && usdcBalance !== null 
    ? usdcBalance 
    : (stats?.breakdown?.byAccount?.wallet ?? 0);
  const yieldPoolBalance = stats?.breakdown?.byAccount?.yield_pool ?? 0;
  const bufferBalance = stats?.breakdown?.byAccount?.buffer ?? 0;
  const yieldEarned = stats?.totalYield ?? 0;

  const isLoading = walletLoading || ledgerLoading;

  return (
    <Card className="glass-strong p-8 rounded-3xl border-0 relative overflow-hidden">
      {/* Background Gradient Accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl from-primary/20 to-transparent rounded-full blur-3xl" />
      
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
              <Wallet className="h-6 w-6 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Total Balance</p>
              <p className="text-xs text-muted-foreground">USDC in Circle Wallet</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadBalance()}
              disabled={walletLoading}
              className="rounded-full"
              title="Refresh balance"
            >
              <RefreshCw className={`h-4 w-4 ${walletLoading ? 'animate-spin' : ''}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setShowBalance(!showBalance)}
              className="rounded-full"
            >
              {showBalance ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
            </Button>
          </div>
        </div>

        <div className="mb-6">
          {isLoading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="text-lg text-muted-foreground">Loading balance...</span>
            </div>
          ) : showBalance ? (
            <>
              <h2 className="text-5xl md:text-6xl font-bold mb-2">
                ${totalBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </h2>
              {yieldEarned > 0 && (
                <div className="flex items-center gap-2 text-success">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    +${yieldEarned.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} yield earned
                  </span>
                </div>
              )}
            </>
          ) : (
            <h2 className="text-5xl md:text-6xl font-bold mb-2">••••••</h2>
          )}
        </div>

        {/* Account Breakdown */}
        <div className="grid grid-cols-3 gap-4 pt-6 border-t border-border/50">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Wallet</p>
            <p className="text-lg font-semibold">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin inline" />
              ) : showBalance ? (
                `$${walletBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : (
                '••••'
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Yield Pool</p>
            <p className="text-lg font-semibold">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin inline" />
              ) : showBalance ? (
                `$${yieldPoolBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : (
                '••••'
              )}
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Buffer</p>
            <p className="text-lg font-semibold">
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin inline" />
              ) : showBalance ? (
                `$${bufferBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              ) : (
                '••••'
              )}
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
};

export default BalanceCard;
