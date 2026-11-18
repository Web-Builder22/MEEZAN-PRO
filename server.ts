import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import { 
  User, 
  Customer, 
  Supplier, 
  Transaction, 
  CashBookEntry, 
  StockItem, 
  Invoice, 
  UserRole 
} from './src/types';

// Simple file-based database
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const EXCEL_BACKUPS_ROOT = path.join(DATA_DIR, 'Meezan Flow Backups');
const EXCEL_SUBFOLDERS = [
  'Customers',
  'Suppliers',
  'Invoices',
  'Inventory',
  'Complete_Backups',
  'Backup_History'
] as const;

// Helper to secure data directories
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}
if (!fs.existsSync(EXCEL_BACKUPS_ROOT)) {
  fs.mkdirSync(EXCEL_BACKUPS_ROOT, { recursive: true });
}
for (const sub of EXCEL_SUBFOLDERS) {
  const subPath = path.join(EXCEL_BACKUPS_ROOT, sub);
  if (!fs.existsSync(subPath)) {
    fs.mkdirSync(subPath, { recursive: true });
  }
}

// Initial clean database structure
const initialDatabase = {
  users: [] as User[],
  customers: [] as Customer[],
  suppliers: [] as Supplier[],
  transactions: [] as Transaction[],
  cashbook: [] as CashBookEntry[],
  inventory: [] as StockItem[],
  invoices: [] as Invoice[]
};

// Initialize file database
function loadDb() {
  try {
    if (fs.existsSync(DB_FILE)) {
      const fileData = fs.readFileSync(DB_FILE, 'utf-8');
      return JSON.parse(fileData);
    }
  } catch (err) {
    console.error('Failed to load database. Reinitializing seed.', err);
  }
  
  // Seed initial db
  fs.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), 'utf-8');
  return initialDatabase;
}

function saveDb(data: any) {
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Failed to write to database.json', err);
  }
}

// Instantiate db cache
let db = loadDb();

// Function to create database backup snapshot before destructive changes or manual saving
function createBackupSnapshot(
  label: string,
  backupType: 'manual' | 'daily' | 'hourly' | 'emergency' = 'manual'
) {
  try {
    const id = 'bk_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const timestamp = new Date().toISOString();
    const counts = {
      customers: db?.customers?.length || 0,
      suppliers: db?.suppliers?.length || 0,
      transactions: db?.transactions?.length || 0,
      cashbook: db?.cashbook?.length || 0,
      inventory: db?.inventory?.length || 0,
      invoices: db?.invoices?.length || 0
    };

    const filepath = path.join(BACKUPS_DIR, `${id}.json`);
    const initialPayload = {
      metadata: { id, timestamp, label, counts, backupType, size: 0 },
      db: {
        customers: db?.customers || [],
        suppliers: db?.suppliers || [],
        transactions: db?.transactions || [],
        cashbook: db?.cashbook || [],
        inventory: db?.inventory || [],
        invoices: db?.invoices || []
      }
    };

    const prelimJson = JSON.stringify(initialPayload, null, 2);
    const byteSize = Buffer.byteLength(prelimJson, 'utf-8');
    initialPayload.metadata.size = byteSize;

    const finalJson = JSON.stringify(initialPayload, null, 2);
    fs.writeFileSync(filepath, finalJson, 'utf-8');
    const stat = fs.statSync(filepath);
    return { id, timestamp, label, counts, backupType, size: stat.size };
  } catch (err) {
    console.error('Failed to create backup snapshot', err);
    return null;
  }
}

