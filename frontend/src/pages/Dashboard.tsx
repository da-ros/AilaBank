import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Mic, Send, ArrowUpRight, ArrowDownLeft, RefreshCw, TrendingUp, Wallet } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import VoiceInterface from "@/components/VoiceInterface";
import BalanceCard from "@/components/BalanceCard";
import QuickActions from "@/components/QuickActions";
import RecentTransactions from "@/components/RecentTransactions";
import { useLedger } from "@/hooks/useLedger";
import HamburgerMenu from "@/components/HamburgerMenu";

const Dashboard = () => {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  const { stats } = useLedger();
  const [showVoiceInterface, setShowVoiceInterface] = useState(false);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">Welcome to AilaBank</h1>
            <p className="text-muted-foreground mt-1">Your AI-powered stablecoin bank</p>
          </div>
          <div className="flex items-center gap-3">
            <Button
              onClick={() => setShowVoiceInterface(!showVoiceInterface)}
              className="glass-strong rounded-full h-14 w-14 md:h-16 md:w-16 p-0 hover:scale-105"
            >
              <Mic className={`h-6 w-6 ${showVoiceInterface ? 'animate-pulse-glow' : ''}`} />
            </Button>
            <HamburgerMenu />
          </div>
        </div>

        {/* Voice Interface */}
        {showVoiceInterface && (
          <div className="animate-slide-up">
            <VoiceInterface onClose={() => setShowVoiceInterface(false)} />
          </div>
        )}

        {/* Balance Card */}
        <BalanceCard />

        {/* Quick Actions */}
        <QuickActions />

        {/* Recent Activity */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RecentTransactions />
          
          {/* Yield Summary */}
          <Card className="glass p-6 rounded-2xl border-0">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Yield Earnings</h3>
              <TrendingUp className="h-5 w-5 text-success" />
            </div>
            <div className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground">Total Earned</p>
                <p className="text-3xl font-bold text-success">
                  ${stats?.totalYield?.toFixed(2) || '0.00'}
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-border/50">
                <div>
                  <p className="text-sm text-muted-foreground">Total Deposits</p>
                  <p className="text-xl font-semibold">
                    ${stats?.totalDeposits?.toFixed(2) || '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Total Withdrawals</p>
                  <p className="text-xl font-semibold">
                    ${stats?.totalWithdrawals?.toFixed(2) || '0.00'}
                  </p>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline" onClick={() => navigate("/transfer")}>
                View Details
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
