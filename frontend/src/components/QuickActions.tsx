import { Button } from "@/components/ui/button";
import { ArrowDownLeft, ArrowUpRight, RefreshCw, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";

const QuickActions = () => {
  const navigate = useNavigate();
  
  const actions = [
    {
      icon: ArrowDownLeft,
      label: "Deposit",
      description: "Add funds",
      gradient: "from-success/20 to-success/5",
      onClick: () => navigate("/transfer"),
    },
    {
      icon: ArrowUpRight,
      label: "Send",
      description: "Transfer money",
      gradient: "from-primary/20 to-primary/5",
      onClick: () => navigate("/transfer"),
    },
    {
      icon: RefreshCw,
      label: "Exchange",
      description: "Convert currency",
      gradient: "from-accent/20 to-accent/5",
      onClick: () => navigate("/transfer"),
    },
    {
      icon: FileText,
      label: "Invoice",
      description: "Create invoice",
      gradient: "from-muted/40 to-muted/10",
      onClick: () => navigate("/merchant"),
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {actions.map((action, index) => (
        <Button
          key={index}
          onClick={action.onClick}
          className="glass h-auto p-6 flex-col gap-3 hover:scale-105 transition-transform rounded-2xl border-0"
          variant="outline"
        >
          <div className={`h-12 w-12 rounded-full bg-gradient-to-br ${action.gradient} flex items-center justify-center`}>
            <action.icon className="h-6 w-6" />
          </div>
          <div className="text-center">
            <p className="font-semibold">{action.label}</p>
            <p className="text-xs text-muted-foreground">{action.description}</p>
          </div>
        </Button>
      ))}
    </div>
  );
};

export default QuickActions;
