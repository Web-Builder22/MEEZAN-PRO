import { 
  Customer, 
  Supplier, 
  Transaction, 
  CashBookEntry, 
  StockItem, 
  Invoice, 
  FinancialStats,
  User
} from './types';

// Simple API helper that handles Authorization header
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

// Handle response or throw clean error messages, resolving unauthorized session errors
const handleResponse = async (res: Response, defaultMessage: string) => {
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    try {
      const err = await res.json();
      throw new Error(err.error || defaultMessage);
    } catch {
      throw new Error(defaultMessage);
    }
  }
  return res.json();
};

export const api = {
  // Auth
  async firebaseLogin(payload: { email: string; name?: string; uid?: string; role?: string; businessName?: string }): Promise<User> {
    const res = await fetch('/api/auth/firebase-login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Firebase sync failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  async login(credentials: any): Promise<User> {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Login failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  async signup(profile: any): Promise<User> {
    const res = await fetch('/api/auth/signup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Registration failed');
    }
    const data = await res.json();
    localStorage.setItem('token', data.token);
    return data;
  },

  async forgotPassword(email: string): Promise<string> {
    const res = await fetch('/api/auth/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Requested account not found');
    }
    const data = await res.json();
    return data.message;
  },

  // Dashboard
  async getStats(): Promise<FinancialStats> {
    const res = await fetch('/api/dashboard/stats', { headers: getHeaders() });
    return handleResponse(res, 'Failed to fetch financial metrics');
  },

  async getAnalytics(): Promise<any> {
    const res = await fetch('/api/dashboard/analytics', { headers: getHeaders() });
    return handleResponse(res, 'Failed to fetch analytics');
  },

  // Customers (Udhaar)
  async getCustomers(): Promise<Customer[]> {
    const res = await fetch('/api/customers', { headers: getHeaders() });
    return handleResponse(res, 'Failed to load customers');
  },

  async createCustomer(payload: any): Promise<Customer> {
    const res = await fetch('/api/customers', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to add customer');
  },

  async updateCustomer(id: string, payload: any): Promise<Customer> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to edit customer profile');
  },

  async deleteCustomer(id: string): Promise<any> {
    const res = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res, 'Delete customer operation was forbidden');
  },

  // Suppliers (Payables)
  async getSuppliers(): Promise<Supplier[]> {
    const res = await fetch('/api/suppliers', { headers: getHeaders() });
    return handleResponse(res, 'Failed to load suppliers');
  },

  async createSupplier(payload: any): Promise<Supplier> {
    const res = await fetch('/api/suppliers', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to add supplier');
  },

  async deleteSupplier(id: string): Promise<any> {
    const res = await fetch(`/api/suppliers/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res, 'Permission denied to delete supplier');
  },

  // Credit / Debit Transactions
  async getTransactions(customerId?: string): Promise<Transaction[]> {
    const url = customerId ? `/api/transactions?customerId=${encodeURIComponent(customerId)}` : '/api/transactions';
    const res = await fetch(url, { headers: getHeaders() });
    return handleResponse(res, 'Failed to load transaction ledger');
  },

  async createTransaction(payload: any): Promise<any> {
    const res = await fetch('/api/transactions', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to register ledger entry');
  },

  async updateTransaction(id: string, payload: any): Promise<any> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to update transaction');
  },

  async deleteTransaction(id: string): Promise<any> {
    const res = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to rollback transaction');
  },

  // Cash Book
  async getCashbook(): Promise<CashBookEntry[]> {
    const res = await fetch('/api/cashbook', { headers: getHeaders() });
    return handleResponse(res, 'Failed to load cashbook entries');
  },

  async createCashEntry(payload: any): Promise<CashBookEntry> {
    const res = await fetch('/api/cashbook', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error('Failed to log cashbook change');
    return res.json();
  },

  async deleteCashEntry(id: string): Promise<any> {
    const res = await fetch(`/api/cashbook/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res, 'Forbidden: Cashbook deletion restricted');
  },

  // Inventory Stock
  async getInventory(): Promise<StockItem[]> {
    const res = await fetch('/api/inventory', { headers: getHeaders() });
    return handleResponse(res, 'Failed to query inventory log');
  },

  async createStockItem(payload: any): Promise<StockItem> {
    const res = await fetch('/api/inventory', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to create stock record');
  },

  async updateStockItem(id: string, payload: any): Promise<StockItem> {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to adjust stock properties');
  },

  async deleteStockItem(id: string): Promise<any> {
    const res = await fetch(`/api/inventory/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    return handleResponse(res, 'Forbidden: Staff cannot delete stock lines');
  },

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    const res = await fetch('/api/invoices', { headers: getHeaders() });
    return handleResponse(res, 'Failed to fetch invoice history');
  },

  async createInvoice(payload: any): Promise<Invoice> {
    const res = await fetch('/api/invoices', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    return handleResponse(res, 'Failed to dispatch invoice builder');
  },


  // Database Backup & Safety Snapshot API
  async getBackups(): Promise<any[]> {
    const res = await fetch('/api/backups', { headers: getHeaders() });
    return handleResponse(res, 'Failed to fetch backups list');
  },

  async createBackup(label: string): Promise<any> {
    const res = await fetch('/api/backups/create', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ label })
    });
    return handleResponse(res, 'Failed to create backup snapshot');
  },

  async restoreBackup(id: string): Promise<any> {
    const res = await fetch(`/api/backups/restore/${id}`, {
      method: 'POST',
      headers: getHeaders()
    });
    return handleResponse(res, 'Failed to restore backup snapshot');
  },

  async uploadBackup(backupData: any): Promise<any> {
    const res = await fetch('/api/backups/upload', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ backupData })
    });
    return handleResponse(res, 'Failed to import backup file');
  }
};
