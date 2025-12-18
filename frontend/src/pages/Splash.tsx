import { Button } from "@/components/ui/button";
import { ArrowRight, Mic, Globe, Shield, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

const Splash = () => {
  const navigate = useNavigate();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      navigate("/dashboard");
    }
  }, [isAuthenticated, isLoading, navigate]);

  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Animated background blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-pulse-glow" />
        <div 
          className="absolute bottom-20 right-10 w-96 h-96 bg-accent/15 rounded-full blur-3xl animate-pulse-glow" 
          style={{ animationDelay: "1s" }} 
        />
      </div>

      {/* Header */}
      <header className="relative z-10 p-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg">
            <Zap className="w-6 h-6 text-foreground" />
          </div>
          <h1 className="text-2xl font-bold">AilaBank</h1>
        </div>
        <Button variant="ghost" onClick={() => navigate("/auth")} className="text-sm">
          Sign In
        </Button>
      </header>

      {/* Hero Section */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center">
        <div className="mb-8 inline-flex items-center gap-2 glass px-4 py-2 rounded-full text-sm animate-slide-up">
          <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
          Voice-First AI Banking
        </div>

        <h2 className="text-5xl md:text-7xl font-bold mb-6 animate-fade-in leading-tight">
          Banking at the
          <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-primary">
            Speed of Voice
          </span>
        </h2>

        <p 
          className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-12 animate-fade-in" 
          style={{ animationDelay: "0.2s" }}
        >
          Cross-border payments powered by AI and stablecoins. Say it, send it, done.
        </p>

        <div 
          className="flex flex-col sm:flex-row gap-4 animate-fade-in" 
          style={{ animationDelay: "0.4s" }}
        >
          <Button 
            size="lg" 
            onClick={() => navigate("/auth?tab=signup")}
            className="group gap-2 shadow-lg hover:shadow-xl transition-all"
          >
            Get Started
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button 
            size="lg" 
            variant="outline"
            onClick={() => navigate("/dashboard")}
            className="gap-2 glass-strong"
          >
            View Live KPIs
          </Button>
        </div>

        {/* Features Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 max-w-4xl w-full">
          {[
            {
              icon: Mic,
              title: "Voice-First",
              description: "Speak naturally. AI understands your intent and executes instantly."
            },
            {
              icon: Globe,
              title: "Global Transfers",
              description: "Send money anywhere. Best rates, transparent fees, instant settlement."
            },
            {
              icon: Shield,
              title: "Secure & Transparent",
              description: "Blockchain-backed. Every transaction is verifiable and auditable."
            }
          ].map((feature, i) => (
            <div 
              key={feature.title}
              className="glass p-6 rounded-2xl animate-slide-up hover:glass-strong transition-all cursor-default"
              style={{ animationDelay: `${0.6 + i * 0.1}s` }}
            >
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-4">
                <feature.icon className="w-6 h-6 text-primary" />
              </div>
              <h3 className="font-semibold text-lg mb-2">{feature.title}</h3>
              <p className="text-sm text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-6 text-center text-sm text-muted-foreground">
        <p>© 2025 AilaBank. Powered by Circle, Arc & AI.</p>
      </footer>
    </div>
  );
};

export default Splash;

