import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  Users, 
  Truck, 
  Wallet, 
  Package, 
  FileSpreadsheet, 
  TrendingUp, 
  Search, 
  Plus, 
  Trash2, 
  MessageSquare, 
  CheckCircle, 
  X, 
  AlertTriangle, 
  RefreshCw, 
  Info, 
  ShieldAlert, 
  PhoneCall, 
  Download, 
  UserPlus, 
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  DollarSign,
  Database,
  History,
  UploadCloud,
  Activity,
  ShieldCheck,
  Globe,
  Star,
  ChevronDown,
  Send,
  Menu,
  PanelLeftClose,
  PanelLeftOpen
} from 'lucide-react';
import { api } from './api';
import { translations, Language } from './translations';
import { 
  User, 
  Customer, 
  Supplier, 
  Transaction, 
  CashBookEntry, 
  StockItem, 
  Invoice, 
  FinancialStats,
  UserRole 
} from './types';
import ThemeToggle from './components/ThemeToggle';
import LanguageToggle from './components/LanguageToggle';
import DashboardCharts from './components/DashboardCharts';
import InvoicePrinter from './components/InvoicePrinter';
import InteractiveLanding from './components/InteractiveLanding';
import AuthPages, { AuthScreenMode } from './components/AuthPages';
import DebtSummary from './components/DebtSummary';
import CustomerFolderSystem from './components/CustomerFolderSystem';
import Footer from './components/Footer';
import { BRAND, MeezanFlowLogo } from './brand';
import { 
  auth, 
  googleProvider, 
  signInWithPopup, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  sendPasswordResetEmail, 
  signOut, 
  updateProfile, 
  onAuthStateChanged,
  formatFirebaseAuthError
} from './firebase';

