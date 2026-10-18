var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_vite = require("vite");
var DATA_DIR = import_path.default.join(process.cwd(), "data");
var DB_FILE = import_path.default.join(DATA_DIR, "database.json");
var BACKUPS_DIR = import_path.default.join(DATA_DIR, "backups");
if (!import_fs.default.existsSync(DATA_DIR)) {
  import_fs.default.mkdirSync(DATA_DIR, { recursive: true });
}
if (!import_fs.default.existsSync(BACKUPS_DIR)) {
  import_fs.default.mkdirSync(BACKUPS_DIR, { recursive: true });
}
var initialDatabase = {
  users: [
    { id: "u1", name: "Zeeshan Ali", email: "owner@example.com", role: "Owner", password: "password123", businessName: "Al-Rehman Karyana Store" },
    { id: "u2", name: "Muzaffar Baig", email: "manager@example.com", role: "Manager", password: "password123", businessName: "Al-Rehman Karyana Store" },
    { id: "u3", name: "Asif Khan", email: "employee@example.com", role: "Employee", password: "password123", businessName: "Al-Rehman Karyana Store" }
  ],
  customers: [
    { id: "c1", name: "Bilal Ahmad", phone: "+923001234567", email: "bilal@gmail.com", balance: 14500, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), businessId: "b1" },
    { id: "c2", name: "Fatima Malik", phone: "+923219876543", email: "fatima@yahoo.com", balance: -3200, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), businessId: "b1" },
    { id: "c3", name: "Kamran Lodhi", phone: "+923124567890", email: "kamran@outlook.com", balance: 5e3, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), businessId: "b1" },
    { id: "c4", name: "Sajid Mehmood", phone: "+923335552211", email: "sajid@gmail.com", balance: 0, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), businessId: "b1" }
  ],
  suppliers: [
    { id: "s1", name: "Lahore Wholesale Distributors", phone: "+923009998887", email: "wholesale.lhr@distributor.com", balance: 25e3, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), businessId: "b1" },
    { id: "s2", name: "Metro Cash & Carry", phone: "+923001112223", email: "metro@metro.pk", balance: -8500, updatedAt: (/* @__PURE__ */ new Date()).toISOString(), businessId: "b1" }
  ],
  transactions: [
    { id: "t1", customerId: "c1", customerName: "Bilal Ahmad", type: "credit", amount: 18e3, date: "2026-05-15", description: "Bought 3 bags of premium Basmati rice and oil", createdBy: "owner@example.com", businessId: "b1" },
    { id: "t2", customerId: "c1", customerName: "Bilal Ahmad", type: "debit", amount: 3500, date: "2026-05-20", description: "Partial payment received on G-Pay", createdBy: "manager@example.com", businessId: "b1" },
    { id: "t3", customerId: "c2", customerName: "Fatima Malik", type: "debit", amount: 3200, date: "2026-05-22", description: "Advanced cash deposit for bakery bulk orders", createdBy: "employee@example.com", businessId: "b1" },
    { id: "t4", customerId: "c3", customerName: "Kamran Lodhi", type: "credit", amount: 5e3, date: "2026-05-25", description: "General store groceries on Udhaar", createdBy: "owner@example.com", businessId: "b1" }
  ],
  cashbook: [
    { id: "cb1", type: "cash-in", amount: 15e3, date: "2026-06-01", category: "Sales", description: "Cash retail sales counter matching register", createdBy: "employee@example.com", businessId: "b1" },
    { id: "cb2", type: "cash-out", amount: 4500, date: "2026-06-02", category: "Electricity Bill", description: "Paid commercial electricity bill", createdBy: "owner@example.com", businessId: "b1" },
    { id: "cb3", type: "cash-in", amount: 3500, date: "2026-06-02", category: "Customer Payment", description: "Udhaar repayment from Bilal Ahmad", createdBy: "manager@example.com", businessId: "b1" },
    { id: "cb4", type: "cash-out", amount: 1200, date: "2026-06-03", category: "Daily Tea/Meals", description: "Lunch expense for workers", createdBy: "employee@example.com", businessId: "b1" },
    { id: "cb5", type: "cash-out", amount: 8e3, date: "2026-06-03", category: "Inventory Purchase", description: "Bought milk packets locally", createdBy: "manager@example.com", businessId: "b1" }
  ],
  inventory: [
    { id: "i1", name: "Super Basmati Rice (5kg)", sku: "RICE-BAS-5", purchasePrice: 1200, sellPrice: 1500, quantity: 45, minQuantity: 10, category: "Grains & Pulses", unit: "pcs", businessId: "b1" },
    { id: "i2", name: "Dal Chana (Premium) - 1kg", sku: "PULSE-DAL-1", purchasePrice: 280, sellPrice: 340, quantity: 8, minQuantity: 15, category: "Grains & Pulses", unit: "kg", businessId: "b1" },
    { id: "i3", name: "Cooking Oil (5 Litre Can)", sku: "OIL-CAN-5", purchasePrice: 2100, sellPrice: 2450, quantity: 22, minQuantity: 5, category: "Oil & Ghee", unit: "pcs", businessId: "b1" },
    { id: "i4", name: "Tapal Danedar Tea (450g)", sku: "TEA-TAPAL-450", purchasePrice: 550, sellPrice: 620, quantity: 4, minQuantity: 8, category: "Beverages", unit: "pcs", businessId: "b1" },
    { id: "i5", name: "Surf Excel Powder (1kg)", sku: "SURF-EXCEL-1", purchasePrice: 420, sellPrice: 490, quantity: 35, minQuantity: 12, category: "Household", unit: "pcs", businessId: "b1" }
  ],
  invoices: [
    {
      id: "inv1",
      invoiceNumber: "INV-2026-001",
      customerId: "c1",
      customerName: "Bilal Ahmad",
      customerPhone: "+923001234567",
      date: "2026-05-15",
      dueDate: "2026-05-30",
      items: [
        { name: "Super Basmati Rice (5kg)", quantity: 3, price: 1500, total: 4500 },
        { name: "Cooking Oil (5 Litre Can)", quantity: 4, price: 2450, total: 9800 }
      ],
      subTotal: 14300,
      discount: 300,
      tax: 500,
      total: 14500,
      isPaid: true,
      createdBy: "owner@example.com",
      businessId: "b1"
    }
  ]
};
function loadDb() {
  try {
    if (import_fs.default.existsSync(DB_FILE)) {
      const fileData = import_fs.default.readFileSync(DB_FILE, "utf-8");
      return JSON.parse(fileData);
    }
  } catch (err) {
    console.error("Failed to load database. Reinitializing seed.", err);
  }
  import_fs.default.writeFileSync(DB_FILE, JSON.stringify(initialDatabase, null, 2), "utf-8");
  return initialDatabase;
}
function saveDb(data) {
  try {
    import_fs.default.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("Failed to write to database.json", err);
  }
}
var db = loadDb();
function createBackupSnapshot(label) {
  try {
    const id = "bk_" + Date.now();
    const timestamp = (/* @__PURE__ */ new Date()).toISOString();
    const counts = {
      customers: db?.customers?.length || 0,
      suppliers: db?.suppliers?.length || 0,
      transactions: db?.transactions?.length || 0,
      cashbook: db?.cashbook?.length || 0,
      inventory: db?.inventory?.length || 0,
      invoices: db?.invoices?.length || 0
    };
    const backupData = {
      metadata: { id, timestamp, label, counts },
      db: {
        customers: db?.customers || [],
        suppliers: db?.suppliers || [],
        transactions: db?.transactions || [],
        cashbook: db?.cashbook || [],
        inventory: db?.inventory || [],
        invoices: db?.invoices || []
      }
    };
    const filepath = import_path.default.join(BACKUPS_DIR, `${id}.json`);
    import_fs.default.writeFileSync(filepath, JSON.stringify(backupData, null, 2), "utf-8");
    return { id, timestamp, label, counts };
  } catch (err) {
    console.error("Failed to create backup snapshot", err);
    return null;
  }
}
function cleanOldBackups() {
  try {
    const files = import_fs.default.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".json")).map((f) => {
      const fp = import_path.default.join(BACKUPS_DIR, f);
      const stat = import_fs.default.statSync(fp);
      return { name: f, path: fp, mtime: stat.mtimeMs };
    });
    files.sort((a, b) => a.mtime - b.mtime);
    if (files.length > 20) {
      const toDelete = files.slice(0, files.length - 20);
      toDelete.forEach((f) => {
        try {
          import_fs.default.unlinkSync(f.path);
        } catch (e) {
          console.error("Failed to remove old backup", f.path, e);
        }
      });
    }
  } catch (err) {
    console.error("Error cleaning old backups", err);
  }
}
async function startServer() {
  const app = (0, import_express.default)();
  const PORT = 3e3;
  app.use(import_express.default.json());
  const authenticateUser = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized: No token provided" });
    }
    const email = authHeader.replace("Bearer ", "").trim();
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (!user) {
      return res.status(401).json({ error: "Unauthorized: Invalid user session token" });
    }
    req.user = user;
    next();
  };
  app.post("/api/auth/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required" });
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const { password: _, ...userWithoutPassword } = user;
    res.json({
      ...userWithoutPassword,
      token: user.email
      // Simple token: user's email acts as session key
    });
  });
  app.post("/api/auth/signup", (req, res) => {
    const { name, email, password, role, businessName } = req.body;
    if (!name || !email || !password || !businessName) {
      return res.status(400).json({ error: "All fields are required (name, email, password, businessName)" });
    }
    const existing = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (existing) {
      return res.status(400).json({ error: "A user with this email already exists" });
    }
    const newUser = {
      id: "u_" + Math.random().toString(36).substring(2, 9),
      name,
      email: email.toLowerCase(),
      password,
      role: role || "Owner",
      businessName
    };
    db.users.push(newUser);
    saveDb(db);
    const { password: _, ...userWithoutPassword } = newUser;
    res.json({
      ...userWithoutPassword,
      token: newUser.email
    });
  });
  app.post("/api/auth/forgot-password", (req, res) => {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email is required" });
    }
    const user = db.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
    if (user) {
      return res.json({ message: `Password reset link sent to ${email}. (Seed: password is '${user.password}')` });
    }
    res.status(404).json({ error: "No accounting profile found with this email" });
  });
  app.get("/api/dashboard/stats", authenticateUser, (req, res) => {
    try {
      const user = req.user;
      const customers = db.customers || [];
      const suppliers = db.suppliers || [];
      const cashbook = db.cashbook || [];
      const transactions = db.transactions || [];
      const receivables = customers.filter((c) => c && typeof c.balance === "number" && c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
      const payables = suppliers.filter((s) => s && typeof s.balance === "number" && s.balance > 0).reduce((sum, s) => sum + s.balance, 0) + customers.filter((c) => c && typeof c.balance === "number" && c.balance < 0).reduce((sum, c) => sum + Math.abs(c.balance), 0);
      const cashIn = cashbook.filter((cb) => cb && cb.type === "cash-in" && typeof cb.amount === "number").reduce((sum, cb) => sum + cb.amount, 0);
      const cashOut = cashbook.filter((cb) => cb && cb.type === "cash-out" && typeof cb.amount === "number").reduce((sum, cb) => sum + cb.amount, 0);
      const cashInHand = cashIn - cashOut;
      const totalSales = cashbook.filter((cb) => cb && cb.type === "cash-in" && typeof cb.amount === "number" && (cb.category === "Sales" || cb.category === "Customer Payment")).reduce((sum, cb) => sum + cb.amount, 0) + transactions.filter((t) => t && t.type === "credit" && typeof t.amount === "number").reduce((sum, t) => sum + t.amount, 0);
      const totalExpenses = cashOut;
      const profit = totalSales - totalExpenses;
      res.json({
        totalSales,
        totalExpenses,
        profit,
        receivables,
        payables,
        cashInHand
      });
    } catch (err) {
      console.error("SERVER ERROR Calculating financial stats:", err);
      res.status(500).json({ error: "Failed to calculate financial metrics: " + err.message });
    }
  });
  app.get("/api/dashboard/analytics", authenticateUser, (req, res) => {
    const weeklyData = [
      { date: "May 28", sales: 12e3, expenses: 3200, profit: 8800 },
      { date: "May 29", sales: 14500, expenses: 2800, profit: 11700 },
      { date: "May 30", sales: 9e3, expenses: 5100, profit: 3900 },
      { date: "May 31", sales: 18400, expenses: 1400, profit: 17e3 },
      { date: "Jun 01", sales: 15e3, expenses: 4e3, profit: 11e3 },
      { date: "Jun 02", sales: 11500, expenses: 5700, profit: 5800 },
      { date: "Jun 03", sales: 16800, expenses: 9200, profit: 7600 }
    ];
    const categoryStats = [
      { name: "Grocery & Grains", value: 45e3 },
      { name: "Oils & fats", value: 25e3 },
      { name: "Beverages/Tea", value: 18e3 },
      { name: "Household Goods", value: 12e3 }
    ];
    res.json({
      weeklyData,
      categoryStats
    });
  });
  app.get("/api/customers", authenticateUser, (req, res) => {
    res.json(db.customers);
  });
  app.post("/api/customers", authenticateUser, (req, res) => {
    const { name, phone, email, initialBalance } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Customer Name and Phone number are required" });
    }
    const newCustomer = {
      id: "c_" + Math.random().toString(36).substring(2, 9),
      name,
      phone,
      email: email || "",
      balance: Number(initialBalance) || 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      businessId: "b1"
    };
    db.customers.push(newCustomer);
    if (newCustomer.balance !== 0) {
      const type = newCustomer.balance > 0 ? "credit" : "debit";
      db.transactions.push({
        id: "t_" + Math.random().toString(36).substring(2, 9),
        customerId: newCustomer.id,
        customerName: newCustomer.name,
        type,
        amount: Math.abs(newCustomer.balance),
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        description: "Opening balance",
        createdBy: req.user.email,
        businessId: "b1"
      });
    }
    saveDb(db);
    res.status(201).json(newCustomer);
  });
  app.put("/api/customers/:id", authenticateUser, (req, res) => {
    const { name, phone, email, balance } = req.body;
    const index = db.customers.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Customer not found" });
    }
    db.customers[index] = {
      ...db.customers[index],
      name: name || db.customers[index].name,
      phone: phone || db.customers[index].phone,
      email: email !== void 0 ? email : db.customers[index].email,
      balance: balance !== void 0 ? Number(balance) : db.customers[index].balance,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb(db);
    res.json(db.customers[index]);
  });
  app.delete("/api/customers/:id", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role === "Employee") {
      return res.status(403).json({ error: "Forbidden: Employees cannot delete clients" });
    }
    const { id } = req.params;
    const customer = db.customers.find((c) => c.id === id);
    createBackupSnapshot(`Before deleting customer "${customer ? customer.name : id}"`);
    db.customers = db.customers.filter((c) => c.id !== id);
    db.transactions = db.transactions.filter((t) => t.customerId !== id);
    db.invoices = db.invoices.filter((inv) => inv.customerId !== id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: "Customer deleted successfully" });
  });
  app.get("/api/suppliers", authenticateUser, (req, res) => {
    res.json(db.suppliers);
  });
  app.post("/api/suppliers", authenticateUser, (req, res) => {
    const { name, phone, email, initialBalance } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Supplier Name and Phone are required" });
    }
    const newSupplier = {
      id: "s_" + Math.random().toString(36).substring(2, 9),
      name,
      phone,
      email: email || "",
      balance: Number(initialBalance) || 0,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      businessId: "b1"
    };
    db.suppliers.push(newSupplier);
    saveDb(db);
    res.status(201).json(newSupplier);
  });
  app.put("/api/suppliers/:id", authenticateUser, (req, res) => {
    const { name, phone, email, balance } = req.body;
    const index = db.suppliers.findIndex((s) => s.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Supplier not found" });
    }
    db.suppliers[index] = {
      ...db.suppliers[index],
      name: name || db.suppliers[index].name,
      phone: phone || db.suppliers[index].phone,
      email: email !== void 0 ? email : db.suppliers[index].email,
      balance: balance !== void 0 ? Number(balance) : db.suppliers[index].balance,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    saveDb(db);
    res.json(db.suppliers[index]);
  });
  app.delete("/api/suppliers/:id", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role === "Employee") {
      return res.status(403).json({ error: "Forbidden: Employee permissions cannot delete records" });
    }
    const supplier = db.suppliers.find((s) => s.id === req.params.id);
    createBackupSnapshot(`Before deleting supplier "${supplier ? supplier.name : req.params.id}"`);
    db.suppliers = db.suppliers.filter((s) => s.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: "Supplier deleted" });
  });
  app.get("/api/transactions", authenticateUser, (req, res) => {
    res.json(db.transactions);
  });
  app.post("/api/transactions", authenticateUser, (req, res) => {
    const { customerId, type, amount, date, description } = req.body;
    if (!customerId || !type || !amount) {
      return res.status(400).json({ error: "Missing customerId, type, or amount" });
    }
    const customer = db.customers.find((c) => c.id === customerId);
    if (!customer) {
      return res.status(404).json({ error: "Customer not found" });
    }
    const txAmount = Number(amount);
    const newTx = {
      id: "t_" + Math.random().toString(36).substring(2, 9),
      customerId,
      customerName: customer.name,
      type,
      amount: txAmount,
      date: date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      description: description || "",
      createdBy: req.user.email,
      businessId: "b1"
    };
    db.transactions.unshift(newTx);
    if (type === "credit") {
      customer.balance += txAmount;
    } else {
      customer.balance -= txAmount;
    }
    customer.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    if (type === "debit") {
      db.cashbook.unshift({
        id: "cb_" + Math.random().toString(36).substring(2, 9),
        type: "cash-in",
        amount: txAmount,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        category: "Customer Payment",
        description: `Payment from Ledger: ${customer.name} - ${description || "No description"}`,
        createdBy: req.user.email,
        businessId: "b1"
      });
    } else {
    }
    saveDb(db);
    res.status(201).json({ transaction: newTx, customer });
  });
  app.delete("/api/transactions/:id", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role === "Employee") {
      return res.status(403).json({ error: "Forbidden: Employees cannot delete ledger logs" });
    }
    const tx = db.transactions.find((t) => t.id === req.params.id);
    if (!tx) {
      return res.status(404).json({ error: "Transaction record not found" });
    }
    createBackupSnapshot(`Before deleting ledger entry: ${tx.customerName} (${tx.type === "credit" ? "Debt" : "Payment"} of Rs. ${tx.amount})`);
    const customer = db.customers.find((c) => c.id === tx.customerId);
    if (customer) {
      if (tx.type === "credit") {
        customer.balance -= tx.amount;
      } else {
        customer.balance += tx.amount;
      }
      customer.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    }
    db.transactions = db.transactions.filter((t) => t.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: "Transaction rolled back and deleted successfully", customer });
  });
  app.get("/api/cashbook", authenticateUser, (req, res) => {
    res.json(db.cashbook);
  });
  app.post("/api/cashbook", authenticateUser, (req, res) => {
    const { type, amount, date, category, description } = req.body;
    if (!type || !amount || !category) {
      return res.status(400).json({ error: "Missing entry type, amount, or category" });
    }
    const newEntry = {
      id: "cb_" + Math.random().toString(36).substring(2, 9),
      type,
      amount: Number(amount),
      date: date || (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      category,
      description: description || "",
      createdBy: req.user.email,
      businessId: "b1"
    };
    db.cashbook.unshift(newEntry);
    saveDb(db);
    res.status(201).json(newEntry);
  });
  app.delete("/api/cashbook/:id", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role === "Employee") {
      return res.status(403).json({ error: "Forbidden: Employee permissions cannot delete history" });
    }
    const cb = db.cashbook.find((c) => c.id === req.params.id);
    createBackupSnapshot(`Before deleting cash entry: ${cb ? cb.category : ""} Rs. ${cb ? cb.amount : ""}`);
    db.cashbook = db.cashbook.filter((cb2) => cb2.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: "Cashbook entry deleted" });
  });
  app.get("/api/inventory", authenticateUser, (req, res) => {
    res.json(db.inventory);
  });
  app.post("/api/inventory", authenticateUser, (req, res) => {
    const { name, sku, purchasePrice, sellPrice, quantity, minQuantity, category, unit } = req.body;
    if (!name || !sellPrice || quantity === void 0) {
      return res.status(400).json({ error: "Name, Sell Price, and Quantity are required" });
    }
    const newItem = {
      id: "i_" + Math.random().toString(36).substring(2, 9),
      name,
      sku: sku || "SKU-" + Math.random().toString(36).substring(2, 7).toUpperCase(),
      purchasePrice: Number(purchasePrice) || 0,
      sellPrice: Number(sellPrice),
      quantity: Number(quantity),
      minQuantity: Number(minQuantity) || 5,
      category: category || "General",
      unit: unit || "pcs",
      businessId: "b1"
    };
    db.inventory.push(newItem);
    saveDb(db);
    res.status(201).json(newItem);
  });
  app.put("/api/inventory/:id", authenticateUser, (req, res) => {
    const { name, sku, purchasePrice, sellPrice, quantity, minQuantity, category, unit } = req.body;
    const index = db.inventory.findIndex((inv) => inv.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: "Inventory stock item not found" });
    }
    db.inventory[index] = {
      ...db.inventory[index],
      name: name || db.inventory[index].name,
      sku: sku || db.inventory[index].sku,
      purchasePrice: purchasePrice !== void 0 ? Number(purchasePrice) : db.inventory[index].purchasePrice,
      sellPrice: sellPrice !== void 0 ? Number(sellPrice) : db.inventory[index].sellPrice,
      quantity: quantity !== void 0 ? Number(quantity) : db.inventory[index].quantity,
      minQuantity: minQuantity !== void 0 ? Number(minQuantity) : db.inventory[index].minQuantity,
      category: category || db.inventory[index].category,
      unit: unit || db.inventory[index].unit
    };
    saveDb(db);
    res.json(db.inventory[index]);
  });
  app.delete("/api/inventory/:id", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role === "Employee") {
      return res.status(403).json({ error: "Only Manager or Owners may delete stock logs" });
    }
    const item = db.inventory.find((i) => i.id === req.params.id);
    createBackupSnapshot(`Before deleting stock item "${item ? item.name : req.params.id}"`);
    db.inventory = db.inventory.filter((inv) => inv.id !== req.params.id);
    saveDb(db);
    cleanOldBackups();
    res.json({ message: "Stock item deleted" });
  });
  app.get("/api/invoices", authenticateUser, (req, res) => {
    res.json(db.invoices);
  });
  app.post("/api/invoices", authenticateUser, (req, res) => {
    const { customerId, customerName, customerPhone, items, discount, tax, isPaid } = req.body;
    if (!customerName || !items || !items.length) {
      return res.status(400).json({ error: "Customer name and items list are required" });
    }
    const formattedItems = items.map((itm) => ({
      name: String(itm.name),
      quantity: Number(itm.quantity),
      price: Number(itm.price),
      total: Number(itm.quantity) * Number(itm.price)
    }));
    const subTotal = formattedItems.reduce((sum, itm) => sum + itm.total, 0);
    const invoiceTax = Number(tax) || 0;
    const invoiceDiscount = Number(discount) || 0;
    const total = subTotal + invoiceTax - invoiceDiscount;
    const invoiceCount = db.invoices.length + 1;
    const invoiceNumStr = String(invoiceCount).padStart(3, "0");
    const newInvoice = {
      id: "inv_" + Math.random().toString(36).substring(2, 9),
      invoiceNumber: `INV-2026-${invoiceNumStr}`,
      customerId,
      customerName,
      customerPhone,
      date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
      dueDate: new Date(Date.now() + 10 * 24 * 60 * 60 * 1e3).toISOString().split("T")[0],
      // 10 days terms
      items: formattedItems,
      subTotal,
      discount: invoiceDiscount,
      tax: invoiceTax,
      total,
      isPaid: !!isPaid,
      createdBy: req.user.email,
      businessId: "b1"
    };
    db.invoices.unshift(newInvoice);
    formattedItems.forEach((soldItem) => {
      const idx = db.inventory.findIndex((inv) => inv.name.toLowerCase() === soldItem.name.toLowerCase() || inv.sku.toLowerCase() === soldItem.name.toLowerCase());
      if (idx !== -1) {
        db.inventory[idx].quantity = Math.max(0, db.inventory[idx].quantity - soldItem.quantity);
      }
    });
    if (newInvoice.isPaid) {
      db.cashbook.unshift({
        id: "cb_" + Math.random().toString(36).substring(2, 9),
        type: "cash-in",
        amount: total,
        date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
        category: "Sales",
        description: `Paid via Invoice ${newInvoice.invoiceNumber} to ${newInvoice.customerName}`,
        createdBy: req.user.email,
        businessId: "b1"
      });
    } else if (customerId) {
      const customerObj = db.customers.find((c) => c.id === customerId);
      if (customerObj) {
        customerObj.balance += total;
        customerObj.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
        db.transactions.unshift({
          id: "t_" + Math.random().toString(36).substring(2, 9),
          customerId,
          customerName: customerObj.name,
          type: "credit",
          amount: total,
          date: (/* @__PURE__ */ new Date()).toISOString().split("T")[0],
          description: `Dispatched Invoice ${newInvoice.invoiceNumber}`,
          invoiceId: newInvoice.id,
          createdBy: req.user.email,
          businessId: "b1"
        });
      }
    }
    saveDb(db);
    res.status(201).json(newInvoice);
  });
  app.post("/api/demo/reset", authenticateUser, (req, res) => {
    createBackupSnapshot("Before resetting database to demo state");
    db = JSON.parse(JSON.stringify(initialDatabase));
    saveDb(db);
    cleanOldBackups();
    res.json({ message: "Demo database reset successfully" });
  });
  app.post("/api/demo/clear", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role !== "Owner") {
      return res.status(403).json({ error: "Only Owners can wipe all data" });
    }
    createBackupSnapshot("Before wiping all records");
    db.customers = [];
    db.suppliers = [];
    db.transactions = [];
    db.cashbook = [];
    db.inventory = [];
    db.invoices = [];
    saveDb(db);
    cleanOldBackups();
    res.json({ message: "All demo and business records cleared successfully! You have a clean slate." });
  });
  app.get("/api/backups", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role !== "Owner") {
      return res.status(403).json({ error: "Only Owners can retrieve database backups list" });
    }
    try {
      const files = import_fs.default.readdirSync(BACKUPS_DIR).filter((f) => f.endsWith(".json"));
      const backupsList = files.map((f) => {
        try {
          const fileContent = import_fs.default.readFileSync(import_path.default.join(BACKUPS_DIR, f), "utf-8");
          const parsed = JSON.parse(fileContent);
          return parsed.metadata;
        } catch (e) {
          return null;
        }
      }).filter(Boolean);
      backupsList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      res.json(backupsList);
    } catch (err) {
      res.status(500).json({ error: "Failed to retrieve backup checkpoints list" });
    }
  });
  app.post("/api/backups/create", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role !== "Owner") {
      return res.status(403).json({ error: "Only Owners can manually create backup checkpoints" });
    }
    const { label } = req.body;
    const labelSanitized = (label || "Manual User Checkpoint").slice(0, 100);
    const snapshot = createBackupSnapshot(labelSanitized);
    if (snapshot) {
      cleanOldBackups();
      res.status(201).json({ message: "Database backup checkpoint created successfully", snapshot });
    } else {
      res.status(500).json({ error: "Failed to create backup snapshot file" });
    }
  });
  app.post("/api/backups/restore/:id", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role !== "Owner") {
      return res.status(403).json({ error: "Only Owners can restore older database backups" });
    }
    const { id } = req.params;
    const filepath = import_path.default.join(BACKUPS_DIR, `${id}.json`);
    if (!import_fs.default.existsSync(filepath)) {
      return res.status(404).json({ error: "Backup checkpoint file not found" });
    }
    try {
      createBackupSnapshot(`Auto-backup before restoring Checkpoint ID: ${id}`);
      const fileContent = import_fs.default.readFileSync(filepath, "utf-8");
      const backupObj = JSON.parse(fileContent);
      db.customers = backupObj.db.customers || [];
      db.suppliers = backupObj.db.suppliers || [];
      db.transactions = backupObj.db.transactions || [];
      db.cashbook = backupObj.db.cashbook || [];
      db.inventory = backupObj.db.inventory || [];
      db.invoices = backupObj.db.invoices || [];
      saveDb(db);
      cleanOldBackups();
      res.json({ message: "Success! Ledger database rolled back to: " + backupObj.metadata.label });
    } catch (err) {
      res.status(500).json({ error: "Failed to restore database from snapshot checkpoint" });
    }
  });
  app.post("/api/backups/upload", authenticateUser, (req, res) => {
    const role = req.user.role;
    if (role !== "Owner") {
      return res.status(403).json({ error: "Only Owners can upload custom backup json files" });
    }
    const { backupData } = req.body;
    if (!backupData || !backupData.customers) {
      return res.status(400).json({ error: "Invalid backup structure. Must contain standard ledger records." });
    }
    try {
      createBackupSnapshot("Auto-backup before importing custom json file");
      db.customers = backupData.customers || [];
      db.suppliers = backupData.suppliers || [];
      db.transactions = backupData.transactions || [];
      db.cashbook = backupData.cashbook || [];
      db.inventory = backupData.inventory || [];
      db.invoices = backupData.invoices || [];
      saveDb(db);
      cleanOldBackups();
      res.json({ message: "Success! Custom backup JSON file imported successfully." });
    } catch (err) {
      res.status(500).json({ error: "Failed to import custom backup file structure" });
    }
  });
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`DigiKhata fullstack server running on http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
