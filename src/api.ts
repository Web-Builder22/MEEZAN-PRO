import { 
  Customer, 
  Supplier, 
  Transaction, 
  CashBookEntry, 
  StockItem, 
  Invoice, 
  FinancialStats,
  User,
  UserRole
} from './types';
import { auth, db as firestoreDb, doc, getDoc, setDoc } from './firebase';

// Simple API helper that handles Authorization header
const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

interface SafeParsedResponse {
  ok: boolean;
  status: number;
  contentType: string;
  isJson: boolean;
  data: any;
  rawText: string;
}

/**
 * Safely reads and parses a Fetch Response without ever throwing
 * "SyntaxError: Failed to execute 'json' on 'Response': Unexpected end of JSON input"
 */
async function safeParseResponse(res: Response): Promise<SafeParsedResponse> {
  const contentType = (res.headers.get('content-type') || '').toLowerCase();
  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    rawText = '';
  }

  const trimmed = rawText.trim();
  if (!trimmed) {
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      isJson: false,
      data: null,
      rawText: ''
    };
  }

  // Avoid attempting JSON.parse on obvious HTML documents (e.g., SPA fallback index.html)
  if (trimmed.startsWith('<!DOCTYPE') || trimmed.startsWith('<!doctype') || trimmed.startsWith('<html')) {
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      isJson: false,
      data: null,
      rawText
    };
  }

  try {
    const parsed = JSON.parse(trimmed);
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      isJson: true,
      data: parsed,
      rawText
    };
  } catch {
    return {
      ok: res.ok,
      status: res.status,
      contentType,
      isJson: false,
      data: null,
      rawText
    };
  }
}

/**
 * Determines whether the response indicates that the custom Express `/api/*` backend
 * is not mounted in the current deployment (e.g., static hosting on Cloudflare Pages,
 * GitHub Pages, Netlify, or Capacitor Android build).
 */
function isStaticHostWithoutBackend(parsed: SafeParsedResponse): boolean {
  // 405 Method Not Allowed or 404 Not Found with empty/non-JSON body on /api/*
  if ((parsed.status === 404 || parsed.status === 405 || parsed.status === 501) && !parsed.isJson) {
    return true;
  }
  // 200 OK returning HTML (SPA rewrite rule serving index.html for /api/*)
  if (parsed.ok && !parsed.isJson && parsed.contentType.includes('text/html')) {
    return true;
  }
  // Empty 200/204 or gateway timeout with non-JSON
  if (!parsed.isJson && (parsed.rawText === '' || parsed.contentType.includes('text/html'))) {
    return true;
  }
  return false;
}

// --- Client-Side Persistent Ledger Store (Fallback when deployed to static hosting without Express) ---
interface LocalDatabase {
  users: User[];
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  cashbook: CashBookEntry[];
  inventory: StockItem[];
  invoices: Invoice[];
  backups: {
    metadata: { id: string; timestamp: string; label: string; counts: Record<string, number> };
    db: Omit<LocalDatabase, 'users' | 'backups'>;
  }[];
}

const LOCAL_DB_KEY = 'meezanflow_ledger_db_v1';

function loadLocalDb(): LocalDatabase {
  try {
    const raw = localStorage.getItem(LOCAL_DB_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        users: Array.isArray(parsed.users) ? parsed.users : [],
        customers: Array.isArray(parsed.customers) ? parsed.customers : [],
        suppliers: Array.isArray(parsed.suppliers) ? parsed.suppliers : [],
        transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
        cashbook: Array.isArray(parsed.cashbook) ? parsed.cashbook : [],
        inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
        invoices: Array.isArray(parsed.invoices) ? parsed.invoices : [],
        backups: Array.isArray(parsed.backups) ? parsed.backups : []
      };
    }
  } catch (e) {
    console.warn('Failed to parse local ledger database, initializing clean state:', e);
  }
  return {
    users: [],
    customers: [],
    suppliers: [],
    transactions: [],
    cashbook: [],
    inventory: [],
    invoices: [],
    backups: []
  };
}

function saveLocalDb(db: LocalDatabase) {
  try {
    localStorage.setItem(LOCAL_DB_KEY, JSON.stringify(db));
  } catch (e) {
    console.warn('Failed to save local ledger database:', e);
  }
}

function getCurrentUserEmail(): string {
  const token = localStorage.getItem('token');
  if (token) return token.toLowerCase();
  try {
    const session = localStorage.getItem('user_session');
    if (session) {
      const u = JSON.parse(session);
      if (u?.email) return String(u.email).toLowerCase();
    }
  } catch {
    // ignore
  }
  return auth.currentUser?.email?.toLowerCase() || 'owner@meezanflow.com';
}

function getCurrentUserRole(): UserRole {
  try {
    const session = localStorage.getItem('user_session');
    if (session) {
      const u = JSON.parse(session);
      if (u?.role) return u.role as UserRole;
    }
  } catch {
    // ignore
  }
  return 'Owner';
}

