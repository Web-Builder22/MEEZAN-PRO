import React, { useState, useRef, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  TrendingUp,
  ShoppingBag,
  Clock,
  Package,
  Plus,
  Users,
  BarChart3,
  Bell,
  Calendar,
  Search,
  FileText,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronRight,
  ChevronDown,
  Wallet,
  Truck,
  ShieldAlert,
  AlertTriangle,
  CheckCircle2,
  Eye,
  EyeOff,
  RefreshCw,
  Settings,
  Database,
  LogOut,
  UserPlus,
  Receipt,
  Briefcase
} from 'lucide-react';
import {
  User,
  Customer,
  Supplier,
  Transaction,
  CashBookEntry,
  StockItem,
  Invoice,
  FinancialStats
} from '../types';
import { Language } from '../translations';
import { BRAND, PartyAvatar } from '../brand';
import DashboardCharts from './DashboardCharts';
import DebtSummary from './DebtSummary';
import { TransactionDescriptionView } from './VoiceTransactionInput';

export type AppTab =
  | 'dashboard'
  | 'business-operations'
  | 'invoices'
  | 'inventory'
  | 'customers'
  | 'suppliers'
  | 'cashbook'
  | 'settings';

interface BusinessDashboardProps {
  user: User;
  language: Language;
  stats: FinancialStats | null;
  analytics: any;
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  cashbook: CashBookEntry[];
  inventory: StockItem[];
  invoices: Invoice[];
  isSyncing: boolean;
  lastSync: string;
  hideBalance: boolean;
  setHideBalance: React.Dispatch<React.SetStateAction<boolean>>;
  onNavigateTab: (tab: AppTab) => void;
  onSelectCustomer: (customerId: string | null) => void;
  onOpenModal: (
    modal: 'customer' | 'supplier' | 'transaction' | 'cashbook' | 'inventory' | 'invoice' | 'backups' | null
  ) => void;
  onOpenCreditSale: () => void;
  onOpenRecordPayment: (customer?: Customer) => void;
  onOpenCustomerReport: (customer: Customer) => void;
  onRefresh: () => void;
  onLogout: () => void;
  getSingleSmsLink: (customerName: string, phone: string, balance: number) => string;
  getWhatsAppLink: (customerName: string, phone: string, balance: number) => string;
  t: any;
}