export default function App() {
  // Session / Authentication state
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('user_session');
    return saved ? JSON.parse(saved) : null;
  });
  
  // Login form states
  const [isLogin, setIsLogin] = useState(true);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authName, setAuthName] = useState('');
  const [authBusiness, setAuthBusiness] = useState('');
  const [authRole, setAuthRole] = useState<UserRole>('Owner');
  const [authError, setAuthError] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [isAuthLoading, setIsAuthLoading] = useState(false);

  // Progressive Web App states for prompting and standalone flow
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showInstallBtn, setShowInstallBtn] = useState(false);
  const [isInStandaloneMode, setIsInStandaloneMode] = useState(false);

  // App Layout States
  const [activeTab, setActiveTab] = useState<'dashboard' | 'customers' | 'suppliers' | 'cashbook' | 'inventory' | 'invoices'>('dashboard');
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'en';
  });

  // Business Data States
  const [stats, setStats] = useState<FinancialStats | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cashbook, setCashbook] = useState<CashBookEntry[]>([]);
  const [inventory, setInventory] = useState<StockItem[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  
  // Sync Status
  const [lastSync, setLastSync] = useState<string>('');
  const [isSyncing, setIsSyncing] = useState(false);
  const [globalError, setGlobalError] = useState('');

  // Search & Filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterOption, setFilterOption] = useState('all');

  // Modals / Drawers Open state
  const [activeModal, setActiveModal] = useState<
    'customer' | 'supplier' | 'transaction' | 'cashbook' | 'inventory' | 'invoice' | 'backups' | null
  >(null);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  // Backups and Safety Recovery Rollbacks states
  const [backups, setBackups] = useState<any[]>([]);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [isSavingBackup, setIsSavingBackup] = useState(false);
  const [backupLabel, setBackupLabel] = useState('');

  // Custom interactive overlays bypassing sandboxed iframe confirmation issues
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmBtnText?: string;
    onConfirm: () => void;
  } | null>(null);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
  } | null>(null);

  // Homepage and Portal state controllers
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authScreenMode, setAuthScreenMode] = useState<'landing' | AuthScreenMode>('landing');
  const [showIosInstruction, setShowIosInstruction] = useState(false);
  const [faqOpenIndex, setFaqOpenIndex] = useState<number | null>(null);

  const askConfirm = (title: string, message: string, onConfirm: () => void, confirmBtnText?: string) => {
    setConfirmState({
      isOpen: true,
      title,
      message,
      confirmBtnText,
      onConfirm: () => {
        onConfirm();
        setConfirmState(null);
      }
    });
  };

  const triggerAlert = (message: string, title?: string) => {
    setAlertState({
      isOpen: true,
      title: title || (language === 'en' ? 'Alert' : 'اطلاع'),
      message
    });
  };

  // Form Inputs - Fresh Customer
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custBalance, setCustBalance] = useState('');

  // Form Inputs - Fresh Supplier
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppBalance, setSuppBalance] = useState('');

  // Form Inputs - Ledger transaction (Credit or Debit)
  const [txCustId, setTxCustId] = useState('');
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txAmount, setTxAmount] = useState('');
  const [txDesc, setTxDesc] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Inputs - Cash book item
  const [cbType, setCbType] = useState<'cash-in' | 'cash-out'>('cash-in');
  const [cbAmount, setCbAmount] = useState('');
  const [cbCategory, setCbCategory] = useState('Sales');
  const [cbDesc, setCbDesc] = useState('');
  const [cbDate, setCbDate] = useState(new Date().toISOString().split('T')[0]);

  // Form Inputs - Stock product item
  const [stockName, setStockName] = useState('');
  const [stockSku, setStockSku] = useState('');
  const [stockQty, setStockQty] = useState('');
  const [stockMinQty, setStockMinQty] = useState('5');
  const [stockPurchase, setStockPurchase] = useState('');
  const [stockSell, setStockSell] = useState('');
  const [stockCategory, setStockCategory] = useState('General');
  const [stockUnit, setStockUnit] = useState('pcs');

  // Form Inputs - Invoice creator
  const [invCustId, setInvCustId] = useState('');
  const [invCustName, setInvCustName] = useState('');
  const [invCustPhone, setInvCustPhone] = useState('');
  const [invoiceItems, setInvoiceItems] = useState<{ name: string; quantity: number; price: number }[]>([
    { name: '', quantity: 1, price: 0 }
  ]);
  const [invDiscount, setInvDiscount] = useState('0');
  const [invTax, setInvTax] = useState('0');
  const [invIsPaid, setInvIsPaid] = useState(true);

  const t = translations[language];

  // Set initial text direction
  useEffect(() => {
    document.documentElement.dir = language === 'ur' ? 'rtl' : 'ltr';
  }, [language]);

  // Fetch all business records from Express backend
  const fetchAllData = async () => {
    if (!user) return;
    setIsSyncing(true);
    setGlobalError('');
    try {
      const [
        dashboardStats,
        dashboardAnalytics,
        customersList,
        suppliersList,
        transactionsList,
        cashbookList,
        inventoryList,
        invoicesList
      ] = await Promise.all([
        api.getStats(),
        api.getAnalytics(),
        api.getCustomers(),
        api.getSuppliers(),
        api.getTransactions(),
        api.getCashbook(),
        api.getInventory(),
        api.getInvoices()
      ]);

      setStats(dashboardStats);
      setAnalytics(dashboardAnalytics);
      setCustomers(customersList);
      setSuppliers(suppliersList);
      setTransactions(transactionsList);
      setCashbook(cashbookList);
      setInventory(inventoryList);
      setInvoices(invoicesList);
      
      setLastSync(new Date().toLocaleTimeString());
    } catch (err: any) {
      console.error(err);
      if (err.message === 'Unauthorized') {
        setUser(null);
        localStorage.removeItem('user_session');
        localStorage.removeItem('token');
        setGlobalError('Your session has expired or is invalid. Please log in again.');
      } else {
        setGlobalError(err.message || `Trouble connecting to ${BRAND.name} server. Showing cache.`);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  // Trigger sync on login or role swap
  useEffect(() => {
    if (user) {
      fetchAllData();
    }
  }, [user]);

  // Handle Progressive Web App (PWA) installation hooks
  useEffect(() => {
    // Detect standalone launching
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone;
    setIsInStandaloneMode(!!isStandalone);

    const handleBeforeInstallPrompt = (e: Event) => {
      console.log('beforeinstallprompt event caught. PWA install button will be shown.');
      // Prevent browser default prompt (e.g. Chrome mini-banner)
      e.preventDefault();
      // Keep event for manual installation triggers
      setDeferredPrompt(e);
      setShowInstallBtn(true);
    };

    const handleAppInstalled = () => {
      console.log('MeezanFlow was successfully installed on local system.');
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) {
      console.warn('Install prompt deferred state is null');
      return;
    }
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User responded to installation selection with: ${outcome}`);
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstallBtn(false);
    }
  };

  const handleInstallClick = () => {
    const isIOS = typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream;
    if (isIOS) {
      setShowIosInstruction(true);
    } else if (deferredPrompt) {
      handleInstallApp();
    } else {
      triggerAlert(
        language === 'en'
          ? `Please open your browser menu and choose "Install ${BRAND.name}" or "Add to Home Screen" to launch the app.`
          : 'اپنے براؤزر مینیو پر کلک کریں اور ایپ ہوم اسکرین پر شامل کرنے کے لیے "Install" یا "Add to Home Screen" منتخب کریں۔'
      );
    }
  };

  // Guard to prevent duplicate concurrent firebaseLogin calls when signInWithPopup triggers onAuthStateChanged
  const isManualAuthInProgress = React.useRef(false);

  // Sync Firebase authentication state
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (fbUser) => {
      if (isManualAuthInProgress.current) {
        return;
      }
      const userEmail = fbUser?.email || fbUser?.providerData?.[0]?.email;
      if (fbUser && userEmail) {
        let currentSaved: User | null = null;
        try {
          const savedSession = localStorage.getItem('user_session');
          currentSaved = savedSession ? JSON.parse(savedSession) : null;
        } catch {
          currentSaved = null;
        }
        if (!currentSaved || currentSaved.email.toLowerCase() !== userEmail.toLowerCase()) {
          try {
            const syncedUser = await api.firebaseLogin({
              email: userEmail,
              name: fbUser.displayName || fbUser.providerData?.[0]?.displayName || userEmail.split('@')[0],
              uid: fbUser.uid,
              role: currentSaved?.role || 'Owner',
              businessName: currentSaved?.businessName || 'MeezanFlow Business'
            });
            setUser(syncedUser);
            localStorage.setItem('user_session', JSON.stringify(syncedUser));
          } catch (e) {
            console.error('Firebase session restore error:', e);
          }
        }
      }
    });
    return () => unsubscribe();
  }, []);

  // Firebase Google Sign-In Handler
  const handleGoogleSignIn = async () => {
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    isManualAuthInProgress.current = true;
    try {
      const res = await signInWithPopup(auth, googleProvider);
      const fbUser = res.user;
      const userEmail = fbUser.email || fbUser.providerData?.[0]?.email;
      if (!userEmail) {
        throw new Error('No email address was returned from your Google account.');
      }
      const syncedUser = await api.firebaseLogin({
        email: userEmail,
        name: fbUser.displayName || fbUser.providerData?.[0]?.displayName || userEmail.split('@')[0],
        uid: fbUser.uid,
        role: authRole || 'Owner',
        businessName: authBusiness || 'MeezanFlow Business'
      });
      setUser(syncedUser);
      localStorage.setItem('user_session', JSON.stringify(syncedUser));
      setShowAuthModal(false);
    } catch (err: any) {
      console.error('Google sign-in error:', err);
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      isManualAuthInProgress.current = false;
      setIsAuthLoading(false);
    }
  };

  // Auth Submit Handler (Firebase Email Authentication + Fallback)
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    isManualAuthInProgress.current = true;
    try {
      if (isLogin) {
        let fbUser: any = null;
        try {
          const res = await signInWithEmailAndPassword(auth, authEmail, authPassword);
          fbUser = res.user;
        } catch (fbErr: any) {
          // If the Firebase project hasn't toggled Email/Password provider yet or user is a seed demo account
          if (fbErr.code === 'auth/operation-not-allowed' || fbErr.code === 'auth/user-not-found') {
            try {
              const loggedUser = await api.login({ email: authEmail, password: authPassword });
              setUser(loggedUser);
              localStorage.setItem('user_session', JSON.stringify(loggedUser));
              setShowAuthModal(false);
              return;
            } catch {
              throw fbErr;
            }
          }
          throw fbErr;
        }

        const syncedUser = await api.firebaseLogin({
          email: fbUser.email || authEmail,
          name: fbUser.displayName || (fbUser.email || authEmail).split('@')[0],
          uid: fbUser.uid
        });
        setUser(syncedUser);
        localStorage.setItem('user_session', JSON.stringify(syncedUser));
        setShowAuthModal(false);
      } else {
        // Registering with Firebase Email/Password
        const res = await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        if (authName) {
          try {
            await updateProfile(res.user, { displayName: authName });
          } catch (pErr) {
            console.warn('Profile name update error:', pErr);
          }
        }
        const registered = await api.firebaseLogin({
          name: authName || res.user.email?.split('@')[0],
          email: authEmail,
          uid: res.user.uid,
          role: authRole,
          businessName: authBusiness || 'MeezanFlow Business'
        });
        setUser(registered);
        localStorage.setItem('user_session', JSON.stringify(registered));
        setShowAuthModal(false);
      }
    } catch (err: any) {
      console.error('Email auth error:', err);
      setAuthError(formatFirebaseAuthError(err));
    } finally {
      isManualAuthInProgress.current = false;
      setIsAuthLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!authEmail) {
      setAuthError('Please fill in your email address first');
      return;
    }
    setIsAuthLoading(true);
    setAuthError('');
    setAuthMessage('');
    try {
      await sendPasswordResetEmail(auth, authEmail);
      setAuthMessage(`Firebase reset email dispatched to ${authEmail}. Please check your inbox.`);
    } catch (err: any) {
      // Fallback
      try {
        const resp = await api.forgotPassword(authEmail);
        setAuthMessage(resp);
      } catch {
        setAuthError(formatFirebaseAuthError(err));
      }
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (e) {
      console.error('Firebase signout error:', e);
    }
    setUser(null);
    localStorage.removeItem('user_session');
    localStorage.removeItem('token');
  };

  // Modal CRUD Operations
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomer({
        name: custName,
        phone: custPhone,
        email: custEmail,
        initialBalance: custBalance
      });
      setActiveModal(null);
      // Reset
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setCustBalance('');
      fetchAllData();
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const handleDeleteCustomer = (id: string) => {
    if (user?.role === 'Employee') {
      triggerAlert(t.roleRestricted);
      return;
    }
    askConfirm(
      language === 'en' ? 'Delete Customer Folder' : 'گاہک فولڈر حذف کریں',
      t.deleteConfirm,
      async () => {
        try {
          await api.deleteCustomer(id);
          if (selectedCustomerId === id) {
            setSelectedCustomerId(null);
          }
          fetchAllData();
        } catch (err: any) {
          triggerAlert(err.message);
        }
      }
    );
  };

  const handleAddSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSupplier({
        name: suppName,
        phone: suppPhone,
        email: suppEmail,
        initialBalance: suppBalance
      });
      setActiveModal(null);
      setSuppName('');
      setSuppPhone('');
      setSuppEmail('');
      setSuppBalance('');
      fetchAllData();
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const handleDeleteSupplier = (id: string) => {
    if (user?.role === 'Employee') {
      triggerAlert(t.roleRestricted);
      return;
    }
    askConfirm(
      language === 'en' ? 'Delete Supplier' : 'سپلائر حذف کریں',
      t.deleteConfirm,
      async () => {
        try {
          await api.deleteSupplier(id);
          fetchAllData();
        } catch (err: any) {
          triggerAlert(err.message);
        }
      }
    );
  };

  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!txCustId) {
      triggerAlert('Please select a customer first');
      return;
    }
    try {
      await api.createTransaction({
        customerId: txCustId,
        type: txType,
        amount: txAmount,
        date: txDate,
        description: txDesc
      });
      setActiveModal(null);
      setTxCustId('');
      setTxAmount('');
      setTxDesc('');
      fetchAllData();
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const handleDeleteTransaction = (id: string) => {
    if (user?.role === 'Employee') {
      triggerAlert(t.roleRestricted);
      return;
    }
    askConfirm(
      language === 'en' ? 'Delete Transaction' : 'لین دین حذف کریں',
      t.deleteConfirm,
      async () => {
        try {
          await api.deleteTransaction(id);
          fetchAllData();
        } catch (err: any) {
          triggerAlert(err.message);
        }
      }
    );
  };

  const handleAddCashEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCashEntry({
        type: cbType,
        amount: cbAmount,
        date: cbDate,
        category: cbCategory,
        description: cbDesc
      });
      setActiveModal(null);
      setCbAmount('');
      setCbDesc('');
      fetchAllData();
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const handleDeleteCashEntry = (id: string) => {
    if (user?.role === 'Employee') {
      triggerAlert(t.roleRestricted);
      return;
    }
    askConfirm(
      language === 'en' ? 'Delete Cash Entry' : 'کیش اندراج حذف کریں',
      t.deleteConfirm,
      async () => {
        try {
          await api.deleteCashEntry(id);
          fetchAllData();
        } catch (err: any) {
          triggerAlert(err.message);
        }
      }
    );
  };

  const handleAddStock = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createStockItem({
        name: stockName,
        sku: stockSku,
        quantity: stockQty,
        minQuantity: stockMinQty,
        purchasePrice: stockPurchase,
        sellPrice: stockSell,
        category: stockCategory,
        unit: stockUnit
      });
      setActiveModal(null);
      setStockName('');
      setStockSku('');
      setStockQty('');
      setStockPurchase('');
      setStockSell('');
      fetchAllData();
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const handleDeleteStock = (id: string) => {
    if (user?.role === 'Employee') {
      triggerAlert(t.roleRestricted);
      return;
    }
    askConfirm(
      language === 'en' ? 'Delete Stock Item' : 'اسٹاک آئٹم حذف کریں',
      t.deleteConfirm,
      async () => {
        try {
          await api.deleteStockItem(id);
          fetchAllData();
        } catch (err: any) {
          triggerAlert(err.message);
        }
      }
    );
  };

  // Quick helper to fill invoice profile matching customer dropdown
  const handleInvoiceCustomerSelect = (id: string) => {
    setInvCustId(id);
    const cust = customers.find(c => c.id === id);
    if (cust) {
      setInvCustName(cust.name);
      setInvCustPhone(cust.phone);
    }
  };

  // Add line item rows
  const addInvoiceRow = () => {
    setInvoiceItems([...invoiceItems, { name: '', quantity: 1, price: 0 }]);
  };

  const removeInvoiceRow = (index: number) => {
    setInvoiceItems(invoiceItems.filter((_, idx) => idx !== index));
  };

  const updateInvoiceRow = (index: number, key: 'name' | 'quantity' | 'price', value: any) => {
    const freshRows = [...invoiceItems];
    if (key === 'name') {
      freshRows[index].name = value;
      // If product exists in stock, auto-populate the unit price in building mode!
      const productObj = inventory.find(itm => itm.name === value || itm.sku === value);
      if (productObj) {
        freshRows[index].price = productObj.sellPrice;
      }
    } else {
      freshRows[index][key] = Number(value);
    }
    setInvoiceItems(freshRows);
  };

  const handleBuildInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanItems = invoiceItems.filter(itm => itm.name && itm.quantity > 0);
    if (!cleanItems.length) {
      alert('Please include at least one product label');
      return;
    }
    try {
      const generatedInvoice = await api.createInvoice({
        customerId: invCustId || undefined,
        customerName: invCustName || 'General Cash Counter',
        customerPhone: invCustPhone || '',
        items: cleanItems,
        discount: invDiscount,
        tax: invTax,
        isPaid: invIsPaid
      });
      
      // Open printer overlay directly!
      setSelectedInvoice(generatedInvoice);
      setActiveModal(null);
      
      // Reset invoice states
      setInvCustId('');
      setInvCustName('');
      setInvCustPhone('');
      setInvoiceItems([{ name: '', quantity: 1, price: 0 }]);
      setInvDiscount('0');
      setInvTax('0');
      
      fetchAllData();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const fetchBackups = async () => {
    if (user?.role !== 'Owner') return;
    try {
      setIsLoadingBackups(true);
      const list = await api.getBackups();
      setBackups(list);
    } catch (err: any) {
      console.error('Failed to load backup checkpoints', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleCreateBackup = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    const label = backupLabel.trim() || (language === 'en' ? 'Manual Checkpoint' : 'دستی بیک اپ');
    try {
      setIsSavingBackup(true);
      await api.createBackup(label);
      setBackupLabel('');
      triggerAlert(
        language === 'en' 
          ? 'Backup snapshot created successfully! Keep doing business with a peace of mind.' 
          : 'بیک اپ پوائنٹ کامیابی سے محفوظ ہو گیا ہے! اب آپ اطمینان سے کام کر سکتے ہیں۔',
        language === 'en' ? 'Success' : 'کامیابی'
      );
      fetchBackups();
    } catch (err: any) {
      triggerAlert(err.message);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRestoreBackup = (id: string, label: string) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    const msg = language === 'en'
      ? `Are you absolutely sure you want to restore "${label}"? This will rollback all business ledger states to this checkpoint.`
      : `کیا آپ واقعی اس بیک اپ "${label}" کو بحال کرنا چاہتے ہیں؟ اس سے تمام کھاتہ جاتی تفصیلات اس وقت کے مطابق تبدیل ہو جائیں گی۔`;
    
    askConfirm(
      language === 'en' ? 'Restore Checkpoint' : 'بیک اپ بحال کریں',
      msg,
      async () => {
        try {
          const res = await api.restoreBackup(id);
          triggerAlert(res.message, language === 'en' ? 'Restored' : 'بحال شدہ');
          fetchAllData();
          fetchBackups();
          setActiveModal(null);
        } catch (err: any) {
          triggerAlert(err.message);
        }
      }
    );
  };

  const handleManualExport = async () => {
    try {
      // Create a safety snapshot on the server first
      await api.createBackup(language === 'en' ? 'Auto-backup before manual export' : 'فائل ایکسپورٹ سے قبل بیک اپ');
      
      // Prepare the downloaded file
      const backupPayload = {
        customers,
        suppliers,
        transactions,
        cashbook,
        inventory,
        invoices,
        exportedAt: new Date().toISOString(),
        appName: BRAND.name,
        businessName: user?.businessName || 'Default Shop'
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(backupPayload, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `meezanflow_backup_${new Date().toISOString().slice(0,10)}_${(user?.businessName || 'shop').replace(/\s+/g, '_')}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();

      triggerAlert(
        language === 'en'
          ? 'Backup downloaded successfully as a JSON file! Keep this file in a safe folder.'
          : 'بیک اپ فائل کامیابی سے ڈاؤن لوڈ ہو گئی ہے! اسے محفوظ فولڈر میں رکھیں۔',
        language === 'en' ? 'File Export' : 'فائل ایکسپورٹ'
      );
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const handleManualImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed.customers || !Array.isArray(parsed.customers)) {
          throw new Error(language === 'en' ? `Invalid ${BRAND.name} Backup file format` : 'غلط بیک اپ فائل فارمیٹ');
        }

        askConfirm(
          language === 'en' ? 'Import Backup File' : 'بیک اپ فائل امپورٹ کریں',
          language === 'en'
            ? `Warning: Restoring this backup file will overwrite your current ledger. Current state will be auto-saved so you can undo if needed. Proceed?`
            : `وارننگ: یہ فائل اپلوڈ کرنے سے موجودہ کھاتہ بدل جائے گا۔ آپ کا موجودہ کھاتہ خود بخود محفوظ ہو جائے گا تاکہ ضرورت پڑنے پر واپس جا سکیں۔ کیا آپ جاری رکھنا چاہتے ہیں؟`,
          async () => {
            try {
              const res = await api.uploadBackup(parsed);
              triggerAlert(res.message, language === 'en' ? 'Imported' : 'کامیابی');
              fetchAllData();
              fetchBackups();
              setActiveModal(null);
            } catch (err: any) {
              triggerAlert(err.message);
            }
          }
        );
      } catch (err: any) {
        triggerAlert(language === 'en' ? 'Failed to parse file: ' + err.message : 'فائل پارس کرنے میں ناکامی: ' + err.message);
      }
    };
    reader.readAsText(file);
    // Reset file input target
    e.target.value = '';
  };

  useEffect(() => {
    if (activeModal === 'backups') {
      fetchBackups();
    }
  }, [activeModal]);

  // Compose dynamic WhatsApp links with debt reminder template!
  const getWhatsAppLink = (customerName: string, phone: string, balance: number) => {
    const formattedPhone = phone.replace('+', '').trim();
    const message = language === 'en'
      ? `Dear ${customerName},\nThis is a friendly payment reminder from ${user?.businessName || 'our shop'}. Your outstanding credit balance is Rs ${balance.toLocaleString()}.\nPlease clear payment soon. Cash & digital transfer accepted.\nThank you!`
      : `محترم ${customerName} صاحب،\nرقم کی ادائیگی یاد دہانی: آپ کا ${user?.businessName || 'ہماری دکان'} کا بقایا ادھار Rs ${balance.toLocaleString()} ہے۔ برائے مہربانی جلد سے جلد بقایا صاف فرمائیں۔ شکریہ!`;
    return `https://wa.me/${formattedPhone}?text=${encodeURIComponent(message)}`;
  };

  // Compose native SMS intent URI with debt reminder template
  const getSingleSmsLink = (customerName: string, phone: string, balance: number) => {
    const isApple = typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    const queryChar = isApple ? '&' : '?';
    const cleanPhone = phone.trim().replace(/[\s-]/g, '');
    const sName = user?.businessName || (language === 'en' ? 'our shop' : 'ہماری دکان');
    const message = language === 'ur'
      ? `محترم ${customerName} صاحب، ${sName} کی طرف سے یاد دہانی: آپ کا بقایا ادھار Rs ${balance.toLocaleString()} واجب الادا ہے۔ برائے مہربانی جلد ادا فرمائیں۔ شکریہ!`
      : `Dear ${customerName}, payment reminder from ${sName}: your pending balance is Rs ${balance.toLocaleString()}. Please clear at your earliest convenience. Thank you!`;
    return `sms:${cleanPhone}${queryChar}body=${encodeURIComponent(message)}`;
  };

  // Multi-field Local Search & category filter logic
  const getFilteredCustomers = () => {
    let list = [...customers];
    if (searchTerm) {
      list = list.filter(c => 
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        c.phone.includes(searchTerm) ||
        (c.email && c.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    if (filterOption === 'receivable') {
      list = list.filter(c => c.balance > 0);
    } else if (filterOption === 'payable') {
      list = list.filter(c => c.balance < 0);
    }
    return list;
  };

  const getFilteredTransactions = () => {
    let list = [...transactions];
    if (searchTerm) {
      list = list.filter(t => 
        t.customerName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        t.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterOption === 'credit') {
      list = list.filter(t => t.type === 'credit');
    } else if (filterOption === 'debit') {
      list = list.filter(t => t.type === 'debit');
    }
    return list;
  };

  const getFilteredCashbook = () => {
    let list = [...cashbook];
    if (searchTerm) {
      list = list.filter(cb => 
        cb.category.toLowerCase().includes(searchTerm.toLowerCase()) || 
        cb.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterOption === 'cash-in') {
      list = list.filter(cb => cb.type === 'cash-in');
    } else if (filterOption === 'cash-out') {
      list = list.filter(cb => cb.type === 'cash-out');
    }
    return list;
  };

  const getFilteredInventory = () => {
    let list = [...inventory];
    if (searchTerm) {
      list = list.filter(itm => 
        itm.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        itm.sku.toLowerCase().includes(searchTerm.toLowerCase()) || 
        itm.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    if (filterOption === 'low-stock') {
      list = list.filter(itm => itm.quantity <= itm.minQuantity);
    }
    return list;
  };

  const lowStockItems = inventory.filter(itm => itm.quantity <= itm.minQuantity);

  const activePreLoginMode = showAuthModal
    ? isLogin
      ? 'login'
      : 'signup'
    : authScreenMode;

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-zinc-950 text-slate-900 dark:text-zinc-100 flex flex-col font-sans transition-colors duration-200">
      <div className="flex-1 flex flex-col">
        {!user ? (
          <>
            {activePreLoginMode === 'landing' ? (
              <InteractiveLanding
                language={language}
                setLanguage={setLanguage}
                onOpenAuth={(targetMode: AuthScreenMode) => {
                  setIsLogin(targetMode === 'login');
                  setAuthError('');
                  setAuthMessage('');
                  if (targetMode === 'signup') {
                    setAuthEmail('');
                    setAuthPassword('');
                  }
                  setAuthScreenMode(targetMode);
                }}
                handleGoogleSignIn={handleGoogleSignIn}
                isAuthLoading={isAuthLoading}
                showInstallBtn={
                  showInstallBtn ||
                  (!isInStandaloneMode &&
                    typeof window !== 'undefined' &&
                    /iPad|iPhone|iPod/.test(window.navigator.userAgent) &&
                    !(window as any).MSStream)
                }
                handleInstallClick={handleInstallClick}
                t={t}
              />
            ) : (
              <AuthPages
                mode={activePreLoginMode}
                setMode={(nextMode: AuthScreenMode) => {
                  setIsLogin(nextMode === 'login');
                  setShowAuthModal(false);
                  setAuthScreenMode(nextMode);
                }}
                onBackToLanding={() => {
                  setShowAuthModal(false);
                  setAuthScreenMode('landing');
                  setAuthError('');
                  setAuthMessage('');
                }}
                language={language}
                setLanguage={setLanguage}
                authEmail={authEmail}
                setAuthEmail={setAuthEmail}
                authPassword={authPassword}
                setAuthPassword={setAuthPassword}
                authName={authName}
                setAuthName={setAuthName}
                authBusiness={authBusiness}
                setAuthBusiness={setAuthBusiness}
                authRole={authRole}
                setAuthRole={setAuthRole}
                authError={authError}
                setAuthError={setAuthError}
                authMessage={authMessage}
                setAuthMessage={setAuthMessage}
                isAuthLoading={isAuthLoading}
                onAuthSubmit={handleAuthSubmit}
                onForgotPassword={handleForgotPassword}
                onGoogleSignIn={handleGoogleSignIn}
                t={t}
              />
            )}

            {/* iOS PWA Install Instruction Modal */}
            {showIosInstruction && (
              <div className="fixed inset-0 z-[100] bg-slate-900/70 backdrop-blur-xs flex justify-center items-center p-4">
                <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative">
                  <div className="flex flex-col items-center text-center">
                    <div className="mb-4">
                      <MeezanFlowLogo size={48} />
                    </div>

                    <h3 className="text-base font-bold text-slate-900 dark:text-white mb-2 leading-snug">
                      {language === 'en' ? `Install ${BRAND.name}` : 'میزان فلو انسٹال کریں'}
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 mb-5 leading-relaxed">
                      {t.installDesc}
                    </p>

                    <div className="w-full text-left bg-slate-50 dark:bg-zinc-950 p-4 rounded-xl border border-slate-200/80 dark:border-zinc-800 space-y-3 mb-5">
                      <div className="flex gap-2.5 items-start">
                        <span className="h-5 w-5 font-bold text-[10px] bg-[#0B192C] text-[#D4AF37] rounded-full flex items-center justify-center shrink-0">
                          1
                        </span>
                        <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium pt-0.5">
                          {language === 'en'
                            ? 'Open this webpage in Apple Safari browser.'
                            : 'اس لنک کو اپنے آئی فون کے سفاری (Safari) براؤزر میں کھولیں۔'}
                        </p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="h-5 w-5 font-bold text-[10px] bg-[#0B192C] text-[#D4AF37] rounded-full flex items-center justify-center shrink-0">
                          2
                        </span>
                        <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium pt-0.5">
                          {language === 'en' ? (
                            <>
                              Tap the{' '}
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 dark:bg-zinc-800 rounded text-[10px] font-bold">
                                Share
                              </span>{' '}
                              button at the bottom of the screen.
                            </>
                          ) : (
                            <>
                              صفحے کے نیچے موجود{' '}
                              <span className="inline-flex items-center px-1.5 py-0.5 bg-slate-200 dark:bg-zinc-800 rounded text-[10px] font-bold">
                                شیئر (Share)
                              </span>{' '}
                              بٹن پر کلک کریں۔
                            </>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="h-5 w-5 font-bold text-[10px] bg-[#0B192C] text-[#D4AF37] rounded-full flex items-center justify-center shrink-0">
                          3
                        </span>
                        <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium pt-0.5">
                          {language === 'en'
                            ? 'Scroll down and select "Add to Home Screen".'
                            : 'تھوڑا نیچے جا کر "Add to Home Screen" منتخب کریں۔'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => setShowIosInstruction(false)}
                      className="w-full py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132847] text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Got It' : 'ٹھیک ہے'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 bg-[#F8FAFC] dark:bg-zinc-950 flex flex-col min-w-0">
            {/* Top Main Navigation Header */}
            <header className="bg-white dark:bg-zinc-900 border-b border-slate-200/80 dark:border-zinc-800 sticky top-0 z-40 px-3 sm:px-6">
              <div className="flex justify-between h-16 items-center max-w-7xl mx-auto gap-2">
                {/* Left: Mobile Hamburger + Logo Brand */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    id="mobile-menu-toggle-btn"
                    onClick={() => setIsMobileMenuOpen(true)}
                    aria-label="Open navigation menu"
                    className="md:hidden p-2 -ml-1 rounded-xl text-slate-700 dark:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer shrink-0"
                  >
                    <Menu className="h-5 w-5" />
                  </button>

                  <MeezanFlowLogo size={36} className="shrink-0" />

                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <h1 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white tracking-tight truncate leading-none">
                        {BRAND.name}
                      </h1>
                      <span className="hidden xs:inline-block text-[10px] font-mono font-bold text-[#9A7B1C] dark:text-[#D4AF37] bg-[#D4AF37]/15 px-1.5 py-0.5 rounded border border-[#D4AF37]/30 shrink-0">
                        PRO
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-500 dark:text-zinc-400 font-medium mt-0.5 max-w-[180px] sm:max-w-xs truncate">
                      {user.businessName}
                      <span className="hidden sm:inline"> • {lastSync ? `Synced ${lastSync}` : 'Cloud Ledger'}</span>
                    </p>
                  </div>
                </div>

                {/* Right: Core Settings & Profile Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                  {/* PWA Install Button */}
                  {(showInstallBtn || (!isInStandaloneMode && (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream))) && (
                    <button
                      type="button"
                      onClick={handleInstallClick}
                      title={t.installDesc}
                      className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 hover:bg-[#D4AF37]/20 text-[#0B192C] dark:text-[#D4AF37] text-xs font-bold shadow-2xs transition-all cursor-pointer"
                    >
                      <Download className="h-3.5 w-3.5" />
                      <span className="hidden lg:inline">{t.installApp}</span>
                    </button>
                  )}

                  {isSyncing ? (
                    <div className="p-2">
                      <RefreshCw className="h-4 w-4 text-[#D4AF37] animate-spin shrink-0" />
                    </div>
                  ) : (
                    <button 
                      onClick={fetchAllData}
                      title={language === 'en' ? 'Sync Ledger' : 'ریفریش کریں'}
                      className="p-2 text-slate-500 hover:text-[#0B192C] dark:text-zinc-400 dark:hover:text-[#D4AF37] rounded-xl hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      <RefreshCw className="h-4 w-4" />
                    </button>
                  )}

                  <div className="hidden sm:block">
                    <LanguageToggle language={language} setLanguage={setLanguage} />
                  </div>
                  <ThemeToggle />

                  <div className="hidden sm:block h-7 w-[1px] bg-slate-200 dark:bg-zinc-800 mx-0.5"></div>

                  {/* User Profile & Logout (Desktop/Tablet) */}
                  <div className="hidden sm:flex items-center gap-2">
                    <div className="text-right hidden lg:block">
                      <p className="text-xs font-bold text-slate-800 dark:text-zinc-200 truncate max-w-[140px]">{user.name}</p>
                      <p className="text-[10px] text-[#9A7B1C] dark:text-[#D4AF37] font-mono font-bold capitalize">
                        {t[user.role.toLowerCase() as 'owner' | 'manager' | 'employee']}
                      </p>
                    </div>
                    <button
                      id="logout-btn"
                      onClick={handleLogout}
                      className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/20 dark:hover:text-red-400 bg-white dark:bg-zinc-900 text-slate-700 dark:text-zinc-300 transition-all cursor-pointer shadow-2xs"
                    >
                      {t.logout}
                    </button>
                  </div>
                </div>
              </div>
            </header>

            {/* Mobile Slide-Over Navigation Drawer (< md) */}
            {isMobileMenuOpen && (
              <div className="md:hidden fixed inset-0 z-50 flex">
                <div
                  className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                  onClick={() => setIsMobileMenuOpen(false)}
                />
                <div className="relative z-10 w-72 max-w-[85vw] bg-white dark:bg-zinc-900 h-full shadow-2xl border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between p-4 overflow-y-auto">
                  <div className="space-y-5">
                    {/* Drawer Header */}
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <MeezanFlowLogo size={34} />
                        <div className="min-w-0">
                          <p className="text-sm font-extrabold text-slate-900 dark:text-white truncate">{BRAND.name}</p>
                          <p className="text-[10px] text-slate-400 truncate">{BRAND.tagline}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => setIsMobileMenuOpen(false)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    </div>

                    {/* Signed-In User Card */}
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800">
                      <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{user.name}</p>
                      <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{user.businessName}</p>
                      <span className="inline-block mt-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-[#0B192C] text-[#D4AF37] capitalize">
                        {t[user.role.toLowerCase() as 'owner' | 'manager' | 'employee']}
                      </span>
                    </div>

                    {/* Navigation Links */}
                    <div className="space-y-1">
                      {[
                        { id: 'dashboard', name: t.dashboard, icon: TrendingUp },
                        { id: 'customers', name: t.customers, icon: Users },
                        { id: 'suppliers', name: t.suppliers, icon: Truck },
                        { id: 'cashbook', name: t.cashBook, icon: Wallet },
                        { id: 'inventory', name: t.inventory, icon: Package },
                        { id: 'invoices', name: t.invoices, icon: FileSpreadsheet }
                      ].map((item) => {
                        const IconComponent = item.icon;
                        const isSelected = activeTab === item.id;
                        return (
                          <button
                            key={`drawer-${item.id}`}
                            type="button"
                            onClick={() => {
                              setActiveTab(item.id as any);
                              setSearchTerm('');
                              setFilterOption('all');
                              if (item.id === 'customers') {
                                setSelectedCustomerId(null);
                              }
                              setIsMobileMenuOpen(false);
                            }}
                            className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl w-full text-left transition-all cursor-pointer ${
                              isSelected
                                ? 'bg-[#0B192C] text-white dark:bg-[#D4AF37] dark:text-[#0B192C] shadow-xs'
                                : 'text-slate-600 dark:text-zinc-400 hover:bg-slate-100 dark:hover:bg-zinc-800'
                            }`}
                          >
                            <IconComponent className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#D4AF37] dark:text-[#0B192C]' : ''}`} />
                            <span className="truncate">{item.name}</span>
                            {item.id === 'inventory' && lowStockItems.length > 0 && (
                              <span className="rtl:mr-auto ltr:ml-auto bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                {lowStockItems.length}
                              </span>
                            )}
                          </button>
                        );
                      })}
                    </div>

                    {user.role === 'Owner' && (
                      <div className="pt-2 border-t border-slate-100 dark:border-zinc-800">
                        <button
                          type="button"
                          onClick={() => {
                            setIsMobileMenuOpen(false);
                            setActiveModal('backups');
                          }}
                          className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 hover:border-[#0B192C] dark:hover:border-[#D4AF37] text-xs font-semibold cursor-pointer"
                        >
                          <Database className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>{language === 'en' ? 'Backups & Recovery Hub' : 'بیک اپ اور بحالی مرکز'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Drawer Footer Controls */}
                  <div className="pt-4 border-t border-slate-100 dark:border-zinc-800 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                        {language === 'en' ? 'Language' : 'زبان'}
                      </span>
                      <LanguageToggle language={language} setLanguage={setLanguage} />
                    </div>

                    {(showInstallBtn || (!isInStandaloneMode && (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream))) && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsMobileMenuOpen(false);
                          handleInstallClick();
                        }}
                        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 text-[#0B192C] dark:text-[#D4AF37] text-xs font-bold cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{t.installApp}</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setIsMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full py-2.5 rounded-xl border border-red-200 dark:border-red-950 bg-red-50/60 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer"
                    >
                      {t.logout}
                    </button>
                  </div>
                </div>
              </div>
            )}

      {/* Main Grid Wrapper */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-4 pb-24 md:py-6 md:pb-8 flex-1 flex flex-col md:flex-row gap-4 lg:gap-6 min-w-0">

        {/* Sidebar Nav Links (Collapsible on Tablet & Desktop) */}
        <nav
          className={`hidden md:flex shrink-0 flex-col gap-1.5 transition-all duration-200 ${
            isSidebarCollapsed ? 'w-20' : 'md:w-52 lg:w-64'
          }`}
        >
          <div className="flex items-center justify-between px-2 mb-1">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {language === 'en' ? 'Navigation' : 'مینو'}
              </span>
            )}
            <button
              type="button"
              onClick={() => setIsSidebarCollapsed((prev) => !prev)}
              title={isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer ml-auto"
            >
              {isSidebarCollapsed ? (
                <PanelLeftOpen className="h-4 w-4" />
              ) : (
                <PanelLeftClose className="h-4 w-4" />
              )}
            </button>
          </div>

          {[
            { id: 'dashboard', name: t.dashboard, icon: TrendingUp },
            { id: 'customers', name: t.customers, icon: Users },
            { id: 'suppliers', name: t.suppliers, icon: Truck },
            { id: 'cashbook', name: t.cashBook, icon: Wallet },
            { id: 'inventory', name: t.inventory, icon: Package },
            { id: 'invoices', name: t.invoices, icon: FileSpreadsheet }
          ].map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <button
                key={item.id}
                title={item.name}
                onClick={() => {
                  setActiveTab(item.id as any);
                  setSearchTerm('');
                  setFilterOption('all');
                  if (item.id === 'customers') {
                    setSelectedCustomerId(null);
                  }
                }}
                className={`relative flex items-center ${
                  isSidebarCollapsed ? 'justify-center px-2 py-3' : 'gap-3 px-4 py-3'
                } text-xs lg:text-sm font-semibold rounded-2xl w-full text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-[#0B192C] text-white dark:bg-[#D4AF37] dark:text-[#0B192C] shadow-xs ring-1 ring-[#0B192C] dark:ring-[#D4AF37]' 
                    : 'text-slate-600 dark:text-zinc-400 hover:text-[#0B192C] dark:hover:text-[#D4AF37] hover:bg-white dark:hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <IconComponent className={`h-[18px] w-[18px] shrink-0 ${isSelected ? 'text-[#D4AF37] dark:text-[#0B192C]' : ''}`} />
                {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                {item.id === 'inventory' && lowStockItems.length > 0 && (
                  <span
                    className={`${
                      isSidebarCollapsed
                        ? 'absolute top-1.5 right-1.5'
                        : 'rtl:mr-auto ltr:ml-auto'
                    } bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full`}
                  >
                    {lowStockItems.length}
                  </span>
                )}
              </button>
            );
          })}

          {user.role === 'Owner' && (
            <div className="mt-6 border-t border-slate-200/70 dark:border-zinc-800 pt-5">
              <button
                type="button"
                id="backups-hub-btn"
                title={language === 'en' ? 'Backups & Recovery Hub' : 'بیک اپ اور بحالی مرکز'}
                onClick={() => setActiveModal('backups')}
                className={`w-full flex items-center justify-center gap-2 ${
                  isSidebarCollapsed ? 'p-3' : 'px-3.5 py-2.5'
                } rounded-xl border border-dashed border-slate-300 hover:border-[#0B192C] text-slate-700 dark:border-zinc-700 dark:hover:border-[#D4AF37] dark:text-zinc-300 bg-white/60 dark:bg-zinc-900/50 transition-all text-xs font-semibold cursor-pointer shadow-2xs`}
              >
                <Database className="h-4 w-4 text-[#D4AF37] shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="truncate">{language === 'en' ? 'Backups & Recovery' : 'بیک اپ اور بحالی'}</span>
                )}
              </button>
            </div>
          )}
        </nav>

        {/* Dynamic Display Area */}
        <main className="flex-1 min-w-0" id="main-content-window">
          {globalError && (
            <div className="mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3.5 sm:p-4 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-400 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="break-words">{globalError}</div>
            </div>
          )}

          {/* 1. DASHBOARD TAB */}
          {activeTab === 'dashboard' && (
            <div className="space-y-5 sm:space-y-6">
              
              {/* Financial Bento Stats Matrix */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
                
                {/* Sale box */}
                <div className="bg-[#0B192C] text-white rounded-2xl p-4 sm:p-5 shadow-xs border border-[#1E293B] flex flex-col justify-between min-h-[116px]">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-extrabold text-slate-300">{t.sales}</span>
                    <span className="h-6 w-6 rounded-lg bg-[#D4AF37]/15 text-[#D4AF37] flex items-center justify-center">
                      <ArrowUpRight className="h-3.5 w-3.5" />
                    </span>
                  </div>
                  <div className="mt-2 select-all">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tabular-nums break-words">
                      Rs {stats?.totalSales.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-300 flex items-center gap-1">
                    <span>{language === 'en' ? 'Invoices & Counter Cash' : 'کل آمدنی اور کھاتا کیش ان'}</span>
                  </div>
                </div>

                {/* Receivables box */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[116px]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500">{t.receivables}</span>
                  <div className="mt-2 select-all text-amber-600 dark:text-amber-400">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tabular-nums break-words">
                      Rs {stats?.receivables.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" />
                    <span>{language === 'en' ? 'Debt Udhaar from customers' : 'وہ رقم جو گاہکوں سے لینی ہے'}</span>
                  </div>
                </div>

                {/* Payables box */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[116px]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500">{t.payables}</span>
                  <div className="mt-2 select-all text-red-600 dark:text-red-400">
                    <span className="text-xl sm:text-2xl lg:text-3xl font-black font-mono tabular-nums break-words">
                      Rs {stats?.payables.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3 shrink-0" />
                    <span>{language === 'en' ? 'Due to distributor suppliers' : 'سپلائرز کو دینے والے پیسے'}</span>
                  </div>
                </div>

                {/* Expenses box */}
                <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[116px]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400 dark:text-zinc-500">{t.expenses}</span>
                  <div className="mt-2 select-all text-slate-800 dark:text-zinc-200">
                    <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums break-words">
                      Rs {stats?.totalExpenses.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-1">
                    <ArrowDownLeft className="h-3.5 w-3.5 text-red-500 shrink-0" />
                    <span>{language === 'en' ? 'Daily shop bills & wages' : 'دکان کے روزمرہ اخراجات'}</span>
                  </div>
                </div>

                {/* Profit box - only viewable by Owner/Manager */}
                {user.role !== 'Employee' ? (
                  <div className="bg-emerald-50/70 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-900/60 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[116px]">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-emerald-800 dark:text-emerald-400">{t.profit}</span>
                    <div className="mt-2 select-all text-emerald-700 dark:text-emerald-300">
                      <span className="text-xl sm:text-2xl font-black font-mono tabular-nums break-words">
                        Rs {stats?.profit.toLocaleString() || '0'}
                      </span>
                    </div>
                    <div className="mt-2 text-[10px] text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                      <TrendingUp className="h-3.5 w-3.5 shrink-0" />
                      <span>{language === 'en' ? 'Revenue minus cash expense' : 'خالص منافع موازنہ'}</span>
                    </div>
                  </div>
                ) : (
                  <div className="bg-slate-100 dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-center items-center text-center opacity-65 min-h-[116px]">
                    <ShieldAlert className="h-5 w-5 text-slate-400 mb-1" />
                    <span className="text-[10px] text-slate-400 font-bold">{t.profit} Status Locked</span>
                  </div>
                )}

                {/* Cash in Hand */}
                <div className="bg-slate-900 text-white dark:bg-zinc-900 border border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between min-h-[116px]">
                  <span className="text-[11px] uppercase tracking-wider font-bold text-slate-400">{t.cashInHand}</span>
                  <div className="mt-2 select-all text-[#D4AF37]">
                    <span className="text-xl sm:text-2xl font-bold font-mono tabular-nums break-words">
                      Rs {stats?.cashInHand.toLocaleString() || '0'}
                    </span>
                  </div>
                  <div className="mt-2 text-[10px] text-slate-400">
                    <span>{language === 'en' ? 'Physical cash in drawer' : 'کیبن دراز میں نقد رقم'}</span>
                  </div>
                </div>
              </div>

              {/* Debt Summary & High-Risk Account Categorization */}
              <DebtSummary
                customers={customers}
                suppliers={suppliers}
                transactions={transactions}
                lang={language}
                getSingleSmsLink={getSingleSmsLink}
                getWhatsAppLink={getWhatsAppLink}
                onQuickRecordPayment={(customer) => {
                  setTxCustId(customer.id);
                  setTxType('debit');
                  setTxAmount(String(customer.balance));
                  setTxDesc(language === 'en' ? 'Payment received' : 'بقایا ادائیگی وصول');
                  setActiveModal('transaction');
                }}
                onNavigateToAccount={(targetTab, accountName) => {
                  setActiveTab(targetTab);
                  if (targetTab === 'customers') {
                    if (accountName) {
                      const matched = customers.find(
                        (c) => c.name.toLowerCase() === accountName.toLowerCase()
                      );
                      setSelectedCustomerId(matched ? matched.id : null);
                    } else {
                      setSelectedCustomerId(null);
                    }
                  } else {
                    setSearchTerm(accountName);
                    setFilterOption('all');
                  }
                }}
              />

              {/* Reports Trend Charts */}
              {user.role !== 'Employee' && (
                <DashboardCharts analytics={analytics} lang={language} />
              )}

              {/* Low Stock Indicators */}
              <div className="bg-white dark:bg-zinc-900 border border-gray-100 dark:border-zinc-850 rounded-2xl p-5 shadow-sm">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-sm font-bold text-gray-800 dark:text-zinc-200 flex items-center gap-2">
                    <Package id="dash-pack" className="h-4.5 w-4.5 text-amber-500 animate-pulse" />
                    <span>{t.lowStockAlerts}</span>
                  </h3>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-50 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 font-semibold">
                    {lowStockItems.length} {language === 'en' ? 'items item level low' : 'اشیاء کم ہیں'}
                  </span>
                </div>

                {lowStockItems.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {lowStockItems.map((itm) => (
                      <div 
                        key={itm.id}
                        className="p-3 border border-amber-150 dark:border-amber-950 bg-amber-50/10 dark:bg-amber-950/5 rounded-xl flex items-center justify-between"
                      >
                        <div>
                          <p className="text-xs font-semibold text-gray-800 dark:text-zinc-200">{itm.name}</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">SKU: {itm.sku}</p>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-black text-red-600 dark:text-red-400 font-mono">
                            {itm.quantity} {itm.unit}
                          </span>
                          <span className="block text-[8px] text-gray-400">Min: {itm.minQuantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-6 text-xs text-gray-400">
                    🌿 {t.noLowStock}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* 2. CUSTOMERS TAB (Customer Folder System) */}
          {activeTab === 'customers' && (
            <CustomerFolderSystem
              customers={customers}
              transactions={transactions}
              language={language}
              businessName={user.businessName}
              userRole={user.role}
              selectedCustomerId={selectedCustomerId}
              onSelectCustomer={setSelectedCustomerId}
              onCreateCustomer={async (payload) => {
                try {
                  const created = await api.createCustomer(payload);
                  await fetchAllData();
                  if (created && created.id) {
                    setSelectedCustomerId(created.id);
                  }
                } catch (err: any) {
                  triggerAlert(err.message);
                  throw err;
                }
              }}
              onUpdateCustomer={async (id, payload) => {
                try {
                  await api.updateCustomer(id, payload);
                  await fetchAllData();
                } catch (err: any) {
                  triggerAlert(err.message);
                  throw err;
                }
              }}
              onDeleteCustomer={handleDeleteCustomer}
              onCreateTransaction={async (payload) => {
                try {
                  await api.createTransaction(payload);
                  await fetchAllData();
                } catch (err: any) {
                  triggerAlert(err.message);
                  throw err;
                }
              }}
              onUpdateTransaction={async (id, payload) => {
                try {
                  await api.updateTransaction(id, payload);
                  await fetchAllData();
                } catch (err: any) {
                  triggerAlert(err.message);
                  throw err;
                }
              }}
              onDeleteTransaction={handleDeleteTransaction}
              t={t}
            />
          )}

          {/* 3. SUPPLIERS TAB */}
          {activeTab === 'suppliers' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={t.searchPlaceholder}
                    className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                  />
                </div>
                
                <button
                  id="add-supp-btn"
                  onClick={() => setActiveModal('supplier')}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:hover:bg-[#E5C158] text-white dark:text-[#0B192C] font-bold text-xs cursor-pointer shadow-xs transition-all"
                >
                  <Plus className="h-4 w-4 text-[#D4AF37] dark:text-[#0B192C]" />
                  <span>{t.addSupplier}</span>
                </button>
              </div>

              {/* Suppliers List: Mobile Cards (< md) + Desktop Table (md+) */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                    suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => {
                      const weOweSupplier = s.balance > 0;
                      return (
                        <div key={s.id} className="p-4 flex items-center justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{s.name}</p>
                            <p className="font-mono text-xs text-slate-500 dark:text-zinc-400 mt-0.5 truncate">{s.phone}</p>
                            <div className={`mt-1.5 font-mono font-black text-xs ${
                              s.balance === 0
                                ? 'text-slate-400'
                                : weOweSupplier
                                  ? 'text-red-500'
                                  : 'text-emerald-600'
                            }`}>
                              {s.balance === 0
                                ? 'Rs 0'
                                : weOweSupplier
                                  ? `Rs ${s.balance.toLocaleString()} (${language === 'en' ? 'Payable' : 'رقم دینا ہے'})`
                                  : `Rs ${Math.abs(s.balance).toLocaleString()} (${language === 'en' ? 'Advance' : 'ایڈوانس'})`
                              }
                            </div>
                          </div>
                          <button
                            id={`del-supp-mob-${s.id}`}
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                            title={t.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 px-4 text-xs text-slate-400">
                      🔍 No distributor suppliers found in directory.
                    </div>
                  )}
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">{t.supplierName}</th>
                        <th className="py-3 px-4">{t.phone}</th>
                        <th className="py-3 px-4 text-right">{t.balance}</th>
                        <th className="py-3 px-4 text-center">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                        suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => {
                          const weOweSupplier = s.balance > 0;
                          return (
                            <tr key={s.id} className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                              <td className="py-4 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                                {s.name}
                              </td>
                              <td className="py-4 px-4 font-mono text-xs text-slate-500">
                                {s.phone}
                              </td>
                              <td className={`py-4 px-4 font-mono font-black text-right ${
                                s.balance === 0 
                                  ? 'text-slate-400' 
                                  : weOweSupplier 
                                    ? 'text-red-500' 
                                    : 'text-emerald-600'
                              }`}>
                                {s.balance === 0 
                                  ? 'Rs 0' 
                                  : weOweSupplier 
                                    ? `Rs ${s.balance.toLocaleString()} (${language === 'en' ? 'Payable' : 'رقم دینا ہے'})` 
                                    : `Rs ${Math.abs(s.balance).toLocaleString()} (${language === 'en' ? 'Advance' : 'ایڈوانس'})`
                                }
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  id={`del-supp-${s.id}`}
                                  onClick={() => handleDeleteSupplier(s.id)}
                                  className="p-1.5 px-3 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={4} className="text-center py-12 text-sm text-slate-400">
                            🔍 No distributor suppliers found in directory.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 4. CASH BOOK TAB */}
          {activeTab === 'cashbook' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search by category / item..."
                    className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                  />
                </div>
                
                <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={filterOption}
                    onChange={(e) => setFilterOption(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="all">{language === 'en' ? 'Cash-In/Out (All)' : 'کل کیش رسیدیں'}</option>
                    <option value="cash-in">{language === 'en' ? 'Cash IN (آمدنی)' : 'کیش ان (رقم آئی)'}</option>
                    <option value="cash-out">{language === 'en' ? 'Cash OUT (اخراجات)' : 'کیش آؤٹ (رقم گئی)'}</option>
                  </select>

                  <button
                    id="add-cash-btn"
                    onClick={() => setActiveModal('cashbook')}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:hover:bg-[#E5C158] text-white dark:text-[#0B192C] font-bold text-xs cursor-pointer shadow-xs transition-all"
                  >
                    <Plus className="h-4 w-4 text-[#D4AF37] dark:text-[#0B192C]" />
                    <span>{t.addCashEntry}</span>
                  </button>
                </div>
              </div>

              {/* Cash entries history: Mobile Cards (< md) + Desktop Table (md+) */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {getFilteredCashbook().length > 0 ? (
                    getFilteredCashbook().map((cb) => (
                      <div key={cb.id} className="p-4 flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold uppercase ${
                              cb.type === 'cash-in'
                                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                : 'bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300'
                            }`}>
                              {cb.type === 'cash-in' ? t.cashIn : t.cashOut}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">{cb.date}</span>
                          </div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white break-words">{cb.category}</p>
                          {cb.description && (
                            <p className="text-xs text-slate-500 dark:text-zinc-400 break-words">{cb.description}</p>
                          )}
                          <p className="text-[10px] font-mono text-slate-400">by {cb.createdBy}</p>
                        </div>

                        <div className="flex flex-col items-end gap-2 shrink-0">
                          <span className={`font-mono font-black text-sm ${
                            cb.type === 'cash-in'
                              ? 'text-emerald-600 dark:text-emerald-400'
                              : 'text-red-500'
                          }`}>
                            {cb.type === 'cash-in' ? `+ Rs ${cb.amount.toLocaleString()}` : `- Rs ${cb.amount.toLocaleString()}`}
                          </span>
                          <button
                            id={`del-cb-mob-${cb.id}`}
                            onClick={() => handleDeleteCashEntry(cb.id)}
                            className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 cursor-pointer"
                            title={t.delete}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 px-4 text-xs text-slate-400">
                      🔍 No cashbook entries listed. Click "{t.addCashEntry}" to register counter cash.
                    </div>
                  )}
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">{t.date}</th>
                        <th className="py-3 px-4">{t.category}</th>
                        <th className="py-3 px-4">{t.description}</th>
                        <th className="py-3 px-4 text-right">{t.amount}</th>
                        <th className="py-3 px-4 text-center">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredCashbook().length > 0 ? (
                        getFilteredCashbook().map((cb) => (
                          <tr key={cb.id} className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                            <td className="py-4 px-4 font-mono text-xs text-slate-400">
                              {cb.date}
                            </td>
                            <td className="py-4 px-4">
                              <span className="font-semibold text-slate-800 dark:text-zinc-200">{cb.category}</span>
                              <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400 mt-0.5">by {cb.createdBy}</span>
                            </td>
                            <td className="py-4 px-4 text-slate-500 italic text-xs max-w-xs truncate">
                              {cb.description || '-'}
                            </td>
                            <td className={`py-4 px-4 font-mono font-black text-right ${
                              cb.type === 'cash-in' 
                                ? 'text-emerald-600 dark:text-emerald-400' 
                                : 'text-red-500'
                            }`}>
                              {cb.type === 'cash-in' ? `+ Rs ${cb.amount.toLocaleString()}` : `- Rs ${cb.amount.toLocaleString()}`}
                              <span className="block text-[8px] font-sans font-bold uppercase mt-0.5">
                                {cb.type === 'cash-in' ? t.cashIn : t.cashOut}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <button
                                id={`del-cb-${cb.id}`}
                                onClick={() => handleDeleteCashEntry(cb.id)}
                                className="p-1.5 px-3 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 cursor-pointer"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-sm text-slate-400">
                            🔍 No cashbook entries listed. Click "{t.addCashEntry}" to register counter cash.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 5. INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search stock by SKU, category or product name..."
                    className="w-full ltr:pl-9 rtl:pr-9 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                  />
                </div>
                
                <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={filterOption}
                    onChange={(e) => setFilterOption(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-semibold text-slate-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="all"> {language === 'en' ? 'All Stock (سب)' : 'سب اسٹاک اشیاء'} </option>
                    <option value="low-stock"> ⚠️ {language === 'en' ? 'Low Stock Warnings' : 'کم اسٹاک کی نشان دہی'} </option>
                  </select>

                  <button
                    id="add-stock-btn"
                    onClick={() => setActiveModal('inventory')}
                    className="flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:hover:bg-[#E5C158] text-white dark:text-[#0B192C] font-bold text-xs cursor-pointer shadow-xs transition-all"
                  >
                    <Plus className="h-4 w-4 text-[#D4AF37] dark:text-[#0B192C]" />
                    <span>{t.addStockItem}</span>
                  </button>
                </div>
              </div>

              {/* Stock directory: Mobile Cards (< md) + Desktop Table (md+) */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {getFilteredInventory().length > 0 ? (
                    getFilteredInventory().map((itm) => {
                      const isAlert = itm.quantity <= itm.minQuantity;
                      return (
                        <div key={itm.id} className="p-4 space-y-2.5">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-slate-900 dark:text-white break-words">{itm.name}</p>
                              <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                                SKU: {itm.sku} • {itm.category}
                              </p>
                            </div>
                            <button
                              id={`del-inv-mob-${itm.id}`}
                              onClick={() => handleDeleteStock(itm.id)}
                              className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>

                          <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-100 dark:border-zinc-800/60 text-xs">
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase">{t.purchasePrice}</span>
                              <span className="font-mono font-semibold text-slate-600 dark:text-zinc-300">Rs {itm.purchasePrice.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase">{t.sellPrice}</span>
                              <span className="font-mono font-bold text-[#0B192C] dark:text-[#D4AF37]">Rs {itm.sellPrice.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] text-slate-400 uppercase">{t.quantity}</span>
                              <span className={`inline-block font-mono font-black text-xs px-2 py-0.5 rounded-full ${
                                isAlert
                                  ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400'
                                  : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                              }`}>
                                {itm.quantity} {itm.unit}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className="text-center py-10 px-4 text-xs text-slate-400">
                      🔍 No inventory stock lines match filter options.
                    </div>
                  )}
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">{language === 'en' ? 'Product Detail' : 'سامان کی معلومات'}</th>
                        <th className="py-3 px-4">{t.category}</th>
                        <th className="py-3 px-4 text-right">{t.purchasePrice}</th>
                        <th className="py-3 px-4 text-right">{t.sellPrice}</th>
                        <th className="py-3 px-4 text-right">{t.quantity}</th>
                        <th className="py-3 px-4 text-center">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredInventory().length > 0 ? (
                        getFilteredInventory().map((itm) => {
                          const isAlert = itm.quantity <= itm.minQuantity;
                          return (
                            <tr key={itm.id} className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                              <td className="py-4 px-4 font-semibold text-slate-800 dark:text-zinc-200">
                                <div>{itm.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">SKU: {itm.sku}</div>
                              </td>
                              <td className="py-4 px-4 text-xs font-semibold text-slate-500">{itm.category}</td>
                              <td className="py-4 px-4 font-mono text-right text-slate-500">Rs {itm.purchasePrice.toLocaleString()}</td>
                              <td className="py-4 px-4 font-mono text-right font-semibold text-[#0B192C] dark:text-[#D4AF37]">Rs {itm.sellPrice.toLocaleString()}</td>
                              <td className="py-4 px-4 text-right">
                                <span className={`inline-block font-mono font-black text-sm px-2.5 py-1 rounded-full ${
                                  isAlert 
                                    ? 'bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400' 
                                    : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400'
                                }`}>
                                  {itm.quantity} {itm.unit}
                                </span>
                                {isAlert && (
                                  <span className="block text-[8px] uppercase font-bold text-red-500 mt-1">⚠️ {t.lowStock}</span>
                                )}
                              </td>
                              <td className="py-4 px-4 text-center">
                                <button
                                  id={`del-inv-${itm.id}`}
                                  onClick={() => handleDeleteStock(itm.id)}
                                  className="p-1.5 px-3 rounded-lg hover:bg-red-50 hover:text-red-600 text-slate-400 cursor-pointer"
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6} className="text-center py-12 text-sm text-slate-400">
                            🔍 No inventory stock lines match filter options.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* 6. INVOICES BUILDER TAB */}
          {activeTab === 'invoices' && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                <div className="min-w-0">
                  <h3 className="text-sm font-bold text-slate-800 dark:text-zinc-200">{t.invoices}</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">{language === 'en' ? 'Click create invoice to generate printable client receipts & download bills.' : 'گاہکوں کا بل بنانے اور پرنٹ کرنے کے لیے بٹن دبائیں۔'}</p>
                </div>
                <button
                  id="open-invoice-builder-btn"
                  onClick={() => setActiveModal('invoice')}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:hover:bg-[#E5C158] text-white dark:text-[#0B192C] font-bold text-xs cursor-pointer shadow-xs transition-all shrink-0"
                >
                  <Plus className="h-4 w-4 text-[#D4AF37] dark:text-[#0B192C]" />
                  <span>{t.createInvoice}</span>
                </button>
              </div>

              {/* Invoices History: Mobile Cards (< md) + Desktop Table (md+) */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                {/* Mobile Card List */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
                  {invoices.length > 0 ? (
                    invoices.map((inv) => (
                      <div key={inv.id} className="p-4 flex items-center justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-[#0B192C] dark:text-[#D4AF37] bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                              {inv.invoiceNumber}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">{inv.date}</span>
                          </div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white truncate">{inv.customerName}</p>
                          <p className="font-mono font-black text-sm text-emerald-700 dark:text-emerald-400">
                            Rs {inv.total.toLocaleString()}
                          </p>
                        </div>
                        <button
                          id={`view-inv-printer-mob-${inv.id}`}
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-xl bg-[#0B192C] text-white dark:bg-[#D4AF37] dark:text-[#0B192C] cursor-pointer shrink-0 shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5 text-[#D4AF37] dark:text-[#0B192C]" />
                          <span>{t.downloadPdf}</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 px-4 text-xs text-slate-400">
                      🧾 {t.noInvoices}
                    </div>
                  )}
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                        <th className="py-3 px-4">{t.invoiceNum}</th>
                        <th className="py-3 px-4">{t.customerName}</th>
                        <th className="py-3 px-4">{t.date}</th>
                        <th className="py-3 px-4 text-right">{t.total}</th>
                        <th className="py-3 px-4 text-center">{t.actions}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {invoices.length > 0 ? (
                        invoices.map((inv) => (
                          <tr key={inv.id} className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-slate-50/50 dark:hover:bg-zinc-800/30">
                            <td className="py-4 px-4 font-mono font-bold text-slate-800 dark:text-zinc-200">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-4 px-4 font-semibold text-slate-800 dark:text-zinc-300">
                              {inv.customerName}
                              <span className="block text-[8px] font-sans font-medium text-slate-400 mt-0.5">Checked-out by {inv.createdBy}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-xs text-slate-400">{inv.date}</td>
                            <td className="py-4 px-4 font-mono font-black text-right text-[#0B192C] dark:text-[#D4AF37]">Rs {inv.total.toLocaleString()}</td>
                            <td className="py-4 px-4 text-center">
                              <button
                                id={`view-inv-printer-${inv.id}`}
                                onClick={() => setSelectedInvoice(inv)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-lg bg-[#0B192C] text-white dark:bg-[#D4AF37] dark:text-[#0B192C] cursor-pointer shadow-2xs"
                              >
                                <Download id={`inv-printer-${inv.id}`} className="h-3 w-3 text-[#D4AF37] dark:text-[#0B192C]" />
                                <span>{t.downloadPdf}</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-sm text-slate-400">
                            🧾 {t.noInvoices}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>

      {/* ==================== DRAWERS & MODALS BACKDROPS ==================== */}

      {/* CUSTOMER DRAWER */}
      {activeModal === 'customer' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              id="close-cust-modal"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pr-6">{t.addCustomer}</h3>

            <form onSubmit={handleAddCustomer} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.customerName} *</label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder={t.customerName}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.phone} *</label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+92"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.email}</label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder={t.email}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-sans"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                  {t.initialBalance} ({language === 'en' ? 'Pos if they owe us, Neg if they paid advanced' : 'مثبت اگر ادھار لینا ہے، منفی اگر پیسے پیشگی آئے'})
                </label>
                <input
                  type="number"
                  value={custBalance}
                  onChange={(e) => setCustBalance(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="save-new-customer"
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white text-xs font-bold cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SUPPLIER DRAWER */}
      {activeModal === 'supplier' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              id="close-supp-modal"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pr-6">{t.addSupplier}</h3>

            <form onSubmit={handleAddSupplier} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.supplierName} *</label>
                <input
                  type="text"
                  required
                  value={suppName}
                  onChange={(e) => setSuppName(e.target.value)}
                  placeholder={t.supplierName}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.phone} *</label>
                <input
                  type="text"
                  required
                  value={suppPhone}
                  onChange={(e) => setSuppPhone(e.target.value)}
                  placeholder="+92"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.email}</label>
                <input
                  type="email"
                  value={suppEmail}
                  onChange={(e) => setSuppEmail(e.target.value)}
                  placeholder={t.email}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                  {t.initialBalance} ({language === 'en' ? 'Pos if we owe them Payable, Neg if we paid advance' : 'مثبت اگر ہم نے دکان کے پیسے دینے ہیں، منفی اگر پیشگی رقم گئی'})
                </label>
                <input
                  type="number"
                  value={suppBalance}
                  onChange={(e) => setSuppBalance(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="save-supplier-btn"
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white text-xs font-bold cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* LEDGER TRANSACTION DRAWERS */}
      {activeModal === 'transaction' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              id="close-tx-modal"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pr-6">{t.addTransaction}</h3>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.selectCustomer} *</label>
                <select
                  required
                  value={txCustId}
                  onChange={(e) => setTxCustId(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                >
                  <option value="">-- Choose customer (گاہک منتخب کریں) --</option>
                  {customers.map(c => (
                    <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                  {language === 'en' ? 'Activity Type' : 'طریقہ لین دین'}
                </label>
                <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-2 gap-2.5">
                  <button
                    id="tx-type-credit-selector"
                    type="button"
                    onClick={() => setTxType('credit')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                      txType === 'credit' 
                        ? 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/40 dark:text-amber-400 ring-2 ring-amber-500 font-black' 
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <ArrowUpRight className="h-5 w-5 mb-1 text-amber-600" />
                    <span className="text-xs">{t.gaveUdhaar}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{language === 'en' ? 'Gave Credit / Booked sale' : 'ادھار دیا'}</span>
                  </button>

                  <button
                    id="tx-type-debit-selector"
                    type="button"
                    onClick={() => setTxType('debit')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                      txType === 'debit' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 ring-2 ring-emerald-500 font-black' 
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <ArrowDownLeft className="h-5 w-5 mb-1 text-emerald-600" />
                    <span className="text-xs">{t.gotCash}</span>
                    <span className="text-[9px] text-slate-400 mt-0.5">{language === 'en' ? 'Received Cash Payment' : 'رقم وصول ہوئی'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.amount} *</label>
                  <input
                    type="number"
                    required
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.date}</label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.description}</label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder={t.description}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="submit-tx-btn-modal"
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white text-xs font-bold cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CASHBOOK ENTRY DRAWERS */}
      {activeModal === 'cashbook' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              id="close-cash-modal"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pr-6">{t.addCashEntry}</h3>

            <form onSubmit={handleAddCashEntry} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-2">
                  {language === 'en' ? 'Cash Flow Direction' : 'کیش آمدن یا جانا'}
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    id="cash-in-selector"
                    type="button"
                    onClick={() => { setCbType('cash-in'); setCbCategory('Sales'); }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                      cbType === 'cash-in' 
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/40 dark:text-emerald-400 ring-2 ring-emerald-500 font-black' 
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <ArrowDownLeft className="h-5 w-5 mb-1 text-emerald-600" />
                    <span className="text-xs">{t.cashIn}</span>
                  </button>

                  <button
                    id="cash-out-selector"
                    type="button"
                    onClick={() => { setCbType('cash-out'); setCbCategory('Rent'); }}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                      cbType === 'cash-out' 
                        ? 'bg-red-50 text-red-800 border-red-300 dark:bg-rose-950/40 dark:text-rose-400 ring-2 ring-red-500 font-black' 
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <ArrowUpRight className="h-5 w-5 mb-1 text-red-600" />
                    <span className="text-xs">{t.cashOut}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.amount} *</label>
                  <input
                    type="number"
                    required
                    value={cbAmount}
                    onChange={(e) => setCbAmount(e.target.value)}
                    placeholder="Rs"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.category}</label>
                  {cbType === 'cash-in' ? (
                    <select
                      value={cbCategory}
                      onChange={(e) => setCbCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Sales">Sales (نقد فروخت)</option>
                      <option value="Customer Payment">Customer Payment (بقایا وصولی)</option>
                      <option value="Refund">Return Refund (واپسی)</option>
                      <option value="Other Inflow">Other Income (دیگر منافع)</option>
                    </select>
                  ) : (
                    <select
                      value={cbCategory}
                      onChange={(e) => setCbCategory(e.target.value)}
                      className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                    >
                      <option value="Rent">Rent (شوروم / دکان کا کرایہ)</option>
                      <option value="Electricity Bill">Electricity Bill (بجلی بل)</option>
                      <option value="Rent/Wages">Wages & Salaries (کارکنوں کے پیسے)</option>
                      <option value="Daily Tea/Meals">Meals & Entertainment (چائے پانی کھانا)</option>
                      <option value="Inventory Purchase">Inventory Purchase (نیا مال خریدنا)</option>
                    </select>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.date}</label>
                <input
                  type="date"
                  required
                  value={cbDate}
                  onChange={(e) => setCbDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.description}</label>
                <input
                  type="text"
                  value={cbDesc}
                  onChange={(e) => setCbDesc(e.target.value)}
                  placeholder="Explain source of cash flow..."
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="save-cash-receipt-btn"
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white text-xs font-bold cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* STOCK INVENTORY DRAWERS */}
      {activeModal === 'inventory' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              id="close-stock-modal"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pr-6">{t.addStockItem}</h3>

            <form onSubmit={handleAddStock} className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">Item Name *</label>
                <input
                  type="text"
                  required
                  value={stockName}
                  onChange={(e) => setStockName(e.target.value)}
                  placeholder="Item Name"
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.sku}</label>
                  <input
                    type="text"
                    value={stockSku}
                    onChange={(e) => setStockSku(e.target.value)}
                    placeholder={t.sku}
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.category}</label>
                  <select
                    value={stockCategory}
                    onChange={(e) => setStockCategory(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="Grains & Pulses">Grains & Pulses (غلہ، دالیں)</option>
                    <option value="Oil & Ghee">Oil & Ghee (گھی، تیل)</option>
                    <option value="Beverages">Beverages (چائے پتی، بوتلیں)</option>
                    <option value="Household">Household (گھریلو اشیاء)</option>
                    <option value="General">General Provision (دیگر سامان)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 xs:grid-cols-3 sm:grid-cols-3 gap-2.5">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.quantity} *</label>
                  <input
                    type="number"
                    required
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                    placeholder="0"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.minQuantity} *</label>
                  <input
                    type="number"
                    required
                    value={stockMinQty}
                    onChange={(e) => setStockMinQty(e.target.value)}
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.unit}</label>
                  <input
                    type="text"
                    required
                    value={stockUnit}
                    onChange={(e) => setStockUnit(e.target.value)}
                    placeholder="pcs / kg"
                    className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono text-center"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.purchasePrice} *</label>
                  <input
                    type="number"
                    required
                    value={stockPurchase}
                    onChange={(e) => setStockPurchase(e.target.value)}
                    placeholder="Cost (روپے)"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.sellPrice} *</label>
                  <input
                    type="number"
                    required
                    value={stockSell}
                    onChange={(e) => setStockSell(e.target.value)}
                    placeholder="Selling (روپے)"
                    className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono font-bold"
                  />
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="submit-stock-btn"
                  type="submit"
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white text-xs font-bold cursor-pointer"
                >
                  {t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* RETAIL INVOICE BUILDER DRAWER */}
      {activeModal === 'invoice' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto">
            <button
              id="close-invoice-modal"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1.5 pr-6">{t.createInvoice}</h3>
            <p className="text-xs text-slate-400 mb-5">{language === 'en' ? 'Select matching customer, choose items, discount percentage, and download printable bill receipts.' : 'گاہک کھاتا منتخب کریں یا نقد لین دین کے لیے براہ راست اشیاء اور بل تیار فرمائیں۔'}</p>

            <form onSubmit={handleBuildInvoice} className="space-y-5">
              <div className="bg-slate-50 dark:bg-zinc-950/60 p-3.5 sm:p-4 rounded-xl border border-slate-200/70 dark:border-zinc-800 gap-3.5 grid grid-cols-1 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">
                    {language === 'en' ? 'Select Saved Customer' : 'محفوظ شدہ گاہک کھاتا'}
                  </label>
                  <select
                    value={invCustId}
                    onChange={(e) => handleInvoiceCustomerSelect(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                  >
                    <option value="">-- {language === 'en' ? 'Walk-in cash counter sales' : 'براہ راست نقد فروخت'} --</option>
                    {customers.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.customerName} *</label>
                  <input
                    type="text"
                    required
                    value={invCustName}
                    onChange={(e) => setInvCustName(e.target.value)}
                    placeholder="e.g. Walk-in client"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none"
                  />
                </div>
              </div>

              {/* Line Items Dynamic Row Array */}
              <div className="space-y-3">
                <div className="flex justify-between items-center border-b border-slate-100 dark:border-zinc-800 pb-2">
                  <span className="text-xs uppercase tracking-wider font-extrabold text-slate-400">{language === 'en' ? 'Invoice Line Items' : 'اشیاء مینو'}</span>
                  <button
                    id="add-invoice-row-btn"
                    type="button"
                    onClick={addInvoiceRow}
                    className="text-xs text-[#0B192C] dark:text-[#D4AF37] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{t.addItem}</span>
                  </button>
                </div>

                <div className="space-y-3">
                  {invoiceItems.map((row, idx) => (
                    <div key={idx} className="flex flex-col sm:flex-row gap-2.5 sm:items-center bg-slate-50/70 dark:bg-zinc-950/50 p-3 rounded-xl border border-slate-200/70 dark:border-zinc-800">
                      
                      {/* Product Selector Auto unit price binding */}
                      <div className="w-full sm:flex-1 min-w-0">
                        <select
                          required
                          value={row.name}
                          onChange={(e) => updateInvoiceRow(idx, 'name', e.target.value)}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200"
                        >
                          <option value="">-- Choose Stock SKU (سامان منتخب کریں) --</option>
                          {inventory.map(itm => (
                            <option key={itm.id} value={itm.name}>{itm.name} (Rs {itm.sellPrice})</option>
                          ))}
                          <option value="General Store Custom Item">General Store Custom Item (روایتی الگ سامان)</option>
                        </select>
                      </div>

                      <div className="flex items-center gap-2 w-full sm:w-auto">
                        {/* Qty */}
                        <div className="flex-1 sm:w-20">
                          <input
                            type="number"
                            required
                            placeholder="Qty"
                            min="1"
                            value={row.quantity}
                            onChange={(e) => updateInvoiceRow(idx, 'quantity', e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-center text-slate-800 dark:text-zinc-200 font-mono"
                          />
                        </div>

                        {/* Selling Price */}
                        <div className="flex-1 sm:w-28">
                          <input
                            type="number"
                            required
                            placeholder="Price"
                            value={row.price}
                            onChange={(e) => updateInvoiceRow(idx, 'price', e.target.value)}
                            className="w-full px-2.5 py-2 text-xs rounded-lg border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-right text-slate-800 dark:text-zinc-200 font-mono"
                          />
                        </div>

                        {/* Single Row Remove */}
                        {invoiceItems.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeInvoiceRow(idx)}
                            className="p-2 text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cash collection & discount columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 border-t border-slate-100 dark:border-zinc-800 pt-4">
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.discount} (Rs)</label>
                  <input
                    type="number"
                    value={invDiscount}
                    onChange={(e) => setInvDiscount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.tax} / VAT (Rs)</label>
                  <input
                    type="number"
                    value={invTax}
                    onChange={(e) => setInvTax(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none font-mono"
                  />
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-wider text-slate-400 font-bold mb-1">{t.isPaid}</label>
                  <div className="mt-2 flex items-center gap-2">
                    <input
                      id="invoice-is-paid-checkbox"
                      type="checkbox"
                      checked={invIsPaid}
                      onChange={(e) => setInvIsPaid(e.target.checked)}
                      className="h-4 w-4 rounded text-[#0B192C] focus:ring-[#D4AF37] border-slate-300 pointer-events-auto"
                    />
                    <span className="text-xs text-slate-600 dark:text-zinc-300 font-semibold">{invoiceItems[0]?.name ? `${language === 'en' ? 'Check if fully paid' : 'بل ادا ہو گیا ہے'}` : 'Counter Paid check'}</span>
                  </div>
                </div>
              </div>

              <div className="flex flex-col-reverse sm:flex-row gap-2.5 justify-end pt-3 border-t border-slate-100 dark:border-zinc-800">
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-500 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  id="checkout-create-invoice-btn"
                  type="submit"
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white text-xs font-bold cursor-pointer"
                >
                  {language === 'en' ? 'Checkout & Print Receipt (بل تیار کریں)' : 'بل بنائیں اور رسید پرنٹ کریں'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}


      {/* PRINTABLE INVOICE OVERLAY POPUP */}
      {selectedInvoice && (
        <InvoicePrinter
          invoice={selectedInvoice}
          businessName={user.businessName}
          lang={language}
          onClose={() => setSelectedInvoice(null)}
        />
      )}

      {/* BACKUPS & RECOVERY MODAL */}
      {activeModal === 'backups' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto">
            <button
              type="button"
              id="close-backups-modal"
              onClick={() => setActiveModal(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-start sm:items-center gap-3 border-b border-slate-100 dark:border-zinc-800 pb-4 mb-5 pr-6">
              <div className="p-2.5 bg-[#0B192C]/10 dark:bg-[#D4AF37]/15 rounded-xl text-[#0B192C] dark:text-[#D4AF37] shrink-0">
                <Database className="h-6 w-6" />
              </div>
              <div className="text-left min-w-0">
                <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                  {language === 'en' ? 'Backups & Recovery Hub' : 'بیک اپ اور ڈیٹا بحالی مرکز'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
                  {language === 'en' 
                    ? 'Worry-free bookkeeping. The system auto-saves checkpoints on every deletion so you can undo accidental losses anytime!'
                    : 'پریشانی سے پاک کھاتہ داری۔ ہر حذف شدہ اندراج سے قبل سسٹم خودکار بیک اپ بناتا ہے تاکہ آپ کبھی بھی نقصان سے بچ سکیں!'}
                </p>
              </div>
            </div>

            {/* Quick Export/Import File Section */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              {/* EXPORT DATA */}
              <div className="p-4 bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-200/70 dark:border-zinc-800/80 rounded-xl flex flex-col justify-between text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Export Ledger File' : 'کل کھاتہ ڈاؤن لوڈ کریں'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal mb-3">
                    {language === 'en'
                      ? 'Download your entire business database as a secure JSON backup file on your local storage.'
                      : 'اپنے پورے کاروبار کا مکمل کھاتہ حاصل کر کے اپنے پاس بطور محفوظ فائل ڈاؤن لوڈ کریں۔'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleManualExport}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-[#0B192C] hover:bg-[#152A47] dark:bg-zinc-800 dark:hover:bg-zinc-700 text-white transition-colors rounded-xl text-xs font-bold shadow-xs cursor-pointer"
                >
                  <Download className="h-4 w-4 text-[#D4AF37]" />
                  <span>{language === 'en' ? 'Download Backup (.json)' : 'بیک اپ فائل ڈاؤن لوڈ کریں'}</span>
                </button>
              </div>

              {/* IMPORT DATA */}
              <div className="p-4 bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-200/70 dark:border-zinc-800/80 rounded-xl flex flex-col justify-between text-left">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider mb-1">
                    {language === 'en' ? 'Restore Backup File' : 'بیک اپ فائل اپلوڈ کریں'}
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal mb-3">
                    {language === 'en'
                      ? 'Upload a previously exported (.json) database backup file to override the current business ledger.'
                      : 'سابقہ ڈاؤن لوڈ کی گئی بیک اپ فائل اپلوڈ کر کے اپنا محفوظ کھاتہ دوبارہ مکمل بحال کریں۔'}
                  </p>
                </div>
                
                <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#0B192C] dark:hover:border-[#D4AF37] text-slate-700 dark:text-zinc-300 transition-colors rounded-xl text-xs font-bold shadow-xs cursor-pointer">
                  <UploadCloud className="h-4 w-4 text-[#D4AF37]" />
                  <span>{language === 'en' ? 'Upload Backup File' : 'بیک اپ فائل منتخب کریں'}</span>
                  <input
                    type="file"
                    accept=".json"
                    onChange={handleManualImport}
                    className="hidden"
                  />
                </label>
              </div>
            </div>

            {/* Manual Checkpoint Area */}
            <div className="p-4 bg-slate-50 dark:bg-zinc-950/30 border border-slate-200/80 dark:border-zinc-800 rounded-xl mb-6 text-left">
              <h4 className="text-xs font-bold text-[#0B192C] dark:text-[#D4AF37] uppercase tracking-wider mb-2">
                {language === 'en' ? 'Create a Manual Safety Checkpoint' : 'دستی بیک اپ پوائنٹ محفوظ کریں'}
              </h4>
              <form onSubmit={handleCreateBackup} className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  required
                  placeholder={
                    language === 'en' 
                      ? 'e.g. Before editing large accounts, Eid Sales, etc.' 
                      : 'مثال کے طور پر: عید سیل سے پہلے، بڑی ادائیگی سے قبل'
                  }
                  value={backupLabel}
                  onChange={(e) => setBackupLabel(e.target.value)}
                  className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#0B192C]"
                />
                <button
                  type="submit"
                  disabled={isSavingBackup}
                  className="px-4 py-2.5 bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] dark:text-[#0B192C] text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${isSavingBackup ? 'animate-spin' : ''}`} />
                  <span>{language === 'en' ? 'Save Checkpoint' : 'سیو بیک اپ'}</span>
                </button>
              </form>
            </div>

            {/* Checkpoints History List */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
                <h4 className="text-xs font-extrabold text-slate-900 dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
                  <History className="h-3.5 w-3.5 text-slate-400" />
                  <span>{language === 'en' ? 'Safety Snapshots & Rollbacks' : 'خودکار اور دستی بیک اپ لسٹ'}</span>
                </h4>
                <span className="text-[10px] bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 px-2 py-0.5 rounded-full font-mono">
                  {backups.length} {language === 'en' ? 'Available' : 'موجود'}
                </span>
              </div>

              {isLoadingBackups ? (
                <div className="py-12 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
                  <RefreshCw className="h-6 w-5 animate-spin text-[#D4AF37]" />
                  <span>{language === 'en' ? 'Querying stored checkpoints...' : 'پوائنٹس لوڈ ہو رہے ہیں...'}</span>
                </div>
              ) : backups.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-400">
                  <p>{language === 'en' ? 'No safety backups or snapshots created yet.' : 'کوئی بیک اپ نہیں پایا گیا۔'}</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[35vh] overflow-y-auto pr-1">
                  {backups.map((bc: any) => {
                    const isAuto = bc.label.startsWith('Before') || bc.label.includes('Auto-backup');
                    return (
                      <div
                        key={bc.id}
                        className="p-3 bg-white dark:bg-zinc-900/60 border border-slate-200/70 dark:border-zinc-800 rounded-xl hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide text-center ${
                              isAuto
                                ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 border border-amber-200/30'
                                : 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-600 dark:text-emerald-400 border border-emerald-200/30'
                            }`}>
                              {isAuto 
                                ? (language === 'en' ? 'Auto-Save' : 'خودکار') 
                                : (language === 'en' ? 'Manual' : 'دستی')}
                            </span>
                            <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 break-words">
                              {bc.label}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 flex-wrap text-[10px] text-slate-400 dark:text-zinc-500 font-mono">
                            <span>{new Date(bc.timestamp).toLocaleString(language === 'en' ? 'en-US' : 'ur-PK')}</span>
                            <span>•</span>
                            <span>
                              {bc.counts ? (
                                <span className="inline-flex items-center gap-1 bg-slate-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded">
                                  {bc.counts.customers} 👥 | {bc.counts.transactions} 💸 | {bc.counts.inventory} 📦
                                </span>
                              ) : 'N/A'}
                            </span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => handleRestoreBackup(bc.id, bc.label)}
                          className="w-full sm:w-auto px-3.5 py-2 text-[#0B192C] dark:text-[#D4AF37] bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap"
                        >
                          {language === 'en' ? 'Restore State ↩' : 'بحال کریں'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM CONFIRMATION OVERLAY (Bypass Sandboxed iframe blockages) */}
      {confirmState && confirmState.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/75 backdrop-blur-xs flex justify-center items-center p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative text-center">
            
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 mb-4">
              <AlertTriangle className="h-6 w-6" />
            </div>

            <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-2">
              {confirmState.title}
            </h3>
            
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-6 leading-relaxed break-words">
              {confirmState.message}
            </p>

            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmState(null)}
                className="w-full px-4 py-2.5 text-xs font-bold text-slate-500 dark:text-zinc-400 bg-slate-50 dark:bg-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-700 transition-colors rounded-xl border border-slate-200 dark:border-zinc-700 cursor-pointer"
              >
                {language === 'en' ? 'Cancel' : 'منسوخ کریں'}
              </button>
              
              <button
                type="button"
                onClick={confirmState.onConfirm}
                className="w-full px-4 py-2.5 text-xs font-bold text-white bg-red-600 hover:bg-red-500 transition-colors rounded-xl shadow-xs cursor-pointer"
              >
                {confirmState.confirmBtnText || (language === 'en' ? 'Confirm' : 'تصدیق کریں')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CUSTOM ALERT/NOTIFICATION OVERLAY */}
      {alertState && alertState.isOpen && (
        <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xs p-5 sm:p-6 shadow-2xl relative text-center animate-in fade-in zoom-in-95 duration-150">
            
            <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-[#0B192C]/10 dark:bg-[#D4AF37]/20 text-[#0B192C] dark:text-[#D4AF37] mb-3">
              <Info className="h-5 w-5" />
            </div>

            <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1.5">
              {alertState.title}
            </h4>
            
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-5 leading-normal font-medium break-words">
              {alertState.message}
            </p>

            <button
              type="button"
              onClick={() => setAlertState(null)}
              className="w-full px-4 py-2.5 text-xs font-bold text-white dark:text-[#0B192C] bg-[#0B192C] hover:bg-[#152A47] dark:bg-[#D4AF37] rounded-xl transition-all cursor-pointer shadow-xs"
            >
              {language === 'en' ? 'OK / Understand' : 'ٹھیک ہے'}
            </button>
          </div>
        </div>
      )}

      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-zinc-800 shadow-[0_-4px_24px_rgba(0,0,0,0.06)] dark:shadow-[0_-4px_24px_rgba(0,0,0,0.4)] pb-safe">
        <ul className="flex items-center justify-around h-16 w-full max-w-lg mx-auto px-1">
          {[
            { id: 'dashboard', name: t.dashboard, icon: TrendingUp },
            { id: 'customers', name: t.customers, icon: Users },
            { id: 'suppliers', name: t.suppliers, icon: Truck },
            { id: 'cashbook', name: t.cashBook, icon: Wallet },
            { id: 'inventory', name: t.inventory, icon: Package },
            { id: 'invoices', name: t.invoices, icon: FileSpreadsheet }
          ].map((item) => {
            const IconComponent = item.icon;
            const isSelected = activeTab === item.id;
            return (
              <li key={item.id} className="flex-1 min-w-0">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab(item.id as any);
                    setSearchTerm('');
                    setFilterOption('all');
                    if (item.id === 'customers') {
                      setSelectedCustomerId(null);
                    }
                  }}
                  className={`relative w-full h-full flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                    isSelected
                      ? 'text-[#0B192C] dark:text-[#D4AF37]'
                      : 'text-slate-400 dark:text-zinc-500 hover:text-slate-600 dark:hover:text-zinc-300'
                  }`}
                >
                  {isSelected && (
                    <span className="absolute top-1/2 -translate-y-1/2 w-9 h-9 bg-slate-100 dark:bg-zinc-800 rounded-full -z-10" />
                  )}
                  <IconComponent className={`h-4.5 w-4.5 transition-transform duration-200 ${isSelected ? 'scale-110 text-[#0B192C] dark:text-[#D4AF37]' : 'scale-100'}`} />
                  <span className="text-[9px] font-bold tracking-tight truncate max-w-full px-0.5 text-center">
                    {item.name}
                  </span>
                  
                  {item.id === 'inventory' && lowStockItems.length > 0 && (
                     <span className="absolute top-1.5 right-1/4 translate-x-1.5 flex h-2 w-2">
                       <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                       <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                     </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
          </div>
        )}
      </div>

      {/* GLOBAL PERSISTENT FOOTER */}
      <Footer hasMobileBottomNav={!!user} />
    </div>
  );
}
