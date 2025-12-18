import { useState, useEffect } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, CreditCard, Plus, Loader2, CheckCircle2, XCircle, Clock } from "lucide-react";
import { merchantAPI } from "@/lib/api-client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import HamburgerMenu from "@/components/HamburgerMenu";

const Merchant = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [subscriptions, setSubscriptions] = useState<any[]>([]);
  const [activeTab, setActiveTab] = useState("invoices");

  // Invoice form state
  const [invoiceForm, setInvoiceForm] = useState({
    customerId: "",
    amount: "",
    currency: "USDC",
    description: "",
  });

  // Subscription form state
  const [subscriptionForm, setSubscriptionForm] = useState({
    planId: "",
    customerId: "",
  });

  useEffect(() => {
    if (user) {
      loadInvoices();
      loadSubscriptions();
    }
  }, [user]);

  const loadInvoices = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const response = await merchantAPI.getInvoices();
      if (response.success && response.invoices) {
        setInvoices(response.invoices);
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to load invoices",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSubscriptions = async () => {
    if (!user) return;
    try {
      const response = await merchantAPI.getSubscriptions();
      if (response.success && response.subscriptions) {
        setSubscriptions(response.subscriptions);
      }
    } catch (error: any) {
      console.error('Failed to load subscriptions:', error);
    }
  };

  const handleCreateInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const response = await merchantAPI.createInvoice(
        invoiceForm.customerId,
        parseFloat(invoiceForm.amount),
        invoiceForm.currency,
        invoiceForm.description
      );
      if (response.success) {
        toast({
          title: "Success",
          description: "Invoice created successfully",
        });
        setInvoiceForm({ customerId: "", amount: "", currency: "USDC", description: "" });
        loadInvoices();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePayInvoice = async (invoiceId: string) => {
    if (!user) return;

    setLoading(true);
    try {
      const response = await merchantAPI.payInvoice(invoiceId);
      if (response.success) {
        toast({
          title: "Success",
          description: "Invoice paid successfully",
        });
        loadInvoices();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to pay invoice",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, { variant: "default" | "secondary" | "destructive" | "outline"; icon: any }> = {
      paid: { variant: "default", icon: CheckCircle2 },
      pending: { variant: "secondary", icon: Clock },
      cancelled: { variant: "destructive", icon: XCircle },
      draft: { variant: "outline", icon: FileText },
    };

    const config = variants[status] || variants.pending;
    const Icon = config.icon;

    return (
      <Badge variant={config.variant} className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {status}
      </Badge>
    );
  };

  return (
    <div className="min-h-screen p-4 md:p-8">
      <div className="max-w-7xl mx-auto space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl md:text-4xl font-bold">Merchant Toolkit</h1>
            <p className="text-muted-foreground mt-1">Manage invoices, subscriptions, and payments</p>
          </div>
          <HamburgerMenu />
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="invoices">Invoices</TabsTrigger>
            <TabsTrigger value="subscriptions">Subscriptions</TabsTrigger>
          </TabsList>

          <TabsContent value="invoices" className="space-y-6">
            {/* Create Invoice Form */}
            <Card className="glass-strong p-6 rounded-2xl border-0">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Create Invoice</h3>
              </div>
              <form onSubmit={handleCreateInvoice} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Customer ID</Label>
                    <Input
                      value={invoiceForm.customerId}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, customerId: e.target.value })}
                      required
                      className="glass mt-1.5 rounded-xl border-0"
                      placeholder="customer-user-id"
                    />
                  </div>
                  <div>
                    <Label>Amount</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={invoiceForm.amount}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, amount: e.target.value })}
                      required
                      className="glass mt-1.5 rounded-xl border-0"
                      placeholder="100.00"
                    />
                  </div>
                  <div>
                    <Label>Currency</Label>
                    <Input
                      value={invoiceForm.currency}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, currency: e.target.value })}
                      required
                      className="glass mt-1.5 rounded-xl border-0"
                      placeholder="USDC"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <Label>Description</Label>
                    <Input
                      value={invoiceForm.description}
                      onChange={(e) => setInvoiceForm({ ...invoiceForm, description: e.target.value })}
                      required
                      className="glass mt-1.5 rounded-xl border-0"
                      placeholder="Invoice description"
                    />
                  </div>
                </div>
                <Button type="submit" disabled={loading} className="w-full md:w-auto">
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Invoice
                    </>
                  )}
                </Button>
              </form>
            </Card>

            {/* Invoices List */}
            <Card className="glass-strong p-6 rounded-2xl border-0">
              <h3 className="text-lg font-semibold mb-4">Invoices</h3>
              {loading && invoices.length === 0 ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : invoices.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No invoices yet</p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {invoices.map((invoice) => (
                      <TableRow key={invoice.id}>
                        <TableCell className="font-medium">{invoice.invoiceNumber || invoice.id.slice(0, 8)}</TableCell>
                        <TableCell>{invoice.customerId?.slice(0, 8) || 'N/A'}...</TableCell>
                        <TableCell>
                          {invoice.amount?.toFixed(2) || '0.00'} {invoice.currency || 'USDC'}
                        </TableCell>
                        <TableCell>{getStatusBadge(invoice.status || 'draft')}</TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {invoice.createdAt ? formatDistanceToNow(new Date(invoice.createdAt), { addSuffix: true }) : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {invoice.status === 'sent' && (
                            <Button
                              size="sm"
                              onClick={() => handlePayInvoice(invoice.id)}
                              disabled={loading}
                            >
                              Pay
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </Card>
          </TabsContent>

          <TabsContent value="subscriptions" className="space-y-6">
            <Card className="glass-strong p-6 rounded-2xl border-0">
              <h3 className="text-lg font-semibold mb-4">Subscriptions</h3>
              {subscriptions.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No subscriptions yet</p>
              ) : (
                <div className="space-y-4">
                  {subscriptions.map((sub) => (
                    <Card key={sub.id} className="glass p-4 rounded-xl border-0">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{sub.planId || 'Plan'}</p>
                          <p className="text-sm text-muted-foreground">
                            Customer: {sub.customerId?.slice(0, 8) || 'N/A'}...
                          </p>
                        </div>
                        {getStatusBadge(sub.status || 'active')}
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Merchant;