function createLocalBackupSnapshot(db: LocalDatabase, label: string) {
  const id = 'bk_' + Date.now();
  const timestamp = new Date().toISOString();
  const counts = {
    customers: db.customers.length,
    suppliers: db.suppliers.length,
    transactions: db.transactions.length,
    cashbook: db.cashbook.length,
    inventory: db.inventory.length,
    invoices: db.invoices.length
  };
  const snapshot = {
    metadata: { id, timestamp, label, counts },
    db: {
      customers: JSON.parse(JSON.stringify(db.customers)),
      suppliers: JSON.parse(JSON.stringify(db.suppliers)),
      transactions: JSON.parse(JSON.stringify(db.transactions)),
      cashbook: JSON.parse(JSON.stringify(db.cashbook)),
      inventory: JSON.parse(JSON.stringify(db.inventory)),
      invoices: JSON.parse(JSON.stringify(db.invoices))
    }
  };
  db.backups.unshift(snapshot);
  if (db.backups.length > 20) {
    db.backups = db.backups.slice(0, 20);
  }
  return snapshot.metadata;
}

/**
 * Syncs authenticated Firebase user profile with Firestore `/users/{uid}`
 * following the schema and security rules in `firestore.rules`.
 */
async function syncUserWithFirestore(payload: {
  email: string;
  name?: string;
  uid?: string;
  role?: string;
  businessName?: string;
}): Promise<Partial<User> | null> {
  const currentFbUser = auth.currentUser;
  const uid = payload.uid || currentFbUser?.uid;
  if (!uid || !currentFbUser || currentFbUser.uid !== uid) {
    return null;
  }

  try {
    const userDocRef = doc(firestoreDb, 'users', uid);
    const existingSnap = await getDoc(userDocRef);

    const cleanEmail = payload.email.trim().toLowerCase().slice(0, 256);
    const cleanName = (payload.name || currentFbUser.displayName || cleanEmail.split('@')[0] || 'User')
      .trim()
      .slice(0, 100);
    const validRoles: UserRole[] = ['Owner', 'Manager', 'Employee'];
    const cleanRole: UserRole = validRoles.includes(payload.role as UserRole)
      ? (payload.role as UserRole)
      : 'Owner';
    const cleanBusiness = (payload.businessName || 'MeezanFlow Business').trim().slice(0, 150);

    if (existingSnap.exists()) {
      const existingData = existingSnap.data();
      const updatedName = cleanName || existingData.name || cleanEmail.split('@')[0];
      const updatedBusiness = payload.businessName
        ? cleanBusiness
        : existingData.businessName || cleanBusiness;

      if (updatedName !== existingData.name || updatedBusiness !== existingData.businessName) {
        await setDoc(
          userDocRef,
          {
            ...existingData,
            uid,
            name: updatedName.slice(0, 100),
            businessName: updatedBusiness.slice(0, 150)
          },
          { merge: true }
        );
      }

      return {
        id: uid,
        email: existingData.email || cleanEmail,
        name: updatedName,
        role: (existingData.role as UserRole) || cleanRole,
        businessName: updatedBusiness
      };
    } else {
      const newProfile = {
        uid,
        email: cleanEmail,
        name: cleanName,
        role: cleanRole,
        businessName: cleanBusiness,
        createdAt: new Date().toISOString()
      };
      await setDoc(userDocRef, newProfile);
      return {
        id: uid,
        email: cleanEmail,
        name: cleanName,
        role: cleanRole,
        businessName: cleanBusiness
      };
    }
  } catch (err) {
    // Non-fatal if Firestore rules or offline state prevent profile doc sync
    console.warn('Firestore user profile sync warning:', err);
    return null;
  }
}

/**
 * Executes a request against the Express `/api/*` server, safely validates the JSON response,
 * and falls back to the client-side ledger engine when deployed to a static host (e.g. Cloudflare Pages).
 */
async function requestWithFallback<T>(
  url: string,
  options: RequestInit,
  defaultMessage: string,
  fallbackFn: () => T | Promise<T>
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(url, options);
  } catch {
    // Network error / offline / static environment without server
    return await fallbackFn();
  }

  if (res.status === 401) {
    throw new Error('Unauthorized');
  }

  const parsed = await safeParseResponse(res);

  // If running on a static host (e.g. Cloudflare Pages) where /api/* returns 405/404 empty body or HTML
  if (isStaticHostWithoutBackend(parsed)) {
    return await fallbackFn();
  }

  if (!parsed.ok) {
    if (parsed.isJson && parsed.data && typeof parsed.data.error === 'string') {
      throw new Error(parsed.data.error);
    }
    throw new Error(`${defaultMessage} (HTTP ${parsed.status})`);
  }

  if (!parsed.isJson) {
    return await fallbackFn();
  }

  return parsed.data as T;
}

