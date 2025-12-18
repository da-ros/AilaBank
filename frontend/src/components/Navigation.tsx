import { NavLink } from "@/components/NavLink";
import { Home, ArrowUpRight, FileText, BarChart3, LogIn, Wallet } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";

const Navigation = () => {
  const { isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  
  const navItems = [
    { to: "/dashboard", icon: Home, label: "Home" },
    { to: "/wallet", icon: Wallet, label: "Wallet" },
    { to: "/transfer", icon: ArrowUpRight, label: "Transfer" },
    { to: "/merchant", icon: FileText, label: "Merchant" },
    { to: "/public", icon: BarChart3, label: "KPIs" },
  ];

  return (
    <>
      {/* Mobile Navigation - Bottom */}
      <nav className="fixed bottom-0 left-0 right-0 glass-strong border-t border-border/50 md:hidden z-50">
        <div className="flex items-center justify-around p-2">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className="flex flex-col items-center gap-1 p-2 rounded-xl transition-colors"
              activeClassName="text-primary bg-primary/10"
            >
              <item.icon className="h-5 w-5" />
              <span className="text-xs">{item.label}</span>
            </NavLink>
          ))}
          {!isAuthenticated && (
            <Button
              variant="ghost"
              onClick={() => navigate("/auth")}
              className="flex flex-col items-center gap-1 p-2 rounded-xl"
            >
              <LogIn className="h-5 w-5" />
              <span className="text-xs">Login</span>
            </Button>
          )}
        </div>
      </nav>

      {/* Desktop Navigation - Sidebar */}
      <nav className="hidden md:flex fixed left-0 top-0 bottom-0 w-20 glass-strong border-r border-border/50 z-50 flex-col items-center py-6 gap-4">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className="flex flex-col items-center gap-2 p-3 rounded-xl transition-colors hover:bg-primary/10"
            activeClassName="text-primary bg-primary/10"
            title={item.label}
          >
            <item.icon className="h-6 w-6" />
            <span className="text-xs">{item.label}</span>
          </NavLink>
        ))}
        {!isAuthenticated && (
          <Button
            variant="ghost"
            onClick={() => navigate("/auth")}
            className="flex flex-col items-center gap-2 p-3 rounded-xl"
            title="Login"
          >
            <LogIn className="h-6 w-6" />
            <span className="text-xs">Login</span>
          </Button>
        )}
      </nav>
    </>
  );
};

export default Navigation;