// Retention Policy: Never automatically delete historical backups.
// Administrators manage deletion manually after explicit confirmation.
function cleanOldBackups() {
  // Intentionally retained: no automatic pruning of historical backups.
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '15mb' }));

  // Helper middleware for authorization/context
  const authenticateUser = (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized: No token provided' });
    }
    
    const email = authHeader.replace('Bearer ', '').trim();
    let user = db.users.find(u => u.email.toLowerCase() === email.toLowerCase());
    
    if (!user) {
      if (email.includes('@')) {
        // Auto-provision user record for Firebase authenticated user
        user = {
          id: 'u_' + Math.random().toString(36).substring(2, 9),
          name: email.split('@')[0],
          email: email.toLowerCase(),
          password: '',
          role: 'Owner' as UserRole,
          businessName: 'MeezanFlow Business'
        };
        db.users.push(user);
        saveDb(db);
      } else {
        return res.status(401).json({ error: 'Unauthorized: Invalid user session token' });
      }
    }
    
    // Attach user to req context
    (req as any).user = user;
    next();
  };

  // --- API Authentication Routes ---
  app.post('/api/auth/firebase-login', (req, res) => {
    try {
      const { email, name, uid, role, businessName } = req.body || {};
      if (!email || typeof email !== 'string') {
        return res.status(400).json({ error: 'Email is required' });
      }
      
      const normalizedEmail = email.trim().toLowerCase();
      if (!Array.isArray(db.users)) {
        db.users = [];
      }

      let user = db.users.find(u => u && u.email && u.email.toLowerCase() === normalizedEmail);
      if (!user) {
        user = {
          id: uid || 'u_' + Math.random().toString(36).substring(2, 9),
          name: (name && String(name).trim()) || normalizedEmail.split('@')[0],
          email: normalizedEmail,
          password: '',
          role: (role as UserRole) || 'Owner',
          businessName: (businessName && String(businessName).trim()) || 'MeezanFlow Business'
        };
        db.users.push(user);
        saveDb(db);
      } else {
        if (name && (!user.name || user.name === user.email.split('@')[0])) {
          user.name = String(name).trim();
        }
        if (businessName) {
          user.businessName = String(businessName).trim();
        }
        saveDb(db);
      }

      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        ...userWithoutPassword,
        token: user.email
      });
    } catch (err: any) {
      console.error('Error in /api/auth/firebase-login:', err);
      return res.status(500).json({ error: err?.message || 'Internal server error during Firebase login sync' });
    }
  });

  app.post('/api/auth/login', (req, res) => {
    try {
      const { email, password } = req.body || {};
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
      }
      
      const normalizedEmail = String(email).trim().toLowerCase();
      const user = (db.users || []).find(
        u => u && u.email && u.email.toLowerCase() === normalizedEmail && u.password === password
      );
      if (!user) {
        return res.status(401).json({ error: 'Invalid email or password' });
      }
      
      const { password: _, ...userWithoutPassword } = user;
      return res.status(200).json({
        ...userWithoutPassword,
        token: user.email // Simple token: user's email acts as session key
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Login failed' });
    }
  });

  app.post('/api/auth/signup', (req, res) => {
    try {
      const { name, email, password, role, businessName } = req.body || {};
      
      if (!name || !email || !password || !businessName) {
        return res.status(400).json({ error: 'All fields are required (name, email, password, businessName)' });
      }
      
      const normalizedEmail = String(email).trim().toLowerCase();
      const existing = (db.users || []).find(u => u && u.email && u.email.toLowerCase() === normalizedEmail);
      if (existing) {
        return res.status(400).json({ error: 'A user with this email already exists' });
      }
      
      const newUser = {
        id: 'u_' + Math.random().toString(36).substring(2, 9),
        name: String(name).trim(),
        email: normalizedEmail,
        password,
        role: (role as UserRole) || 'Owner',
        businessName: String(businessName).trim()
      };
      
      db.users.push(newUser);
      saveDb(db);
      
      const { password: _, ...userWithoutPassword } = newUser;
      return res.status(201).json({
        ...userWithoutPassword,
        token: newUser.email
      });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Signup failed' });
    }
  });

  app.post('/api/auth/forgot-password', (req, res) => {
    try {
      const { email } = req.body || {};
      if (!email) {
        return res.status(400).json({ error: 'Email is required' });
      }
      const normalizedEmail = String(email).trim().toLowerCase();
      const user = (db.users || []).find(u => u && u.email && u.email.toLowerCase() === normalizedEmail);
      if (user) {
        return res.status(200).json({ message: `Password reset instructions sent to ${email}.` });
      }
      return res.status(404).json({ error: 'No accounting profile found with this email' });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Password reset request failed' });
    }
  });

  // --- API Dashboard / Analytics ---
  app.get('/api/dashboard/stats', authenticateUser, (req, res) => {
    try {
      const user = (req as any).user;
      
      // Since this is a demo, we manage everything under the single business ID 'b1' or user's business
      // To support multi-tenancy beautifully, we keep everything accessible
      
      const customers = db.customers || [];
      const suppliers = db.suppliers || [];
      const cashbook = db.cashbook || [];
      const transactions = db.transactions || [];

      // Calculations:
      // Receivables are positive customer balances (they owe us)
      const receivables = customers
        .filter(c => c && typeof c.balance === 'number' && c.balance > 0)
        .reduce((sum, c) => sum + c.balance, 0);

      // Payables are positive supplier balances (we owe them) + negative customer balances (refund or advanced payments)
      const payables = suppliers
        .filter(s => s && typeof s.balance === 'number' && s.balance > 0)
        .reduce((sum, s) => sum + s.balance, 0) + 
        customers
        .filter(c => c && typeof c.balance === 'number' && c.balance < 0)
        .reduce((sum, c) => sum + Math.abs(c.balance), 0);
        
      // Cash book inflows vs outflows
      const cashIn = cashbook
        .filter(cb => cb && cb.type === 'cash-in' && typeof cb.amount === 'number')
        .reduce((sum, cb) => sum + cb.amount, 0);
      const cashOut = cashbook
        .filter(cb => cb && cb.type === 'cash-out' && typeof cb.amount === 'number')
        .reduce((sum, cb) => sum + cb.amount, 0);
      const cashInHand = cashIn - cashOut;

      // Sales are cash-in where category is 'Sales' OR sum of credit transactions (Sales made on credit) + invoices totals
      // Let's use simple sum: cash-in tagged with 'Sales' or 'Customer Payment' + total revenue from invoice totals
      const totalSales = cashbook
        .filter(cb => cb && cb.type === 'cash-in' && typeof cb.amount === 'number' && (cb.category === 'Sales' || cb.category === 'Customer Payment'))
        .reduce((sum, cb) => sum + cb.amount, 0) + 
        transactions
        .filter(t => t && t.type === 'credit' && typeof t.amount === 'number')
        .reduce((sum, t) => sum + t.amount, 0);

      // Total expenses are cash-out entries
      const totalExpenses = cashOut;

      // Net Profit
      const profit = totalSales - totalExpenses;

      res.json({
        totalSales,
        totalExpenses,
        profit,
        receivables,
        payables,
        cashInHand
      });
    } catch (err: any) {
      console.error('SERVER ERROR Calculating financial stats:', err);
      res.status(500).json({ error: 'Failed to calculate financial metrics: ' + err.message });
    }
  });

  app.get('/api/dashboard/analytics', authenticateUser, (req, res) => {
    const cashbook = db.cashbook || [];
    const transactions = db.transactions || [];
    const inventory = db.inventory || [];

    // Compute real daily breakdown for the last 7 days from actual records
    const weeklyData = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(now.getDate() - i);
      const isoDate = d.toISOString().split('T')[0];
      const label = d.toLocaleDateString('en-US', { month: 'short', day: '2-digit' });

      const dayCashSales = cashbook
        .filter(cb => cb && cb.date === isoDate && cb.type === 'cash-in' && (cb.category === 'Sales' || cb.category === 'Customer Payment'))
        .reduce((sum, cb) => sum + (Number(cb.amount) || 0), 0);

      const dayCreditSales = transactions
        .filter(t => t && t.date === isoDate && t.type === 'credit')
        .reduce((sum, t) => sum + (Number(t.amount) || 0), 0);

      const sales = dayCashSales + dayCreditSales;

      const expenses = cashbook
        .filter(cb => cb && cb.date === isoDate && cb.type === 'cash-out')
        .reduce((sum, cb) => sum + (Number(cb.amount) || 0), 0);

      weeklyData.push({
        date: label,
        sales,
        expenses,
        profit: sales - expenses
      });
    }

    // Compute category valuation from actual inventory records
    const categoryMap: Record<string, number> = {};
    inventory.forEach(item => {
      if (item && item.category) {
        const val = (Number(item.sellPrice) || 0) * (Number(item.quantity) || 0);
        categoryMap[item.category] = (categoryMap[item.category] || 0) + val;
      }
    });

    const categoryStats = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    }));

    res.json({
      weeklyData,
      categoryStats
    });
  });

  // --- Customer CRUD ---
  app.get('/api/customers', authenticateUser, (req, res) => {
    const bizId = (req as any).user?.businessId || 'b1';
    const list = (db.customers || []).filter((c: Customer) => (c.businessId || 'b1') === bizId);
    res.json(list);
  });

  app.post('/api/customers', authenticateUser, (req, res) => {
    const { name, phone, email, address, initialBalance, promisedPaymentDate, promisedPaymentNote } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Customer Name and Phone number are required' });
    }
    const bizId = (req as any).user?.businessId || 'b1';
    const nowIso = new Date().toISOString();
    
    const newCustomer: Customer = {
      id: 'c_' + Math.random().toString(36).substring(2, 9),
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : '',
      address: address ? String(address).trim() : '',
      createdAt: nowIso,
      balance: Number(initialBalance) || 0,
      updatedAt: nowIso,
      businessId: bizId,
      ...(promisedPaymentDate ? { promisedPaymentDate: String(promisedPaymentDate).trim() } : {}),
      ...(promisedPaymentNote ? { promisedPaymentNote: String(promisedPaymentNote).trim() } : {})
    };
    
    db.customers.push(newCustomer);
    
    // Add transaction history if balance isn't 0
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
        createdBy: (req as any).user.email,
        businessId: bizId
      });
    }

    saveDb(db);
    res.status(201).json(newCustomer);
  });

  app.put('/api/customers/:id', authenticateUser, (req, res) => {
    const { name, phone, email, address, balance, promisedPaymentDate, promisedPaymentNote, lastReminderOpenedAt } = req.body;
    const bizId = (req as any).user?.businessId || 'b1';
    const index = db.customers.findIndex((c: Customer) => c.id === req.params.id && (c.businessId || 'b1') === bizId);
    if (index === -1) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const updatedName = name ? String(name).trim() : db.customers[index].name;
    db.customers[index] = {
      ...db.customers[index],
      name: updatedName,
      phone: phone ? String(phone).trim() : db.customers[index].phone,
      email: email !== undefined ? String(email).trim() : db.customers[index].email,
      address: address !== undefined ? String(address).trim() : db.customers[index].address,
      balance: balance !== undefined ? Number(balance) : db.customers[index].balance,
      promisedPaymentDate:
        promisedPaymentDate !== undefined
          ? String(promisedPaymentDate).trim()
          : db.customers[index].promisedPaymentDate,
      promisedPaymentNote:
        promisedPaymentNote !== undefined
          ? String(promisedPaymentNote).trim()
          : db.customers[index].promisedPaymentNote,
      lastReminderOpenedAt:
        lastReminderOpenedAt !== undefined
          ? String(lastReminderOpenedAt).trim()
          : db.customers[index].lastReminderOpenedAt,
      updatedAt: new Date().toISOString()
    };

    // Keep customerName synced across all transactions linked by customerId
    if (name) {
      db.transactions = (db.transactions || []).map((t: Transaction) =>
        t.customerId === req.params.id ? { ...t, customerName: updatedName } : t
      );
      db.invoices = (db.invoices || []).map((inv: Invoice) =>
        inv.customerId === req.params.id ? { ...inv, customerName: updatedName } : inv
      );
    }
    
    saveDb(db);
    res.json(db.customers[index]);
  });

  app.delete('/api/customers/:id', authenticateUser, (req, res) => {
    // Check permission - Employees cannot delete
    const role = (req as any).user.role;
    if (role === 'Employee') {
      return res.status(403).json({ error: 'Forbidden: Employees cannot delete clients' });
    }

    const { id } = req.params;
    const bizId = (req as any).user?.businessId || 'b1';
    const customer = db.customers.find((c: any) => c.id === id && (c.businessId || 'b1') === bizId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    createBackupSnapshot(`Before deleting customer "${customer ? customer.name : id}"`);

    db.customers = db.customers.filter((c: any) => c.id !== id);
    db.transactions = db.transactions.filter((t: any) => t.customerId !== id);
    db.invoices = db.invoices.filter((inv: any) => inv.customerId !== id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: 'Customer deleted successfully' });
  });

  // --- Supplier CRUD ---
  app.get('/api/suppliers', authenticateUser, (req, res) => {
    res.json(db.suppliers);
  });

  app.post('/api/suppliers', authenticateUser, (req, res) => {
    const { name, phone, email, address, initialBalance } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: 'Supplier Name and Phone are required' });
    }
    const nowIso = new Date().toISOString();
    const newSupplier: Supplier = {
      id: 's_' + Math.random().toString(36).substring(2, 9),
      name: String(name).trim(),
      phone: String(phone).trim(),
      email: email ? String(email).trim() : '',
      address: address ? String(address).trim() : '',
      createdAt: nowIso,
      balance: Number(initialBalance) || 0,
      updatedAt: nowIso,
      businessId: 'b1'
    };
    
    db.suppliers.push(newSupplier);
    saveDb(db);
    res.status(201).json(newSupplier);
  });

  app.put('/api/suppliers/:id', authenticateUser, (req, res) => {
    const { name, phone, email, address, balance } = req.body;
    const index = db.suppliers.findIndex(s => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Supplier not found' });
    }
    
    db.suppliers[index] = {
      ...db.suppliers[index],
      name: name || db.suppliers[index].name,
      phone: phone || db.suppliers[index].phone,
      email: email !== undefined ? email : db.suppliers[index].email,
      address: address !== undefined ? String(address).trim() : db.suppliers[index].address,
      balance: balance !== undefined ? Number(balance) : db.suppliers[index].balance,
      updatedAt: new Date().toISOString()
    };
    
    saveDb(db);
    res.json(db.suppliers[index]);
  });

  app.delete('/api/suppliers/:id', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role === 'Employee') {
      return res.status(403).json({ error: 'Forbidden: Employee permissions cannot delete records' });
    }
    const supplier = db.suppliers.find((s: any) => s.id === req.params.id);
    createBackupSnapshot(`Before deleting supplier "${supplier ? supplier.name : req.params.id}"`);

    db.suppliers = db.suppliers.filter(s => s.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: 'Supplier deleted' });
  });

  // --- Digital Ledger / Credit Debit Transactions ---
  app.get('/api/transactions', authenticateUser, (req, res) => {
    const bizId = (req as any).user?.businessId || 'b1';
    const customerId = req.query.customerId as string | undefined;
    let list = (db.transactions || []).filter((t: Transaction) => (t.businessId || 'b1') === bizId);
    if (customerId) {
      list = list.filter((t: Transaction) => t.customerId === customerId);
    }
    res.json(list);
  });

  app.post('/api/transactions', authenticateUser, (req, res) => {
    const { customerId, type, amount, date, description } = req.body;
    
    if (!customerId || !type || !amount) {
      return res.status(400).json({ error: 'Missing customerId, type, or amount' });
    }
    
    const bizId = (req as any).user?.businessId || 'b1';
    const customer = db.customers.find((c: Customer) => c.id === customerId && (c.businessId || 'b1') === bizId);
    if (!customer) {
      return res.status(404).json({ error: 'Customer not found' });
    }
    
    const txAmount = Number(amount);
    if (isNaN(txAmount) || txAmount <= 0) {
      return res.status(400).json({ error: 'Transaction amount must be a positive number' });
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
      createdBy: (req as any).user.email,
      businessId: bizId
    };
    
    db.transactions.unshift(newTx);
    
    // Adjust customer balances
    // credit = Udhaar given (increased receivable / customer owes us more)
    // debit = Payment received (decreases customer debt)
    if (type === 'credit') {
      customer.balance += txAmount;
    } else {
      customer.balance -= txAmount;
    }
    customer.updatedAt = nowIso;
    
    // Auto-create a Cash Book entry if payment was received in cash (debit) or cash is handled
    if (type === 'debit') {
      db.cashbook.unshift({
        id: 'cb_' + Math.random().toString(36).substring(2, 9),
        type: 'cash-in',
        amount: txAmount,
        date: nowIso.split('T')[0],
        category: 'Customer Payment',
        description: `Payment from Ledger: ${customer.name} - ${description || 'No description'}`,
        createdBy: (req as any).user.email,
        businessId: bizId
      });
    }

    saveDb(db);
    res.status(201).json({ transaction: newTx, customer });
  });

  app.put('/api/transactions/:id', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role === 'Employee') {
      return res.status(403).json({ error: 'Forbidden: Employees cannot edit ledger logs' });
    }

    const bizId = (req as any).user?.businessId || 'b1';
    const txIndex = db.transactions.findIndex((t: Transaction) => t.id === req.params.id && (t.businessId || 'b1') === bizId);
    if (txIndex === -1) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    const existingTx = db.transactions[txIndex];
    const { type, amount, date, description } = req.body;
    const newType = (type === 'credit' || type === 'debit') ? type : existingTx.type;
    const newAmount = amount !== undefined ? Number(amount) : existingTx.amount;

    if (isNaN(newAmount) || newAmount <= 0) {
      return res.status(400).json({ error: 'Transaction amount must be a positive number' });
    }

    createBackupSnapshot(`Before editing ledger entry: ${existingTx.customerName} (Rs. ${existingTx.amount})`);

    const customer = db.customers.find((c: Customer) => c.id === existingTx.customerId);
    if (customer) {
      // Revert old transaction effect
      if (existingTx.type === 'credit') {
        customer.balance -= existingTx.amount;
      } else {
        customer.balance += existingTx.amount;
      }
      // Apply new transaction effect
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

    saveDb(db);
    cleanOldBackups();
    res.json({ transaction: db.transactions[txIndex], customer });
  });

  app.delete('/api/transactions/:id', authenticateUser, (req, res) => {
    // Only Owners or Managers can delete transactions
    const role = (req as any).user.role;
    if (role === 'Employee') {
      return res.status(403).json({ error: 'Forbidden: Employees cannot delete ledger logs' });
    }

    const bizId = (req as any).user?.businessId || 'b1';
    const tx = db.transactions.find((t: Transaction) => t.id === req.params.id && (t.businessId || 'b1') === bizId);
    if (!tx) {
      return res.status(404).json({ error: 'Transaction record not found' });
    }

    createBackupSnapshot(`Before deleting ledger entry: ${tx.customerName} (${tx.type === 'credit' ? 'Debt' : 'Payment'} of Rs. ${tx.amount})`);

    // Revert balance on customer
    const customer = db.customers.find((c: Customer) => c.id === tx.customerId);
    if (customer) {
      if (tx.type === 'credit') {
        customer.balance -= tx.amount;
      } else {
        customer.balance += tx.amount;
      }
      customer.updatedAt = new Date().toISOString();
    }

    db.transactions = db.transactions.filter((t: Transaction) => t.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: 'Transaction rolled back and deleted successfully', customer });
  });

  // --- Cash Book Entries ---
  app.get('/api/cashbook', authenticateUser, (req, res) => {
    res.json(db.cashbook);
  });

  app.post('/api/cashbook', authenticateUser, (req, res) => {
    const { type, amount, date, category, description } = req.body;
    
    if (!type || !amount || !category) {
      return res.status(400).json({ error: 'Missing entry type, amount, or category' });
    }
    
    const newEntry: CashBookEntry = {
      id: 'cb_' + Math.random().toString(36).substring(2, 9),
      type: type as 'cash-in' | 'cash-out',
      amount: Number(amount),
      date: date || new Date().toISOString().split('T')[0],
      category,
      description: description || '',
      createdBy: (req as any).user.email,
      businessId: 'b1'
    };
    
    db.cashbook.unshift(newEntry);
    saveDb(db);
    res.status(201).json(newEntry);
  });

  app.delete('/api/cashbook/:id', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role === 'Employee') {
      return res.status(403).json({ error: 'Forbidden: Employee permissions cannot delete history' });
    }
    const cb = db.cashbook.find((c: any) => c.id === req.params.id);
    createBackupSnapshot(`Before deleting cash entry: ${cb ? cb.category : ''} Rs. ${cb ? cb.amount : ''}`);

    db.cashbook = db.cashbook.filter(cb => cb.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: 'Cashbook entry deleted' });
  });

  // --- Inventory Management ---
  app.get('/api/inventory', authenticateUser, (req, res) => {
    res.json(db.inventory);
  });

  app.post('/api/inventory', authenticateUser, (req, res) => {
    const { name, sku, purchasePrice, sellPrice, quantity, minQuantity, category, unit } = req.body;
    if (!name || !sellPrice || quantity === undefined) {
      return res.status(400).json({ error: 'Name, Sell Price, and Quantity are required' });
    }
    
    const newItem: StockItem = {
      id: 'i_' + Math.random().toString(36).substring(2, 9),
      name,
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
    saveDb(db);
    res.status(201).json(newItem);
  });

  app.put('/api/inventory/:id', authenticateUser, (req, res) => {
    const { name, sku, purchasePrice, sellPrice, quantity, minQuantity, category, unit } = req.body;
    const index = db.inventory.findIndex(inv => inv.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Inventory stock item not found' });
    }
    
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
    
    saveDb(db);
    res.json(db.inventory[index]);
  });

  app.delete('/api/inventory/:id', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role === 'Employee') {
      return res.status(403).json({ error: 'Only Manager or Owners may delete stock logs' });
    }
    const item = db.inventory.find((i: any) => i.id === req.params.id);
    createBackupSnapshot(`Before deleting stock item "${item ? item.name : req.params.id}"`);

    db.inventory = db.inventory.filter(inv => inv.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: 'Stock item deleted' });
  });

  // --- Invoices ---
  app.get('/api/invoices', authenticateUser, (req, res) => {
    res.json(db.invoices);
  });

  app.post('/api/invoices', authenticateUser, (req, res) => {
    const { customerId, customerName, customerPhone, items, discount, tax, isPaid } = req.body;
    
    if (!customerName || !items || !items.length) {
      return res.status(400).json({ error: 'Customer name and items list are required' });
    }
    
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
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 10 days terms
      items: formattedItems,
      subTotal,
      discount: invoiceDiscount,
      tax: invoiceTax,
      total,
      isPaid: !!isPaid,
      createdBy: (req as any).user.email,
      businessId: 'b1'
    };
    
    db.invoices.unshift(newInvoice);
    
    // Deduct stock quantities sold in the invoice
    formattedItems.forEach((soldItem: any) => {
      const idx = db.inventory.findIndex(inv => inv.name.toLowerCase() === soldItem.name.toLowerCase() || inv.sku.toLowerCase() === soldItem.name.toLowerCase());
      if (idx !== -1) {
        db.inventory[idx].quantity = Math.max(0, db.inventory[idx].quantity - soldItem.quantity);
      }
    });

    // Write a corresponding cash-in transaction if already paid on create
    if (newInvoice.isPaid) {
      db.cashbook.unshift({
        id: 'cb_' + Math.random().toString(36).substring(2, 9),
        type: 'cash-in',
        amount: total,
        date: new Date().toISOString().split('T')[0],
        category: 'Sales',
        description: `Paid via Invoice ${newInvoice.invoiceNumber} to ${newInvoice.customerName}`,
        createdBy: (req as any).user.email,
        businessId: 'b1'
      });
    } else if (customerId) {
      // If client account is associated and not paid, register as dynamic Udhaar (credit) on customer ledger
      const customerObj = db.customers.find(c => c.id === customerId);
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
          createdBy: (req as any).user.email,
          businessId: 'b1'
        });
      }
    }
    
    saveDb(db);
    res.status(201).json(newInvoice);
  });



  // --- Database Backups and Rollbacks API ---
  app.get('/api/backups', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role !== 'Owner') {
      return res.status(403).json({ error: 'Only Owners can retrieve database backups list' });
    }
    
    try {
      const files = fs.readdirSync(BACKUPS_DIR).filter(f => f.endsWith('.json'));
      const backupsList = files.map(f => {
        try {
          const fullPath = path.join(BACKUPS_DIR, f);
          const stat = fs.statSync(fullPath);
          const fileContent = fs.readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(fileContent);
          if (!parsed || !parsed.metadata) return null;
          return {
            ...parsed.metadata,
            size: parsed.metadata.size || stat.size
          };
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      
      // Sort descending by timestamp (newest first) — all historical backups retained
      backupsList.sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(backupsList);
    } catch (err) {
      res.status(500).json({ error: 'Failed to retrieve backup checkpoints list' });
    }
  });

  app.post('/api/backups/create', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role !== 'Owner') {
      return res.status(403).json({ error: 'Only Owners can manually create backup checkpoints' });
    }
    
    const { label, backupType } = req.body || {};
    const validTypes = ['manual', 'daily', 'hourly', 'emergency'];
    const resolvedType = validTypes.includes(backupType) ? backupType : 'manual';
    const labelSanitized = (label || 'Manual User Checkpoint').slice(0, 120);
    const snapshot = createBackupSnapshot(labelSanitized, resolvedType as any);
    if (snapshot) {
      res.status(201).json({ message: 'Database backup checkpoint created successfully', snapshot });
    } else {
      res.status(500).json({ error: 'Failed to create backup snapshot file' });
    }
  });

  app.delete('/api/backups/:id', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role !== 'Owner') {
      return res.status(403).json({ error: 'Only authorized Administrators (Owner) can delete historical backups' });
    }

    const safeId = path.basename(String(req.params.id || ''));
    const filepath = path.join(BACKUPS_DIR, `${safeId}.json`);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Backup checkpoint file not found' });
    }

    try {
      fs.unlinkSync(filepath);
      return res.json({ message: 'Historical backup checkpoint deleted permanently.', id: safeId });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to delete backup checkpoint' });
    }
  });

  app.post('/api/backups/restore/:id', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role !== 'Owner') {
      return res.status(403).json({ error: 'Only Owners can restore older database backups' });
    }
    
    const safeId = path.basename(String(req.params.id || ''));
    const filepath = path.join(BACKUPS_DIR, `${safeId}.json`);
    if (!fs.existsSync(filepath)) {
      return res.status(404).json({ error: 'Backup checkpoint file not found' });
    }
    
    try {
      const fileContent = fs.readFileSync(filepath, 'utf-8');
      const backupObj = JSON.parse(fileContent);

      // Step 1: Verify integrity of the selected backup before mutating db
      if (!backupObj || !backupObj.db || typeof backupObj.db !== 'object') {
        return res.status(400).json({ error: 'Backup integrity check failed: corrupted snapshot structure.' });
      }

      const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
        const seen = new Map<string, T>();
        for (const item of arr || []) {
          if (item && item.id) {
            seen.set(String(item.id), item);
          }
        }
        return Array.from(seen.values());
      };

      // Step 2: Automatically create an emergency snapshot of the current database before restoring
      const emergencySnapshot = createBackupSnapshot(
        `Emergency Pre-Restore Snapshot (before restoring ${backupObj.metadata?.label || safeId})`,
        'emergency'
      );
      
      // Step 3: Restore all modules consistently with unique ID deduplication
      db.customers = dedupeById(Array.isArray(backupObj.db.customers) ? backupObj.db.customers : []);
      db.suppliers = dedupeById(Array.isArray(backupObj.db.suppliers) ? backupObj.db.suppliers : []);
      db.transactions = dedupeById(Array.isArray(backupObj.db.transactions) ? backupObj.db.transactions : []);
      db.cashbook = dedupeById(Array.isArray(backupObj.db.cashbook) ? backupObj.db.cashbook : []);
      db.inventory = dedupeById(Array.isArray(backupObj.db.inventory) ? backupObj.db.inventory : []);
      db.invoices = dedupeById(Array.isArray(backupObj.db.invoices) ? backupObj.db.invoices : []);
      
      saveDb(db);

      // Step 4: Verify restored record counts
      const verifiedCounts = {
        customers: db.customers.length,
        suppliers: db.suppliers.length,
        invoices: db.invoices.length,
        inventory: db.inventory.length,
        transactions: db.transactions.length,
        cashbook: db.cashbook.length
      };

      res.json({
        message: `Success! Ledger database restored to "${backupObj.metadata?.label || safeId}". Verified ${verifiedCounts.customers} Customers, ${verifiedCounts.suppliers} Suppliers, ${verifiedCounts.invoices} Invoices, and ${verifiedCounts.inventory} Inventory products.`,
        verifiedCounts,
        emergencySnapshot
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to restore database from snapshot checkpoint' });
    }
  });

  app.post('/api/backups/upload', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role !== 'Owner') {
      return res.status(403).json({ error: 'Only Owners can upload and restore backup files' });
    }
    
    const { backupData, sourceLabel } = req.body || {};
    if (
      !backupData ||
      (!Array.isArray(backupData.customers) &&
        !Array.isArray(backupData.suppliers) &&
        !Array.isArray(backupData.invoices) &&
        !Array.isArray(backupData.inventory))
    ) {
      return res.status(400).json({ error: 'Backup integrity check failed: Must contain valid ledger records.' });
    }
    
    try {
      const dedupeById = <T extends { id: string }>(arr: T[]): T[] => {
        const seen = new Map<string, T>();
        for (const item of arr || []) {
          if (item && item.id) {
            seen.set(String(item.id), item);
          }
        }
        return Array.from(seen.values());
      };

      // Automatically create an emergency snapshot of the current database before restoring
      const emergencySnapshot = createBackupSnapshot(
        `Emergency Pre-Restore Snapshot (before restoring ${sourceLabel || 'Excel Backup'})`,
        'emergency'
      );
      
      if (Array.isArray(backupData.customers)) db.customers = dedupeById(backupData.customers);
      if (Array.isArray(backupData.suppliers)) db.suppliers = dedupeById(backupData.suppliers);
      if (Array.isArray(backupData.transactions)) db.transactions = dedupeById(backupData.transactions);
      if (Array.isArray(backupData.cashbook)) db.cashbook = dedupeById(backupData.cashbook);
      if (Array.isArray(backupData.inventory)) db.inventory = dedupeById(backupData.inventory);
      if (Array.isArray(backupData.invoices)) db.invoices = dedupeById(backupData.invoices);
      
      saveDb(db);

      const verifiedCounts = {
        customers: db.customers.length,
        suppliers: db.suppliers.length,
        invoices: db.invoices.length,
        inventory: db.inventory.length,
        transactions: db.transactions.length,
        cashbook: db.cashbook.length
      };

      res.json({
        message: `Success! Backup data restored and verified (${verifiedCounts.customers} Customers, ${verifiedCounts.suppliers} Suppliers, ${verifiedCounts.invoices} Invoices, ${verifiedCounts.inventory} Inventory items). Emergency snapshot saved.`,
        verifiedCounts,
        emergencySnapshot
      });
    } catch (err) {
      res.status(500).json({ error: 'Failed to import backup file structure' });
    }
  });

  // --- Organized Excel (.xlsx) Backup Endpoints (Meezan Flow Backups/) ---
  app.post('/api/excel-backups/upload', (req, res) => {
    try {
      const { folderName, fileName, base64Data } = req.body || {};
      if (!folderName || !fileName || !base64Data) {
        return res.status(400).json({ error: 'folderName, fileName, and base64Data are required' });
      }
      const allowedFolders = new Set<string>(EXCEL_SUBFOLDERS);
      const safeFolder = allowedFolders.has(folderName) ? folderName : 'Complete_Backups';
      const safeFileName = path.basename(String(fileName));
      if (!safeFileName.toLowerCase().endsWith('.xlsx')) {
        return res.status(400).json({ error: 'Only .xlsx files are permitted' });
      }

      const folderDir = path.join(EXCEL_BACKUPS_ROOT, safeFolder);
      if (!fs.existsSync(folderDir)) {
        fs.mkdirSync(folderDir, { recursive: true });
      }

      const targetPath = path.join(folderDir, safeFileName);
      const tempPath = `${targetPath}.tmp_${Date.now()}`;
      const buffer = Buffer.from(base64Data, 'base64');
      if (buffer.length === 0) {
        return res.status(400).json({ error: 'Cannot save empty Excel buffer' });
      }

      // Atomic write via temp file rename so partial writes can never corrupt existing backups
      fs.writeFileSync(tempPath, buffer);
      fs.renameSync(tempPath, targetPath);

      const stat = fs.statSync(targetPath);
      const fileInfo = {
        id: `local:${safeFolder}/${safeFileName}`,
        name: safeFileName,
        modifiedTime: stat.mtime.toISOString(),
        size: String(stat.size),
        webViewLink: `/api/excel-backups/file/${encodeURIComponent(safeFolder)}/${encodeURIComponent(safeFileName)}`
      };

      return res.json(fileInfo);
    } catch (err: any) {
      console.error('Failed to store Excel backup file:', err);
      return res.status(500).json({ error: err?.message || 'Failed to store Excel backup file' });
    }
  });

  app.get('/api/excel-backups/status', (req, res) => {
    try {
      const folders = {
        rootFolderId: 'local:Meezan Flow Backups',
        customersFolderId: 'Customers',
        suppliersFolderId: 'Suppliers',
        invoicesFolderId: 'Invoices',
        inventoryFolderId: 'Inventory',
        completeBackupsFolderId: 'Complete_Backups',
        backupHistoryFolderId: 'Backup_History'
      };

      const getFileStatInfo = (folderName: string, fileName: string, moduleKey: string) => {
        const fp = path.join(EXCEL_BACKUPS_ROOT, folderName, fileName);
        if (!fs.existsSync(fp)) return null;
        const stat = fs.statSync(fp);
        return {
          id: `local:${folderName}/${fileName}`,
          name: fileName,
          modifiedTime: stat.mtime.toISOString(),
          size: String(stat.size),
          webViewLink: `/api/excel-backups/file/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`,
          module: moduleKey
        };
      };

      const moduleFiles: Record<string, any> = {};
      const cust = getFileStatInfo('Customers', 'Customers_Backup.xlsx', 'customers');
      const supp = getFileStatInfo('Suppliers', 'Suppliers_Backup.xlsx', 'suppliers');
      const inv = getFileStatInfo('Invoices', 'Invoices_Backup.xlsx', 'invoices');
      const stock = getFileStatInfo('Inventory', 'Inventory_Backup.xlsx', 'inventory');
      const comp =
        getFileStatInfo('Complete_Backups', 'Meezan_Flow_Backup.xlsx', 'complete') ||
        getFileStatInfo('Complete_Backups', 'Meezan_Flow_Full_Backup.xlsx', 'complete');

      if (cust) moduleFiles.customers = cust;
      if (supp) moduleFiles.suppliers = supp;
      if (inv) moduleFiles.invoices = inv;
      if (stock) moduleFiles.inventory = stock;
      if (comp) moduleFiles.complete = comp;

      const historyDir = path.join(EXCEL_BACKUPS_ROOT, 'Backup_History');
      let historyFiles: any[] = [];
      if (fs.existsSync(historyDir)) {
        // Never automatically truncate or delete historical backups
        historyFiles = fs
          .readdirSync(historyDir)
          .filter((f) => f.toLowerCase().endsWith('.xlsx'))
          .map((fileName) => {
            const fp = path.join(historyDir, fileName);
            const stat = fs.statSync(fp);
            return {
              id: `local:Backup_History/${fileName}`,
              name: fileName,
              modifiedTime: stat.mtime.toISOString(),
              size: String(stat.size),
              webViewLink: `/api/excel-backups/file/Backup_History/${encodeURIComponent(fileName)}`,
              module: 'history',
              _mtimeMs: stat.mtimeMs
            };
          })
          .sort((a, b) => b._mtimeMs - a._mtimeMs)
          .map(({ _mtimeMs, ...rest }) => rest);
      }

      return res.json({ folders, moduleFiles, historyFiles });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to read Excel backup status' });
    }
  });

  app.get('/api/excel-backups/file/:folderName/:fileName', (req, res) => {
    try {
      const allowedFolders = new Set<string>(EXCEL_SUBFOLDERS);
      const safeFolder = allowedFolders.has(req.params.folderName) ? req.params.folderName : '';
      const safeFileName = path.basename(String(req.params.fileName || ''));
      if (!safeFolder || !safeFileName.toLowerCase().endsWith('.xlsx')) {
        return res.status(404).json({ error: 'Excel backup file not found' });
      }
      const fp = path.join(EXCEL_BACKUPS_ROOT, safeFolder, safeFileName);
      if (!fs.existsSync(fp)) {
        return res.status(404).json({ error: 'Excel backup file not found' });
      }
      res.setHeader(
        'Content-Type',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
      );
      res.setHeader('Content-Disposition', `attachment; filename="${safeFileName}"`);
      return res.sendFile(fp);
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to download Excel backup file' });
    }
  });

  app.delete('/api/excel-backups/file/:folderName/:fileName', authenticateUser, (req, res) => {
    const role = (req as any).user.role;
    if (role !== 'Owner') {
      return res.status(403).json({ error: 'Only authorized Administrators (Owner) can delete backup files' });
    }
    try {
      const allowedFolders = new Set<string>(EXCEL_SUBFOLDERS);
      const safeFolder = allowedFolders.has(req.params.folderName) ? req.params.folderName : '';
      const safeFileName = path.basename(String(req.params.fileName || ''));
      if (!safeFolder || !safeFileName.toLowerCase().endsWith('.xlsx')) {
        return res.status(404).json({ error: 'Excel backup file not found' });
      }
      const fp = path.join(EXCEL_BACKUPS_ROOT, safeFolder, safeFileName);
      if (!fs.existsSync(fp)) {
        return res.status(404).json({ error: 'Excel backup file not found' });
      }
      fs.unlinkSync(fp);
      return res.json({ message: `Deleted backup file "${safeFileName}" permanently.` });
    } catch (err: any) {
      return res.status(500).json({ error: err?.message || 'Failed to delete Excel backup file' });
    }
  });

  // Serve static UI assets under production or use Vite in development mode
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { 
        middlewareMode: true,
        hmr: false
      },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`MeezanFlow fullstack server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
