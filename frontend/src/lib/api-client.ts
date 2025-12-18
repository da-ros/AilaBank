/**
 * API Client for AilaBank Backend
 * Centralized API communication with error handling and authentication
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api/v1';

// Get auth token from localStorage
export const getAuthToken = (): string | null => {
  return localStorage.getItem('aila_token');
};

// Set auth token
export const setAuthToken = (token: string): void => {
  localStorage.setItem('aila_token', token);
};

// Remove auth token
export const removeAuthToken = (): void => {
  localStorage.removeItem('aila_token');
};

// API request helper
async function apiRequest<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = getAuthToken();
  
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || error.message || `HTTP ${response.status}`);
  }

  return response.json();
}

// Auth API
export const authAPI = {
  signup: async (email: string, password: string, address?: string) => {
    return apiRequest<{ user: any; session: any; message: string }>('/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ email, password, address }),
    });
  },

  login: async (email: string, password: string) => {
    const response = await apiRequest<{ user: any; session: { access_token: string } }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    
    if (response.session?.access_token) {
      setAuthToken(response.session.access_token);
    }
    
    return response;
  },

  logout: () => {
    removeAuthToken();
  },
};

// Circle Wallet API
export const walletAPI = {
  getWallet: async () => {
    return apiRequest<{ success: boolean; wallet: any }>('/circle/wallet');
  },

  createWallet: async (address?: string) => {
    return apiRequest<{ success: boolean; wallet: any }>('/circle/wallet/create', {
      method: 'POST',
      body: JSON.stringify({ address }),
    });
  },

  getBalance: async () => {
    return apiRequest<{ success: boolean; balances: Array<{ amount: string; currency: string }> }>('/circle/wallet/balance');
  },

  getTransactions: async (limit: number = 50) => {
    return apiRequest<{ success: boolean; transactions: any[]; count: number }>(`/circle/wallet/transactions?limit=${limit}`);
  },

  createDepositAddress: async () => {
    return apiRequest<{ success: boolean; address: string; chain: string }>('/circle/wallet/deposit-address', {
      method: 'POST',
    });
  },

  transferToArc: async (destinationAddress: string, amount: string) => {
    return apiRequest<{ success: boolean; transfer: any }>('/circle/transfer/arc', {
      method: 'POST',
      body: JSON.stringify({ destinationAddress, amount }),
    });
  },
};

// Intent API
export const intentAPI = {
  processIntent: async (
    audioBlob?: Blob, 
    text?: string, 
    userId?: string, 
    locale: string = 'en',
    onTranscript?: (transcript: string) => void
  ) => {
    const formData = new FormData();
    
    if (audioBlob) {
      formData.append('audio', audioBlob, 'audio.webm');
    }
    if (text) {
      formData.append('text', text);
    }
    if (userId) {
      formData.append('userId', userId);
    }
    formData.append('locale', locale);
    
    // Enable streaming if transcript callback is provided
    if (onTranscript && audioBlob) {
      formData.append('stream', 'true');
    }

    const token = getAuthToken();
    const headers: HeadersInit = {};
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    // If streaming is enabled, use EventSource-like approach with fetch
    if (onTranscript && audioBlob) {
      const response = await fetch(`${API_BASE_URL}/intent`, {
        method: 'POST',
        headers,
        body: formData,
      });

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(error.error || error.message || `HTTP ${response.status}`);
      }

      // Read streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let finalResult: any = null;

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || ''; // Keep incomplete line in buffer

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.type === 'transcript' && data.transcript) {
                  // Call transcript callback immediately
                  onTranscript(data.transcript);
                } else if (data.type === 'complete') {
                  // Store final result
                  finalResult = data;
                } else if (data.type === 'error') {
                  throw new Error(data.error || 'Intent processing failed');
                }
              } catch (e) {
                console.error('Error parsing SSE data:', e);
              }
            }
          }
        }
      }

      if (!finalResult) {
        throw new Error('No result received from streaming response');
      }

      return finalResult;
    }

    // Non-streaming mode (original behavior)
    const response = await fetch(`${API_BASE_URL}/intent`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(error.error || error.message || `HTTP ${response.status}`);
    }

    return response.json();
  },
};

// FX Quotes API
export const quotesAPI = {
  getQuote: async (from: string, to: string, amount: number, corridor?: string) => {
    const params = new URLSearchParams({
      from,
      to,
      amount: amount.toString(),
    });
    if (corridor) params.append('corridor', corridor);
    
    return apiRequest<{ success: boolean; quote: any }>(`/quotes?${params.toString()}`);
  },

  getAllQuotes: async (from: string, to: string, amount: number, corridor?: string) => {
    const params = new URLSearchParams({
      from,
      to,
      amount: amount.toString(),
      all: 'true',
    });
    if (corridor) params.append('corridor', corridor);
    
    return apiRequest<{ success: boolean; quotes: any[]; best: any }>(`/quotes?${params.toString()}`);
  },
};

// Route Selection API
export const routesAPI = {
  chooseRoute: async (from: string, to: string, amount: number, corridor: string, userId?: string, metadata?: any) => {
    return apiRequest<{ success: boolean; route: any }>('/route/choose', {
      method: 'POST',
      body: JSON.stringify({ from, to, amount, corridor, userId, metadata }),
    });
  },

  getCorridors: async () => {
    return apiRequest<{ success: boolean; corridors: string[]; count: number }>('/route/corridors');
  },

  getPSPs: async () => {
    return apiRequest<{ success: boolean; psps: any[]; count: number }>('/route/psps');
  },
};

// Receipts API
export const receiptsAPI = {
  createReceipt: async (quoteSet: any, chosenRoute: any, fx: any, fees: any, spread: any, userId?: string) => {
    return apiRequest<{ success: boolean; receipt: any }>('/receipts/best-exec', {
      method: 'POST',
      body: JSON.stringify({ quoteSet, chosenRoute, fx, fees, spread, userId }),
    });
  },

  getReceipt: async (receiptId: string) => {
    return apiRequest<{ success: boolean; receipt: any }>(`/receipts/${receiptId}`);
  },
};

// Ledger API
export const ledgerAPI = {
  getStats: async (userId?: string, startDate?: string, endDate?: string) => {
    const params = new URLSearchParams();
    if (userId) params.append('userId', userId);
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    
    return apiRequest<{ success: boolean; stats: any }>(`/ledger/stats?${params.toString()}`);
  },

  getUserLedger: async (userId: string, page: number = 1, limit: number = 50, entryType?: string, startDate?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (entryType) params.append('entryType', entryType);
    if (startDate) params.append('startDate', startDate);
    
    return apiRequest<{ success: boolean; entries: any[]; pagination: any }>(`/ledger/user/${userId}?${params.toString()}`);
  },

  getMyLedger: async (page: number = 1, limit: number = 50, entryType?: string, startDate?: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (entryType) params.append('entryType', entryType);
    if (startDate) params.append('startDate', startDate);
    
    return apiRequest<{ success: boolean; entries: any[]; pagination: any }>(`/ledger?${params.toString()}`);
  },
};

// Merchant API
export const merchantAPI = {
  // Invoices
  createInvoice: async (customerId: string, amount: number, currency: string, description: string, lineItems?: any[], dueDate?: string, metadata?: any) => {
    return apiRequest<{ success: boolean; invoice: any }>('/merchant/invoices', {
      method: 'POST',
      body: JSON.stringify({ customerId, amount, currency, description, lineItems, dueDate, metadata }),
    });
  },

  getInvoice: async (invoiceId: string) => {
    return apiRequest<{ success: boolean; invoice: any }>(`/merchant/invoices/${invoiceId}`);
  },

  getInvoices: async (status?: string, page: number = 1, limit: number = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
    return apiRequest<{ success: boolean; invoices: any[]; pagination: any }>(`/merchant/invoices?${params.toString()}`);
  },

  payInvoice: async (invoiceId: string) => {
    return apiRequest<{ success: boolean; invoice: any }>(`/merchant/invoices/${invoiceId}/pay`, {
      method: 'POST',
    });
  },

  refundInvoice: async (invoiceId: string, amount?: number) => {
    return apiRequest<{ success: boolean; invoice: any }>(`/merchant/invoices/${invoiceId}/refund`, {
      method: 'POST',
      body: JSON.stringify({ amount }),
    });
  },

  // Subscriptions
  createPlan: async (name: string, amount: number, currency: string, interval: string, description?: string) => {
    return apiRequest<{ success: boolean; plan: any }>('/merchant/subscriptions/plans', {
      method: 'POST',
      body: JSON.stringify({ name, amount, currency, interval, description }),
    });
  },

  subscribe: async (planId: string, customerId: string) => {
    return apiRequest<{ success: boolean; subscription: any }>('/merchant/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ planId, customerId }),
    });
  },

  getSubscriptions: async (status?: string, page: number = 1, limit: number = 50) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) params.append('status', status);
    
    return apiRequest<{ success: boolean; subscriptions: any[]; pagination: any }>(`/merchant/subscriptions?${params.toString()}`);
  },

  cancelSubscription: async (subscriptionId: string) => {
    return apiRequest<{ success: boolean; subscription: any }>(`/merchant/subscriptions/${subscriptionId}/cancel`, {
      method: 'POST',
    });
  },
};

// Public Dashboard API
export const publicAPI = {
  getCorridorKPIs: async (corridor?: string) => {
    const params = corridor ? new URLSearchParams({ corridor }) : new URLSearchParams();
    return apiRequest<{ success: boolean; kpis?: any[]; kpi?: any; count?: number }>(`/public/kpi/corridors?${params.toString()}`);
  },

  getSystemStatus: async () => {
    return apiRequest<{ success: boolean; status: any }>('/public/status');
  },
};

// Treasury API
export const treasuryAPI = {
  runRateSweep: async (dryRun: boolean = false) => {
    return apiRequest<{ success: boolean; result: any }>(`/ratesweep/run?dryRun=${dryRun}`, {
      method: 'POST',
    });
  },

  getPolicies: async () => {
    return apiRequest<{ success: boolean; policies: any[] }>('/treasury/policies');
  },

  createPolicy: async (policy: any) => {
    return apiRequest<{ success: boolean; policy: any }>('/treasury/policies', {
      method: 'POST',
      body: JSON.stringify(policy),
    });
  },

  getBalances: async () => {
    return apiRequest<{ success: boolean; balances: any; idleBalances: any[] }>('/treasury/balances');
  },
};

