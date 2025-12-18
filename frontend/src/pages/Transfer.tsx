import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowRight, Info, CheckCircle2, Loader2, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { quotesAPI, routesAPI, receiptsAPI } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";
import HamburgerMenu from "@/components/HamburgerMenu";

const Transfer = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();
  const [amount, setAmount] = useState("");
  const [fromCurrency, setFromCurrency] = useState("USDC");
  const [toCurrency, setToCurrency] = useState("USDC");
  const [recipientAddress, setRecipientAddress] = useState("");
  const [corridor, setCorridor] = useState("USDC-US");
  const [quote, setQuote] = useState<any>(null);
  const [routes, setRoutes] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [loadingQuote, setLoadingQuote] = useState(false);
  const [loadingRoutes, setLoadingRoutes] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-update corridor when currencies change
  useEffect(() => {
    if (fromCurrency && toCurrency) {
      setCorridor(`${fromCurrency}-${toCurrency === 'USDC' ? 'US' : toCurrency}`);
    }
  }, [fromCurrency, toCurrency]);

  // Fetch quote when amount or currencies change (with debounce)
  useEffect(() => {
    if (!amount || parseFloat(amount) <= 0) {
      setQuote(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      fetchQuote();
    }, 500); // Debounce 500ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [amount, fromCurrency, toCurrency, corridor]);

  // Fetch example routes when currencies are selected (even without amount)
  useEffect(() => {
    if (!fromCurrency || !toCurrency || !user) {
      setRoutes([]);
      setSelectedRoute(null);
      return;
    }

    const timeoutId = setTimeout(() => {
      // If amount is entered, fetch routes with actual amount
      // Otherwise, fetch example routes with default amount of $100
      if (amount && parseFloat(amount) > 0) {
        if (quote) {
          fetchRoutes();
        }
      } else {
        // Fetch example routes with default amount
        fetchExampleRoutes();
      }
    }, 300); // Debounce 300ms

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fromCurrency, toCurrency, corridor, amount, quote, user]);

  const fetchQuote = async () => {
    if (!amount || parseFloat(amount) <= 0) return;

    setLoadingQuote(true);
    setError(null);
    try {
      const response = await quotesAPI.getQuote(
        fromCurrency,
        toCurrency,
        parseFloat(amount),
        corridor
      );
      if (response.success && response.quote) {
        setQuote(response.quote);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch quote');
      console.error('Quote error:', err);
    } finally {
      setLoadingQuote(false);
    }
  };

  const fetchRoutes = async (useAmount?: number) => {
    if (!user) return;
    
    const amountToUse = useAmount || (amount ? parseFloat(amount) : 100);
    if (amountToUse <= 0) return;

    setLoadingRoutes(true);
    setError(null);
    try {
      const response = await routesAPI.chooseRoute(
        fromCurrency,
        toCurrency,
        amountToUse,
        corridor,
        user.id,
        {
          recipientInfo: recipientAddress ? {
            address: recipientAddress,
          } : undefined,
        }
      );
      if (response.success && response.route) {
        const routeData = response.route;
        const allRoutes = [
          routeData.selectedRoute,
          ...(routeData.alternativeRoutes || []),
        ].map((route: any, index: number) => ({
          ...route,
          id: route.routeId || index,
          recommended: index === 0,
          cost: route.cost || 0,
          speed: route.speed || 0,
          reliability: route.reliability || 0,
          score: route.score || 0,
          isExample: !amount || parseFloat(amount) <= 0, // Mark as example if no amount entered
        }));
        setRoutes(allRoutes);
        if (allRoutes.length > 0) {
          setSelectedRoute(allRoutes[0]);
        }
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch routes');
      console.error('Routes error:', err);
    } finally {
      setLoadingRoutes(false);
    }
  };

  const fetchExampleRoutes = async () => {
    // Fetch routes with example amount of $100
    await fetchRoutes(100);
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  const handleTransfer = async () => {
    if (!selectedRoute || !amount || !user) {
      toast({
        title: "Error",
        description: "Please select a route and enter an amount",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create receipt
      const receiptResponse = await receiptsAPI.createReceipt(
        {
          quotes: quote ? [quote] : [],
          bestQuote: quote,
        },
        selectedRoute,
        quote ? {
          from: quote.from,
          to: quote.to,
          rate: quote.rate,
          convertedAmount: quote.convertedAmount,
        } : null,
        {
          total: selectedRoute.cost,
          breakdown: {
            route: selectedRoute.cost,
            fx: quote?.fees?.total || 0,
          },
        },
        {
          amount: quote?.spread || 0,
          percentage: quote ? ((quote.spread / quote.convertedAmount) * 100) : 0,
        },
        user.id
      );

      toast({
        title: "Transfer Initiated",
        description: `Receipt created: ${receiptResponse.receipt?.receiptId}`,
      });

      // Navigate to receipt or dashboard
      if (receiptResponse.receipt?.receiptId) {
        navigate(`/receipts/${receiptResponse.receipt.receiptId}`);
      } else {
        navigate("/");
      }
    } catch (err: any) {
      toast({
        title: "Transfer Failed",
        description: err.message || "Failed to initiate transfer",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Cross-Border Transfer</h1>
            <p className="text-muted-foreground mt-1">Send money globally with transparent pricing</p>
          </div>
          <HamburgerMenu />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Transfer Form */}
          <Card className="glass-strong p-6 rounded-2xl border-0">
            <h3 className="text-lg font-semibold mb-4">Transfer Details</h3>
            
            <div className="space-y-4">
              <div>
                <Label>From</Label>
                <Select value={fromCurrency} onValueChange={setFromCurrency}>
                  <SelectTrigger className="glass mt-1.5 rounded-xl border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC - USD Coin</SelectItem>
                    <SelectItem value="EUR">EUR - Euro</SelectItem>
                    <SelectItem value="GBP">GBP - British Pound</SelectItem>
                    <SelectItem value="USD">USD - US Dollar</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex justify-center">
                <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <ArrowRight className="h-5 w-5 text-primary" />
                </div>
              </div>

              <div>
                <Label>To</Label>
                <Select value={toCurrency} onValueChange={setToCurrency}>
                  <SelectTrigger className="glass mt-1.5 rounded-xl border-0">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="USDC">USDC - USD Coin</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Amount</Label>
                <Input
                  type="number"
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="glass mt-1.5 rounded-xl border-0 text-2xl font-semibold"
                />
              </div>

              <div>
                <Label>Recipient Address (Optional)</Label>
                <Input
                  placeholder="0x... or ENS name"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  className="glass mt-1.5 rounded-xl border-0"
                />
              </div>

              {loadingQuote && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Fetching quote...</span>
                </div>
              )}
            </div>
          </Card>

          {/* Quote Display */}
          {quote && (
            <Card className="glass-strong p-4 rounded-2xl border-0 mb-4">
              <h4 className="font-semibold mb-2">FX Quote</h4>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Rate</p>
                  <p className="font-semibold">{quote.rate?.toFixed(4) || 'N/A'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">You'll Receive</p>
                  <p className="font-semibold text-lg">
                    {quote.convertedAmount?.toFixed(2) || '0.00'} {toCurrency}
                  </p>
                </div>
                <div>
                  <p className="text-muted-foreground">Fees</p>
                  <p className="font-medium">${quote.fees?.total?.toFixed(2) || '0.00'}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Spread</p>
                  <p className="font-medium">{quote.spread?.toFixed(2) || '0.00'}%</p>
                </div>
              </div>
            </Card>
          )}

          {/* Route Selection */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Select Route</h3>
            
            {loadingRoutes ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-muted-foreground">Loading routes...</span>
              </div>
            ) : routes.length === 0 ? (
              <Card className="glass p-4 rounded-2xl border-0">
                <p className="text-muted-foreground text-center text-sm">
                  {loadingRoutes ? 'Loading routes...' : 'Select currencies to see available routes'}
                </p>
              </Card>
            ) : (
              <>
                {routes.map((route) => (
                  <Card
                    key={route.id}
                    onClick={() => setSelectedRoute(route)}
                    className={`glass p-4 rounded-2xl border-0 cursor-pointer hover:scale-[1.02] transition-transform ${
                      selectedRoute?.id === route.id ? 'ring-2 ring-primary' : ''
                    } ${route.recommended ? 'border-primary/50' : ''}`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        <span className="font-semibold">{route.psp?.name || route.provider || 'Unknown PSP'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {route.isExample && (
                          <Badge variant="outline" className="text-xs">
                            Example
                          </Badge>
                        )}
                        {route.recommended && (
                          <Badge className="bg-primary/10 text-primary border-0">
                            Recommended
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <p className="text-muted-foreground">
                          {route.isExample ? 'Est. Cost (on $100)' : 'Total Cost'}
                        </p>
                        <p className="font-semibold text-lg">${route.cost?.toFixed(2) || '0.00'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Delivery Time</p>
                        <p className="font-semibold">{route.speed ? formatTime(route.speed) : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Reliability</p>
                        <p className="font-medium">{(route.reliability * 100)?.toFixed(1) || '0'}%</p>
                      </div>
                      <div>
                        <p className="text-muted-foreground">Route Score</p>
                        <p className="font-medium">{(route.score * 100)?.toFixed(0) || '0'}/100</p>
                      </div>
                    </div>
                    {route.isExample && (
                      <p className="text-xs text-muted-foreground mt-2 italic">
                        * Costs shown are estimates for $100. Enter an amount to see actual pricing.
                      </p>
                    )}
                  </Card>
                ))}

                <div className="glass p-4 rounded-xl flex items-start gap-3">
                  <Info className="h-5 w-5 text-primary flex-shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Best Execution Guarantee</p>
                    <p className="text-muted-foreground text-xs">
                      We automatically select the best route based on cost, speed, and reliability. You'll receive a proof-of-execution receipt.
                    </p>
                  </div>
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Button
                  className="w-full h-12 text-base rounded-xl"
                  size="lg"
                  onClick={handleTransfer}
                  disabled={!selectedRoute || loading || !amount}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Continue Transfer"
                  )}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Transfer;