export const api = {
  // Auth
  async firebaseLogin(payload: {
    email: string;
    name?: string;
    uid?: string;
    role?: string;
    businessName?: string;
  }): Promise<User> {
    if (!payload || !payload.email) {
      throw new Error('Email is required for Google / Firebase sign-in.');
    }

    const normalizedEmail = payload.email.trim().toLowerCase();
    const resolvedName = (payload.name || normalizedEmail.split('@')[0] || 'Business Owner').trim();
    const resolvedRole: UserRole = (payload.role as UserRole) || 'Owner';
    const resolvedBusiness = (payload.businessName || 'MeezanFlow Business').trim();

    // 1. Sync user profile in Firestore if authenticated with Firebase
    const firestoreProfile = await syncUserWithFirestore({
      email: normalizedEmail,
      name: resolvedName,
      uid: payload.uid,
      role: resolvedRole,
      businessName: resolvedBusiness
    });

    // Helper to build and persist the user session locally when Express /api/* is unavailable
    const completeClientSideFirebaseLogin = (): User => {
      const localDb = loadLocalDb();
      let existingUser = localDb.users.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (!existingUser) {
        existingUser = {
          id: firestoreProfile?.id || payload.uid || 'u_' + Math.random().toString(36).substring(2, 9),
          name: firestoreProfile?.name || resolvedName,
          email: normalizedEmail,
          role: firestoreProfile?.role || resolvedRole,
          businessName: firestoreProfile?.businessName || resolvedBusiness,
          token: normalizedEmail
        };
        localDb.users.push(existingUser);
      } else {
        existingUser.name = firestoreProfile?.name || resolvedName || existingUser.name;
        if (payload.businessName || firestoreProfile?.businessName) {
          existingUser.businessName = firestoreProfile?.businessName || resolvedBusiness;
        }
        existingUser.token = normalizedEmail;
      }

      saveLocalDb(localDb);
      localStorage.setItem('token', normalizedEmail);
      return existingUser;
    };

    // 2. Attempt sync with Express backend `/api/auth/firebase-login`
    try {
      const res = await fetch('/api/auth/firebase-login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: normalizedEmail,
          name: firestoreProfile?.name || resolvedName,
          uid: payload.uid,
          role: firestoreProfile?.role || resolvedRole,
          businessName: firestoreProfile?.businessName || resolvedBusiness
        })
      });

      const parsed = await safeParseResponse(res);

      // If static deployment (e.g. Cloudflare Pages returning 405/404 empty body or HTML), use client-side + Firestore session
      if (isStaticHostWithoutBackend(parsed)) {
        return completeClientSideFirebaseLogin();
      }

      if (!parsed.ok) {
        if (parsed.isJson && parsed.data?.error) {
          throw new Error(parsed.data.error);
        }
        throw new Error(`Authentication sync failed with status ${parsed.status}.`);
      }

      if (!parsed.isJson || !parsed.data || !parsed.data.email) {
        return completeClientSideFirebaseLogin();
      }

      const data = parsed.data as User;
      const token = data.token || data.email || normalizedEmail;
      localStorage.setItem('token', token);
      return {
        ...data,
        token
      };
    } catch (err: any) {
      // If fetch itself failed (offline or static environment without /api/*) and user is authenticated with Firebase, complete login
      if (
        auth.currentUser &&
        auth.currentUser.email?.toLowerCase() === normalizedEmail &&
        (!err?.message || err.message.includes('Failed to fetch') || err.message.includes('NetworkError'))
      ) {
        return completeClientSideFirebaseLogin();
      }
      throw err;
    }
  },

  async login(credentials: any): Promise<User> {
    if (!credentials?.email || !credentials?.password) {
      throw new Error('Email and password are required');
    }

    let res: Response;
    try {
      res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(credentials)
      });
    } catch {
      throw new Error('Unable to reach authentication server. Please check your connection or sign in with Google.');
    }

    const parsed = await safeParseResponse(res);

    if (isStaticHostWithoutBackend(parsed)) {
      throw new Error('Invalid email or password. Please verify your credentials or create a new account.');
    }

    if (!parsed.ok) {
      const errMsg = parsed.isJson && parsed.data?.error ? parsed.data.error : 'Invalid email or password';
      throw new Error(errMsg);
    }

    if (!parsed.isJson || !parsed.data) {
      throw new Error('Unexpected response from login server.');
    }

    const data = parsed.data as User;
    localStorage.setItem('token', data.token || data.email);
    return data;
  },

  async signup(profile: any): Promise<User> {
    let res: Response;
    try {
      res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(profile)
      });
    } catch {
      throw new Error('Unable to reach registration server. Please check your internet connection.');
    }

    const parsed = await safeParseResponse(res);

    if (isStaticHostWithoutBackend(parsed)) {
      return this.firebaseLogin({
        email: profile.email,
        name: profile.name,
        role: profile.role,
        businessName: profile.businessName
      });
    }

    if (!parsed.ok) {
      const errMsg = parsed.isJson && parsed.data?.error ? parsed.data.error : 'Registration failed';
      throw new Error(errMsg);
    }

    if (!parsed.isJson || !parsed.data) {
      throw new Error('Unexpected response from registration server.');
    }

    const data = parsed.data as User;
    localStorage.setItem('token', data.token || data.email);
    return data;
  },

  async forgotPassword(email: string): Promise<string> {
    let res: Response;
    try {
      res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({ email })
      });
    } catch {
      throw new Error('Unable to reach password reset service. Please check your connection.');
    }

    const parsed = await safeParseResponse(res);

    if (!parsed.ok || !parsed.isJson) {
      const errMsg = parsed.isJson && parsed.data?.error ? parsed.data.error : 'Requested account not found';
      throw new Error(errMsg);
    }

    return parsed.data.message || `Password reset instructions sent to ${email}.`;
  },

  // Dashboard
  async getStats(): Promise<FinancialStats> {
    return requestWithFallback(
      '/api/dashboard/stats',
      { headers: getHeaders() },
      'Failed to fetch financial metrics',
      () => {
        const db = loadLocalDb();
        const receivables = db.customers
          .filter((c) => c && typeof c.balance === 'number' && c.balance > 0)
          .reduce((sum, c) => sum + c.balance, 0);

        const payables =
          db.suppliers
            .filter((s) => s && typeof s.balance === 'number' && s.balance > 0)
            .reduce((sum, s) => sum + s.balance, 0) +
          db.customers
            .filter((c) => c && typeof c.balance === 'number' && c.balance < 0)
            .reduce((sum, c) => sum + Math.abs(c.balance), 0);

        const cashIn = db.cashbook
          .filter((cb) => cb && cb.type === 'cash-in' && typeof cb.amount === 'number')
          .reduce((sum, cb) => sum + cb.amount, 0);
        const cashOut = db.cashbook
          .filter((cb) => cb && cb.type === 'cash-out' && typeof cb.amount === 'number')
          .reduce((sum, cb) => sum + cb.amount, 0);
        const cashInHand = cashIn - cashOut;

        const totalSales =
          db.cashbook
            .filter(
              (cb) =>
                cb &&
                cb.type === 'cash-in' &&
                typeof cb.amount === 'number' &&
                (cb.category === 'Sales' || cb.category === 'Customer Payment')
            )
            .reduce((sum, cb) => sum + cb.amount, 0) +
          db.transactions
            .filter((t) => t && t.type === 'credit' && typeof t.amount === 'number')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalExpenses = cashOut;
        const profit = totalSales - totalExpenses;

        return {
          totalSales,
          totalExpenses,
          profit,
          receivables,
          payables,
          cashInHand
        };
      }
    );
  },

  async getAnalytics(): Promise<any> {
    return requestWithFallback(
      '/api/dashboard/analytics',
      { headers: getHeaders() },
      'Failed to fetch analytics',
      () => {
        const db = loadLocalDb();
        const weeklyData = [];
        const now = new Date();
        for (let i = 6; i >= 0; i--) {
          const d = new Date(now);
          d.setDate(now.getDate() - i);
          const isoDate = d.toISOString().split('T')[0];
          const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

          const dayCashSales = db.cashbook
            .filter(
              (cb) =>
                cb &&
                cb.date === isoDate &&
                cb.type === 'cash-in' &&
                (cb.category === 'Sales' || cb.category === 'Customer Payment')
            )
            .reduce((sum, cb) => sum + (Number(cb.amount) || 0), 0);

          const dayCreditSales = db.transactions
            .filter((t) => t && t.date === isoDate && t.type === 'credit')
            .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

          const sales = dayCashSales + dayCreditSales;
          const expenses = db.cashbook
            .filter((cb) => cb && cb.date === isoDate && cb.type === 'cash-out')
            .reduce((sum, cb) => sum + (Number(cb.amount) || 0), 0);

          weeklyData.push({
            date: label,
            sales,
            expenses,
            profit: sales - expenses
          });
        }

        const categoryMap: Record<string, number> = {};
        db.inventory.forEach((item) => {
          if (item && item.category) {
            const val = (Number(item.sellPrice) || 0) * (Number(item.quantity) || 0);
            categoryMap[item.category] = (categoryMap[item.category] || 0) + val;
          }
        });

        const categoryStats = Object.entries(categoryMap).map(([name, value]) => ({
          name,
          value
        }));

        return { weeklyData, categoryStats };
      }
    );
  },

  // Customers (Udhaar)
  async getCustomers(): Promise<Customer[]> {
    return requestWithFallback(
      '/api/customers',
      { headers: getHeaders() },
      'Failed to load customers',
      () => loadLocalDb().customers
    );
  },

  async createCustomer(payload: any): Promise<Customer> {
    return requestWithFallback(
      '/api/customers',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to add customer',
      () => {
        const { name, phone, email, initialBalance } = payload || {};
        if (!name || !phone) {
          throw new Error('Customer Name and Phone number are required');
        }
        const db = loadLocalDb();
        const nowIso = new Date().toISOString();
        const newCustomer: Customer = {
          id: 'c_' + Math.random().toString(36).substring(2, 9),
          name: String(name).trim(),
          phone: String(phone).trim(),
          email: email ? String(email).trim() : '',
          balance: Number(initialBalance) || 0,
          updatedAt: nowIso,
          businessId: 'b1'
        };
        db.customers.push(newCustomer);

        if (newCustomer.balance !== 0) {
          const type = newCustomer.balance > 0 ? 'credit' : 'debit';
          db.transactions.unshift({
            id: 't_' + Math.random().toString(36).substring(2, 9),
            customerId: newCustomer.id,
            customerName: newCustomer.name,
            type,
            amount: Math.abs(newCustomer.balance),
            date: nowIso.split('T')[0],
            createdAt: nowIso,
            description: 'Opening balance',
            createdBy: getCurrentUserEmail(),
            businessId: 'b1'
          });
        }

        saveLocalDb(db);
        return newCustomer;
      }
    );
  },

  async updateCustomer(id: string, payload: any): Promise<Customer> {
    return requestWithFallback(
      `/api/customers/${id}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to edit customer profile',
      () => {
        const db = loadLocalDb();
        const index = db.customers.findIndex((c) => c.id === id);
        if (index === -1) {
          throw new Error('Customer not found');
        }
        const { name, phone, email, balance } = payload || {};
        const updatedName = name ? String(name).trim() : db.customers[index].name;
        db.customers[index] = {
          ...db.customers[index],
          name: updatedName,
          phone: phone ? String(phone).trim() : db.customers[index].phone,
          email: email !== undefined ? String(email).trim() : db.customers[index].email,
          balance: balance !== undefined ? Number(balance) : db.customers[index].balance,
          updatedAt: new Date().toISOString()
        };
        if (name) {
          db.transactions = db.transactions.map((t) =>
            t.customerId === id ? { ...t, customerName: updatedName } : t
          );
          db.invoices = db.invoices.map((inv) =>
            inv.customerId === id ? { ...inv, customerName: updatedName } : inv
          );
        }
        saveLocalDb(db);
        return db.customers[index];
      }
    );
  },

  async deleteCustomer(id: string): Promise<any> {
    return requestWithFallback(
      `/api/customers/${id}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      },
      'Delete customer operation was forbidden',
      () => {
        if (getCurrentUserRole() === 'Employee') {
          throw new Error('Forbidden: Employees cannot delete clients');
        }
        const db = loadLocalDb();
        const customer = db.customers.find((c) => c.id === id);
        if (!customer) {
          throw new Error('Customer not found');
        }
        createLocalBackupSnapshot(db, `Before deleting customer "${customer.name}"`);
        db.customers = db.customers.filter((c) => c.id !== id);
        db.transactions = db.transactions.filter((t) => t.customerId !== id);
        db.invoices = db.invoices.filter((inv) => inv.customerId !== id);
        saveLocalDb(db);
        return { message: 'Customer deleted successfully' };
      }
    );
  },

  // Suppliers (Payables)
  async getSuppliers(): Promise<Supplier[]> {
    return requestWithFallback(
      '/api/suppliers',
      { headers: getHeaders() },
      'Failed to load suppliers',
      () => loadLocalDb().suppliers
    );
  },

  async createSupplier(payload: any): Promise<Supplier> {
    return requestWithFallback(
      '/api/suppliers',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to add supplier',
      () => {
        const { name, phone, email, initialBalance } = payload || {};
        if (!name || !phone) {
          throw new Error('Supplier Name and Phone are required');
        }
        const db = loadLocalDb();
        const newSupplier: Supplier = {
          id: 's_' + Math.random().toString(36).substring(2, 9),
          name: String(name).trim(),
          phone: String(phone).trim(),
          email: email ? String(email).trim() : '',
          balance: Number(initialBalance) || 0,
          updatedAt: new Date().toISOString(),
          businessId: 'b1'
        };
        db.suppliers.push(newSupplier);
        saveLocalDb(db);
        return newSupplier;
      }
    );
  },

  async deleteSupplier(id: string): Promise<any> {
    return requestWithFallback(
      `/api/suppliers/${id}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      },
      'Permission denied to delete supplier',
      () => {
        if (getCurrentUserRole() === 'Employee') {
          throw new Error('Forbidden: Employee permissions cannot delete records');
        }
        const db = loadLocalDb();
        const supplier = db.suppliers.find((s) => s.id === id);
        createLocalBackupSnapshot(db, `Before deleting supplier "${supplier ? supplier.name : id}"`);
        db.suppliers = db.suppliers.filter((s) => s.id !== id);
        saveLocalDb(db);
        return { message: 'Supplier deleted' };
      }
    );
  },

  // Credit / Debit Transactions
  async getTransactions(customerId?: string): Promise<Transaction[]> {
    const url = customerId
      ? `/api/transactions?customerId=${encodeURIComponent(customerId)}`
      : '/api/transactions';
    return requestWithFallback(url, { headers: getHeaders() }, 'Failed to load transaction ledger', () => {
      const list = loadLocalDb().transactions;
      return customerId ? list.filter((t) => t.customerId === customerId) : list;
    });
  },

  async createTransaction(payload: any): Promise<any> {
    return requestWithFallback(
      '/api/transactions',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to register ledger entry',
      () => {
        const { customerId, type, amount, date, description } = payload || {};
        if (!customerId || !type || !amount) {
          throw new Error('Missing customerId, type, or amount');
        }
        const db = loadLocalDb();
        const customer = db.customers.find((c) => c.id === customerId);
        if (!customer) {
          throw new Error('Customer not found');
        }
        const txAmount = Number(amount);
        if (isNaN(txAmount) || txAmount <= 0) {
          throw new Error('Transaction amount must be a positive number');
        }
        const nowIso = new Date().toISOString();
        const newTx: Transaction = {
          id: 't_' + Math.random().toString(36).substring(2, 9),
          customerId,
          customerName: customer.name,
          type: type as 'credit' | 'debit',
          amount: txAmount,
          date: date || nowIso.split('T')[0],
          createdAt: nowIso,
          description: description || '',
          createdBy: getCurrentUserEmail(),
          businessId: 'b1'
        };
        db.transactions.unshift(newTx);
        if (type === 'credit') {
          customer.balance += txAmount;
        } else {
          customer.balance -= txAmount;
        }
        customer.updatedAt = nowIso;

        if (type === 'debit') {
          db.cashbook.unshift({
            id: 'cb_' + Math.random().toString(36).substring(2, 9),
            type: 'cash-in',
            amount: txAmount,
            date: nowIso.split('T')[0],
            category: 'Customer Payment',
            description: `Payment from Ledger: ${customer.name} - ${description || 'No description'}`,
            createdBy: getCurrentUserEmail(),
            businessId: 'b1'
          });
        }
        saveLocalDb(db);
        return { transaction: newTx, customer };
      }
    );
  },

  async updateTransaction(id: string, payload: any): Promise<any> {
    return requestWithFallback(
      `/api/transactions/${id}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to update transaction',
      () => {
        if (getCurrentUserRole() === 'Employee') {
          throw new Error('Forbidden: Employees cannot edit ledger logs');
        }
        const db = loadLocalDb();
        const txIndex = db.transactions.findIndex((t) => t.id === id);
        if (txIndex === -1) {
          throw new Error('Transaction record not found');
        }
        const existingTx = db.transactions[txIndex];
        const { type, amount, date, description } = payload || {};
        const newType = type === 'credit' || type === 'debit' ? type : existingTx.type;
        const newAmount = amount !== undefined ? Number(amount) : existingTx.amount;
        if (isNaN(newAmount) || newAmount <= 0) {
          throw new Error('Transaction amount must be a positive number');
        }
        createLocalBackupSnapshot(db, `Before editing ledger entry: ${existingTx.customerName} (Rs. ${existingTx.amount})`);
        const customer = db.customers.find((c) => c.id === existingTx.customerId);
        if (customer) {
          if (existingTx.type === 'credit') {
            customer.balance -= existingTx.amount;
          } else {
            customer.balance += existingTx.amount;
          }
          if (newType === 'credit') {
            customer.balance += newAmount;
          } else {
            customer.balance -= newAmount;
          }
          customer.updatedAt = new Date().toISOString();
        }
        db.transactions[txIndex] = {
          ...existingTx,
          type: newType,
          amount: newAmount,
          date: date || existingTx.date,
          description: description !== undefined ? String(description) : existingTx.description
        };
        saveLocalDb(db);
        return { transaction: db.transactions[txIndex], customer };
      }
    );
  },

  async deleteTransaction(id: string): Promise<any> {
    return requestWithFallback(
      `/api/transactions/${id}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      },
      'Failed to rollback transaction',
      () => {
        if (getCurrentUserRole() === 'Employee') {
          throw new Error('Forbidden: Employees cannot delete ledger logs');
        }
        const db = loadLocalDb();
        const tx = db.transactions.find((t) => t.id === id);
        if (!tx) {
          throw new Error('Transaction record not found');
        }
        createLocalBackupSnapshot(db, `Before deleting ledger entry: ${tx.customerName} (Rs. ${tx.amount})`);
        const customer = db.customers.find((c) => c.id === tx.customerId);
        if (customer) {
          if (tx.type === 'credit') {
            customer.balance -= tx.amount;
          } else {
            customer.balance += tx.amount;
          }
          customer.updatedAt = new Date().toISOString();
        }
        db.transactions = db.transactions.filter((t) => t.id !== id);
        saveLocalDb(db);
        return { message: 'Transaction rolled back and deleted successfully', customer };
      }
    );
  },

  // Cash Book
  async getCashbook(): Promise<CashBookEntry[]> {
    return requestWithFallback(
      '/api/cashbook',
      { headers: getHeaders() },
      'Failed to load cashbook entries',
      () => loadLocalDb().cashbook
    );
  },

  async createCashEntry(payload: any): Promise<CashBookEntry> {
    return requestWithFallback(
      '/api/cashbook',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to log cashbook change',
      () => {
        const { type, amount, date, category, description } = payload || {};
        if (!type || !amount || !category) {
          throw new Error('Missing entry type, amount, or category');
        }
        const db = loadLocalDb();
        const newEntry: CashBookEntry = {
          id: 'cb_' + Math.random().toString(36).substring(2, 9),
          type: type as 'cash-in' | 'cash-out',
          amount: Number(amount),
          date: date || new Date().toISOString().split('T')[0],
          category,
          description: description || '',
          createdBy: getCurrentUserEmail(),
          businessId: 'b1'
        };
        db.cashbook.unshift(newEntry);
        saveLocalDb(db);
        return newEntry;
      }
    );
  },

  async deleteCashEntry(id: string): Promise<any> {
    return requestWithFallback(
      `/api/cashbook/${id}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      },
      'Forbidden: Cashbook deletion restricted',
      () => {
        if (getCurrentUserRole() === 'Employee') {
          throw new Error('Forbidden: Employee permissions cannot delete history');
        }
        const db = loadLocalDb();
        const cb = db.cashbook.find((c) => c.id === id);
        createLocalBackupSnapshot(db, `Before deleting cash entry: ${cb ? cb.category : ''} Rs. ${cb ? cb.amount : ''}`);
        db.cashbook = db.cashbook.filter((c) => c.id !== id);
        saveLocalDb(db);
        return { message: 'Cashbook entry deleted' };
      }
    );
  },

  // Inventory Stock
  async getInventory(): Promise<StockItem[]> {
    return requestWithFallback(
      '/api/inventory',
      { headers: getHeaders() },
      'Failed to query inventory log',
      () => loadLocalDb().inventory
    );
  },

  async createStockItem(payload: any): Promise<StockItem> {
    return requestWithFallback(
      '/api/inventory',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to create stock record',
      () => {
        const { name, sku, purchasePrice, sellPrice, quantity, minQuantity, category, unit } = payload || {};
        if (!name || !sellPrice || quantity === undefined) {
          throw new Error('Name, Sell Price, and Quantity are required');
        }
        const db = loadLocalDb();
        const newItem: StockItem = {
          id: 'i_' + Math.random().toString(36).substring(2, 9),
          name: String(name).trim(),
          sku: sku || 'SKU-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
          purchasePrice: Number(purchasePrice) || 0,
          sellPrice: Number(sellPrice),
          quantity: Number(quantity),
          minQuantity: Number(minQuantity) || 5,
          category: category || 'General',
          unit: unit || 'pcs',
          businessId: 'b1'
        };
        db.inventory.push(newItem);
        saveLocalDb(db);
        return newItem;
      }
    );
  },

  async updateStockItem(id: string, payload: any): Promise<StockItem> {
    return requestWithFallback(
      `/api/inventory/${id}`,
      {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to adjust stock properties',
      () => {
        const db = loadLocalDb();
        const index = db.inventory.findIndex((inv) => inv.id === id);
        if (index === -1) {
          throw new Error('Inventory stock item not found');
        }
        const { name, sku, purchasePrice, sellPrice, quantity, minQuantity, category, unit } = payload || {};
        db.inventory[index] = {
          ...db.inventory[index],
          name: name || db.inventory[index].name,
          sku: sku || db.inventory[index].sku,
          purchasePrice: purchasePrice !== undefined ? Number(purchasePrice) : db.inventory[index].purchasePrice,
          sellPrice: sellPrice !== undefined ? Number(sellPrice) : db.inventory[index].sellPrice,
          quantity: quantity !== undefined ? Number(quantity) : db.inventory[index].quantity,
          minQuantity: minQuantity !== undefined ? Number(minQuantity) : db.inventory[index].minQuantity,
          category: category || db.inventory[index].category,
          unit: unit || db.inventory[index].unit
        };
        saveLocalDb(db);
        return db.inventory[index];
      }
    );
  },

  async deleteStockItem(id: string): Promise<any> {
    return requestWithFallback(
      `/api/inventory/${id}`,
      {
        method: 'DELETE',
        headers: getHeaders()
      },
      'Forbidden: Staff cannot delete stock lines',
      () => {
        if (getCurrentUserRole() === 'Employee') {
          throw new Error('Only Manager or Owners may delete stock logs');
        }
        const db = loadLocalDb();
        const item = db.inventory.find((i) => i.id === id);
        createLocalBackupSnapshot(db, `Before deleting stock item "${item ? item.name : id}"`);
        db.inventory = db.inventory.filter((inv) => inv.id !== id);
        saveLocalDb(db);
        return { message: 'Stock item deleted' };
      }
    );
  },

  // Invoices
  async getInvoices(): Promise<Invoice[]> {
    return requestWithFallback(
      '/api/invoices',
      { headers: getHeaders() },
      'Failed to fetch invoice history',
      () => loadLocalDb().invoices
    );
  },

  async createInvoice(payload: any): Promise<Invoice> {
    return requestWithFallback(
      '/api/invoices',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(payload)
      },
      'Failed to dispatch invoice builder',
      () => {
        const { customerId, customerName, customerPhone, items, discount, tax, isPaid } = payload || {};
        if (!customerName || !items || !items.length) {
          throw new Error('Customer name and items list are required');
        }
        const db = loadLocalDb();
        const formattedItems = items.map((itm: any) => ({
          name: String(itm.name),
          quantity: Number(itm.quantity),
          price: Number(itm.price),
          total: Number(itm.quantity) * Number(itm.price)
        }));
        const subTotal = formattedItems.reduce((sum: number, itm: any) => sum + itm.total, 0);
        const invoiceTax = Number(tax) || 0;
        const invoiceDiscount = Number(discount) || 0;
        const total = subTotal + invoiceTax - invoiceDiscount;
        const invoiceCount = db.invoices.length + 1;
        const invoiceNumStr = String(invoiceCount).padStart(3, '0');

        const newInvoice: Invoice = {
          id: 'inv_' + Math.random().toString(36).substring(2, 9),
          invoiceNumber: `INV-2026-${invoiceNumStr}`,
          customerId,
          customerName,
          customerPhone,
          date: new Date().toISOString().split('T')[0],
          dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          items: formattedItems,
          subTotal,
          discount: invoiceDiscount,
          tax: invoiceTax,
          total,
          isPaid: !!isPaid,
          createdBy: getCurrentUserEmail(),
          businessId: 'b1'
        };

        db.invoices.unshift(newInvoice);

        formattedItems.forEach((soldItem: any) => {
          const idx = db.inventory.findIndex(
            (inv) =>
              inv.name.toLowerCase() === soldItem.name.toLowerCase() ||
              inv.sku.toLowerCase() === soldItem.name.toLowerCase()
          );
          if (idx !== -1) {
            db.inventory[idx].quantity = Math.max(0, db.inventory[idx].quantity - soldItem.quantity);
          }
        });

        if (newInvoice.isPaid) {
          db.cashbook.unshift({
            id: 'cb_' + Math.random().toString(36).substring(2, 9),
            type: 'cash-in',
            amount: total,
            date: new Date().toISOString().split('T')[0],
            category: 'Sales',
            description: `Paid via Invoice ${newInvoice.invoiceNumber} to ${newInvoice.customerName}`,
            createdBy: getCurrentUserEmail(),
            businessId: 'b1'
          });
        } else if (customerId) {
          const customerObj = db.customers.find((c) => c.id === customerId);
          if (customerObj) {
            const nowIso = new Date().toISOString();
            customerObj.balance += total;
            customerObj.updatedAt = nowIso;
            db.transactions.unshift({
              id: 't_' + Math.random().toString(36).substring(2, 9),
              customerId,
              customerName: customerObj.name,
              type: 'credit',
              amount: total,
              date: nowIso.split('T')[0],
              createdAt: nowIso,
              description: `Dispatched Invoice ${newInvoice.invoiceNumber}`,
              invoiceId: newInvoice.id,
              createdBy: getCurrentUserEmail(),
              businessId: 'b1'
            });
          }
        }

        saveLocalDb(db);
        return newInvoice;
      }
    );
  },

  // Database Backup & Safety Snapshot API
  async getBackups(): Promise<any[]> {
    return requestWithFallback(
      '/api/backups',
      { headers: getHeaders() },
      'Failed to fetch backups list',
      () => loadLocalDb().backups.map((b) => b.metadata)
    );
  },

  async createBackup(label: string): Promise<any> {
    return requestWithFallback(
      '/api/backups/create',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ label })
      },
      'Failed to create backup snapshot',
      () => {
        const db = loadLocalDb();
        const labelSanitized = (label || 'Manual User Checkpoint').slice(0, 100);
        const snapshot = createLocalBackupSnapshot(db, labelSanitized);
        saveLocalDb(db);
        return { message: 'Database backup checkpoint created successfully', snapshot };
      }
    );
  },

  async restoreBackup(id: string): Promise<any> {
    return requestWithFallback(
      `/api/backups/restore/${id}`,
      {
        method: 'POST',
        headers: getHeaders()
      },
      'Failed to restore backup snapshot',
      () => {
        const db = loadLocalDb();
        const found = db.backups.find((b) => b.metadata.id === id);
        if (!found) {
          throw new Error('Backup checkpoint file not found');
        }
        createLocalBackupSnapshot(db, `Auto-backup before restoring Checkpoint ID: ${id}`);
        db.customers = JSON.parse(JSON.stringify(found.db.customers || []));
        db.suppliers = JSON.parse(JSON.stringify(found.db.suppliers || []));
        db.transactions = JSON.parse(JSON.stringify(found.db.transactions || []));
        db.cashbook = JSON.parse(JSON.stringify(found.db.cashbook || []));
        db.inventory = JSON.parse(JSON.stringify(found.db.inventory || []));
        db.invoices = JSON.parse(JSON.stringify(found.db.invoices || []));
        saveLocalDb(db);
        return { message: 'Success! Ledger database rolled back to: ' + found.metadata.label };
      }
    );
  },

  async uploadBackup(backupData: any): Promise<any> {
    return requestWithFallback(
      '/api/backups/upload',
      {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ backupData })
      },
      'Failed to import backup file',
      () => {
        if (!backupData || !backupData.customers) {
          throw new Error('Invalid backup structure. Must contain standard ledger records.');
        }
        const db = loadLocalDb();
        createLocalBackupSnapshot(db, 'Auto-backup before importing custom json file');
        db.customers = backupData.customers || [];
        db.suppliers = backupData.suppliers || [];
        db.transactions = backupData.transactions || [];
        db.cashbook = backupData.cashbook || [];
        db.inventory = backupData.inventory || [];
        db.invoices = backupData.invoices || [];
        saveLocalDb(db);
        return { message: 'Success! Custom backup JSON file imported successfully.' };
      }
    );
  }
};
