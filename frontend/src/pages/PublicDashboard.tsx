import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingDown, TrendingUp, Clock, CheckCircle2, Loader2 } from "lucide-react";
import { publicAPI } from "@/lib/api-client";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import HamburgerMenu from "@/components/HamburgerMenu";

const PublicDashboard = () => {
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();
  const [kpis, setKpis] = useState<any[]>([]);
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [kpisResponse, statusResponse] = await Promise.all([
        publicAPI.getCorridorKPIs(),
        publicAPI.getSystemStatus(),
      ]);

      if (kpisResponse.success) {
        setKpis(kpisResponse.kpis || []);
      }

      if (statusResponse.success) {
        setStatus(statusResponse.status);
      }
    } catch (error: any) {
      console.error('Failed to load dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return secs > 0 ? `${minutes}m ${secs}s` : `${minutes}m`;
  };

  const formatSuccessRate = (rate: number): string => {
    return `${(rate * 100).toFixed(1)}%`;
  };

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
        <div className="flex items-start justify-between">
          <div>
            <Badge className="mb-4 bg-success/10 text-success border-0">
              Live Status
            </Badge>
            <h1 className="text-3xl md:text-4xl font-bold mb-2">Public Reliability Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time transparency on costs, delivery times, and success rates
            </p>
          </div>
          {isAuthenticated && <HamburgerMenu />}
        </div>

        {/* System Status */}
        <Card className="glass-strong p-6 rounded-2xl border-0">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : status ? (
            <>
              <div className="flex items-center gap-3 mb-4">
                <div className={`h-3 w-3 rounded-full ${
                  status.status === 'operational' ? 'bg-success animate-pulse-glow' :
                  status.status === 'degraded' ? 'bg-warning' : 'bg-destructive'
                }`} />
                <h3 className="text-lg font-semibold capitalize">
                  {status.status === 'operational' ? 'All Systems Operational' :
                   status.status === 'degraded' ? 'System Degraded' : 'System Down'}
                </h3>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Overall Uptime</p>
                  <p className="text-3xl font-bold">{status.uptime?.toFixed(2) || '0'}%</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Active Corridors</p>
                  <p className="text-3xl font-bold">{status.corridors?.total || 0}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground mb-1">Operational PSPs</p>
                  <p className="text-3xl font-bold">{status.psp?.operational || 0}</p>
                </div>
              </div>
            </>
          ) : null}
        </Card>

        {/* Corridor KPIs */}
        <div>
          <h2 className="text-2xl font-bold mb-4">Corridor Performance</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : kpis.length === 0 ? (
            <Card className="glass p-6 rounded-2xl border-0">
              <p className="text-muted-foreground text-center">No corridor data available yet</p>
            </Card>
          ) : (
            <div className="grid gap-4">
              {kpis.map((kpi, index) => (
                <Card key={index} className="glass p-6 rounded-2xl border-0">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="text-xl font-bold mb-1">{kpi.corridor}</h3>
                      <p className="text-sm text-muted-foreground">
                        {kpi.from} → {kpi.to}
                      </p>
                      {kpi.costBreakdown && (
                        <p className="text-xs text-muted-foreground mt-1">
                          Avg Fee: ${kpi.costBreakdown.averageFees?.toFixed(2) || '0.00'} | 
                          Avg Spread: ${kpi.costBreakdown.averageSpread?.toFixed(2) || '0.00'}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-6">
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <span className="text-sm">All-in Cost (on $200)</span>
                      </div>
                      <p className="text-2xl font-bold">
                        ${kpi.metrics?.allInCost200?.toFixed(2) || '0.00'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <Clock className="h-4 w-4" />
                        <span className="text-sm">Median Delivery</span>
                      </div>
                      <p className="text-2xl font-bold">
                        {kpi.metrics?.medianDelivery ? formatTime(kpi.metrics.medianDelivery) : 'N/A'}
                      </p>
                    </div>
                    <div>
                      <div className="flex items-center gap-2 text-muted-foreground mb-2">
                        <CheckCircle2 className="h-4 w-4" />
                        <span className="text-sm">Success Rate</span>
                      </div>
                      <p className="text-2xl font-bold text-success">
                        {kpi.metrics?.successRate ? formatSuccessRate(kpi.metrics.successRate) : '0%'}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {kpi.metrics?.successfulExecutions || 0} / {kpi.metrics?.totalExecutions || 0} successful
                      </p>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Additional Info */}
        <Card className="glass p-6 rounded-2xl border-0">
          <h3 className="font-semibold mb-2">About This Dashboard</h3>
          <p className="text-sm text-muted-foreground">
            This public dashboard provides real-time transparency into AilaBank's cross-border payment performance. 
            All metrics are updated every 5 minutes and reflect actual transaction data. Our best-execution guarantee 
            ensures you always get the most competitive rates available.
          </p>
        </Card>
      </div>
    </div>
  );
};

export default PublicDashboard;
