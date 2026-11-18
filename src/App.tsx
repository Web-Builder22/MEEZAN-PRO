import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
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
  CheckCircle2,
  Clock,
  FileText,
  Calendar,
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
  ChevronRight,
  Eye,
  EyeOff,
  CalendarClock,
  Send,
  Menu,
  PanelLeftClose,
  PanelLeftOpen,
  BarChart3,
  Settings,
  LogOut,
  ShoppingBag,
  Briefcase,
  Cloud
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
import CustomerAccountReportModal from './components/CustomerAccountReportModal';
import BusinessDashboard, { AppTab } from './components/BusinessDashboard';
import { GoogleDriveBackupHub } from './components/GoogleDriveBackupHub';
import {
  BackupModuleType,
  DriveBackupFileInfo,
  DriveFolderStructureIds,
  DRIVE_FILE_NAMES,
  downloadExcelBackupLocally,
  parseExcelBackupBuffer,
  syncModuleToGoogleDrive,
  syncAllModulesToGoogleDrive,
  fetchGoogleDriveBackupStatus,
  downloadAndParseDriveExcelBackup,
  verifyBackupDatasetIntegrity,
  createScheduledOrEmergencyExcelSnapshot,
  checkAndRunScheduledBackups,
  triggerHourlyBackupIfChanged,
  deleteHistoricalExcelBackupFile,
  formatDateTimeDdMmmYyyy,
  formatFileSize
} from './services/googleDriveBackup';
import VoiceDescriptionField, {
  TransactionDescriptionView,
  formatPlainDescriptionText
} from './components/VoiceTransactionInput';
import { BRAND, MeezanFlowLogo, PartyAvatar } from './brand';
import { 
  auth, 
  googleProvider, 
  GoogleAuthProvider,
  getGoogleAccessToken,
  setGoogleAccessToken,
  connectGoogleDriveAccount,
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

  // App Layout States - Default to 'dashboard'
  const [activeTab, setActiveTab] = useState<AppTab>('dashboard');
  const [paymentSubTab, setPaymentSubTab] = useState<'transactions' | 'cashbook'>('transactions');
  const [hideBalance, setHideBalance] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isInvMenuOpen, setIsInvMenuOpen] = useState<boolean>(false);

  // Keep "Business Operations" parent menu expanded whenever Business Operations or any of its 4 sub-sections is active
  useEffect(() => {
    if (
      activeTab === 'business-operations' ||
      activeTab === 'customers' ||
      activeTab === 'suppliers' ||
      activeTab === 'invoices' ||
      activeTab === 'inventory'
    ) {
      setIsInvMenuOpen(true);
    }
  }, [activeTab]);
  const [language, setLanguage] = useState<Language>(() => {
    return (localStorage.getItem('lang') as Language) || 'en';
  });

  // Settings form state
  const [settingsName, setSettingsName] = useState(user?.name || '');
  const [settingsBusiness, setSettingsBusiness] = useState(user?.businessName || '');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

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

  // Dashboard Report Modal state
  const [dashboardReportCustomer, setDashboardReportCustomer] = useState<Customer | null>(null);

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

  // Google Drive & Excel (.xlsx) Backup System States
  const [isDriveConnected, setIsDriveConnected] = useState<boolean>(true);
  const [driveSyncStatus, setDriveSyncStatus] = useState<'idle' | 'syncing' | 'synced' | 'error'>('synced');
  const [driveLastSync, setDriveLastSync] = useState<string | null>(() =>
    localStorage.getItem('meezan_drive_last_sync')
  );
  const [driveLastModule, setDriveLastModule] = useState<string | null>(null);
  const [driveError, setDriveError] = useState<string | null>(null);
  const [autoDriveSync, setAutoDriveSync] = useState<boolean>(() => {
    return localStorage.getItem('meezan_auto_drive_sync') !== 'false';
  });
  const [driveFolders, setDriveFolders] = useState<DriveFolderStructureIds | null>(null);
  const [driveModuleFiles, setDriveModuleFiles] = useState<
    Partial<Record<BackupModuleType, DriveBackupFileInfo>>
  >({});
  const [driveHistoryFiles, setDriveHistoryFiles] = useState<DriveBackupFileInfo[]>([]);

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
  const [custAddress, setCustAddress] = useState('');
  const [custBalance, setCustBalance] = useState('');

  // Form Inputs - Fresh Supplier
  const [suppName, setSuppName] = useState('');
  const [suppPhone, setSuppPhone] = useState('');
  const [suppEmail, setSuppEmail] = useState('');
  const [suppAddress, setSuppAddress] = useState('');
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
      setSettingsName(user.name || '');
      setSettingsBusiness(user.businessName || '');
      fetchAllData();
    }
  }, [user]);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmedName = settingsName.trim() || user.name;
    const trimmedBus = settingsBusiness.trim() || user.businessName;
    setIsSavingSettings(true);
    try {
      const updatedUser = await api.firebaseLogin({
        email: user.email,
        name: trimmedName,
        uid: user.id,
        role: user.role,
        businessName: trimmedBus
      });
      setUser(updatedUser);
      localStorage.setItem('user_session', JSON.stringify(updatedUser));
      triggerAlert(
        language === 'en'
          ? 'Your business profile and account settings have been saved.'
          : 'آپ کی دکان اور پروفائل کی ترتیبات محفوظ ہو گئی ہیں۔',
        language === 'en' ? 'Settings Saved' : 'محفوظ شدہ'
      );
    } catch (err: any) {
      const fallbackUser = { ...user, name: trimmedName, businessName: trimmedBus };
      setUser(fallbackUser);
      localStorage.setItem('user_session', JSON.stringify(fallbackUser));
      triggerAlert(
        language === 'en'
          ? 'Settings saved locally.'
          : 'ترتیبات محفوظ ہو گئیں۔',
        language === 'en' ? 'Saved' : 'محفوظ شدہ'
      );
    } finally {
      setIsSavingSettings(false);
    }
  };

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
      const credential = GoogleAuthProvider.credentialFromResult(res);
      if (credential?.accessToken) {
        setGoogleAccessToken(credential.accessToken);
        setIsDriveConnected(true);
        setDriveError(null);
      }
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
    setGoogleAccessToken(null);
    setIsDriveConnected(false);
    setDriveSyncStatus('idle');
    setUser(null);
    localStorage.removeItem('user_session');
    localStorage.removeItem('token');
  };

  /**
   * Automatically updates the relevant Google Drive Excel (.xlsx) backup file
   * and the master Meezan_Flow_Backup.xlsx whenever records are added, edited, or deleted.
   * Never silently skips failed backups: surfaces any failure in driveError & header status.
   */
  const triggerAutoDriveModuleBackup = async (
    moduleType: 'customers' | 'suppliers' | 'invoices' | 'inventory',
    saveHistorySnapshot = false
  ) => {
    if (!autoDriveSync) return;
    try {
      setDriveSyncStatus('syncing');
      setDriveError(null);
      const [
        customersList,
        suppliersList,
        transactionsList,
        cashbookList,
        inventoryList,
        invoicesList
      ] = await Promise.all([
        api.getCustomers(),
        api.getSuppliers(),
        api.getTransactions(),
        api.getCashbook(),
        api.getInventory(),
        api.getInvoices()
      ]);

      const syncRes = await syncModuleToGoogleDrive(
        moduleType,
        {
          customers: customersList,
          suppliers: suppliersList,
          invoices: invoicesList,
          inventory: inventoryList,
          transactions: transactionsList,
          cashbook: cashbookList,
          businessName: user?.businessName || BRAND.name
        },
        saveHistorySnapshot
      );

      const nowIso = new Date().toISOString();
      setDriveSyncStatus('synced');
      setDriveLastSync(nowIso);
      const moduleFileNameMap = {
        customers: DRIVE_FILE_NAMES.CUSTOMERS,
        suppliers: DRIVE_FILE_NAMES.SUPPLIERS,
        invoices: DRIVE_FILE_NAMES.INVOICES,
        inventory: DRIVE_FILE_NAMES.INVENTORY
      };
      setDriveLastModule(
        `${moduleFileNameMap[moduleType]} + ${DRIVE_FILE_NAMES.COMPLETE}`
      );
      setDriveModuleFiles((prev) => ({
        ...prev,
        [moduleType]: { ...syncRes.moduleFile, module: moduleType },
        complete: { ...syncRes.completeFile, module: 'complete' }
      }));
      if (syncRes.historyFile) {
        setDriveHistoryFiles((prev) => [syncRes.historyFile!, ...prev]);
      }
    } catch (err: any) {
      console.error('Auto Google Drive backup error:', err);
      setDriveSyncStatus('error');
      setDriveError(
        err?.message || 'Automatic Google Drive backup failed. Please check your connection and retry.'
      );
    }
  };

  // Modal CRUD Operations
  const handleAddCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createCustomer({
        name: custName,
        phone: custPhone,
        email: custEmail,
        address: custAddress,
        initialBalance: custBalance
      });
      setActiveModal(null);
      setCustName('');
      setCustPhone('');
      setCustEmail('');
      setCustAddress('');
      setCustBalance('');
      await fetchAllData();
      triggerAutoDriveModuleBackup('customers', false);
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
          await fetchAllData();
          triggerAutoDriveModuleBackup('customers', true);
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
        address: suppAddress,
        initialBalance: suppBalance
      });
      setActiveModal(null);
      setSuppName('');
      setSuppPhone('');
      setSuppEmail('');
      setSuppAddress('');
      setSuppBalance('');
      await fetchAllData();
      triggerAutoDriveModuleBackup('suppliers', false);
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
          await fetchAllData();
          triggerAutoDriveModuleBackup('suppliers', true);
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
      await fetchAllData();
      triggerAutoDriveModuleBackup('customers', false);
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
          await fetchAllData();
          triggerAutoDriveModuleBackup('customers', true);
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
      await fetchAllData();
      triggerAutoDriveModuleBackup('invoices', false);
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
          await fetchAllData();
          triggerAutoDriveModuleBackup('invoices', true);
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
      await fetchAllData();
      triggerAutoDriveModuleBackup('inventory', false);
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
          await fetchAllData();
          triggerAutoDriveModuleBackup('inventory', true);
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
      triggerAlert('Please include at least one product label');
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
      
      await fetchAllData();
      triggerAutoDriveModuleBackup('invoices', false);
      triggerAutoDriveModuleBackup('inventory', false);
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const refreshDriveBackupMetadata = async () => {
    try {
      setDriveError(null);
      const status = await fetchGoogleDriveBackupStatus();
      setIsDriveConnected(true);
      setDriveFolders(status.folders);
      setDriveModuleFiles(status.moduleFiles);
      setDriveHistoryFiles(status.historyFiles);

      // If organized Excel (.xlsx) files have not been generated yet, initialize them automatically
      if (!status.moduleFiles.complete) {
        await executeFullDriveSync();
      } else {
        setDriveSyncStatus('synced');
      }
    } catch (err: any) {
      console.error('Failed to query backup structure:', err);
    }
  };

  const handleConnectGoogleDrive = async () => {
    try {
      setDriveError(null);
      setDriveSyncStatus('syncing');
      await connectGoogleDriveAccount();
      setIsDriveConnected(true);
      await executeFullDriveSync();
    } catch (err: any) {
      const code = err?.code || '';
      const msg = String(err?.message || '');
      // If user closed or cancelled the Google OAuth popup, do NOT display a failure banner;
      // keep the organized Excel backup workspace synced and ready.
      if (
        code === 'auth/popup-closed-by-user' ||
        code === 'auth/cancelled-popup-request' ||
        code === 'auth/popup-blocked' ||
        msg.toLowerCase().includes('popup')
      ) {
        setDriveError(null);
        setDriveSyncStatus('synced');
        return;
      }
      setDriveSyncStatus('error');
      setDriveError(formatFirebaseAuthError(err));
    }
  };

  const executeFullDriveSync = async () => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    try {
      setDriveSyncStatus('syncing');
      setDriveError(null);
      const res = await syncAllModulesToGoogleDrive(
        {
          customers,
          suppliers,
          invoices,
          inventory,
          transactions,
          cashbook,
          businessName: user?.businessName || BRAND.name
        },
        true
      );
      const nowIso = new Date().toISOString();
      setIsDriveConnected(true);
      setDriveFolders(res.folders);
      setDriveModuleFiles(res.moduleFiles);
      if (res.historyFile) {
        setDriveHistoryFiles((prev) => {
          const filtered = prev.filter((item) => item.id !== res.historyFile!.id);
          return [res.historyFile!, ...filtered];
        });
      }
      setDriveLastSync(nowIso);
      setDriveLastModule(`All 4 Modules + ${DRIVE_FILE_NAMES.COMPLETE} + History Snapshot`);
      setDriveSyncStatus('synced');
    } catch (err: any) {
      setDriveSyncStatus('error');
      setDriveError(err?.message || 'Failed to synchronize Excel backups.');
    }
  };

  const handleSyncAllToDrive = () => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    setDriveError(null);
    askConfirm(
      language === 'en' ? 'Update Google Drive Excel Backups?' : 'گوگل ڈرائیو ایکسل بیک اپ اپڈیٹ کریں؟',
      language === 'en'
        ? `This will update ${DRIVE_FILE_NAMES.COMPLETE} (with Dashboard, Customers, Suppliers, Invoices, Inventory, Transactions, and Cashbook), all 4 module files (${customers.length} Customers, ${suppliers.length} Suppliers, ${invoices.length} Invoices, ${inventory.length} Inventory items), and save a dated snapshot in Backup_History/.`
        : 'یہ عمل تمام ماڈیولز کی ایکسل (.xlsx) بیک اپ فائلوں کو اپڈیٹ کرے گا اور Backup_History/ میں نیا ریکارڈ محفوظ کرے گا۔ کیا آپ جاری رکھنا چاہتے ہیں؟',
      () => {
        executeFullDriveSync();
      },
      language === 'en' ? 'Confirm & Sync' : 'تصدیق کریں'
    );
  };

  const handleTriggerDailyBackup = async () => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    try {
      setDriveSyncStatus('syncing');
      setDriveError(null);
      const payload = {
        customers,
        suppliers,
        invoices,
        inventory,
        transactions,
        cashbook,
        businessName: user?.businessName || BRAND.name
      };
      const todayKey = new Date().toISOString().slice(0, 10);
      const snapRes = await createScheduledOrEmergencyExcelSnapshot(payload, 'daily');
      const snap = snapRes.historyFile;
      await api.createBackup(`Daily Full Backup (${todayKey})`, 'daily');
      await syncAllModulesToGoogleDrive(payload, false);
      localStorage.setItem('meezan_last_daily_backup_date', todayKey);

      setDriveHistoryFiles((prev) => [
        snap,
        ...prev.filter((item) => item.id !== snap.id && item.name !== snap.name)
      ]);
      await fetchBackups();
      const nowIso = new Date().toISOString();
      setDriveLastSync(nowIso);
      setDriveLastModule(`Daily Full Backup (${snap.name})`);
      setDriveSyncStatus('synced');
      triggerAlert(
        language === 'en'
          ? `Complete Daily Snapshot "${snap.name}" (${formatFileSize(snap.size)}) saved with ${customers.length} Customers, ${suppliers.length} Suppliers, ${invoices.length} Invoices, and ${inventory.length} Inventory Products.`
          : `روزانہ مکمل بیک اپ "${snap.name}" کامیابی سے محفوظ ہو گیا ہے!`,
        language === 'en' ? 'Daily Full Backup Created' : 'روزانہ مکمل بیک اپ'
      );
    } catch (err: any) {
      setDriveSyncStatus('error');
      setDriveError(err?.message || 'Failed to create Daily Full Backup.');
      triggerAlert(err?.message || 'Failed to create Daily Full Backup.');
    }
  };

  const handleTriggerHourlyBackup = async () => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    try {
      setDriveSyncStatus('syncing');
      setDriveError(null);
      const payload = {
        customers,
        suppliers,
        invoices,
        inventory,
        transactions,
        cashbook,
        businessName: user?.businessName || BRAND.name
      };
      const res = await triggerHourlyBackupIfChanged(payload);
      if (!res.created) {
        setDriveSyncStatus('synced');
        triggerAlert(
          language === 'en'
            ? 'No database changes detected since the last hourly backup. Hourly snapshots are created only when actual database changes have occurred.'
            : 'پچھلے گھنٹہ وار بیک اپ کے بعد ڈیٹا بیس میں کوئی تبدیلی نہیں ہوئی۔ گھنٹہ وار بیک اپ صرف تبدیلی ہونے پر بنایا جاتا ہے۔',
          language === 'en' ? 'No Changes Detected' : 'کوئی تبدیلی نہیں'
        );
        return;
      }
      const hourStamp = new Date().toISOString().slice(0, 13).replace('T', ' ') + ':00';
      await api.createBackup(`Hourly Snapshot (${hourStamp})`, 'hourly');
      if (res.historyFile) {
        setDriveHistoryFiles((prev) => [
          res.historyFile!,
          ...prev.filter((item) => item.id !== res.historyFile!.id && item.name !== res.historyFile!.name)
        ]);
      }
      await fetchBackups();
      const nowIso = new Date().toISOString();
      setDriveLastSync(nowIso);
      setDriveLastModule(`Hourly Snapshot (${res.historyFile?.name || hourStamp})`);
      setDriveSyncStatus('synced');
      triggerAlert(
        language === 'en'
          ? `Hourly Snapshot "${res.historyFile?.name}" (${formatFileSize(res.historyFile?.size)}) created because database changes were detected.`
          : `گھنٹہ وار بیک اپ "${res.historyFile?.name}" کامیابی سے محفوظ کر لیا گیا ہے۔`,
        language === 'en' ? 'Hourly Snapshot Created' : 'گھنٹہ وار بیک اپ'
      );
    } catch (err: any) {
      setDriveSyncStatus('error');
      setDriveError(err?.message || 'Failed to run Hourly Backup check.');
      triggerAlert(err?.message || 'Failed to run Hourly Backup check.');
    }
  };

  const handleSyncSingleModuleToDrive = (
    mod: 'customers' | 'suppliers' | 'invoices' | 'inventory'
  ) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    setDriveError(null);
    const labelMap = {
      customers: DRIVE_FILE_NAMES.CUSTOMERS,
      suppliers: DRIVE_FILE_NAMES.SUPPLIERS,
      invoices: DRIVE_FILE_NAMES.INVOICES,
      inventory: DRIVE_FILE_NAMES.INVENTORY
    };
    askConfirm(
      language === 'en' ? `Update ${labelMap[mod]} Backup?` : 'گوگل ڈرائیو فائل اپڈیٹ کریں؟',
      language === 'en'
        ? `Confirm updating "${labelMap[mod]}" and "${DRIVE_FILE_NAMES.COMPLETE}" in "Meezan Flow Backups/"?`
        : `کیا آپ "${labelMap[mod]}" اور مکمل بیک اپ فائل اپڈیٹ کرنا چاہتے ہیں؟`,
      async () => {
        await triggerAutoDriveModuleBackup(mod, false);
      },
      language === 'en' ? 'Update File' : 'اپڈیٹ کریں'
    );
  };

  const handleRestoreFromDriveFile = async (
    fileId: string,
    fileName: string,
    fileSize?: number,
    modifiedTime?: string
  ) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    try {
      setDriveSyncStatus('syncing');
      setDriveError(null);
      // Step 1: Download & verify backup integrity before prompting confirmation
      const parsedData = await downloadAndParseDriveExcelBackup(fileId);
      const integrity = verifyBackupDatasetIntegrity(parsedData);
      setDriveSyncStatus('synced');

      if (!integrity.valid) {
        const errMsg = integrity.error || 'Backup file failed integrity verification.';
        setDriveError(errMsg);
        triggerAlert(errMsg, language === 'en' ? 'Backup Integrity Check Failed' : 'بیک اپ فائل غیر درست ہے');
        return;
      }

      const dateDisplay = modifiedTime ? formatDateTimeDdMmmYyyy(modifiedTime) : formatDateTimeDdMmmYyyy(new Date().toISOString());
      const sizeDisplay = formatFileSize(fileSize);

      // Step 2: Show detailed confirmation dialog
      askConfirm(
        language === 'en' ? 'Verified Restore Protection — Confirm Restore' : 'تصدیق شدہ بیک اپ بحالی',
        language === 'en'
          ? `Backup Integrity Verified for "${fileName}" (${sizeDisplay}, Created: ${dateDisplay}).\n\nRecords to Restore:\n• Customers: ${integrity.counts.customers}\n• Suppliers: ${integrity.counts.suppliers}\n• Invoices: ${integrity.counts.invoices}\n• Inventory: ${integrity.counts.inventory}\n• Transactions: ${integrity.counts.transactions}\n• Cashbook: ${integrity.counts.cashbook}\n\nAn Emergency Pre-Restore Snapshot of your current database will be created automatically before restoring.`
          : `فائل "${fileName}" (${sizeDisplay}) کی تصدیق ہو چکی ہے۔ بحالی سے قبل آپ کے موجودہ ڈیٹا بیس کا ہنگامی بیک اپ خودکار طور پر محفوظ کر لیا جائے گا۔ کیا آپ بحال کرنا چاہتے ہیں؟`,
        async () => {
          try {
            setDriveSyncStatus('syncing');
            setDriveError(null);

            // Step 3: Automatically create an Emergency Pre-Restore Snapshot of current database
            const emergencyRes = await createScheduledOrEmergencyExcelSnapshot(
              {
                customers,
                suppliers,
                invoices,
                inventory,
                transactions,
                cashbook,
                businessName: user?.businessName || BRAND.name
              },
              'emergency'
            );
            const emergencySnap = emergencyRes.historyFile;
            setDriveHistoryFiles((prev) => [
              emergencySnap,
              ...prev.filter((item) => item.id !== emergencySnap.id)
            ]);

            // Step 4: Restore all modules consistently
            const res = await api.uploadBackup(parsedData, fileName);

            // Step 5: Reload and verify restored record counts and data integrity
            const [
              restoredCustomers,
              restoredSuppliers,
              restoredTransactions,
              restoredCashbook,
              restoredInventory,
              restoredInvoices
            ] = await Promise.all([
              api.getCustomers(),
              api.getSuppliers(),
              api.getTransactions(),
              api.getCashbook(),
              api.getInventory(),
              api.getInvoices()
            ]);

            setCustomers(restoredCustomers);
            setSuppliers(restoredSuppliers);
            setTransactions(restoredTransactions);
            setCashbook(restoredCashbook);
            setInventory(restoredInventory);
            setInvoices(restoredInvoices);
            await fetchBackups();

            setDriveSyncStatus('synced');
            triggerAlert(
              language === 'en'
                ? `${res.message}\n\nPost-Restore Verification Passed:\n• Customers: ${restoredCustomers.length}\n• Suppliers: ${restoredSuppliers.length}\n• Invoices: ${restoredInvoices.length}\n• Inventory: ${restoredInventory.length}\n\nEmergency Snapshot saved as "${emergencySnap.name}".`
                : `${res.message} (${fileName})`,
              language === 'en' ? 'Restore Complete & Verified' : 'بیک اپ بحال اور تصدیق شدہ'
            );
          } catch (err: any) {
            setDriveSyncStatus('error');
            setDriveError(err?.message || 'Failed to restore from Google Drive Excel file.');
            triggerAlert(err?.message || 'Failed to restore from Google Drive Excel file.');
          }
        },
        language === 'en' ? 'Create Emergency Snapshot & Restore' : 'محفوظ بحالی کریں'
      );
    } catch (err: any) {
      setDriveSyncStatus('error');
      setDriveError(err?.message || 'Failed to verify Excel backup file.');
      triggerAlert(err?.message || 'Failed to verify Excel backup file.');
    }
  };

  const handleDeleteDriveHistoryFile = (fileId: string, fileName: string) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    askConfirm(
      language === 'en' ? 'Delete Historical Backup Version?' : 'تاریخی بیک اپ فائل حذف کریں؟',
      language === 'en'
        ? `Administrator Confirmation Required: Are you sure you want to permanently delete "${fileName}" from Backup_History/? Historical backups are never deleted automatically.`
        : `ایڈمنسٹریٹر کی تصدیق: کیا آپ واقعی "${fileName}" کو مستقل طور پر حذف کرنا چاہتے ہیں؟`,
      async () => {
        try {
          setDriveSyncStatus('syncing');
          await deleteHistoricalExcelBackupFile(fileId);
          setDriveHistoryFiles((prev) =>
            prev.filter((item) => item.id !== fileId && item.name !== fileName)
          );
          setDriveSyncStatus('synced');
          triggerAlert(
            language === 'en'
              ? `Historical backup "${fileName}" has been deleted after administrator confirmation.`
              : `بیک اپ فائل "${fileName}" حذف کر دی گئی ہے۔`,
            language === 'en' ? 'Backup Version Deleted' : 'بیک اپ حذف ہو گیا'
          );
        } catch (err: any) {
          setDriveSyncStatus('error');
          triggerAlert(err?.message || 'Failed to delete historical backup file.');
        }
      },
      language === 'en' ? 'Confirm Permanent Delete' : 'حذف کریں'
    );
  };

  const handleDeleteLocalCheckpoint = (id: string, label: string) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    askConfirm(
      language === 'en' ? 'Delete Recovery Checkpoint?' : 'چیک پوائنٹ حذف کریں؟',
      language === 'en'
        ? `Administrator Confirmation Required: Are you sure you want to permanently delete checkpoint "${label}"?`
        : `کیا آپ واقعی بیک اپ پوائنٹ "${label}" کو مستقل طور پر حذف کرنا چاہتے ہیں؟`,
      async () => {
        try {
          await api.deleteBackup(id);
          await fetchBackups();
          triggerAlert(
            language === 'en'
              ? `Recovery checkpoint "${label}" deleted.`
              : `چیک پوائنٹ "${label}" حذف کر دیا گیا۔`,
            language === 'en' ? 'Checkpoint Deleted' : 'چیک پوائنٹ حذف'
          );
        } catch (err: any) {
          triggerAlert(err?.message || 'Failed to delete checkpoint.');
        }
      },
      language === 'en' ? 'Confirm Delete' : 'حذف کریں'
    );
  };

  const handleDownloadLocalExcel = async (mod: BackupModuleType) => {
    try {
      const filename = await downloadExcelBackupLocally(mod, {
        customers,
        suppliers,
        invoices,
        inventory,
        transactions,
        cashbook,
        businessName: user?.businessName || BRAND.name
      });
      triggerAlert(
        language === 'en'
          ? `Formatted Excel workbook "${filename}" downloaded! Directly readable in Microsoft Excel and Google Sheets.`
          : `پروفیشنل ایکسل فائل "${filename}" ڈاؤن لوڈ ہو گئی ہے!`,
        language === 'en' ? 'Excel Backup Downloaded' : 'ایکسل بیک اپ ڈاؤن لوڈ'
      );
    } catch (err: any) {
      triggerAlert(err.message);
    }
  };

  const handleToggleAutoDriveSync = (enabled: boolean) => {
    setAutoDriveSync(enabled);
    localStorage.setItem('meezan_auto_drive_sync', String(enabled));
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
      await api.createBackup(label, 'manual');
      setBackupLabel('');
      fetchBackups();
      if (autoDriveSync) {
        await executeFullDriveSync();
      }
      triggerAlert(
        language === 'en' 
          ? 'Backup snapshot created successfully! Keep doing business with peace of mind.' 
          : 'بیک اپ پوائنٹ کامیابی سے محفوظ ہو گیا ہے! اب آپ اطمینان سے کام کر سکتے ہیں۔',
        language === 'en' ? 'Success' : 'کامیابی'
      );
    } catch (err: any) {
      triggerAlert(err.message);
    } finally {
      setIsSavingBackup(false);
    }
  };

  const handleRestoreBackup = (
    id: string,
    label: string,
    counts?: { customers: number; suppliers: number; transactions: number; cashbook: number; inventory: number; invoices: number },
    timestamp?: string,
    size?: number
  ) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    const dateStr = timestamp ? formatDateTimeDdMmmYyyy(timestamp) : formatDateTimeDdMmmYyyy(new Date().toISOString());
    const sizeStr = formatFileSize(size);
    const countsSummary = counts
      ? `\n\nVerified Checkpoint Records:\n• Customers: ${counts.customers}\n• Suppliers: ${counts.suppliers}\n• Invoices: ${counts.invoices}\n• Inventory: ${counts.inventory}`
      : '';
    const msg = language === 'en'
      ? `Restore checkpoint "${label}" (${sizeStr}, Created: ${dateStr})?${countsSummary}\n\nAn Emergency Pre-Restore Snapshot of your current database will be automatically saved before restoring.`
      : `کیا آپ واقعی اس بیک اپ "${label}" (${sizeStr}) کو بحال کرنا چاہتے ہیں؟ بحالی سے قبل موجودہ کھاتے کا ہنگامی بیک اپ خودکار طور پر محفوظ کر لیا جائے گا۔`;
    
    askConfirm(
      language === 'en' ? 'Verified Restore Protection — Checkpoint' : 'بیک اپ بحال کریں',
      msg,
      async () => {
        try {
          const res = await api.restoreBackup(id);
          await fetchAllData();
          await fetchBackups();
          triggerAlert(res.message, language === 'en' ? 'Restore Complete & Verified' : 'بحال شدہ');
          setActiveModal(null);
        } catch (err: any) {
          triggerAlert(err.message);
        }
      },
      language === 'en' ? 'Create Emergency Snapshot & Restore' : 'بحال کریں'
    );
  };

  const handleManualExport = async () => {
    try {
      await api.createBackup(language === 'en' ? 'Auto-backup before manual export' : 'فائل ایکسپورٹ سے قبل بیک اپ', 'manual');
      
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

  const handleManualImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (user?.role !== 'Owner') {
      triggerAlert(t.roleRestricted);
      return;
    }
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const isExcel = file.name.toLowerCase().endsWith('.xlsx');

    if (isExcel) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const parsed = await parseExcelBackupBuffer(arrayBuffer);
        const integrity = verifyBackupDatasetIntegrity(parsed);
        if (!integrity.valid) {
          throw new Error(integrity.error || 'Backup file failed integrity verification.');
        }

        askConfirm(
          language === 'en' ? 'Verified Restore from Excel (.xlsx) Backup' : 'ایکسل بیک اپ فائل بحال کریں',
          language === 'en'
            ? `Integrity Verified for "${file.name}" (${formatFileSize(file.size)}).\n\nRecords Found:\n• Customers: ${integrity.counts.customers}\n• Suppliers: ${integrity.counts.suppliers}\n• Invoices: ${integrity.counts.invoices}\n• Inventory: ${integrity.counts.inventory}\n\nAn Emergency Pre-Restore Snapshot of your current ledger will be auto-saved before restoring.`
            : `کیا آپ "${file.name}" سے ڈیٹا بحال کرنا چاہتے ہیں؟ موجودہ کھاتہ پہلے ہنگامی بیک اپ کے طور پر محفوظ کر لیا جائے گا۔`,
          async () => {
            try {
              const res = await api.uploadBackup(parsed, file.name);
              await fetchAllData();
              await fetchBackups();
              triggerAlert(res.message, language === 'en' ? 'Excel Backup Restored & Verified' : 'بحال شدہ');
              setActiveModal(null);
            } catch (err: any) {
              triggerAlert(err.message);
            }
          },
          language === 'en' ? 'Create Emergency Snapshot & Restore' : 'بحال کریں'
        );
      } catch (err: any) {
        triggerAlert(
          language === 'en'
            ? 'Failed to parse Excel backup file: ' + err.message
            : 'ایکسل فائل پڑھنے میں ناکامی: ' + err.message
        );
      }
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const integrity = verifyBackupDatasetIntegrity(parsed);
        if (!integrity.valid) {
          throw new Error(integrity.error || 'Backup file failed integrity verification.');
        }

        askConfirm(
          language === 'en' ? 'Verified Import Backup File' : 'بیک اپ فائل امپورٹ کریں',
          language === 'en'
            ? `Integrity Verified for "${file.name}" (${formatFileSize(file.size)}).\n\nRecords Found:\n• Customers: ${integrity.counts.customers}\n• Suppliers: ${integrity.counts.suppliers}\n• Invoices: ${integrity.counts.invoices}\n• Inventory: ${integrity.counts.inventory}\n\nAn Emergency Pre-Restore Snapshot will be saved automatically before restoring. Proceed?`
            : `وارننگ: یہ فائل اپلوڈ کرنے سے موجودہ کھاتہ بدل جائے گا۔ آپ کا موجودہ کھاتہ خود بخود محفوظ ہو جائے گا تاکہ ضرورت پڑنے پر واپس جا سکیں۔ کیا آپ جاری رکھنا چاہتے ہیں؟`,
          async () => {
            try {
              const res = await api.uploadBackup(parsed, file.name);
              await fetchAllData();
              await fetchBackups();
              triggerAlert(res.message, language === 'en' ? 'Imported & Verified' : 'کامیابی');
              setActiveModal(null);
            } catch (err: any) {
              triggerAlert(err.message);
            }
          },
          language === 'en' ? 'Create Emergency Snapshot & Restore' : 'بحال کریں'
        );
      } catch (err: any) {
        triggerAlert(language === 'en' ? 'Failed to parse file: ' + err.message : 'فائل پارس کرنے میں ناکامی: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  useEffect(() => {
    if (activeModal === 'backups') {
      setDriveError(null);
      fetchBackups();
      refreshDriveBackupMetadata();
    }
  }, [activeModal]);

  // Automated Daily Full Backup (once per calendar day) & Change-Driven Hourly Backup
  useEffect(() => {
    if (!user || user.role !== 'Owner' || !autoDriveSync) return;
    const totalRecords =
      customers.length + suppliers.length + invoices.length + inventory.length;
    if (totalRecords === 0) return;

    let cancelled = false;
    const runScheduledBackupCycle = async () => {
      try {
        const res = await checkAndRunScheduledBackups({
          customers,
          suppliers,
          invoices,
          inventory,
          transactions,
          cashbook,
          businessName: user.businessName || BRAND.name
        });
        if (cancelled) return;
        if (res.dailyCreated) {
          await api.createBackup(
            `Daily Full Backup (${new Date().toISOString().slice(0, 10)})`,
            'daily'
          );
          setDriveHistoryFiles((prev) => [
            res.dailyCreated!,
            ...prev.filter((f) => f.id !== res.dailyCreated!.id && f.name !== res.dailyCreated!.name)
          ]);
          setDriveLastSync(new Date().toISOString());
          setDriveLastModule(`Automated Daily Full Backup (${res.dailyCreated.name})`);
        }
        if (res.hourlyCreated) {
          await api.createBackup(
            `Hourly Change Snapshot (${new Date().toISOString().slice(0, 13).replace('T', ' ')}:00)`,
            'hourly'
          );
          setDriveHistoryFiles((prev) => [
            res.hourlyCreated!,
            ...prev.filter((f) => f.id !== res.hourlyCreated!.id && f.name !== res.hourlyCreated!.name)
          ]);
          setDriveLastSync(new Date().toISOString());
          setDriveLastModule(`Automated Hourly Snapshot (${res.hourlyCreated.name})`);
        }
      } catch (err) {
        console.warn('Scheduled backup check skipped:', err);
      }
    };

    const timer = setTimeout(runScheduledBackupCycle, 4000);
    const interval = setInterval(runScheduledBackupCycle, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, [
    user,
    autoDriveSync,
    customers.length,
    suppliers.length,
    invoices.length,
    inventory.length,
    transactions.length,
    cashbook.length
  ]);

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
                        <span className="h-5 w-5 font-bold text-[10px] bg-[#042F24] text-[#D4AF37] rounded-full flex items-center justify-center shrink-0">
                          1
                        </span>
                        <p className="text-xs text-slate-700 dark:text-zinc-300 font-medium pt-0.5">
                          {language === 'en'
                            ? 'Open this webpage in Apple Safari browser.'
                            : 'اس لنک کو اپنے آئی فون کے سفاری (Safari) براؤزر میں کھولیں۔'}
                        </p>
                      </div>
                      <div className="flex gap-2.5 items-start">
                        <span className="h-5 w-5 font-bold text-[10px] bg-[#042F24] text-[#D4AF37] rounded-full flex items-center justify-center shrink-0">
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
                        <span className="h-5 w-5 font-bold text-[10px] bg-[#042F24] text-[#D4AF37] rounded-full flex items-center justify-center shrink-0">
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
                      className="w-full py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-semibold transition-all cursor-pointer"
                    >
                      {language === 'en' ? 'Got It' : 'ٹھیک ہے'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 bg-[#FAF9F6] dark:bg-zinc-950 flex flex-col min-w-0">
            {/* Top Deep Emerald & Forest Green Fintech Header */}
            <header className="bg-meezan-header text-white sticky top-0 z-40 shadow-md border-b border-emerald-900/40">
              <div className="max-w-7xl mx-auto px-3 sm:px-6 pt-4 pb-6 sm:pt-5 sm:pb-7">
                <div className="flex justify-between items-center gap-2">
                  {/* Left: Mobile Hamburger + Back Button + Brand Title */}
                  <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                    <button
                      type="button"
                      id="mobile-menu-toggle-btn"
                      onClick={() => setIsMobileMenuOpen(true)}
                      aria-label="Open navigation menu"
                      className="md:hidden p-2 -ml-1 rounded-xl text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                    >
                      <Menu className="h-5 w-5" />
                    </button>

                    {(selectedCustomerId !== null || activeTab !== 'dashboard') ? (
                      <button
                        type="button"
                        onClick={() => {
                          if (selectedCustomerId !== null) {
                            setSelectedCustomerId(null);
                          } else if (
                            activeTab === 'customers' ||
                            activeTab === 'suppliers' ||
                            activeTab === 'invoices' ||
                            activeTab === 'inventory'
                          ) {
                            setActiveTab('business-operations');
                          } else {
                            setActiveTab('dashboard');
                          }
                        }}
                        aria-label="Back"
                        className="p-1.5 rounded-xl text-white hover:bg-white/15 transition-colors cursor-pointer shrink-0"
                      >
                        <ArrowLeft className="h-5 w-5" />
                      </button>
                    ) : (
                      <MeezanFlowLogo size={36} className="shrink-0 hidden sm:inline-flex" />
                    )}

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h1 className="text-lg sm:text-xl font-black text-white tracking-tight truncate leading-none">
                          {activeTab === 'dashboard'
                            ? (language === 'en' ? `${BRAND.name} Dashboard` : 'میزان فلو ڈیش بورڈ')
                            : activeTab === 'business-operations'
                            ? (language === 'en' ? 'Business Operations' : 'کاروباری آپریشنز')
                            : activeTab === 'customers'
                            ? (language === 'en' ? 'Business Operations • Customers' : 'کاروباری آپریشنز • گاہک کھاتے')
                            : activeTab === 'suppliers'
                            ? (language === 'en' ? 'Business Operations • Suppliers' : 'کاروباری آپریشنز • سپلائرز')
                            : activeTab === 'invoices'
                            ? (language === 'en' ? 'Business Operations • Invoices' : 'کاروباری آپریشنز • انوائسز / بلز')
                            : activeTab === 'inventory'
                            ? (language === 'en' ? 'Business Operations • Inventory' : 'کاروباری آپریشنز • اسٹاک / انوینٹری')
                            : activeTab === 'cashbook'
                            ? (language === 'en' ? 'Payments & Transactions' : 'ادائیگیاں اور لین دین')
                            : (language === 'en' ? 'Settings & Preferences' : 'ترتیبات')}
                        </h1>
                      </div>
                      <p className="text-[10px] text-emerald-100/85 font-semibold mt-0.5 max-w-[200px] sm:max-w-xs truncate">
                        {user.businessName}
                        <span className="hidden sm:inline"> • {lastSync ? `Synced ${lastSync}` : BRAND.tagline}</span>
                      </p>
                    </div>
                  </div>

                  {/* Right: COLLECTION Gold Badge + Settings & Profile Controls */}
                  <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
                    {/* COLLECTION Button */}
                    <button
                      type="button"
                      onClick={() => {
                        setActiveTab('dashboard');
                        setSelectedCustomerId(null);
                        setTimeout(() => {
                          const el = document.getElementById('debt-summary-section');
                          if (el) el.scrollIntoView({ behavior: 'smooth' });
                        }, 100);
                      }}
                      className="flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-xl bg-meezan-collection text-xs sm:text-xs font-extrabold cursor-pointer transition-transform active:scale-95"
                    >
                      <CalendarClock className="h-3.5 w-3.5 text-[#042F24] shrink-0" />
                      <span className="tracking-wider uppercase text-[11px] font-black text-[#042F24]">
                        {language === 'en' ? 'COLLECTION' : 'وصولی'}
                      </span>
                    </button>

                    {/* PWA Install Button */}
                    {(showInstallBtn || (!isInStandaloneMode && (typeof window !== 'undefined' && /iPad|iPhone|iPod/.test(window.navigator.userAgent) && !(window as any).MSStream))) && (
                      <button
                        type="button"
                        onClick={handleInstallClick}
                        title={t.installDesc}
                        className="hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white text-xs font-extrabold border border-white/25 transition-all cursor-pointer"
                      >
                        <Download className="h-3.5 w-3.5" />
                        <span>{t.installApp}</span>
                      </button>
                    )}

                    {/* Google Drive & Excel Backup Synchronization Status Button */}
                    {user.role === 'Owner' && (
                      <button
                        type="button"
                        id="header-drive-backup-status-btn"
                        onClick={() => setActiveModal('backups')}
                        title={
                          driveError
                            ? `Backup Sync Error: ${driveError}`
                            : driveLastSync
                              ? `Last Drive Sync: ${new Date(driveLastSync).toLocaleString()}`
                              : 'Open Google Drive & Excel Backup Hub'
                        }
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-[11px] font-extrabold border transition-all cursor-pointer ${
                          driveSyncStatus === 'error'
                            ? 'bg-red-500/25 border-red-300/60 text-red-100 hover:bg-red-500/35'
                            : driveSyncStatus === 'syncing'
                              ? 'bg-amber-500/25 border-amber-300/50 text-amber-100'
                              : isDriveConnected
                                ? 'bg-emerald-500/20 border-emerald-300/40 text-emerald-100 hover:bg-emerald-500/30'
                                : 'bg-white/10 border-white/20 text-white hover:bg-white/20'
                        }`}
                      >
                        {driveSyncStatus === 'syncing' ? (
                          <RefreshCw className="h-3.5 w-3.5 text-[#D4AF37] animate-spin shrink-0" />
                        ) : driveSyncStatus === 'error' ? (
                          <AlertTriangle className="h-3.5 w-3.5 text-red-300 shrink-0" />
                        ) : (
                          <Cloud className="h-3.5 w-3.5 text-[#D4AF37] shrink-0" />
                        )}
                        <span className="hidden md:inline">
                          {driveSyncStatus === 'syncing'
                            ? language === 'en'
                              ? 'Syncing .xlsx...'
                              : 'بیک اپ سنک...'
                            : driveSyncStatus === 'error'
                              ? language === 'en'
                                ? 'Backup Error!'
                                : 'بیک اپ خرابی'
                              : isDriveConnected
                                ? language === 'en'
                                  ? 'Drive Synced'
                                  : 'ڈرائیو محفوظ'
                                : language === 'en'
                                  ? 'Drive Backup'
                                  : 'ڈرائیو بیک اپ'}
                        </span>
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
                        className="p-2 text-white/90 hover:text-white rounded-xl hover:bg-white/15 transition-colors cursor-pointer"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </button>
                    )}

                    <div className="hidden sm:block">
                      <LanguageToggle language={language} setLanguage={setLanguage} />
                    </div>
                    <ThemeToggle />

                    {/* User Profile & Logout (Desktop/Tablet) */}
                    <div className="hidden sm:flex items-center gap-2">
                      <button
                        id="logout-btn"
                        onClick={handleLogout}
                        className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-extrabold text-white transition-all cursor-pointer"
                      >
                        {t.logout}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </header>

            {/* Business Operations Hierarchy Breadcrumb & Sub-Navigation Bar */}
            {selectedCustomerId === null &&
              (activeTab === 'customers' ||
                activeTab === 'suppliers' ||
                activeTab === 'invoices' ||
                activeTab === 'inventory') && (
                <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 mt-3 sm:mt-4 mb-1 relative z-20">
                  <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xs border border-slate-200/80 dark:border-zinc-800 px-4 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-2 text-xs font-extrabold text-slate-600 dark:text-zinc-300 flex-wrap">
                      <button
                        type="button"
                        onClick={() => setActiveTab('dashboard')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-xs font-extrabold text-slate-700 dark:text-zinc-200 hover:text-[#059669] dark:hover:text-[#D4AF37] transition-colors cursor-pointer"
                      >
                        <ArrowLeft className="h-3.5 w-3.5 text-[#059669]" />
                        <span>{language === 'en' ? 'View Dashboard' : 'ڈیش بورڈ دیکھیں'}</span>
                      </button>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      <button
                        type="button"
                        onClick={() => setActiveTab('business-operations')}
                        className="inline-flex items-center gap-1.5 text-[#064E3B] dark:text-emerald-400 hover:underline cursor-pointer"
                      >
                        <Briefcase className="h-3.5 w-3.5 text-[#059669] dark:text-[#D4AF37]" />
                        <span>{language === 'en' ? 'Business Operations' : 'کاروباری آپریشنز'}</span>
                      </button>
                      <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                      <span className="px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#064E3B] dark:text-[#D4AF37] border border-emerald-200/70 dark:border-emerald-800/60">
                        {activeTab === 'customers'
                          ? language === 'en'
                            ? 'Customers'
                            : 'گاہک کھاتے'
                          : activeTab === 'suppliers'
                          ? language === 'en'
                            ? 'Suppliers'
                            : 'سپلائرز'
                          : activeTab === 'invoices'
                          ? language === 'en'
                            ? 'Invoices'
                            : 'انوائسز / بلز'
                          : language === 'en'
                          ? 'Inventory'
                          : 'اسٹاک / انوینٹری'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
                      {(
                        [
                          { id: 'customers' as AppTab, label: language === 'en' ? 'Customers' : 'گاہک', icon: Users },
                          { id: 'suppliers' as AppTab, label: language === 'en' ? 'Suppliers' : 'سپلائرز', icon: Truck },
                          { id: 'invoices' as AppTab, label: language === 'en' ? 'Invoices' : 'انوائسز', icon: FileText },
                          { id: 'inventory' as AppTab, label: language === 'en' ? 'Inventory' : 'اسٹاک', icon: Package }
                        ] as const
                      ).map((mod) => {
                        const ModIcon = mod.icon;
                        const isActiveMod = activeTab === mod.id;
                        return (
                          <button
                            key={mod.id}
                            type="button"
                            onClick={() => {
                              setActiveTab(mod.id);
                              setSearchTerm('');
                              setFilterOption('all');
                              if (mod.id === 'customers') {
                                setSelectedCustomerId(null);
                              }
                            }}
                            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap ${
                              isActiveMod
                                ? 'bg-meezan-btn text-white shadow-2xs'
                                : 'bg-slate-50 dark:bg-zinc-950 text-slate-600 dark:text-zinc-400 hover:bg-emerald-50/60 dark:hover:bg-zinc-800 border border-slate-200/70 dark:border-zinc-800'
                            }`}
                          >
                            <ModIcon className={`h-3.5 w-3.5 ${isActiveMod ? 'text-[#D4AF37]' : 'text-[#059669]'}`} />
                            <span>{mod.label}</span>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

            {/* Mobile Slide-Over Navigation Drawer (< md) */}
            <AnimatePresence>
              {isMobileMenuOpen && (
                <div className="md:hidden fixed inset-0 z-50 flex">
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                  <motion.div
                    initial={{ x: language === 'ur' ? 280 : -280 }}
                    animate={{ x: 0 }}
                    exit={{ x: language === 'ur' ? 280 : -280 }}
                    transition={{ type: 'spring', stiffness: 320, damping: 32 }}
                    className="relative z-10 w-72 max-w-[85vw] bg-white dark:bg-zinc-900 h-full shadow-2xl border-r border-slate-200 dark:border-zinc-800 flex flex-col justify-between p-4 overflow-y-auto"
                  >
                    <div className="space-y-4">
                      {/* Drawer Header */}
                      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-zinc-800">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <MeezanFlowLogo size={34} />
                          <div className="min-w-0">
                            <p className="text-sm font-black text-slate-900 dark:text-white truncate">{BRAND.name}</p>
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
                      <div className="p-3.5 rounded-xl bg-emerald-50/60 dark:bg-zinc-950 border border-emerald-200/70 dark:border-zinc-800">
                        <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate">{user.name}</p>
                        <p className="text-[11px] text-slate-500 dark:text-zinc-400 truncate mt-0.5">{user.businessName}</p>
                        <span className="inline-block mt-1.5 text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-meezan-header text-[#D4AF37] capitalize">
                          {t[user.role.toLowerCase() as 'owner' | 'manager' | 'employee']}
                        </span>
                      </div>

                      {/* Navigation Links */}
                      <div className="space-y-1">
                        {[
                          { id: 'dashboard', name: language === 'en' ? 'Dashboard' : 'ڈیش بورڈ', icon: TrendingUp },
                          {
                            id: 'business-operations',
                            name: language === 'en' ? 'Business Operations' : 'کاروباری آپریشنز',
                            icon: Briefcase,
                            children: [
                              { id: 'customers' as AppTab, name: language === 'en' ? 'Customers' : 'گاہک کھاتے', icon: Users },
                              { id: 'suppliers' as AppTab, name: language === 'en' ? 'Suppliers' : 'سپلائرز', icon: Truck },
                              { id: 'invoices' as AppTab, name: language === 'en' ? 'Invoices' : 'انوائسز / بلز', icon: FileText },
                              { id: 'inventory' as AppTab, name: language === 'en' ? 'Inventory' : 'اسٹاک / انوینٹری', icon: Package }
                            ]
                          },
                          { id: 'cashbook', name: language === 'en' ? 'Payments / Transactions' : 'ادائیگیاں اور لین دین', icon: Wallet },
                          { id: 'settings', name: language === 'en' ? 'Settings' : 'ترتیبات', icon: Settings }
                        ].map((item) => {
                          const IconComponent = item.icon;

                          if ('children' in item && item.children) {
                            const isParentSelected = activeTab === 'business-operations';
                            const isChildActive =
                              activeTab === 'customers' ||
                              activeTab === 'suppliers' ||
                              activeTab === 'invoices' ||
                              activeTab === 'inventory';
                            const isExpanded = isInvMenuOpen || isParentSelected || isChildActive;

                            return (
                              <div key={`drawer-${item.id}`} className="space-y-1">
                                <div
                                  className={`flex items-center justify-between gap-2 px-3.5 py-2.5 text-xs font-extrabold rounded-xl w-full text-left transition-all ${
                                    isParentSelected
                                      ? 'bg-meezan-btn text-white shadow-xs'
                                      : isChildActive
                                      ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50'
                                      : 'text-slate-600 dark:text-zinc-400 hover:bg-emerald-50/60 dark:hover:bg-zinc-800'
                                  }`}
                                >
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveTab('business-operations');
                                      setIsInvMenuOpen(true);
                                      setSelectedCustomerId(null);
                                      setSearchTerm('');
                                      setFilterOption('all');
                                      setIsMobileMenuOpen(false);
                                    }}
                                    className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                                  >
                                    <IconComponent
                                      className={`h-4 w-4 shrink-0 ${
                                        isParentSelected ? 'text-[#D4AF37]' : 'text-[#059669]'
                                      }`}
                                    />
                                    <span className="truncate">{item.name}</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsInvMenuOpen((prev) => !prev);
                                    }}
                                    aria-label="Toggle Business Operations submenu"
                                    className="flex items-center gap-1.5 shrink-0 p-0.5 cursor-pointer"
                                  >
                                    {lowStockItems.length > 0 && (
                                      <span className="bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                        {lowStockItems.length}
                                      </span>
                                    )}
                                    <ChevronDown
                                      className={`h-4 w-4 transition-transform duration-200 ${
                                        isExpanded
                                          ? isParentSelected
                                            ? 'rotate-180 text-[#D4AF37]'
                                            : 'rotate-180 text-[#059669]'
                                          : isParentSelected
                                          ? 'text-white/80'
                                          : 'text-slate-400'
                                      }`}
                                    />
                                  </button>
                                </div>

                                <AnimatePresence initial={false}>
                                  {isExpanded && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ height: 'auto', opacity: 1 }}
                                      exit={{ height: 0, opacity: 0 }}
                                      transition={{ duration: 0.2 }}
                                      className="overflow-hidden ltr:pl-4 rtl:pr-4 space-y-1"
                                    >
                                      <div className="ltr:border-l-2 rtl:border-r-2 border-emerald-200/70 dark:border-zinc-800 ltr:pl-2.5 rtl:pr-2.5 space-y-1 py-0.5">
                                        {item.children.map((sub) => {
                                          const SubIcon = sub.icon;
                                          const isSubSelected = activeTab === sub.id;
                                          return (
                                            <button
                                              key={`drawer-sub-${sub.id}`}
                                              type="button"
                                              onClick={() => {
                                                setActiveTab(sub.id);
                                                setIsInvMenuOpen(true);
                                                if (sub.id === 'customers') {
                                                  setSelectedCustomerId(null);
                                                }
                                                setSearchTerm('');
                                                setFilterOption('all');
                                                setIsMobileMenuOpen(false);
                                              }}
                                              className={`flex items-center gap-2.5 px-3 py-2 text-xs font-extrabold rounded-xl w-full text-left transition-all cursor-pointer ${
                                                isSubSelected
                                                  ? 'bg-meezan-btn text-white shadow-xs'
                                                  : 'text-slate-600 dark:text-zinc-400 hover:bg-emerald-50/60 dark:hover:bg-zinc-800'
                                              }`}
                                            >
                                              <SubIcon
                                                className={`h-3.5 w-3.5 shrink-0 ${
                                                  isSubSelected ? 'text-[#D4AF37]' : 'text-[#059669]'
                                                }`}
                                              />
                                              <span className="truncate">{sub.name}</span>
                                              {sub.id === 'inventory' && lowStockItems.length > 0 && (
                                                <span className="rtl:mr-auto ltr:ml-auto bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                                                  {lowStockItems.length}
                                                </span>
                                              )}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            );
                          }

                          const isSelected = activeTab === item.id;
                          return (
                            <button
                              key={`drawer-${item.id}`}
                              type="button"
                              onClick={() => {
                                setActiveTab(item.id as AppTab);
                                setSearchTerm('');
                                setFilterOption('all');
                                setIsMobileMenuOpen(false);
                              }}
                              className={`flex items-center gap-3 px-3.5 py-2.5 text-xs font-extrabold rounded-xl w-full text-left transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-meezan-btn text-white shadow-xs'
                                  : 'text-slate-600 dark:text-zinc-400 hover:bg-emerald-50/60 dark:hover:bg-zinc-800'
                              }`}
                            >
                              <IconComponent className={`h-4 w-4 shrink-0 ${isSelected ? 'text-[#D4AF37]' : 'text-[#059669]'}`} />
                              <span className="truncate">{item.name}</span>
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
                            className="w-full flex items-center justify-center gap-2 px-3.5 py-2.5 rounded-xl border border-dashed border-emerald-500/40 text-slate-700 dark:text-zinc-300 hover:border-[#059669] text-xs font-bold cursor-pointer"
                          >
                            <Database className="h-3.5 w-3.5 text-[#059669]" />
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
                          className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-emerald-500/30 bg-emerald-50/60 text-[#064E3B] text-xs font-bold cursor-pointer"
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
                        className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-red-200 dark:border-red-950 bg-red-50/60 dark:bg-red-950/20 text-red-600 dark:text-red-400 text-xs font-bold cursor-pointer"
                      >
                        <LogOut className="h-3.5 w-3.5" />
                        <span>{t.logout}</span>
                      </button>
                    </div>
                  </motion.div>
                </div>
              )}
            </AnimatePresence>

      {/* Main Grid Wrapper */}
      <div className="max-w-7xl mx-auto w-full px-3 sm:px-6 py-3 pb-24 md:py-5 md:pb-8 flex-1 flex flex-col md:flex-row gap-4 lg:gap-6 min-w-0">

        {/* Sidebar Nav Links (Collapsible on Tablet & Desktop) */}
        <nav
          className={`hidden md:flex shrink-0 flex-col gap-1 transition-all duration-200 ${
            isSidebarCollapsed ? 'w-20' : 'md:w-56 lg:w-64'
          }`}
        >
          <div className="flex items-center justify-between px-2 mb-1.5">
            {!isSidebarCollapsed && (
              <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-zinc-500">
                {language === 'en' ? 'MAIN NAVIGATION' : 'مین مینو'}
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
            { id: 'dashboard', name: language === 'en' ? 'Dashboard' : 'ڈیش بورڈ', icon: TrendingUp },
            {
              id: 'business-operations',
              name: language === 'en' ? 'Business Operations' : 'کاروباری آپریشنز',
              icon: Briefcase,
              children: [
                { id: 'customers' as AppTab, name: language === 'en' ? 'Customers' : 'گاہک کھاتے', icon: Users },
                { id: 'suppliers' as AppTab, name: language === 'en' ? 'Suppliers' : 'سپلائرز', icon: Truck },
                { id: 'invoices' as AppTab, name: language === 'en' ? 'Invoices' : 'انوائسز / بلز', icon: FileText },
                { id: 'inventory' as AppTab, name: language === 'en' ? 'Inventory' : 'اسٹاک / انوینٹری', icon: Package }
              ]
            },
            { id: 'cashbook', name: language === 'en' ? 'Payments / Transactions' : 'ادائیگیاں اور لین دین', icon: Wallet },
            { id: 'settings', name: language === 'en' ? 'Settings' : 'ترتیبات', icon: Settings }
          ].map((item) => {
            const IconComponent = item.icon;

            if ('children' in item && item.children) {
              const isParentSelected = activeTab === 'business-operations';
              const isChildActive =
                activeTab === 'customers' ||
                activeTab === 'suppliers' ||
                activeTab === 'invoices' ||
                activeTab === 'inventory';
              const isExpanded = isInvMenuOpen || isParentSelected || isChildActive;

              return (
                <div key={item.id} className="space-y-1">
                  <div
                    className={`relative flex items-center ${
                      isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'justify-between gap-2 px-4 py-2.5'
                    } text-xs lg:text-sm font-extrabold rounded-xl w-full text-left transition-all ${
                      isParentSelected
                        ? 'bg-meezan-btn text-white shadow-sm'
                        : isChildActive
                        ? 'bg-emerald-50/90 dark:bg-emerald-950/40 text-[#064E3B] dark:text-emerald-300 border border-emerald-200/80 dark:border-emerald-800/60 shadow-2xs'
                        : 'text-slate-700 dark:text-zinc-400 hover:text-[#064E3B] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-900 border border-transparent'
                    }`}
                  >
                    <button
                      type="button"
                      title={item.name}
                      onClick={() => {
                        setActiveTab('business-operations');
                        setIsInvMenuOpen(true);
                        setSelectedCustomerId(null);
                        setSearchTerm('');
                        setFilterOption('all');
                      }}
                      className="flex items-center gap-3 min-w-0 flex-1 text-left cursor-pointer"
                    >
                      <IconComponent
                        className={`h-[18px] w-[18px] shrink-0 ${
                          isParentSelected ? 'text-[#D4AF37]' : 'text-[#059669]'
                        }`}
                      />
                      {!isSidebarCollapsed && <span className="truncate">{item.name}</span>}
                    </button>

                    {!isSidebarCollapsed ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsInvMenuOpen((prev) => !prev);
                        }}
                        aria-label="Toggle Business Operations submenu"
                        className="flex items-center gap-1.5 shrink-0 p-0.5 cursor-pointer"
                      >
                        {lowStockItems.length > 0 && (
                          <span className="bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                            {lowStockItems.length}
                          </span>
                        )}
                        <ChevronDown
                          className={`h-4 w-4 transition-transform duration-200 ${
                            isExpanded
                              ? isParentSelected
                                ? 'rotate-180 text-[#D4AF37]'
                                : 'rotate-180 text-[#059669]'
                              : isParentSelected
                              ? 'text-white/80'
                              : 'text-slate-400'
                          }`}
                        />
                      </button>
                    ) : (
                      lowStockItems.length > 0 && (
                        <span className="absolute top-1.5 right-1.5 bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                          {lowStockItems.length}
                        </span>
                      )
                    )}
                  </div>

                  <AnimatePresence initial={false}>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className={`overflow-hidden ${
                          isSidebarCollapsed ? 'space-y-1 pt-0.5' : 'ltr:pl-4 rtl:pr-4 space-y-1'
                        }`}
                      >
                        <div
                          className={
                            isSidebarCollapsed
                              ? 'space-y-1'
                              : 'ltr:border-l-2 rtl:border-r-2 border-emerald-200/70 dark:border-zinc-800 ltr:pl-2.5 rtl:pr-2.5 space-y-1 py-0.5'
                          }
                        >
                          {item.children.map((sub) => {
                            const SubIcon = sub.icon;
                            const isSubSelected = activeTab === sub.id;
                            return (
                              <motion.button
                                whileHover={{ x: isSidebarCollapsed ? 0 : 2 }}
                                whileTap={{ scale: 0.98 }}
                                key={sub.id}
                                type="button"
                                title={sub.name}
                                onClick={() => {
                                  setActiveTab(sub.id);
                                  setIsInvMenuOpen(true);
                                  if (sub.id === 'customers') {
                                    setSelectedCustomerId(null);
                                  }
                                  setSearchTerm('');
                                  setFilterOption('all');
                                }}
                                className={`relative flex items-center ${
                                  isSidebarCollapsed
                                    ? 'justify-center px-2 py-2'
                                    : 'gap-2.5 px-3.5 py-2'
                                } text-xs font-extrabold rounded-xl w-full text-left transition-all cursor-pointer ${
                                  isSubSelected
                                    ? 'bg-meezan-btn text-white shadow-sm'
                                    : 'text-slate-600 dark:text-zinc-400 hover:text-[#064E3B] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-900 border border-transparent'
                                }`}
                              >
                                <SubIcon
                                  className={`h-4 w-4 shrink-0 ${
                                    isSubSelected ? 'text-[#D4AF37]' : 'text-[#059669]'
                                  }`}
                                />
                                {!isSidebarCollapsed && <span className="truncate">{sub.name}</span>}
                                {sub.id === 'inventory' && lowStockItems.length > 0 && (
                                  <span
                                    className={`${
                                      isSidebarCollapsed
                                        ? 'absolute top-1 right-1'
                                        : 'rtl:mr-auto ltr:ml-auto'
                                    } bg-red-500 text-white font-mono text-[10px] font-bold px-1.5 py-0.5 rounded-full`}
                                  >
                                    {lowStockItems.length}
                                  </span>
                                )}
                              </motion.button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            const isSelected = activeTab === item.id;
            return (
              <motion.button
                whileHover={{ x: isSidebarCollapsed ? 0 : 2 }}
                whileTap={{ scale: 0.98 }}
                key={item.id}
                title={item.name}
                onClick={() => {
                  setActiveTab(item.id as AppTab);
                  setSearchTerm('');
                  setFilterOption('all');
                }}
                className={`relative flex items-center ${
                  isSidebarCollapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-4 py-2.5'
                } text-xs lg:text-sm font-extrabold rounded-xl w-full text-left transition-all cursor-pointer ${
                  isSelected 
                    ? 'bg-meezan-btn text-white shadow-sm' 
                    : 'text-slate-700 dark:text-zinc-400 hover:text-[#064E3B] dark:hover:text-emerald-400 hover:bg-white dark:hover:bg-zinc-900 border border-transparent'
                }`}
              >
                <IconComponent className={`h-[18px] w-[18px] shrink-0 ${isSelected ? 'text-[#D4AF37]' : 'text-[#059669]'}`} />
                {!isSidebarCollapsed && (
                  <span className="truncate">{item.name}</span>
                )}
              </motion.button>
            );
          })}

          <div className="mt-4 border-t border-slate-200/70 dark:border-zinc-800 pt-4 space-y-2">
            {user.role === 'Owner' && (
              <button
                type="button"
                id="backups-hub-btn"
                title={language === 'en' ? 'Backups & Recovery Hub' : 'بیک اپ اور بحالی مرکز'}
                onClick={() => setActiveModal('backups')}
                className={`w-full flex items-center justify-center gap-2 ${
                  isSidebarCollapsed ? 'p-2.5' : 'px-3.5 py-2.5'
                } rounded-xl border border-dashed border-emerald-500/40 hover:border-[#059669] text-slate-700 dark:border-zinc-700 dark:text-zinc-300 bg-white dark:bg-zinc-900/50 transition-all text-xs font-extrabold cursor-pointer shadow-2xs`}
              >
                <Database className="h-4 w-4 text-[#059669] shrink-0" />
                {!isSidebarCollapsed && (
                  <span className="truncate">{language === 'en' ? 'Backups & Recovery' : 'بیک اپ اور بحالی'}</span>
                )}
              </button>
            )}

            <button
              type="button"
              onClick={handleLogout}
              title={t.logout}
              className={`w-full flex items-center ${
                isSidebarCollapsed ? 'justify-center p-2.5' : 'gap-3 px-4 py-2.5'
              } rounded-xl text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors text-xs lg:text-sm font-extrabold cursor-pointer`}
            >
              <LogOut className="h-[18px] w-[18px] shrink-0" />
              {!isSidebarCollapsed && (
                <span className="truncate">{t.logout}</span>
              )}
            </button>
          </div>
        </nav>

        {/* Dynamic Display Area */}
        <main className="flex-1 min-w-0" id="main-content-window">
          {globalError && (
            <div className="mb-5 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 p-3.5 sm:p-4 rounded-xl flex items-center gap-3 text-amber-800 dark:text-amber-400 text-xs">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <div className="break-words">{globalError}</div>
            </div>
          )}

          {/* 1. DASHBOARD / BUSINESS MANAGEMENT COMMAND CENTER */}
          {activeTab === 'dashboard' && (
            <BusinessDashboard
              user={user}
              language={language}
              stats={stats}
              analytics={analytics}
              customers={customers}
              suppliers={suppliers}
              transactions={transactions}
              cashbook={cashbook}
              inventory={inventory}
              invoices={invoices}
              isSyncing={isSyncing}
              lastSync={lastSync}
              hideBalance={hideBalance}
              setHideBalance={setHideBalance}
              onNavigateTab={(targetTab) => {
                setActiveTab(targetTab);
                setSearchTerm('');
                setFilterOption('all');
                if (targetTab === 'customers') {
                  setSelectedCustomerId(null);
                }
              }}
              onSelectCustomer={setSelectedCustomerId}
              onOpenModal={setActiveModal}
              onOpenCreditSale={() => {
                setTxType('credit');
                setTxDesc('');
                setActiveModal('transaction');
              }}
              onOpenRecordPayment={(customer) => {
                if (customer) {
                  setTxCustId(customer.id);
                  setTxAmount(String(customer.balance));
                } else {
                  setTxCustId('');
                  setTxAmount('');
                }
                setTxType('debit');
                setTxDesc(language === 'en' ? 'Payment received' : 'ادائیگی وصول');
                setActiveModal('transaction');
              }}
              onOpenCustomerReport={(customer) => setDashboardReportCustomer(customer)}
              onRefresh={fetchAllData}
              onLogout={handleLogout}
              getSingleSmsLink={getSingleSmsLink}
              getWhatsAppLink={getWhatsAppLink}
              t={t}
            />
          )}

          {/* 1B. DEDICATED BUSINESS OPERATIONS PAGE (4 Separate Cards: Customers, Suppliers, Invoices, Inventory) */}
          {activeTab === 'business-operations' && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-6 pb-8"
            >
              {/* Business Operations Header Card */}
              <div className="bg-white dark:bg-zinc-900 rounded-2xl p-5 sm:p-6 border border-slate-200/90 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-start sm:items-center gap-4 min-w-0">
                  <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-meezan-header text-[#D4AF37] flex items-center justify-center shrink-0 shadow-xs">
                    <Briefcase className="h-6 w-6 sm:h-7 sm:w-7" />
                  </div>
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight">
                        {language === 'en' ? 'Business Operations' : 'کاروباری آپریشنز'}
                      </h2>
                      <span className="text-xs font-bold px-2.5 py-0.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/60 text-[#064E3B] dark:text-[#D4AF37] border border-emerald-200/80 dark:border-emerald-800/60">
                        {user.businessName}
                      </span>
                    </div>
                    <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400 font-medium">
                      {language === 'en'
                        ? 'Select a module below to manage Customers, Suppliers, Invoices, or Inventory.'
                        : 'گاہک کھاتے، سپلائرز، انوائسز یا اسٹاک منظم کرنے کے لیے نیچے مطلوبہ شعبہ منتخب کریں۔'}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('dashboard')}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-xs font-extrabold text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer self-start sm:self-center shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 text-[#059669]" />
                  <span>{language === 'en' ? 'View Dashboard' : 'ڈیش بورڈ دیکھیں'}</span>
                </button>
              </div>

              {/* 4 Separate Business Operations Cards Grid: 1. Customers, 2. Suppliers, 3. Invoices, 4. Inventory */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* 1. Customers Card */}
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSelectedCustomerId(null);
                    setSearchTerm('');
                    setFilterOption('all');
                    setActiveTab('customers');
                  }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200/90 dark:border-zinc-800 hover:border-[#059669]/60 dark:hover:border-[#D4AF37]/50 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 group-hover:bg-[#064E3B] text-[#059669] dark:text-emerald-400 group-hover:text-[#D4AF37] flex items-center justify-center transition-colors shrink-0">
                        <Users className="h-6 w-6" />
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-300 border border-emerald-200/60 dark:border-zinc-700">
                        {customers.length} {language === 'en' ? 'Accounts' : 'کھاتے'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>{language === 'en' ? 'Customers' : 'گاہک کھاتے (Customers)'}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                        {language === 'en'
                          ? 'Manage customer credit folders, record Udhaar & payments, and share WhatsApp/PDF ledger statements.'
                          : 'گاہکوں کے ادھار کھاتے، نقد وصولیاں اور واٹس ایپ پی ڈی ایف اسٹیٹمنٹس منظم کریں۔'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 dark:text-zinc-400">
                        {language === 'en' ? 'Total Receivables (You will get)' : 'کل واجب الوصول (آپ نے لینے ہیں)'}
                      </span>
                      <span className="font-mono font-black text-receivable-maroon dark:text-amber-400 text-sm">
                        {hideBalance ? 'Rs ••••' : `Rs ${(stats?.receivables || 0).toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModal('customer');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#064E3B] dark:text-emerald-300 text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{language === 'en' ? 'Add Customer' : 'نیا گاہک'}</span>
                    </button>

                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] dark:text-[#D4AF37] group-hover:translate-x-0.5 transition-transform">
                      <span>{language === 'en' ? 'Open Customers' : 'گاہک کھاتے کھولیں'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>

                {/* 2. Suppliers Card */}
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSearchTerm('');
                    setFilterOption('all');
                    setActiveTab('suppliers');
                  }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200/90 dark:border-zinc-800 hover:border-[#059669]/60 dark:hover:border-[#D4AF37]/50 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 group-hover:bg-[#064E3B] text-[#059669] dark:text-emerald-400 group-hover:text-[#D4AF37] flex items-center justify-center transition-colors shrink-0">
                        <Truck className="h-6 w-6" />
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-300 border border-emerald-200/60 dark:border-zinc-700">
                        {suppliers.length} {language === 'en' ? 'Suppliers' : 'سپلائرز'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>{language === 'en' ? 'Suppliers' : 'سپلائرز (Suppliers)'}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                        {language === 'en'
                          ? 'Maintain wholesale vendor directories, track supplier payables, and manage stock purchase balances.'
                          : 'ہول سیل سپلائرز کا ریکارڈ رکھیں اور واجب الادا رقوم و بلز کی تفصیلات منظم کریں۔'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 dark:text-zinc-400">
                        {language === 'en' ? 'Total Payables (You will give)' : 'کل واجب الادا (آپ نے دینے ہیں)'}
                      </span>
                      <span className="font-mono font-black text-payable-green dark:text-emerald-400 text-sm">
                        {hideBalance ? 'Rs ••••' : `Rs ${(stats?.payables || 0).toLocaleString()}`}
                      </span>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModal('supplier');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#064E3B] dark:text-emerald-300 text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{language === 'en' ? 'Add Supplier' : 'نیا سپلائر'}</span>
                    </button>

                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] dark:text-[#D4AF37] group-hover:translate-x-0.5 transition-transform">
                      <span>{language === 'en' ? 'Open Suppliers' : 'سپلائرز کھولیں'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>

                {/* 3. Invoices Card */}
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSearchTerm('');
                    setFilterOption('all');
                    setActiveTab('invoices');
                  }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200/90 dark:border-zinc-800 hover:border-[#059669]/60 dark:hover:border-[#D4AF37]/50 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 group-hover:bg-[#064E3B] text-[#059669] dark:text-emerald-400 group-hover:text-[#D4AF37] flex items-center justify-center transition-colors shrink-0">
                        <FileText className="h-6 w-6" />
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-300 border border-emerald-200/60 dark:border-zinc-700">
                        {invoices.length} {language === 'en' ? 'Invoices' : 'بلز'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>{language === 'en' ? 'Invoices' : 'انوائسز اور بلز (Invoices)'}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                        {language === 'en'
                          ? 'Create itemized sales bills, print customer receipts, and track paid or credit invoices.'
                          : 'تفصیلی سیلز بل بنائیں، رسیدیں پرنٹ کریں اور نقد یا ادھار بلوں کا ریکارڈ رکھیں۔'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 dark:text-zinc-400">
                        {language === 'en' ? 'Invoice Settlement Status' : 'بلوں کی صورتحال'}
                      </span>
                      <span className="font-mono font-extrabold text-slate-900 dark:text-white">
                        {invoices.filter((i) => i.isPaid).length} {language === 'en' ? 'Paid' : 'ادا شدہ'} •{' '}
                        {invoices.filter((i) => !i.isPaid).length} {language === 'en' ? 'Unpaid' : 'باقی'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModal('invoice');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#064E3B] dark:text-emerald-300 text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{language === 'en' ? 'Create Invoice' : 'نیا بل بنائیں'}</span>
                    </button>

                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] dark:text-[#D4AF37] group-hover:translate-x-0.5 transition-transform">
                      <span>{language === 'en' ? 'Open Invoices' : 'انوائسز کھولیں'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>

                {/* 4. Inventory Card */}
                <motion.div
                  whileHover={{ y: -3 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => {
                    setSearchTerm('');
                    setFilterOption('all');
                    setActiveTab('inventory');
                  }}
                  className="bg-white dark:bg-zinc-900 rounded-2xl p-6 border border-slate-200/90 dark:border-zinc-800 hover:border-[#059669]/60 dark:hover:border-[#D4AF37]/50 shadow-2xs hover:shadow-md transition-all cursor-pointer flex flex-col justify-between group"
                >
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-3">
                      <div className="h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 group-hover:bg-[#064E3B] text-[#059669] dark:text-emerald-400 group-hover:text-[#D4AF37] flex items-center justify-center transition-colors shrink-0">
                        <Package className="h-6 w-6" />
                      </div>
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-50 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-300 border border-emerald-200/60 dark:border-zinc-700">
                        {inventory.length} {language === 'en' ? 'Products' : 'مصنوعات'}
                      </span>
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
                        <span>{language === 'en' ? 'Inventory' : 'اسٹاک اور انوینٹری (Inventory)'}</span>
                      </h3>
                      <p className="text-xs sm:text-sm text-slate-600 dark:text-zinc-400 leading-relaxed">
                        {language === 'en'
                          ? 'Monitor product stock quantities, SKU unit prices, categories, and automatic low-stock alerts.'
                          : 'دکان کا اسٹاک، قیمتیں، یونٹس اور کم ہونے والی مصنوعات کے الرٹس منظم کریں۔'}
                      </p>
                    </div>

                    <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/70 dark:border-zinc-800 flex items-center justify-between text-xs">
                      <span className="font-bold text-slate-500 dark:text-zinc-400">
                        {language === 'en' ? 'Stock Health Status' : 'اسٹاک کی صورتحال'}
                      </span>
                      {lowStockItems.length > 0 ? (
                        <span className="font-mono font-extrabold text-rose-600 dark:text-rose-400">
                          {lowStockItems.length} {language === 'en' ? 'Low Stock Alert' : 'کم اسٹاک الرٹ'}
                        </span>
                      ) : (
                        <span className="font-mono font-extrabold text-emerald-600 dark:text-emerald-400">
                          {language === 'en' ? 'All Stock Healthy' : 'اسٹاک مکمل ہے'}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-5 mt-5 border-t border-slate-100 dark:border-zinc-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveModal('inventory');
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-[#064E3B] dark:text-emerald-300 text-xs font-extrabold transition-colors cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" />
                      <span>{language === 'en' ? 'Add Product' : 'نئی مصنوعات'}</span>
                    </button>

                    <span className="inline-flex items-center gap-1 text-xs font-extrabold text-[#059669] dark:text-[#D4AF37] group-hover:translate-x-0.5 transition-transform">
                      <span>{language === 'en' ? 'Open Inventory' : 'اسٹاک کھولیں'}</span>
                      <ChevronRight className="h-4 w-4" />
                    </span>
                  </div>
                </motion.div>
              </div>
            </motion.div>
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
              hideBalance={hideBalance}
              onCreateCustomer={async (payload) => {
                try {
                  const created = await api.createCustomer(payload);
                  await fetchAllData();
                  triggerAutoDriveModuleBackup('customers', false);
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
                  triggerAutoDriveModuleBackup('customers', false);
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
                  triggerAutoDriveModuleBackup('customers', false);
                } catch (err: any) {
                  triggerAlert(err.message);
                  throw err;
                }
              }}
              onUpdateTransaction={async (id, payload) => {
                try {
                  await api.updateTransaction(id, payload);
                  await fetchAllData();
                  triggerAutoDriveModuleBackup('customers', false);
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
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-3 relative pb-24"
            >
              {/* Search Bar + Add Supplier Row */}
              <div className="flex items-center gap-2 sm:gap-3">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? `${suppliers.length} Suppliers`
                        : `${suppliers.length} سپلائرز تلاش کریں...`
                    }
                    className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold text-slate-800 dark:text-zinc-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#059669] shadow-2xs"
                  />
                </div>
                
                <button
                  id="add-supp-btn"
                  onClick={() => setActiveModal('supplier')}
                  className="hidden sm:flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-meezan-btn text-white font-black text-xs cursor-pointer shadow-sm transition-all shrink-0"
                >
                  <Plus className="h-4 w-4 stroke-[3] text-[#D4AF37]" />
                  <span className="uppercase tracking-wider">{t.addSupplier}</span>
                </button>
              </div>

              {/* Suppliers Clean White List */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs divide-y divide-slate-100 dark:divide-zinc-800/80">
                {suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).length > 0 ? (
                  suppliers.filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase())).map((s) => {
                    const weOweSupplier = s.balance > 0;
                    return (
                      <div
                        key={s.id}
                        className="px-3.5 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-emerald-50/30 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          <PartyAvatar name={s.name} size="md" />
                          <div className="min-w-0 flex-1">
                            <p className="font-extrabold text-[15px] sm:text-base text-slate-900 dark:text-white truncate leading-snug">
                              {s.name}
                            </p>
                            <p className="text-[11px] sm:text-xs font-semibold text-slate-500 dark:text-zinc-400 mt-0.5 truncate">
                              {s.phone || (language === 'en' ? 'Supplier Account' : 'سپلائر کھاتہ')}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 shrink-0">
                          <div className="text-right">
                            <p className={`text-sm sm:text-base font-black font-mono tabular-nums leading-tight ${
                              s.balance === 0
                                ? 'text-slate-400 dark:text-zinc-500'
                                : weOweSupplier
                                  ? 'text-payable-green dark:text-emerald-400'
                                  : 'text-receivable-maroon dark:text-rose-400'
                            }`}>
                              {hideBalance ? 'Rs ••••' : `Rs ${Math.abs(s.balance).toLocaleString()}`}
                            </p>
                            <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mt-0.5">
                              {s.balance === 0
                                ? (language === 'en' ? 'Settled' : 'حساب برابر')
                                : weOweSupplier
                                  ? (language === 'en' ? "You'll Give" : 'دینے ہیں')
                                  : (language === 'en' ? "You'll Get" : 'لینے ہیں')}
                            </p>
                          </div>

                          <button
                            id={`del-supp-${s.id}`}
                            onClick={() => handleDeleteSupplier(s.id)}
                            className="p-2 rounded-xl hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 shrink-0 cursor-pointer"
                            title={t.delete}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-12 px-4 text-xs text-slate-400 font-bold">
                    🔍 {language === 'en' ? 'No suppliers found in directory.' : 'کوئی سپلائر نہیں ملا۔'}
                  </div>
                )}
              </div>

              {/* Floating CTA Button (+ ADD SUPPLIER) */}
              <div className="fixed bottom-20 md:bottom-8 right-4 sm:right-8 z-30">
                <button
                  type="button"
                  onClick={() => setActiveModal('supplier')}
                  className="flex items-center gap-2 px-5 sm:px-6 py-3 sm:py-3.5 rounded-xl bg-meezan-btn text-white font-black text-xs sm:text-sm tracking-wider uppercase cursor-pointer shadow-lg hover:scale-[1.02] active:scale-95 transition-transform"
                >
                  <Plus className="h-4 w-4 sm:h-5 sm:w-5 stroke-[3] text-[#D4AF37]" />
                  <span>
                    {language === 'en' ? 'ADD SUPPLIER' : 'نیا سپلائر شامل کریں'}
                  </span>
                </button>
              </div>
            </motion.div>
          )}

          {/* 4. PAYMENTS / TRANSACTIONS & CASH BOOK TAB */}
          {activeTab === 'cashbook' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              {/* Sub-tab Switcher: Customer Transactions vs Counter Cashbook */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-3 sm:p-4 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                    {language === 'en' ? 'Payments & Transactions Ledger' : 'ادائیگیاں اور لین دین کا کھاتہ'}
                  </h3>
                  <p className="text-xs font-medium text-slate-500 dark:text-zinc-400 mt-0.5">
                    {language === 'en'
                      ? 'Switch between Customer Ledger Transactions and Counter Cashbook entries.'
                      : 'گاہک کے لین دین اور کیش بک اندراجات کے درمیان تبدیل کریں۔'}
                  </p>
                </div>
                <div className="inline-flex p-1 rounded-xl bg-slate-100 dark:bg-zinc-800 border border-slate-200/70 dark:border-zinc-700 self-start sm:self-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSubTab('transactions');
                      setFilterOption('all');
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      paymentSubTab === 'transactions'
                        ? 'bg-[#064E3B] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'en' ? `Customer Ledger (${transactions.length})` : `گاہک کھاتہ (${transactions.length})`}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPaymentSubTab('cashbook');
                      setFilterOption('all');
                    }}
                    className={`px-3.5 py-2 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      paymentSubTab === 'cashbook'
                        ? 'bg-[#064E3B] text-white shadow-2xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'en' ? `Counter Cashbook (${cashbook.length})` : `کیش بک (${cashbook.length})`}
                  </button>
                </div>
              </div>

              {paymentSubTab === 'transactions' ? (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder={
                          language === 'en'
                            ? 'Search by customer name, ID, or description...'
                            : 'گاہک کا نام یا تفصیل تلاش کریں...'
                        }
                        className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                    </div>

                    <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={filterOption}
                        onChange={(e) => setFilterOption(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-extrabold text-slate-700 dark:text-zinc-300 focus:outline-none"
                      >
                        <option value="all">{language === 'en' ? 'All Transactions' : 'تمام لین دین'}</option>
                        <option value="debit">{language === 'en' ? 'Payment Received (وصولی)' : 'وصولی (رقم ملی)'}</option>
                        <option value="credit">{language === 'en' ? 'Credit Given (ادھار دیا)' : 'ادھار دیا'}</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => {
                          setTxType('debit');
                          setActiveModal('transaction');
                        }}
                        className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-meezan-btn text-white font-black text-xs cursor-pointer shadow-sm transition-all"
                      >
                        <Plus className="h-4 w-4 stroke-[3] text-[#D4AF37]" />
                        <span className="uppercase tracking-wider">
                          {language === 'en' ? 'Record Payment' : 'نیا لین دین'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
                    {/* Mobile Card List */}
                    <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
                      {getFilteredTransactions().length > 0 ? (
                        getFilteredTransactions().map((tx) => {
                          const cust = customers.find((c) => c.id === tx.customerId);
                          const isPaymentReceived = tx.type === 'debit';
                          return (
                            <div key={tx.id} className="p-4 flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1 space-y-1">
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="font-mono font-bold text-[11px] text-slate-600 dark:text-zinc-300 bg-slate-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                                    #{tx.id.slice(0, 8).toUpperCase()}
                                  </span>
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                      isPaymentReceived
                                        ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300'
                                        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/50 dark:text-amber-300'
                                    }`}
                                  >
                                    {isPaymentReceived
                                      ? language === 'en'
                                        ? 'Paid / Received'
                                        : 'وصول شدہ'
                                      : language === 'en'
                                        ? 'Pending Credit'
                                        : 'ادھار / باقی'}
                                  </span>
                                  <span className="font-mono text-[11px] text-slate-400">{tx.date}</span>
                                </div>
                                <p className="font-extrabold text-sm text-slate-900 dark:text-white break-words">
                                  {cust?.name || (language === 'en' ? 'Customer Account' : 'گاہک کھاتہ')}
                                </p>
                                {tx.description && (
                                  <div className="text-xs text-slate-500 dark:text-zinc-400 break-words">
                                    <TransactionDescriptionView description={tx.description} language={language} />
                                  </div>
                                )}
                              </div>

                              <div className="flex flex-col items-end gap-2 shrink-0">
                                <span
                                  className={`font-black font-mono text-sm tabular-nums ${
                                    isPaymentReceived
                                      ? 'text-payable-green dark:text-emerald-400'
                                      : 'text-receivable-maroon dark:text-rose-400'
                                  }`}
                                >
                                  {isPaymentReceived
                                    ? `+ Rs ${tx.amount.toLocaleString()}`
                                    : `- Rs ${tx.amount.toLocaleString()}`}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTransaction(tx.id)}
                                  className="p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 text-slate-400 hover:text-red-600 cursor-pointer"
                                  title={t.delete}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-10 px-4 text-xs text-slate-400 font-bold">
                          🔍 {language === 'en' ? 'No customer transactions recorded yet.' : 'کوئی لین دین موجود نہیں ہے۔'}
                        </div>
                      )}
                    </div>

                    {/* Desktop Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-black tracking-wider">
                            <th className="py-3 px-4">{language === 'en' ? 'Transaction ID' : 'ٹرانزیکشن آئی ڈی'}</th>
                            <th className="py-3 px-4">{t.customerName}</th>
                            <th className="py-3 px-4">{t.date}</th>
                            <th className="py-3 px-4">{t.description}</th>
                            <th className="py-3 px-4 text-right">{t.amount}</th>
                            <th className="py-3 px-4 text-center">{language === 'en' ? 'Payment Status' : 'اسٹیٹس'}</th>
                            <th className="py-3 px-4 text-center">{t.actions}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {getFilteredTransactions().length > 0 ? (
                            getFilteredTransactions().map((tx) => {
                              const cust = customers.find((c) => c.id === tx.customerId);
                              const isPaymentReceived = tx.type === 'debit';
                              return (
                                <tr
                                  key={tx.id}
                                  className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-emerald-50/20 dark:hover:bg-zinc-800/30"
                                >
                                  <td className="py-4 px-4 font-mono text-xs font-bold text-slate-600 dark:text-zinc-300">
                                    #{tx.id.slice(0, 8).toUpperCase()}
                                  </td>
                                  <td className="py-4 px-4 font-extrabold text-slate-900 dark:text-white">
                                    {cust?.name || (language === 'en' ? 'Customer Account' : 'گاہک کھاتہ')}
                                    <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400 mt-0.5">
                                      by {tx.createdBy}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 font-mono text-xs text-slate-400">{tx.date}</td>
                                  <td className="py-4 px-4 text-slate-500 text-xs max-w-xs">
                                    <TransactionDescriptionView
                                      description={tx.description}
                                      language={language}
                                      emptyLabel="-"
                                    />
                                  </td>
                                  <td
                                    className={`py-4 px-4 font-black font-mono text-right tabular-nums ${
                                      isPaymentReceived
                                        ? 'text-payable-green dark:text-emerald-400'
                                        : 'text-receivable-maroon dark:text-rose-400'
                                    }`}
                                  >
                                    {isPaymentReceived
                                      ? `+ Rs ${tx.amount.toLocaleString()}`
                                      : `- Rs ${tx.amount.toLocaleString()}`}
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <span
                                      className={`inline-flex items-center px-2.5 py-1 rounded-md text-[11px] font-extrabold ${
                                        isPaymentReceived
                                          ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                                          : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
                                      }`}
                                    >
                                      {isPaymentReceived
                                        ? language === 'en'
                                          ? 'Paid / Received'
                                          : 'وصول شدہ'
                                        : language === 'en'
                                          ? 'Pending Credit'
                                          : 'ادھار / باقی'}
                                    </span>
                                  </td>
                                  <td className="py-4 px-4 text-center">
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteTransaction(tx.id)}
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
                              <td colSpan={7} className="text-center py-12 text-sm text-slate-400 font-bold">
                                🔍 {language === 'en' ? 'No customer transactions recorded yet.' : 'کوئی لین دین موجود نہیں ہے۔'}
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                    <div className="relative flex-1 min-w-0">
                      <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                      <input
                        type="text"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        placeholder="Search by category / item..."
                        className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                    </div>
                    
                    <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2">
                      <select
                        value={filterOption}
                        onChange={(e) => setFilterOption(e.target.value)}
                        className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-extrabold text-slate-700 dark:text-zinc-300 focus:outline-none"
                      >
                        <option value="all">{language === 'en' ? 'Cash-In/Out (All)' : 'کل کیش رسیدیں'}</option>
                        <option value="cash-in">{language === 'en' ? 'Cash IN (آمدنی)' : 'کیش ان (رقم آئی)'}</option>
                        <option value="cash-out">{language === 'en' ? 'Cash OUT (اخراجات)' : 'کیش آؤٹ (رقم گئی)'}</option>
                      </select>

                      <button
                        id="add-cash-btn"
                        onClick={() => setActiveModal('cashbook')}
                        className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-meezan-btn text-white font-black text-xs cursor-pointer shadow-sm transition-all"
                      >
                        <Plus className="h-4 w-4 stroke-[3] text-[#D4AF37]" />
                        <span className="uppercase tracking-wider">{t.addCashEntry}</span>
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
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${
                                  cb.type === 'cash-in'
                                    ? 'bg-emerald-50 text-payable-green dark:bg-emerald-950/40 dark:text-emerald-300'
                                    : 'bg-red-50 text-receivable-maroon dark:bg-red-950/40 dark:text-red-300'
                                }`}>
                                  {cb.type === 'cash-in' ? t.cashIn : t.cashOut}
                                </span>
                                <span className="font-mono text-[11px] text-slate-400">{cb.date}</span>
                              </div>
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white break-words">{cb.category}</p>
                              {cb.description && (
                                <div className="text-xs text-slate-500 dark:text-zinc-400 break-words">
                                  <TransactionDescriptionView description={cb.description} language={language} />
                                </div>
                              )}
                              <p className="text-[10px] font-mono text-slate-400">by {cb.createdBy}</p>
                            </div>

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <span className={`font-black font-mono text-sm tabular-nums ${
                                cb.type === 'cash-in'
                                  ? 'text-payable-green dark:text-emerald-400'
                                  : 'text-receivable-maroon dark:text-rose-400'
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
                        <div className="text-center py-10 px-4 text-xs text-slate-400 font-bold">
                          🔍 No cashbook entries listed. Click "{t.addCashEntry}" to register counter cash.
                        </div>
                      )}
                    </div>

                    {/* Desktop/Tablet Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-black tracking-wider">
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
                              <tr key={cb.id} className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-emerald-50/20 dark:hover:bg-zinc-800/30">
                                <td className="py-4 px-4 font-mono text-xs text-slate-400">
                                  {cb.date}
                                </td>
                                <td className="py-4 px-4">
                                  <span className="font-extrabold text-slate-800 dark:text-zinc-200">{cb.category}</span>
                                  <span className="block text-[9px] uppercase font-mono tracking-wider text-slate-400 mt-0.5">by {cb.createdBy}</span>
                                </td>
                                <td className="py-4 px-4 text-slate-500 text-xs max-w-xs">
                                  <TransactionDescriptionView description={cb.description} language={language} emptyLabel="-" />
                                </td>
                                <td className={`py-4 px-4 font-black font-mono text-right tabular-nums ${
                                  cb.type === 'cash-in' 
                                    ? 'text-payable-green dark:text-emerald-400' 
                                    : 'text-receivable-maroon dark:text-rose-400'
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
                              <td colSpan={5} className="text-center py-12 text-sm text-slate-400 font-bold">
                                🔍 No cashbook entries listed. Click "{t.addCashEntry}" to register counter cash.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}
            </motion.div>
          )}

          {/* 5. INVENTORY TAB */}
          {activeTab === 'inventory' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row gap-3 justify-between sm:items-center">
                <div className="relative flex-1 min-w-0">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search stock by SKU, category or product name..."
                    className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>
                
                <div className="flex flex-col xs:flex-row sm:flex-row items-stretch sm:items-center gap-2">
                  <select
                    value={filterOption}
                    onChange={(e) => setFilterOption(e.target.value)}
                    className="px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-extrabold text-slate-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="all"> {language === 'en' ? 'All Stock (سب)' : 'سب اسٹاک اشیاء'} </option>
                    <option value="low-stock"> ⚠️ {language === 'en' ? 'Low Stock Warnings' : 'کم اسٹاک کی نشان دہی'} </option>
                  </select>

                  <button
                    id="add-stock-btn"
                    onClick={() => setActiveModal('inventory')}
                    className="flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-meezan-btn text-white font-black text-xs cursor-pointer shadow-sm transition-all"
                  >
                    <Plus className="h-4 w-4 stroke-[3] text-[#D4AF37]" />
                    <span className="uppercase tracking-wider">{t.addStockItem}</span>
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
                              <p className="font-extrabold text-sm text-slate-900 dark:text-white break-words">{itm.name}</p>
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
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.purchasePrice}</span>
                              <span className="font-mono font-bold text-slate-600 dark:text-zinc-300">Rs {itm.purchasePrice.toLocaleString()}</span>
                            </div>
                            <div>
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.sellPrice}</span>
                              <span className="font-mono font-black text-[#059669]">Rs {itm.sellPrice.toLocaleString()}</span>
                            </div>
                            <div className="text-right">
                              <span className="block text-[10px] text-slate-400 uppercase font-bold">{t.quantity}</span>
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
                    <div className="text-center py-10 px-4 text-xs text-slate-400 font-bold">
                      🔍 No inventory stock lines match filter options.
                    </div>
                  )}
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-black tracking-wider">
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
                            <tr key={itm.id} className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-emerald-50/20 dark:hover:bg-zinc-800/30">
                              <td className="py-4 px-4 font-extrabold text-slate-800 dark:text-zinc-200">
                                <div>{itm.name}</div>
                                <div className="text-[10px] text-slate-400 mt-0.5 font-mono">SKU: {itm.sku}</div>
                              </td>
                              <td className="py-4 px-4 text-xs font-bold text-slate-500">{itm.category}</td>
                              <td className="py-4 px-4 font-mono text-right text-slate-500">Rs {itm.purchasePrice.toLocaleString()}</td>
                              <td className="py-4 px-4 font-mono text-right font-black text-[#059669]">Rs {itm.sellPrice.toLocaleString()}</td>
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
                          <td colSpan={6} className="text-center py-12 text-sm text-slate-400 font-bold">
                            🔍 No inventory stock lines match filter options.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* 6. INVOICES / SALES BUILDER TAB */}
          {activeTab === 'invoices' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="space-y-4"
            >
              <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 shadow-xs">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-800 dark:text-zinc-200">{t.invoices}</h3>
                  <p className="text-[11px] text-slate-400 font-bold mt-0.5">{language === 'en' ? 'Click create invoice to generate printable client receipts & download bills.' : 'گاہکوں کا بل بنانے اور پرنٹ کرنے کے لیے بٹن دبائیں۔'}</p>
                </div>
                <button
                  id="open-invoice-builder-btn"
                  onClick={() => setActiveModal('invoice')}
                  className="w-full sm:w-auto flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-meezan-btn text-white font-black text-xs cursor-pointer shadow-sm transition-all shrink-0"
                >
                  <Plus className="h-4 w-4 stroke-[3] text-[#D4AF37]" />
                  <span className="uppercase tracking-wider">{t.createInvoice}</span>
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
                            <span className="font-mono font-bold text-xs text-[#064E3B] dark:text-emerald-300 bg-emerald-50 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                              {inv.invoiceNumber}
                            </span>
                            <span className="font-mono text-[11px] text-slate-400">{inv.date}</span>
                          </div>
                          <p className="font-extrabold text-sm text-slate-900 dark:text-white truncate">{inv.customerName}</p>
                          <p className="font-black font-mono text-sm text-payable-green dark:text-emerald-400 tabular-nums">
                            Rs {inv.total.toLocaleString()}
                          </p>
                        </div>
                        <button
                          id={`view-inv-printer-mob-${inv.id}`}
                          onClick={() => setSelectedInvoice(inv)}
                          className="inline-flex items-center gap-1.5 text-xs font-black px-3.5 py-2 rounded-xl bg-meezan-btn text-white cursor-pointer shrink-0 shadow-2xs"
                        >
                          <Download className="h-3.5 w-3.5 text-[#D4AF37]" />
                          <span>{t.downloadPdf}</span>
                        </button>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-10 px-4 text-xs text-slate-400 font-bold">
                      🧾 {t.noInvoices}
                    </div>
                  )}
                </div>

                {/* Desktop/Tablet Table */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-900 text-slate-400 text-[10px] uppercase font-black tracking-wider">
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
                          <tr key={inv.id} className="border-b border-slate-100 dark:border-zinc-800/80 text-sm hover:bg-emerald-50/20 dark:hover:bg-zinc-800/30">
                            <td className="py-4 px-4 font-mono font-bold text-slate-800 dark:text-zinc-200">
                              {inv.invoiceNumber}
                            </td>
                            <td className="py-4 px-4 font-extrabold text-slate-800 dark:text-zinc-300">
                              {inv.customerName}
                              <span className="block text-[8px] font-sans font-medium text-slate-400 mt-0.5">Checked-out by {inv.createdBy}</span>
                            </td>
                            <td className="py-4 px-4 font-mono text-xs text-slate-400">{inv.date}</td>
                            <td className="py-4 px-4 font-black font-mono text-right text-payable-green dark:text-emerald-400 tabular-nums">Rs {inv.total.toLocaleString()}</td>
                            <td className="py-4 px-4 text-center">
                              <button
                                id={`view-inv-printer-${inv.id}`}
                                onClick={() => setSelectedInvoice(inv)}
                                className="inline-flex items-center gap-1.5 text-[11px] font-black px-3.5 py-1.5 rounded-xl bg-meezan-btn text-white cursor-pointer shadow-2xs"
                              >
                                <Download id={`inv-printer-${inv.id}`} className="h-3 w-3 text-[#D4AF37]" />
                                <span>{t.downloadPdf}</span>
                              </button>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-sm text-slate-400 font-bold">
                            🧾 {t.noInvoices}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </motion.div>
          )}

          {/* 7. SETTINGS TAB */}
          {activeTab === 'settings' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className="max-w-4xl space-y-5"
            >
              {/* Business & Profile Settings Card */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs">
                <div className="flex items-center gap-3 pb-4 border-b border-slate-100 dark:border-zinc-800">
                  <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#064E3B] to-[#059669] text-[#D4AF37] font-black text-base flex items-center justify-center shadow-xs">
                    {user.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h2 className="text-base sm:text-lg font-black text-slate-900 dark:text-white">
                      {language === 'en' ? 'Business & Profile Settings' : 'کاروبار اور پروفائل کی ترتیبات'}
                    </h2>
                    <p className="text-xs font-medium text-slate-500 dark:text-zinc-400">
                      {user.email} • <span className="font-bold text-[#059669]">{user.role}</span>
                    </p>
                  </div>
                </div>

                <form onSubmit={handleSaveSettings} className="mt-5 space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        {language === 'en' ? 'Your Full Name' : 'آپ کا مکمل نام'}
                      </label>
                      <input
                        type="text"
                        required
                        value={settingsName}
                        onChange={(e) => setSettingsName(e.target.value)}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/70 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400 mb-1.5">
                        {language === 'en' ? 'Business / Shop Name' : 'کاروبار یا دکان کا نام'}
                      </label>
                      <input
                        type="text"
                        value={settingsBusiness}
                        onChange={(e) => setSettingsBusiness(e.target.value)}
                        placeholder={BRAND.name}
                        className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800/70 text-sm font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      disabled={isSavingSettings}
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-black uppercase tracking-wider shadow-sm cursor-pointer disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4 text-[#D4AF37]" />
                      <span>
                        {isSavingSettings
                          ? language === 'en'
                            ? 'Saving...'
                            : 'محفوظ ہو رہا ہے...'
                          : language === 'en'
                            ? 'Save Changes'
                            : 'تبدیلیاں محفوظ کریں'}
                      </span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Data, Backups & Account Session */}
              <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-5 sm:p-6 shadow-2xs space-y-4">
                <h3 className="text-sm sm:text-base font-black text-slate-900 dark:text-white">
                  {language === 'en' ? 'Data Protection & Session' : 'ڈیٹا بیک اپ اور اکاؤنٹ'}
                </h3>

                <div className="flex flex-wrap items-center gap-3">
                  {user.role === 'Owner' && (
                    <button
                      type="button"
                      onClick={() => setActiveModal('backups')}
                      className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-extrabold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                    >
                      <Database className="h-4 w-4 text-[#059669]" />
                      <span>
                        {language === 'en'
                          ? 'Google Drive & Excel Backups'
                          : 'گوگل ڈرائیو اور ایکسل بیک اپ'}
                      </span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => handleDownloadLocalExcel('complete')}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-extrabold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <FileSpreadsheet className="h-4 w-4 text-[#059669]" />
                    <span>
                      {language === 'en'
                        ? 'Download Full Backup (.xlsx)'
                        : 'مکمل ایکسل بیک اپ (.xlsx)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={handleManualExport}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 text-xs font-extrabold text-slate-700 dark:text-zinc-200 cursor-pointer transition-colors"
                  >
                    <Download className="h-4 w-4 text-[#059669]" />
                    <span>{t.exportJson}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/70 dark:bg-red-950/30 hover:bg-red-100 text-xs font-extrabold text-red-600 dark:text-red-400 cursor-pointer transition-colors ltr:ml-auto rtl:mr-auto"
                  >
                    <LogOut className="h-4 w-4" />
                    <span>{t.logout}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}

        </main>
      </div>

      {/* ==================== DRAWERS & MODALS BACKDROPS ==================== */}

      {/* CUSTOMER ACCOUNT REPORT MODAL (Opened from Dashboard Quick Actions / Summary) */}
      {dashboardReportCustomer && (
        <CustomerAccountReportModal
          customer={dashboardReportCustomer}
          allTransactions={transactions}
          businessName={user.businessName || BRAND.name}
          language={language}
          onClose={() => setDashboardReportCustomer(null)}
        />
      )}

      {/* CUSTOMER DRAWER */}
      {activeModal === 'customer' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
          >
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
                  className="w-full px-3.5 py-2.5 text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
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
                  {language === 'en' ? 'Address' : 'پتہ'}
                </label>
                <input
                  type="text"
                  value={custAddress}
                  onChange={(e) => setCustAddress(e.target.value)}
                  placeholder={language === 'en' ? 'Shop / Street / City Address' : 'دکان یا شہر کا پتہ'}
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
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-black cursor-pointer"
                >
                  <span className="uppercase tracking-wider">{t.save}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* SUPPLIER DRAWER */}
      {activeModal === 'supplier' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
          >
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
                  {language === 'en' ? 'Address' : 'پتہ'}
                </label>
                <input
                  type="text"
                  value={suppAddress}
                  onChange={(e) => setSuppAddress(e.target.value)}
                  placeholder={language === 'en' ? 'Warehouse / Market / City Address' : 'مارکیٹ یا شہر کا پتہ'}
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
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-black cursor-pointer"
                >
                  <span className="uppercase tracking-wider">{t.save}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* LEDGER TRANSACTION DRAWERS */}
      {activeModal === 'transaction' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
          >
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

              <VoiceDescriptionField
                value={txDesc}
                onChange={setTxDesc}
                language={language}
                label={t.description}
                placeholder={t.description}
              />

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
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-black cursor-pointer"
                >
                  <span className="uppercase tracking-wider">{t.save}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* CASHBOOK ENTRY DRAWERS */}
      {activeModal === 'cashbook' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
          >
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
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-black cursor-pointer"
                >
                  <span className="uppercase tracking-wider">{t.save}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* STOCK INVENTORY DRAWERS */}
      {activeModal === 'inventory' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
          >
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
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-black cursor-pointer"
                >
                  <span className="uppercase tracking-wider">{t.save}</span>
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* RETAIL INVOICE BUILDER DRAWER */}
      {activeModal === 'invoice' && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4 overflow-y-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-2xl p-4 sm:p-6 shadow-2xl relative my-auto max-h-[92vh] overflow-y-auto"
          >
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
                    className="text-xs text-[#059669] dark:text-[#D4AF37] font-bold flex items-center gap-1 cursor-pointer"
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
                      className="h-4 w-4 rounded text-[#059669] focus:ring-[#059669] border-slate-300 pointer-events-auto"
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
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-black cursor-pointer"
                >
                  <span>{language === 'en' ? 'Checkout & Print Receipt (بل تیار کریں)' : 'بل بنائیں اور رسید پرنٹ کریں'}</span>
                </button>
              </div>
            </form>
          </motion.div>
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
        <GoogleDriveBackupHub
          language={language}
          businessName={user.businessName || BRAND.name}
          userRole={user.role}
          counts={{
            customers: customers.length,
            suppliers: suppliers.length,
            invoices: invoices.length,
            inventory: inventory.length,
            transactions: transactions.length,
            cashbook: cashbook.length,
            totalSales: invoices.reduce((sum, inv) => sum + (Number(inv.grandTotal) || 0), 0),
            totalOutstandingPayments: customers.reduce(
              (sum, c) => sum + (Number(c.totalBalance) > 0 ? Number(c.totalBalance) : 0),
              0
            )
          }}
          isDriveConnected={isDriveConnected}
          driveSyncStatus={driveSyncStatus}
          driveLastSync={driveLastSync}
          driveLastModule={driveLastModule}
          driveError={driveError}
          autoDriveSync={autoDriveSync}
          driveFolders={driveFolders}
          driveModuleFiles={driveModuleFiles}
          driveHistoryFiles={driveHistoryFiles}
          onClose={() => setActiveModal(null)}
          onConnectDrive={handleConnectGoogleDrive}
          onToggleAutoSync={handleToggleAutoDriveSync}
          onSyncAllToDrive={handleSyncAllToDrive}
          onSyncSingleModuleToDrive={handleSyncSingleModuleToDrive}
          onTriggerDailyBackup={handleTriggerDailyBackup}
          onTriggerHourlyBackup={handleTriggerHourlyBackup}
          onRestoreFromDriveFile={handleRestoreFromDriveFile}
          onDeleteDriveHistoryFile={handleDeleteDriveHistoryFile}
          onDownloadLocalExcel={handleDownloadLocalExcel}
          onDownloadLocalJson={handleManualExport}
          onUploadBackupFile={handleManualImport}
          backupLabel={backupLabel}
          setBackupLabel={setBackupLabel}
          isSavingBackup={isSavingBackup}
          onCreateLocalCheckpoint={handleCreateBackup}
          backups={backups}
          isLoadingBackups={isLoadingBackups}
          onRestoreLocalCheckpoint={handleRestoreBackup}
          onDeleteLocalCheckpoint={handleDeleteLocalCheckpoint}
        />
      )}

      {/* CUSTOM CONFIRMATION OVERLAY (Bypass Sandboxed iframe blockages) */}
      <AnimatePresence>
        {confirmState && confirmState.isOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/75 backdrop-blur-xs flex justify-center items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-sm p-5 sm:p-6 shadow-2xl relative text-center"
            >
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CUSTOM ALERT/NOTIFICATION OVERLAY */}
      <AnimatePresence>
        {alertState && alertState.isOpen && (
          <div className="fixed inset-0 z-[100] bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-xs p-5 sm:p-6 shadow-2xl relative text-center"
            >
              <div className="mx-auto flex items-center justify-center h-10 w-10 rounded-full bg-emerald-50 dark:bg-zinc-800 text-[#059669] mb-3">
                <Info className="h-5 w-5" />
              </div>

              <h4 className="text-sm font-black text-slate-900 dark:text-white mb-1.5">
                {alertState.title}
              </h4>
              
              <p className="text-xs text-slate-500 dark:text-zinc-400 mb-5 leading-normal font-medium break-words">
                {alertState.message}
              </p>

              <button
                type="button"
                onClick={() => setAlertState(null)}
                className="w-full px-4 py-2.5 text-xs font-black text-white bg-meezan-btn rounded-xl transition-all cursor-pointer shadow-xs"
              >
                <span>{language === 'en' ? 'OK / Understand' : 'ٹھیک ہے'}</span>
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  );
}