export default function BusinessDashboard({
  user,
  language,
  stats,
  analytics,
  customers,
  suppliers,
  transactions,
  cashbook,
  inventory,
  invoices,
  isSyncing,
  lastSync,
  hideBalance,
  setHideBalance,
  onNavigateTab,
  onSelectCustomer,
  onOpenModal,
  onOpenCreditSale,
  onOpenRecordPayment,
  onOpenCustomerReport,
  onRefresh,
  onLogout,
  getSingleSmsLink,
  getWhatsAppLink,
  t
}: BusinessDashboardProps) {
  const [dashSearch, setDashSearch] = useState('');
  const [dashStatusFilter, setDashStatusFilter] = useState<'all' | 'pending' | 'overdue' | 'partial' | 'paid'>('all');
  const [dashDateFilter, setDashDateFilter] = useState<'all' | 'today' | '7d' | '30d'>('all');
  const [showStatementPicker, setShowStatementPicker] = useState(false);
  const [isNotifOpen, setIsNotifOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) {
        setIsNotifOpen(false);
      }
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setIsProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const nowMs = Date.now();
  const todayIso = new Date().toISOString().slice(0, 10);

  const formattedCurrentDate = useMemo(() => {
    try {
      return new Date().toLocaleDateString(language === 'en' ? 'en-US' : 'ur-PK', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return todayIso;
    }
  }, [language, todayIso]);

  // Customer status classification helper
  const classifyCustomerStatus = (c: Customer): 'paid' | 'pending' | 'partial' | 'overdue' => {
    if (c.balance <= 0) return 'paid';
    const custTxs = transactions.filter((tx) => tx.customerId === c.id);
    const debitTxs = custTxs.filter((tx) => tx.type === 'debit');
    const hasPartialPayment = debitTxs.length > 0;
    const isPromisedDue = Boolean(c.promisedPaymentDate && c.promisedPaymentDate <= todayIso);

    let daysSinceActivity = 0;
    if (debitTxs.length > 0) {
      const latestDebitMs = Math.max(...debitTxs.map((tx) => new Date(tx.date).getTime() || 0));
      daysSinceActivity = Math.floor((nowMs - latestDebitMs) / (1000 * 60 * 60 * 24));
    } else if (custTxs.length > 0) {
      const earliestTxMs = Math.min(...custTxs.map((tx) => new Date(tx.date).getTime() || nowMs));
      daysSinceActivity = Math.floor((nowMs - earliestTxMs) / (1000 * 60 * 60 * 24));
    }

    if (daysSinceActivity > 30 || isPromisedDue) return 'overdue';
    if (hasPartialPayment) return 'partial';
    return 'pending';
  };

  // 1. Calculate Today's Sales from real data
  const todaysSales = useMemo(() => {
    const todayCashSales = cashbook
      .filter(
        (cb) =>
          cb &&
          cb.date === todayIso &&
          cb.type === 'cash-in' &&
          (cb.category === 'Sales' || cb.category === 'Customer Payment')
      )
      .reduce((sum, cb) => sum + (Number(cb.amount) || 0), 0);

    const todayCreditSales = transactions
      .filter((tx) => tx && tx.date === todayIso && tx.type === 'credit')
      .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

    // Unpaid walk-in invoices created today that didn't generate a customer credit transaction
    const todayUnpaidWalkinInvoices = invoices
      .filter((inv) => inv && inv.date === todayIso && !inv.isPaid && !inv.customerId)
      .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);

    return todayCashSales + todayCreditSales + todayUnpaidWalkinInvoices;
  }, [cashbook, transactions, invoices, todayIso]);

  const todaysOrdersCount = useMemo(() => {
    const todayInvs = invoices.filter((inv) => inv.date === todayIso).length;
    const todayStandaloneCredits = transactions.filter(
      (tx) => tx.date === todayIso && tx.type === 'credit' && !tx.invoiceId
    ).length;
    const todayStandaloneCashSales = cashbook.filter(
      (cb) =>
        cb.date === todayIso &&
        cb.type === 'cash-in' &&
        cb.category === 'Sales' &&
        !cb.description?.startsWith('Paid via Invoice')
    ).length;
    return todayInvs + todayStandaloneCredits + todayStandaloneCashSales;
  }, [invoices, transactions, cashbook, todayIso]);

  // 2. Calculate Total Orders from real data
  const totalOrdersCount = useMemo(() => {
    const standaloneCreditSales = transactions.filter((tx) => tx.type === 'credit' && !tx.invoiceId).length;
    const standaloneCashSales = cashbook.filter(
      (cb) =>
        cb.type === 'cash-in' &&
        cb.category === 'Sales' &&
        !cb.description?.startsWith('Paid via Invoice')
    ).length;
    return invoices.length + standaloneCreditSales + standaloneCashSales;
  }, [invoices, transactions, cashbook]);

  // 3. Calculate Pending Payments (Receivables) from real data
  const pendingReceivablesAmount = useMemo(() => {
    if (stats && typeof stats.receivables === 'number') {
      return stats.receivables;
    }
    return customers.filter((c) => c.balance > 0).reduce((sum, c) => sum + c.balance, 0);
  }, [stats, customers]);

  const pendingCustomersList = useMemo(() => customers.filter((c) => c.balance > 0), [customers]);
  const overdueCustomersList = useMemo(
    () => customers.filter((c) => classifyCustomerStatus(c) === 'overdue'),
    [customers, transactions, todayIso]
  );

  // 4. Calculate Total Products & Stock metrics from real data
  const totalProductsCount = inventory.length;
  const lowStockItems = useMemo(
    () => inventory.filter((itm) => itm.quantity <= itm.minQuantity),
    [inventory]
  );
  const totalInventoryUnits = useMemo(
    () => inventory.reduce((sum, itm) => sum + (Number(itm.quantity) || 0), 0),
    [inventory]
  );

  // Real Notifications derived from application state
  const notifications = useMemo(() => {
    const items: {
      id: string;
      type: 'overdue' | 'promised' | 'low-stock';
      title: string;
      subtitle: string;
      amountOrQty: string;
      onClick: () => void;
    }[] = [];

    // Promised payment due today or past due
    customers
      .filter((c) => c.balance > 0 && c.promisedPaymentDate && c.promisedPaymentDate <= todayIso)
      .forEach((c) => {
        items.push({
          id: `prom-${c.id}`,
          type: 'promised',
          title: c.name,
          subtitle:
            language === 'en'
              ? `Promised payment due (${c.promisedPaymentDate})`
              : `وعدہ شدہ ادائیگی کی تاریخ (${c.promisedPaymentDate})`,
          amountOrQty: `Rs ${c.balance.toLocaleString()}`,
          onClick: () => {
            onSelectCustomer(c.id);
            onNavigateTab('customers');
            setIsNotifOpen(false);
          }
        });
      });

    // Overdue accounts (>30 days) not already in promised list
    overdueCustomersList
      .filter((c) => !c.promisedPaymentDate || c.promisedPaymentDate > todayIso)
      .forEach((c) => {
        items.push({
          id: `ovd-${c.id}`,
          type: 'overdue',
          title: c.name,
          subtitle:
            language === 'en'
              ? 'Overdue receivable (>30 days)'
              : '30 دن سے زائد واجب الادا بیلنس',
          amountOrQty: `Rs ${c.balance.toLocaleString()}`,
          onClick: () => {
            onSelectCustomer(c.id);
            onNavigateTab('customers');
            setIsNotifOpen(false);
          }
        });
      });

    // Low stock items
    lowStockItems.forEach((itm) => {
      items.push({
        id: `stk-${itm.id}`,
        type: 'low-stock',
        title: itm.name,
        subtitle:
          language === 'en'
            ? `Low stock alert (Min: ${itm.minQuantity} ${itm.unit})`
            : `کم اسٹاک الرٹ (کم از کم: ${itm.minQuantity} ${itm.unit})`,
        amountOrQty: `${itm.quantity} ${itm.unit}`,
        onClick: () => {
          onNavigateTab('inventory');
          setIsNotifOpen(false);
        }
      });
    });

    return items;
  }, [customers, overdueCustomersList, lowStockItems, todayIso, language, onSelectCustomer, onNavigateTab]);

  // Determine transaction payment status from real customer & transaction state
  const getTransactionStatus = (tx: Transaction): {
    key: 'paid' | 'pending' | 'partial' | 'overdue';
    label: string;
    badgeClass: string;
  } => {
    if (tx.type === 'debit') {
      return {
        key: 'paid',
        label: language === 'en' ? 'Paid / Received' : 'وصول شدہ',
        badgeClass:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80'
      };
    }

    const linkedCustomer = customers.find((c) => c.id === tx.customerId);
    if (!linkedCustomer || linkedCustomer.balance <= 0) {
      return {
        key: 'paid',
        label: language === 'en' ? 'Settled' : 'بے باق',
        badgeClass:
          'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-800/80'
      };
    }

    const st = classifyCustomerStatus(linkedCustomer);
    if (st === 'overdue') {
      return {
        key: 'overdue',
        label: language === 'en' ? 'Overdue' : 'میعاد ختم',
        badgeClass:
          'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-800/80'
      };
    }
    if (st === 'partial') {
      return {
        key: 'partial',
        label: language === 'en' ? 'Partially Paid' : 'جزوی ادائیگی',
        badgeClass:
          'bg-teal-50 text-teal-700 border-teal-200 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-800/80'
      };
    }
    return {
      key: 'pending',
      label: language === 'en' ? 'Pending Credit' : 'واجب الادا',
      badgeClass:
        'bg-amber-50 text-amber-800 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-800/80'
    };
  };

  // Filter Recent Transactions
  const filteredRecentTransactions = useMemo(() => {
    return [...transactions]
      .filter((tx) => {
        const q = dashSearch.trim().toLowerCase();
        const matchesSearch =
          !q ||
          tx.id.toLowerCase().includes(q) ||
          tx.customerName.toLowerCase().includes(q) ||
          (tx.description && tx.description.toLowerCase().includes(q));
        if (!matchesSearch) return false;

        if (dashStatusFilter !== 'all') {
          const st = getTransactionStatus(tx).key;
          if (st !== dashStatusFilter) return false;
        }

        if (dashDateFilter === 'today') {
          return tx.date === todayIso;
        }
        if (dashDateFilter === '7d') {
          const diffDays = (nowMs - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 7;
        }
        if (dashDateFilter === '30d') {
          const diffDays = (nowMs - new Date(tx.date).getTime()) / (1000 * 60 * 60 * 24);
          return diffDays <= 30;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = a.createdAt ? new Date(a.createdAt).getTime() : new Date(a.date).getTime();
        const timeB = b.createdAt ? new Date(b.createdAt).getTime() : new Date(b.date).getTime();
        return timeB - timeA;
      });
  }, [transactions, customers, dashSearch, dashStatusFilter, dashDateFilter, todayIso, nowMs]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6 pb-8"
    >
      {/* ==================== 1. DASHBOARD OVERVIEW BAR ==================== */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 border border-slate-200/90 dark:border-zinc-800 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        {/* Welcome Message & Current Date */}
        <div className="min-w-0 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-lg sm:text-2xl font-extrabold text-slate-900 dark:text-white tracking-tight truncate">
              {language === 'en' ? `Welcome back, ${user.name}` : `خوش آمدید، ${user.name}`}
            </h2>
            <span className="text-xs font-semibold text-emerald-800 dark:text-[#D4AF37] bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200/80 dark:border-emerald-800/60 px-2.5 py-0.5 rounded-lg">
              {user.businessName}
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 font-medium">
            <Calendar className="h-3.5 w-3.5 text-[#059669] dark:text-[#D4AF37] shrink-0" />
            <span>{formattedCurrentDate}</span>
            {lastSync && (
              <>
                <span aria-hidden="true">·</span>
                <span className="font-mono text-[11px]">
                  {language === 'en' ? `Updated ${lastSync}` : `اپ ڈیٹ ${lastSync}`}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Right Controls: Hide/Show Balance, Refresh, Notification Bell, User Profile Menu */}
        <div className="flex items-center gap-2.5 self-end sm:self-center shrink-0">
          {/* Balance Privacy Button */}
          <button
            type="button"
            onClick={() => setHideBalance((prev) => !prev)}
            title={hideBalance ? 'Show financial amounts' : 'Hide financial amounts'}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer whitespace-nowrap"
          >
            {hideBalance ? (
              <Eye className="h-4 w-4 text-[#059669]" />
            ) : (
              <EyeOff className="h-4 w-4 text-slate-500" />
            )}
            <span className="hidden md:inline">
              {hideBalance
                ? language === 'en'
                  ? 'Show Amounts'
                  : 'رقم دکھائیں'
                : language === 'en'
                ? 'Hide Amounts'
                : 'رقم چھپائیں'}
            </span>
          </button>

          {/* Sync / Refresh Button */}
          <button
            type="button"
            onClick={onRefresh}
            disabled={isSyncing}
            title={language === 'en' ? 'Refresh dashboard data' : 'ڈیٹا ریفریش کریں'}
            className="p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 transition-colors cursor-pointer"
          >
            <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin text-[#059669]' : ''}`} />
          </button>

          {/* Notification Icon & Dropdown */}
          <div className="relative" ref={notifRef}>
            <button
              type="button"
              onClick={() => {
                setIsNotifOpen((prev) => !prev);
                setIsProfileOpen(false);
              }}
              aria-label="Notifications"
              className="relative p-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 transition-colors cursor-pointer"
            >
              <Bell className="h-4 w-4" />
              {notifications.length > 0 && (
                <span className="absolute -top-1 -right-1 h-4 min-w-[16px] px-1 rounded-full bg-rose-600 text-white text-[10px] font-mono font-bold flex items-center justify-center">
                  {notifications.length}
                </span>
              )}
            </button>

            <AnimatePresence>
              {isNotifOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="px-4 py-3 bg-slate-50 dark:bg-zinc-950 border-b border-slate-200/80 dark:border-zinc-800 flex items-center justify-between">
                    <span className="text-xs font-extrabold text-slate-900 dark:text-white">
                      {language === 'en' ? 'Business Notifications' : 'کاروباری اطلاعات'}
                    </span>
                    <span className="text-[11px] font-mono font-bold text-[#059669] dark:text-[#D4AF37]">
                      {notifications.length} {language === 'en' ? 'active' : 'فعال'}
                    </span>
                  </div>

                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100 dark:divide-zinc-800">
                    {notifications.length > 0 ? (
                      notifications.map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={item.onClick}
                          className="w-full text-left px-4 py-3 hover:bg-emerald-50/40 dark:hover:bg-zinc-800/50 transition-colors flex items-start justify-between gap-3 cursor-pointer"
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <span
                              className={`mt-0.5 p-1.5 rounded-lg shrink-0 ${
                                item.type === 'low-stock'
                                  ? 'bg-amber-50 text-amber-600 dark:bg-amber-950/50 dark:text-amber-400'
                                  : 'bg-rose-50 text-rose-600 dark:bg-rose-950/50 dark:text-rose-400'
                              }`}
                            >
                              {item.type === 'low-stock' ? (
                                <Package className="h-3.5 w-3.5" />
                              ) : (
                                <AlertTriangle className="h-3.5 w-3.5" />
                              )}
                            </span>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                {item.title}
                              </p>
                              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                                {item.subtitle}
                              </p>
                            </div>
                          </div>
                          <span className="text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 shrink-0 tabular-nums">
                            {hideBalance && item.type !== 'low-stock' ? 'Rs ••••' : item.amountOrQty}
                          </span>
                        </button>
                      ))
                    ) : (
                      <div className="py-8 px-4 text-center">
                        <CheckCircle2 className="h-7 w-7 text-emerald-500 mx-auto mb-2" />
                        <p className="text-xs font-bold text-slate-700 dark:text-zinc-300">
                          {language === 'en' ? 'All caught up!' : 'سب مکمل ہے!'}
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          {language === 'en'
                            ? 'No overdue payment alerts or low stock warnings.'
                            : 'کوئی واجب الادا ادائیگی یا کم اسٹاک الرٹ نہیں ہے۔'}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Profile Menu */}
          <div className="relative" ref={profileRef}>
            <button
              type="button"
              onClick={() => {
                setIsProfileOpen((prev) => !prev);
                setIsNotifOpen(false);
              }}
              className="flex items-center gap-2.5 pl-2 pr-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 hover:bg-slate-100 dark:bg-zinc-950 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
            >
              <PartyAvatar name={user.name} size="sm" showBadge={false} />
              <div className="hidden sm:block text-left min-w-0 max-w-[130px]">
                <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate leading-tight">
                  {user.name}
                </p>
                <p className="text-[10px] font-semibold text-[#059669] dark:text-[#D4AF37] truncate">
                  {user.role}
                </p>
              </div>
              <ChevronDown className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            </button>

            <AnimatePresence>
              {isProfileOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl shadow-xl z-50 overflow-hidden"
                >
                  <div className="p-4 bg-meezan-header text-white">
                    <p className="text-xs font-extrabold truncate">{user.name}</p>
                    <p className="text-[11px] text-emerald-100/80 truncate mt-0.5">{user.email}</p>
                    <div className="mt-2 flex items-center justify-between">
                      <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/15 text-[#D4AF37]">
                        {user.role}
                      </span>
                      <span className="text-[10px] text-emerald-100/90 truncate max-w-[120px]">
                        {user.businessName}
                      </span>
                    </div>
                  </div>

                  <div className="p-1.5 divide-y divide-slate-100 dark:divide-zinc-800">
                    <div className="py-1 space-y-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onNavigateTab('settings');
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-emerald-50/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <Settings className="h-4 w-4 text-[#059669]" />
                        <span>{language === 'en' ? 'Account & Store Settings' : 'اکاؤنٹ اور دکان کی ترتیبات'}</span>
                      </button>

                      {user.role === 'Owner' && (
                        <button
                          type="button"
                          onClick={() => {
                            setIsProfileOpen(false);
                            onOpenModal('backups');
                          }}
                          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-slate-700 dark:text-zinc-200 hover:bg-emerald-50/60 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                        >
                          <Database className="h-4 w-4 text-[#059669]" />
                          <span>{language === 'en' ? 'Backups & Recovery Hub' : 'بیک اپ اور بحالی مرکز'}</span>
                        </button>
                      )}
                    </div>

                    <div className="pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileOpen(false);
                          onLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                      >
                        <LogOut className="h-4 w-4" />
                        <span>{t.logout}</span>
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      {/* ==================== 2. BUSINESS STATISTICS (4 CORE CARDS) ==================== */}
      {isSyncing && !stats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className="h-32 rounded-2xl skeleton-shimmer border border-slate-200/60 dark:border-zinc-800"
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {/* Card 1: Today's Sales */}
          <div
            onClick={() => onNavigateTab('invoices')}
            className="bg-meezan-header text-white rounded-2xl p-5 shadow-sm border border-emerald-900/40 flex flex-col justify-between min-h-[132px] cursor-pointer hover:shadow-md transition-all group"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-emerald-100/90">
                {language === 'en' ? "Today's Sales" : 'آج کی فروخت'}
              </span>
              <span className="h-9 w-9 rounded-xl bg-white/15 border border-[#D4AF37]/35 text-[#D4AF37] flex items-center justify-center shrink-0">
                <TrendingUp className="h-4.5 w-4.5" />
              </span>
            </div>

            <div className="my-2">
              <p className="text-2xl sm:text-3xl font-black text-white font-mono tabular-nums tracking-tight">
                {hideBalance ? 'Rs ••••' : `Rs ${todaysSales.toLocaleString()}`}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-emerald-100/80 font-medium">
              <span>
                {language === 'en'
                  ? `Total Sales: ${hideBalance ? 'Rs ••••' : `Rs ${(stats?.totalSales || 0).toLocaleString()}`}`
                  : `کل فروخت: ${hideBalance ? 'Rs ••••' : `Rs ${(stats?.totalSales || 0).toLocaleString()}`}`}
              </span>
              <span className="font-mono font-bold text-[#D4AF37]">
                {todaysOrdersCount} {language === 'en' ? 'today' : 'آج'}
              </span>
            </div>
          </div>

          {/* Card 2: Total Orders */}
          <div
            onClick={() => onNavigateTab('invoices')}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200/90 dark:border-zinc-800 shadow-2xs flex flex-col justify-between min-h-[132px] cursor-pointer hover:border-emerald-600/40 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                {language === 'en' ? 'Total Orders' : 'کل آرڈرز اور بلز'}
              </span>
              <span className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <ShoppingBag className="h-4.5 w-4.5" />
              </span>
            </div>

            <div className="my-2">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {totalOrdersCount.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              <span>
                {language === 'en'
                  ? `${invoices.length} Invoices · ${transactions.filter((tx) => tx.type === 'credit').length} Credit Sales`
                  : `${invoices.length} بلز · ${transactions.filter((tx) => tx.type === 'credit').length} ادھار فروخت`}
              </span>
              <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
            </div>
          </div>

          {/* Card 3: Pending Payments */}
          <div
            onClick={() => onNavigateTab('customers')}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200/90 dark:border-zinc-800 shadow-2xs flex flex-col justify-between min-h-[132px] cursor-pointer hover:border-emerald-600/40 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                {language === 'en' ? 'Pending Payments' : 'واجب الادا وصولیاں'}
              </span>
              <span className="h-9 w-9 rounded-xl bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <Clock className="h-4.5 w-4.5" />
              </span>
            </div>

            <div className="my-2">
              <p className="text-2xl sm:text-3xl font-black text-receivable-maroon dark:text-amber-400 font-mono tabular-nums tracking-tight">
                {hideBalance ? 'Rs ••••' : `Rs ${pendingReceivablesAmount.toLocaleString()}`}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              <span>
                {language === 'en'
                  ? `${pendingCustomersList.length} Customers Pending`
                  : `${pendingCustomersList.length} گاہکوں کے ذمہ باقی`}
              </span>
              {overdueCustomersList.length > 0 && (
                <span className="text-rose-600 dark:text-rose-400 font-bold">
                  {overdueCustomersList.length} {language === 'en' ? 'overdue' : 'میعاد ختم'}
                </span>
              )}
            </div>
          </div>

          {/* Card 4: Total Products */}
          <div
            onClick={() => onNavigateTab('inventory')}
            className="bg-white dark:bg-zinc-900 rounded-2xl p-5 border border-slate-200/90 dark:border-zinc-800 shadow-2xs flex flex-col justify-between min-h-[132px] cursor-pointer hover:border-emerald-600/40 transition-all"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                {language === 'en' ? 'Total Products' : 'کل مصنوعات (اسٹاک)'}
              </span>
              <span className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-[#059669] dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Package className="h-4.5 w-4.5" />
              </span>
            </div>

            <div className="my-2">
              <p className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white font-mono tabular-nums tracking-tight">
                {totalProductsCount.toLocaleString()}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-500 dark:text-zinc-400 font-medium">
              <span>
                {language === 'en'
                  ? `${totalInventoryUnits.toLocaleString()} units in stock`
                  : `${totalInventoryUnits.toLocaleString()} یونٹس موجود`}
              </span>
              {lowStockItems.length > 0 ? (
                <span className="text-amber-600 dark:text-amber-400 font-bold">
                  {lowStockItems.length} {language === 'en' ? 'low stock' : 'کم اسٹاک'}
                </span>
              ) : (
                <span className="text-emerald-600 dark:text-emerald-400 font-bold">
                  {language === 'en' ? 'Healthy' : 'مکمل'}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Secondary Accounting Ledger Strip (Cash in Hand, Payables, Expenses, Net Profit) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div
          onClick={() => onNavigateTab('cashbook')}
          className="bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-600/40 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 truncate">{t.cashInHand}</p>
            <p className="text-sm sm:text-base font-black text-[#064E3B] dark:text-emerald-400 font-mono tabular-nums mt-0.5">
              {hideBalance ? 'Rs ••••' : `Rs ${(stats?.cashInHand || 0).toLocaleString()}`}
            </p>
          </div>
          <Wallet className="h-4 w-4 text-[#059669] shrink-0" />
        </div>

        <div
          onClick={() => onNavigateTab('suppliers')}
          className="bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-600/40 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 truncate">{t.payables}</p>
            <p className="text-sm sm:text-base font-black text-payable-green dark:text-emerald-400 font-mono tabular-nums mt-0.5">
              {hideBalance ? 'Rs ••••' : `Rs ${(stats?.payables || 0).toLocaleString()}`}
            </p>
          </div>
          <Truck className="h-4 w-4 text-[#059669] shrink-0" />
        </div>

        <div
          onClick={() => onNavigateTab('cashbook')}
          className="bg-white dark:bg-zinc-900 rounded-xl px-4 py-3 border border-slate-200/80 dark:border-zinc-800 flex items-center justify-between gap-3 cursor-pointer hover:border-emerald-600/40 transition-colors"
        >
          <div className="min-w-0">
            <p className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 truncate">{t.expenses}</p>
            <p className="text-sm sm:text-base font-black text-slate-800 dark:text-zinc-200 font-mono tabular-nums mt-0.5">
              {hideBalance ? 'Rs ••••' : `Rs ${(stats?.totalExpenses || 0).toLocaleString()}`}
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-rose-500 shrink-0" />
        </div>

        {user.role !== 'Employee' ? (
          <div className="bg-emerald-50/60 dark:bg-emerald-950/25 rounded-xl px-4 py-3 border border-emerald-200/80 dark:border-emerald-900/60 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 truncate">{t.profit}</p>
              <p className="text-sm sm:text-base font-black text-payable-green dark:text-emerald-400 font-mono tabular-nums mt-0.5">
                {hideBalance ? 'Rs ••••' : `Rs ${(stats?.profit || 0).toLocaleString()}`}
              </p>
            </div>
            <TrendingUp className="h-4 w-4 text-[#059669] shrink-0" />
          </div>
        ) : (
          <div className="bg-slate-100 dark:bg-zinc-900 rounded-xl px-4 py-3 border border-slate-200 dark:border-zinc-800 flex items-center justify-between gap-2 opacity-70">
            <span className="text-xs font-bold text-slate-400">{t.profit} Locked</span>
            <ShieldAlert className="h-4 w-4 text-slate-400 shrink-0" />
          </div>
        )}
      </div>

      {/* ==================== 3. BUSINESS OPERATIONS MAIN CARD ==================== */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl p-4 sm:p-6 border border-slate-200/90 dark:border-zinc-800 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
              {language === 'en' ? 'Business Operations & Actions' : 'کاروباری آپریشنز اور فوری اقدامات'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400">
              {language === 'en'
                ? 'Access Customers, Suppliers, Invoices, and Inventory from one unified workspace.'
                : 'گاہک کھاتہ، سپلائرز، انوائسز اور اسٹاک تک ایک ہی جگہ سے رسائی حاصل کریں۔'}
            </p>
          </div>

          {/* Secondary Utility Actions (Record Payment, Credit Entry, Statement) */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onOpenRecordPayment()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/70 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
            >
              <ArrowDownLeft className="h-3.5 w-3.5 text-emerald-600" />
              <span>{language === 'en' ? 'Record Payment' : 'وصولی درج کریں'}</span>
            </button>

            <button
              type="button"
              onClick={onOpenCreditSale}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 border border-slate-200 dark:border-zinc-700 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
            >
              <ArrowUpRight className="h-3.5 w-3.5 text-rose-600" />
              <span>{language === 'en' ? 'Give Credit (Udhaar)' : 'ادھار درج کریں'}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowStatementPicker((prev) => !prev)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 text-[#042F24] dark:text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-bold cursor-pointer transition-colors whitespace-nowrap"
            >
              <FileText className="h-3.5 w-3.5 text-[#059669] dark:text-[#D4AF37]" />
              <span>{language === 'en' ? 'Share Statement' : 'مکمل اسٹیٹمنٹ'}</span>
            </button>
          </div>
        </div>

        {/* Single Clickable Main Dashboard Box: Business Operations */}
        <motion.button
          whileHover={{ y: -2 }}
          whileTap={{ scale: 0.99 }}
          type="button"
          id="business-operations-card"
          onClick={() => {
            onSelectCustomer(null);
            onNavigateTab('business-operations');
          }}
          className="w-full text-left rounded-2xl bg-gradient-to-r from-[#042F24] via-[#064E3B] to-[#047857] text-white p-5 sm:p-6 border border-emerald-700/60 shadow-md hover:shadow-lg transition-all cursor-pointer group"
        >
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start sm:items-center gap-4 min-w-0">
              <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-2xl bg-white/15 border border-[#D4AF37]/40 flex items-center justify-center shrink-0 shadow-xs group-hover:scale-105 transition-transform">
                <Briefcase className="h-6 w-6 sm:h-7 sm:w-7 text-[#D4AF37]" />
              </div>
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h4 className="text-base sm:text-xl font-black text-white tracking-tight">
                    {language === 'en' ? 'Business Operations' : 'کاروباری آپریشنز (Business Operations)'}
                  </h4>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-extrabold bg-[#D4AF37] text-[#042F24]">
                    {language === 'en' ? '4 Core Modules' : '4 اہم شعبے'}
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-emerald-100/90 font-medium">
                  {language === 'en'
                    ? 'Click to open Customers, Suppliers, Invoices, and Inventory management.'
                    : 'گاہک کھاتے، سپلائرز، انوائسز اور اسٹاک مینجمنٹ کھولنے کے لیے کلک کریں۔'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between md:justify-end gap-3 pt-3 md:pt-0 border-t md:border-t-0 border-white/10 shrink-0">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-100/90">
                <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  {customers.length} {language === 'en' ? 'Customers' : 'گاہک'}
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  {suppliers.length} {language === 'en' ? 'Suppliers' : 'سپلائرز'}
                </span>
                <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  {invoices.length} {language === 'en' ? 'Invoices' : 'بلز'}
                </span>
                <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-white/10 border border-white/15">
                  {inventory.length} {language === 'en' ? 'Products' : 'مصنوعات'}
                </span>
              </div>

              <div className="h-9 w-9 rounded-xl bg-white/15 group-hover:bg-[#D4AF37] text-white group-hover:text-[#042F24] flex items-center justify-center transition-colors shrink-0">
                <ChevronRight className="h-5 w-5 group-hover:translate-x-0.5 transition-transform" />
              </div>
            </div>
          </div>
        </motion.button>

        {/* Optional Statement Customer Picker Drawer */}
        <AnimatePresence>
          {showStatementPicker && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-2 p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-extrabold text-[#042F24] dark:text-emerald-300">
                    {language === 'en'
                      ? 'Select a Customer Account to Generate Full PDF Statement'
                      : 'مکمل اسٹیٹمنٹ اور پی ڈی ایف کے لیے گاہک منتخب کریں'}
                  </p>
                  <p className="text-[11px] text-slate-600 dark:text-zinc-400">
                    {language === 'en'
                      ? 'Includes opening balance, running ledger, and WhatsApp sharing.'
                      : 'ابتدائی بیلنس، مکمل کھاتہ اور واٹس ایپ شیئرنگ شامل ہے۔'}
                  </p>
                </div>

                {customers.length > 0 ? (
                  <div className="flex items-center gap-2">
                    <select
                      defaultValue=""
                      onChange={(e) => {
                        const picked = customers.find((c) => c.id === e.target.value);
                        if (picked) {
                          onOpenCustomerReport(picked);
                          setShowStatementPicker(false);
                        }
                      }}
                      className="px-3.5 py-2 rounded-xl border border-emerald-300 dark:border-emerald-800 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-800 dark:text-white focus:outline-none"
                    >
                      <option value="" disabled>
                        {language === 'en' ? '-- Choose Customer --' : '-- گاہک منتخب کریں --'}
                      </option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} — Rs {Math.abs(c.balance).toLocaleString()}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onOpenModal('customer')}
                    className="px-3.5 py-2 rounded-xl bg-meezan-btn text-white text-xs font-bold cursor-pointer"
                  >
                    {language === 'en' ? '+ Add First Customer' : '+ پہلا گاہک شامل کریں'}
                  </button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* ==================== 4. RECENT TRANSACTIONS TABLE ==================== */}
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-slate-200/90 dark:border-zinc-800 shadow-2xs overflow-hidden">
        {/* Header & Filter Controls */}
        <div className="p-4 sm:p-5 border-b border-slate-200/80 dark:border-zinc-800 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                {language === 'en' ? 'Recent Transactions' : 'حالیہ لین دین اور ادائیگیاں'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400">
                {language === 'en'
                  ? 'Real-time log of customer credit sales and payments received.'
                  : 'گاہکوں کے ساتھ ہونے والے ادھار اور نقد وصولیوں کی تفصیل۔'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigateTab('cashbook')}
                className="text-xs font-bold text-[#059669] dark:text-[#D4AF37] hover:underline cursor-pointer"
              >
                {language === 'en'
                  ? `View All Payments (${transactions.length})`
                  : `سب دیکھیں (${transactions.length})`}
              </button>
            </div>
          </div>

          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pt-1">
            {/* Search Input */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={dashSearch}
                onChange={(e) => setDashSearch(e.target.value)}
                placeholder={
                  language === 'en'
                    ? 'Search by transaction ID, customer name, or description...'
                    : 'ٹرانزیکشن آئی ڈی، گاہک کا نام یا تفصیل تلاش کریں...'
                }
                className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-4 rtl:pl-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs sm:text-sm font-medium text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-[#059669]"
              />
            </div>

            {/* Status & Date Range Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={dashStatusFilter}
                onChange={(e) => setDashStatusFilter(e.target.value as any)}
                className="px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none"
              >
                <option value="all">{language === 'en' ? 'All Statuses' : 'تمام حالات'}</option>
                <option value="paid">{language === 'en' ? 'Paid / Settled' : 'وصول شدہ / بے باق'}</option>
                <option value="pending">{language === 'en' ? 'Pending Credit' : 'واجب الادا'}</option>
                <option value="partial">{language === 'en' ? 'Partially Paid' : 'جزوی ادائیگی'}</option>
                <option value="overdue">{language === 'en' ? 'Overdue' : 'میعاد ختم'}</option>
              </select>

              <div className="inline-flex rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 p-0.5">
                {[
                  { id: 'all', label: language === 'en' ? 'All Time' : 'مکمل' },
                  { id: 'today', label: language === 'en' ? 'Today' : 'آج' },
                  { id: '7d', label: language === 'en' ? '7 Days' : '7 دن' },
                  { id: '30d', label: language === 'en' ? '30 Days' : '30 دن' }
                ].map((df) => (
                  <button
                    key={df.id}
                    type="button"
                    onClick={() => setDashDateFilter(df.id as any)}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold transition-colors cursor-pointer whitespace-nowrap ${
                      dashDateFilter === df.id
                        ? 'bg-[#042F24] text-[#D4AF37] shadow-2xs'
                        : 'text-slate-500 hover:text-slate-800 dark:hover:text-zinc-200'
                    }`}
                  >
                    {df.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Desktop & Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-zinc-950/60 border-b border-slate-200/80 dark:border-zinc-800 text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-zinc-400">
                <th className="py-3.5 px-5">{language === 'en' ? 'Transaction ID' : 'ٹرانزیکشن آئی ڈی'}</th>
                <th className="py-3.5 px-5">{language === 'en' ? 'Customer Name' : 'گاہک کا نام'}</th>
                <th className="py-3.5 px-5">{language === 'en' ? 'Date' : 'تاریخ'}</th>
                <th className="py-3.5 px-5 text-right">{language === 'en' ? 'Amount' : 'رقم'}</th>
                <th className="py-3.5 px-5 text-center">{language === 'en' ? 'Payment Status' : 'ادائیگی کی صورتحال'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/80 text-sm">
              {filteredRecentTransactions.length > 0 ? (
                filteredRecentTransactions.slice(0, 10).map((tx) => {
                  const isPayment = tx.type === 'debit';
                  const statusObj = getTransactionStatus(tx);
                  const displayTxId = tx.id.startsWith('t_')
                    ? `#TX-${tx.id.slice(2).toUpperCase()}`
                    : `#${tx.id.toUpperCase()}`;

                  return (
                    <tr
                      key={tx.id}
                      onClick={() => {
                        onSelectCustomer(tx.customerId);
                        onNavigateTab('customers');
                      }}
                      className="hover:bg-emerald-50/30 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                    >
                      <td className="py-3.5 px-5 font-mono text-xs font-bold text-slate-600 dark:text-zinc-400 whitespace-nowrap">
                        {displayTxId}
                      </td>
                      <td className="py-3.5 px-5">
                        <div className="flex items-center gap-3 min-w-0">
                          <PartyAvatar name={tx.customerName} size="sm" showBadge={false} />
                          <div className="min-w-0">
                            <p className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {tx.customerName}
                            </p>
                            <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                              <TransactionDescriptionView
                                description={tx.description}
                                language={language}
                                emptyLabel={isPayment ? 'Payment Received' : 'Credit Sale'}
                                compact
                              />
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-5 font-mono text-xs text-slate-500 dark:text-zinc-400 tabular-nums whitespace-nowrap">
                        {tx.date}
                      </td>
                      <td className="py-3.5 px-5 text-right font-mono text-xs sm:text-sm font-black tabular-nums whitespace-nowrap">
                        <span
                          className={
                            isPayment
                              ? 'text-payable-green dark:text-emerald-400'
                              : 'text-receivable-maroon dark:text-amber-400'
                          }
                        >
                          {hideBalance
                            ? 'Rs ••••'
                            : `${isPayment ? '+' : '-'} Rs ${tx.amount.toLocaleString()}`}
                        </span>
                      </td>
                      <td className="py-3.5 px-5 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-lg text-[11px] font-bold border ${statusObj.badgeClass}`}
                        >
                          {statusObj.label}
                        </span>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="py-12 px-4 text-center">
                    <p className="text-xs sm:text-sm font-bold text-slate-500 dark:text-zinc-400">
                      {language === 'en'
                        ? 'No transactions found for the selected filter.'
                        : 'منتخب فلٹر کے مطابق کوئی لین دین نہیں ملا۔'}
                    </p>
                    <div className="mt-3 flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => onOpenModal('invoice')}
                        className="px-4 py-2 rounded-xl bg-meezan-btn text-white text-xs font-bold cursor-pointer"
                      >
                        {language === 'en' ? '+ Add New Sale' : '+ نئی فروخت درج کریں'}
                      </button>
                      <button
                        type="button"
                        onClick={onOpenCreditSale}
                        className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 cursor-pointer"
                      >
                        {language === 'en' ? 'Record Customer Entry' : 'کھاتہ اندراج کریں'}
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View (< md) */}
        <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/80">
          {filteredRecentTransactions.length > 0 ? (
            filteredRecentTransactions.slice(0, 10).map((tx) => {
              const isPayment = tx.type === 'debit';
              const statusObj = getTransactionStatus(tx);
              const displayTxId = tx.id.startsWith('t_')
                ? `#TX-${tx.id.slice(2).toUpperCase()}`
                : `#${tx.id.toUpperCase()}`;

              return (
                <div
                  key={tx.id}
                  onClick={() => {
                    onSelectCustomer(tx.customerId);
                    onNavigateTab('customers');
                  }}
                  className="p-4 flex items-center justify-between gap-3 hover:bg-emerald-50/30 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <PartyAvatar name={tx.customerName} size="sm" showBadge={false} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-400">{displayTxId}</span>
                        <span className="font-mono text-[10px] text-slate-400">· {tx.date}</span>
                      </div>
                      <p className="text-xs font-extrabold text-slate-900 dark:text-white truncate mt-0.5">
                        {tx.customerName}
                      </p>
                      <div className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                        <TransactionDescriptionView
                          description={tx.description}
                          language={language}
                          emptyLabel={isPayment ? 'Payment Received' : 'Credit Sale'}
                          compact
                        />
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0 space-y-1">
                    <p
                      className={`text-xs font-black font-mono tabular-nums ${
                        isPayment
                          ? 'text-payable-green dark:text-emerald-400'
                          : 'text-receivable-maroon dark:text-amber-400'
                      }`}
                    >
                      {hideBalance
                        ? 'Rs ••••'
                        : `${isPayment ? '+' : '-'} Rs ${tx.amount.toLocaleString()}`}
                    </p>
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[10px] font-bold border ${statusObj.badgeClass}`}
                    >
                      {statusObj.label}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 px-4 text-center">
              <p className="text-xs font-bold text-slate-500 dark:text-zinc-400">
                {language === 'en'
                  ? 'No transactions found for the selected filter.'
                  : 'منتخب فلٹر کے مطابق کوئی لین دین نہیں ملا۔'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ==================== 5. CHARTS & COLLECTION OVERVIEW ==================== */}
      {user.role !== 'Employee' && <DashboardCharts analytics={analytics} lang={language} />}

      <div id="debt-summary-section">
        <DebtSummary
          customers={customers}
          suppliers={suppliers}
          transactions={transactions}
          lang={language}
          getSingleSmsLink={getSingleSmsLink}
          getWhatsAppLink={getWhatsAppLink}
          onQuickRecordPayment={(customer) => onOpenRecordPayment(customer)}
          onNavigateToAccount={(targetTab, accountName) => {
            onNavigateTab(targetTab);
            if (targetTab === 'customers' && accountName) {
              const matched = customers.find(
                (c) => c.name.toLowerCase() === accountName.toLowerCase()
              );
              onSelectCustomer(matched ? matched.id : null);
            }
          }}
        />
      </div>
    </motion.div>
  );
}
