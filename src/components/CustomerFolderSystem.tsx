import React, { useState, useMemo } from 'react';
import {
  Folder,
  FolderOpen,
  Search,
  Plus,
  Edit3,
  Trash2,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  Calendar,
  Clock,
  MessageSquare,
  Send,
  LayoutGrid,
  List,
  X,
  FileText,
  SlidersHorizontal,
  ArrowUpDown,
  Copy,
  Check
} from 'lucide-react';
import { Customer, Transaction, UserRole } from '../types';
import { Language } from '../translations';
import { BRAND } from '../brand';

interface CustomerFolderSystemProps {
  customers: Customer[];
  transactions: Transaction[];
  language: Language;
  businessName: string;
  userRole: UserRole;
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  onCreateCustomer: (payload: { name: string; phone: string; email: string; initialBalance: string }) => Promise<void>;
  onUpdateCustomer: (id: string, payload: { name: string; phone: string; email: string }) => Promise<void>;
  onDeleteCustomer: (id: string) => void;
  onCreateTransaction: (payload: {
    customerId: string;
    type: 'credit' | 'debit';
    amount: string;
    date: string;
    description: string;
  }) => Promise<void>;
  onUpdateTransaction: (
    id: string,
    payload: { type: 'credit' | 'debit'; amount: string; date: string; description: string }
  ) => Promise<void>;
  onDeleteTransaction: (id: string) => void;
  t: Record<string, string>;
}

interface EnrichedTransaction extends Transaction {
  runningBalance: number;
  originalIndex: number;
}

export default function CustomerFolderSystem({
  customers,
  transactions,
  language,
  businessName,
  userRole,
  selectedCustomerId,
  onSelectCustomer,
  onCreateCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  onCreateTransaction,
  onUpdateTransaction,
  onDeleteTransaction,
  t
}: CustomerFolderSystemProps) {
  // Folder List View States
  const [folderSearch, setFolderSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState<'all' | 'receivable' | 'payable' | 'settled'>('all');
  const [folderSort, setFolderSort] = useState<'updated' | 'name' | 'balance' | 'txCount'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('grid');

  // Inside Customer Folder View States
  const [txSearch, setTxSearch] = useState('');
  const [txTypeFilter, setTxTypeFilter] = useState<'all' | 'credit' | 'debit'>('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [txSortOrder, setTxSortOrder] = useState<'newest' | 'oldest'>('newest');
  const [visibleTxLimit, setVisibleTxLimit] = useState<number>(25);

  // Modals inside Customer Folder System
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isStatementModalOpen, setIsStatementModalOpen] = useState(false);
  const [copiedStatement, setCopiedStatement] = useState(false);

  // Customer Form State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custInitialBalance, setCustInitialBalance] = useState('');
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Transaction Form State
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Map customerId -> strictly that customer's transactions (associated ONLY by customerId)
  const transactionsByCustomerId = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    for (const c of customers) {
      map.set(c.id, []);
    }
    transactions.forEach((tx) => {
      if (!tx || !tx.customerId) return;
      const existing = map.get(tx.customerId);
      if (existing) {
        existing.push(tx);
      } else {
        map.set(tx.customerId, [tx]);
      }
    });
    return map;
  }, [customers, transactions]);

  // Compute summary stats per customer folder
  const customerFolderSummaries = useMemo(() => {
    const summaryMap = new Map<
      string,
      {
        txCount: number;
        totalCredit: number;
        totalDebit: number;
        lastTxDate: string | null;
      }
    >();

    for (const c of customers) {
      const custTxs = transactionsByCustomerId.get(c.id) || [];
      let totalCredit = 0;
      let totalDebit = 0;
      let lastTxDate: string | null = null;

      for (const tx of custTxs) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'credit') {
          totalCredit += amt;
        } else if (tx.type === 'debit') {
          totalDebit += amt;
        }
        const stamp = tx.createdAt || tx.date;
        if (!lastTxDate || stamp > lastTxDate) {
          lastTxDate = stamp;
        }
      }

      summaryMap.set(c.id, {
        txCount: custTxs.length,
        totalCredit,
        totalDebit,
        lastTxDate
      });
    }

    return summaryMap;
  }, [customers, transactionsByCustomerId]);

  // Filtered & sorted customer folders
  const filteredFolders = useMemo(() => {
    const query = folderSearch.trim().toLowerCase();

    const filtered = customers.filter((c) => {
      if (query) {
        const matchName = c.name.toLowerCase().includes(query);
        const matchPhone = c.phone.toLowerCase().includes(query);
        const matchEmail = c.email ? c.email.toLowerCase().includes(query) : false;
        if (!matchName && !matchPhone && !matchEmail) return false;
      }

      if (folderFilter === 'receivable' && c.balance <= 0) return false;
      if (folderFilter === 'payable' && c.balance >= 0) return false;
      if (folderFilter === 'settled' && c.balance !== 0) return false;

      return true;
    });

    return filtered.sort((a, b) => {
      if (folderSort === 'name') {
        return a.name.localeCompare(b.name);
      }
      if (folderSort === 'balance') {
        return Math.abs(b.balance) - Math.abs(a.balance);
      }
      if (folderSort === 'txCount') {
        const countA = customerFolderSummaries.get(a.id)?.txCount || 0;
        const countB = customerFolderSummaries.get(b.id)?.txCount || 0;
        return countB - countA;
      }
      // Default: recently updated
      return new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime();
    });
  }, [customers, folderSearch, folderFilter, folderSort, customerFolderSummaries]);

  // Currently selected customer
  const selectedCustomer = useMemo(() => {
    if (!selectedCustomerId) return null;
    return customers.find((c) => c.id === selectedCustomerId) || null;
  }, [customers, selectedCustomerId]);

  // Selected customer's transactions with chronological running balance
  const selectedCustomerEnrichedTxs = useMemo<EnrichedTransaction[]>(() => {
    if (!selectedCustomer) return [];
    const rawTxs = transactionsByCustomerId.get(selectedCustomer.id) || [];

    // Tag with original index in transactions array (since unshift places newer items at lower indices)
    const indexed = rawTxs.map((tx, idx) => ({ tx, originalIndex: idx }));

    // Sort chronologically OLDEST -> NEWEST to compute running balance accurately
    indexed.sort((a, b) => {
      const dateCmp = (a.tx.date || '').localeCompare(b.tx.date || '');
      if (dateCmp !== 0) return dateCmp;

      if (a.tx.createdAt && b.tx.createdAt) {
        const timeCmp = a.tx.createdAt.localeCompare(b.tx.createdAt);
        if (timeCmp !== 0) return timeCmp;
      }

      // Higher index in db.transactions means it was created earlier
      return b.originalIndex - a.originalIndex;
    });

    // Calculate net sum of recorded transactions to account for any pre-existing baseline balance
    const netFromTxs = indexed.reduce((acc, item) => {
      const amt = Number(item.tx.amount) || 0;
      return item.tx.type === 'credit' ? acc + amt : acc - amt;
    }, 0);

    let running = (Number(selectedCustomer.balance) || 0) - netFromTxs;

    const chronological: EnrichedTransaction[] = indexed.map(({ tx, originalIndex }) => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'credit') {
        running += amt;
      } else {
        running -= amt;
      }
      return {
        ...tx,
        runningBalance: running,
        originalIndex
      };
    });

    return chronological;
  }, [selectedCustomer, transactionsByCustomerId]);

  // Filtered and sorted transactions inside the open customer folder
  const displayedCustomerTxs = useMemo(() => {
    const query = txSearch.trim().toLowerCase();

    const filtered = selectedCustomerEnrichedTxs.filter((tx) => {
      if (txTypeFilter !== 'all' && tx.type !== txTypeFilter) return false;
      if (dateFrom && tx.date < dateFrom) return false;
      if (dateTo && tx.date > dateTo) return false;
      if (query) {
        const matchDesc = (tx.description || '').toLowerCase().includes(query);
        const matchAmt = String(tx.amount).includes(query);
        const matchDate = (tx.date || '').includes(query);
        if (!matchDesc && !matchAmt && !matchDate) return false;
      }
      return true;
    });

    // Chronological array is already oldest -> newest
    if (txSortOrder === 'newest') {
      return [...filtered].reverse();
    }
    return filtered;
  }, [selectedCustomerEnrichedTxs, txSearch, txTypeFilter, dateFrom, dateTo, txSortOrder]);

  // Format date & time helper
  const formatTxDateTime = (tx: Transaction) => {
    const dateStr = tx.date || (tx.createdAt ? tx.createdAt.split('T')[0] : '—');
    let timeStr = '';
    if (tx.createdAt) {
      const parsed = new Date(tx.createdAt);
      if (!isNaN(parsed.getTime())) {
        timeStr = parsed.toLocaleTimeString(language === 'en' ? 'en-US' : 'ur-PK', {
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    }
    return { dateStr, timeStr };
  };

  // Build customer-specific WhatsApp Statement / Reminder message (strictly using ONLY this customer's records)
  const buildCustomerWhatsAppStatement = (customer: Customer) => {
    const summary = customerFolderSummaries.get(customer.id) || {
      txCount: 0,
      totalCredit: 0,
      totalDebit: 0,
      lastTxDate: null
    };
    const recentTxs = [...selectedCustomerEnrichedTxs].reverse().slice(0, 5);
    const shopTitle = businessName || BRAND.name;

    if (language === 'ur') {
      const txLines =
        recentTxs.length > 0
          ? recentTxs
              .map(
                (tx) =>
                  `• ${tx.date}: ${tx.type === 'credit' ? 'ادھار (Credit)' : 'وصولی (Payment)'} Rs ${tx.amount.toLocaleString()}${
                    tx.description ? ` (${tx.description})` : ''
                  }`
              )
              .join('\n')
          : '• کوئی لین دین ریکارڈ نہیں';

      return (
        `*${shopTitle} - کھاتہ اسٹیٹمنٹ*\n` +
        `محترم *${customer.name}* صاحب،\n\n` +
        `آپ کے کھاتہ کی تفصیل درج ذیل ہے:\n` +
        `کل ادھار (Credit): Rs ${summary.totalCredit.toLocaleString()}\n` +
        `کل وصولی (Paid): Rs ${summary.totalDebit.toLocaleString()}\n` +
        `*موجودہ بقایا (Balance): Rs ${customer.balance.toLocaleString()}*\n` +
        `کل لین دین: ${summary.txCount}\n\n` +
        `حالیہ لین دین:\n${txLines}\n\n` +
        `شکریہ!`
      );
    }

    const balanceStatus =
      customer.balance > 0
        ? `PKR ${customer.balance.toLocaleString()} (Payable to ${shopTitle})`
        : customer.balance < 0
        ? `PKR ${Math.abs(customer.balance).toLocaleString()} (Advance Credit)`
        : `PKR 0 (Settled)`;

    const txLines =
      recentTxs.length > 0
        ? recentTxs
            .map(
              (tx) =>
                `• ${tx.date}: ${tx.type === 'credit' ? 'Credit' : 'Payment'} PKR ${tx.amount.toLocaleString()}${
                  tx.description ? ` - ${tx.description}` : ''
                } (Bal: PKR ${tx.runningBalance.toLocaleString()})`
            )
            .join('\n')
        : '• No transactions recorded yet';

    return (
      `*${shopTitle} — Account Statement*\n` +
      `Customer: *${customer.name}* (${customer.phone})\n\n` +
      `*Account Summary:*\n` +
      `• Total Credit (Charged): PKR ${summary.totalCredit.toLocaleString()}\n` +
      `• Total Payments Received: PKR ${summary.totalDebit.toLocaleString()}\n` +
      `• *Current Outstanding Balance: ${balanceStatus}*\n` +
      `• Total Transactions: ${summary.txCount}\n\n` +
      `*Recent Ledger Activity:*\n${txLines}\n\n` +
      `Thank you for your business!`
    );
  };

  const getCustomerWhatsAppUrl = (customer: Customer) => {
    const cleanPhone = customer.phone.replace(/[^0-9]/g, '');
    const text = buildCustomerWhatsAppStatement(customer);
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`;
  };

  const getCustomerSmsUrl = (customer: Customer) => {
    const isApple =
      typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    const queryChar = isApple ? '&' : '?';
    const cleanPhone = customer.phone.trim().replace(/[\s-]/g, '');
    const summary = customerFolderSummaries.get(customer.id) || {
      txCount: 0,
      totalCredit: 0,
      totalDebit: 0
    };
    const shopTitle = businessName || BRAND.name;
    const message =
      language === 'ur'
        ? `محترم ${customer.name}، ${shopTitle} کھاتہ: کل ادھار Rs ${summary.totalCredit.toLocaleString()}، وصولی Rs ${summary.totalDebit.toLocaleString()}، موجودہ بقایا Rs ${customer.balance.toLocaleString()}۔ شکریہ!`
        : `Dear ${customer.name}, ${shopTitle} statement: Total Credit PKR ${summary.totalCredit.toLocaleString()}, Paid PKR ${summary.totalDebit.toLocaleString()}, Outstanding Balance PKR ${customer.balance.toLocaleString()}. Thank you!`;
    return `sms:${cleanPhone}${queryChar}body=${encodeURIComponent(message)}`;
  };

  // Handlers for Customer Create / Edit
  const openAddCustomerModal = () => {
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustInitialBalance('');
    setIsAddCustomerOpen(true);
  };

  const openEditCustomerModal = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCustName(customer.name);
    setCustPhone(customer.phone);
    setCustEmail(customer.email || '');
    setEditingCustomer(customer);
  };

  const handleSaveNewCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!custName.trim() || !custPhone.trim()) return;
    setIsSubmittingCustomer(true);
    try {
      await onCreateCustomer({
        name: custName.trim(),
        phone: custPhone.trim(),
        email: custEmail.trim(),
        initialBalance: custInitialBalance
      });
      setIsAddCustomerOpen(false);
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  const handleSaveEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCustomer || !custName.trim() || !custPhone.trim()) return;
    setIsSubmittingCustomer(true);
    try {
      await onUpdateCustomer(editingCustomer.id, {
        name: custName.trim(),
        phone: custPhone.trim(),
        email: custEmail.trim()
      });
      setEditingCustomer(null);
    } finally {
      setIsSubmittingCustomer(false);
    }
  };

  // Handlers for Transaction Create / Edit inside selected Customer Folder
  const openAddTransactionModal = (defaultType: 'credit' | 'debit' = 'credit') => {
    setTxType(defaultType);
    setTxAmount('');
    setTxDate(new Date().toISOString().split('T')[0]);
    setTxDesc('');
    setIsAddTxOpen(true);
  };

  const openEditTransactionModal = (tx: Transaction) => {
    setTxType(tx.type);
    setTxAmount(String(tx.amount));
    setTxDate(tx.date || new Date().toISOString().split('T')[0]);
    setTxDesc(tx.description || '');
    setEditingTx(tx);
  };

  const handleSaveNewTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !txAmount) return;
    setIsSubmittingTx(true);
    try {
      await onCreateTransaction({
        customerId: selectedCustomer.id,
        type: txType,
        amount: txAmount,
        date: txDate,
        description: txDesc.trim()
      });
      setIsAddTxOpen(false);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleSaveEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTx || !txAmount) return;
    setIsSubmittingTx(true);
    try {
      await onUpdateTransaction(editingTx.id, {
        type: txType,
        amount: txAmount,
        date: txDate,
        description: txDesc.trim()
      });
      setEditingTx(null);
    } finally {
      setIsSubmittingTx(false);
    }
  };

  const handleCopyStatement = () => {
    if (!selectedCustomer) return;
    const statementText = buildCustomerWhatsAppStatement(selectedCustomer);
    navigator.clipboard?.writeText(statementText);
    setCopiedStatement(true);
    setTimeout(() => setCopiedStatement(false), 2000);
  };

  // Global customer metrics for header bar
  const totalReceivableSum = useMemo(
    () => customers.filter((c) => c.balance > 0).reduce((acc, c) => acc + c.balance, 0),
    [customers]
  );
  const totalAdvanceSum = useMemo(
    () => customers.filter((c) => c.balance < 0).reduce((acc, c) => acc + Math.abs(c.balance), 0),
    [customers]
  );

  const selectedCustomerSummary = selectedCustomer
    ? customerFolderSummaries.get(selectedCustomer.id) || {
        txCount: 0,
        totalCredit: 0,
        totalDebit: 0,
        lastTxDate: null
      }
    : null;

  return (
    <div className="space-y-5">
      {/* ===================================================================== */}
      {/* VIEW 1: CUSTOMER FOLDERS DIRECTORY (When no folder is open)           */}
      {/* ===================================================================== */}
      {!selectedCustomer ? (
        <>
          {/* Directory Top Overview Banner */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="h-9 w-9 sm:h-10 sm:w-10 rounded-xl bg-[#0B192C] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
                    <Folder className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white tracking-tight truncate">
                      {language === 'en' ? 'Customer Account Folders' : 'گاہک کھاتہ فولڈرز'}
                    </h2>
                    <p className="text-xs text-slate-500 dark:text-zinc-400 line-clamp-2">
                      {language === 'en'
                        ? 'Click any customer folder to open their dedicated ledger, record transactions, and send statements.'
                        : 'کسی بھی گاہک کے فولڈر پر کلک کر کے اس کا مکمل کھاتہ اور لین دین دیکھیں۔'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-between gap-3 sm:gap-5 pt-3 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-zinc-800">
                <div className="grid grid-cols-3 sm:flex sm:items-center gap-2 sm:gap-5">
                  <div className="bg-slate-50 sm:bg-transparent dark:bg-zinc-950/60 sm:dark:bg-transparent p-2 sm:p-0 rounded-xl">
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate">
                      {language === 'en' ? 'Folders' : 'کل فولڈرز'}
                    </span>
                    <span className="text-xs sm:text-base font-bold font-mono tabular-nums text-slate-900 dark:text-white">
                      {customers.length}
                    </span>
                  </div>
                  <div className="hidden sm:block h-7 w-[1px] bg-slate-200 dark:bg-zinc-800" />
                  <div className="bg-slate-50 sm:bg-transparent dark:bg-zinc-950/60 sm:dark:bg-transparent p-2 sm:p-0 rounded-xl">
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate">
                      {language === 'en' ? 'Receivable' : 'کل واجب الوصول'}
                    </span>
                    <span className="text-xs sm:text-base font-bold font-mono tabular-nums text-amber-600 dark:text-amber-400 break-all sm:break-normal">
                      PKR {totalReceivableSum.toLocaleString()}
                    </span>
                  </div>
                  <div className="hidden sm:block h-7 w-[1px] bg-slate-200 dark:bg-zinc-800" />
                  <div className="bg-slate-50 sm:bg-transparent dark:bg-zinc-950/60 sm:dark:bg-transparent p-2 sm:p-0 rounded-xl">
                    <span className="block text-[10px] sm:text-[11px] font-medium text-slate-400 dark:text-zinc-500 truncate">
                      {language === 'en' ? 'Advance' : 'ایڈوانس'}
                    </span>
                    <span className="text-xs sm:text-base font-bold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 break-all sm:break-normal">
                      PKR {totalAdvanceSum.toLocaleString()}
                    </span>
                  </div>
                </div>

                <button
                  id="add-customer-btn"
                  type="button"
                  onClick={openAddCustomerModal}
                  className="w-full sm:w-auto sm:ml-auto lg:ml-2 flex items-center justify-center gap-2 px-4 py-2.5 min-h-[42px] rounded-xl bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] font-semibold text-xs shadow-xs transition-colors cursor-pointer whitespace-nowrap shrink-0"
                >
                  <Plus className="h-4 w-4" />
                  <span>{language === 'en' ? 'New Customer Folder' : 'نیا گاہک فولڈر'}</span>
                </button>
              </div>
            </div>
          </div>

          {/* Search, Filter & View Mode Toolbar */}
          <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
            {/* Search by Name or Phone */}
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
              <input
                id="customer-folder-search"
                type="text"
                value={folderSearch}
                onChange={(e) => setFolderSearch(e.target.value)}
                placeholder={
                  language === 'en'
                    ? 'Search customer folders by name or phone...'
                    : 'نام یا فون نمبر سے گاہک فولڈر تلاش کریں...'
                }
                className="w-full ltr:pl-10 rtl:pr-10 ltr:pr-9 rtl:pl-9 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
              />
              {folderSearch && (
                <button
                  type="button"
                  onClick={() => setFolderSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Filter & Sort Controls */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              {/* Segmented Filter Controls */}
              <div className="grid grid-cols-4 sm:flex items-center p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 rounded-xl overflow-x-auto">
                {(
                  [
                    { id: 'all', labelEn: 'All', labelUr: 'سب' },
                    { id: 'receivable', labelEn: 'Receivable', labelUr: 'وصولی' },
                    { id: 'payable', labelEn: 'Advance', labelUr: 'ایڈوانس' },
                    { id: 'settled', labelEn: 'Settled', labelUr: 'بے باق' }
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => setFolderFilter(tab.id)}
                    className={`px-2 sm:px-3 py-1.5 text-[11px] sm:text-xs font-semibold rounded-lg transition-colors cursor-pointer whitespace-nowrap text-center ${
                      folderFilter === tab.id
                        ? 'bg-white dark:bg-zinc-800 text-slate-900 dark:text-white shadow-2xs'
                        : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                    }`}
                  >
                    {language === 'en' ? tab.labelEn : tab.labelUr}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                {/* Sort Selector */}
                <select
                  value={folderSort}
                  onChange={(e) => setFolderSort(e.target.value as any)}
                  aria-label="Sort customer folders"
                  className="flex-1 sm:flex-initial px-3 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs font-medium text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37] cursor-pointer"
                >
                  <option value="updated">{language === 'en' ? 'Sort: Recent Activity' : 'ترتیب: حالیہ سرگرمی'}</option>
                  <option value="balance">{language === 'en' ? 'Sort: Highest Balance' : 'ترتیب: زیادہ بقایا'}</option>
                  <option value="txCount">{language === 'en' ? 'Sort: Most Transactions' : 'ترتیب: زیادہ لین دین'}</option>
                  <option value="name">{language === 'en' ? 'Sort: Name (A–Z)' : 'ترتیب: نام'}</option>
                </select>

                {/* View Mode Toggle (Folder Cards vs Folder Rows) */}
                <div className="flex items-center p-1 bg-slate-100 dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 rounded-xl shrink-0">
                  <button
                    type="button"
                    onClick={() => setViewMode('grid')}
                    title={language === 'en' ? 'Folder Card Grid' : 'فولڈر کارڈز'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'grid'
                        ? 'bg-white dark:bg-zinc-800 text-[#0B192C] dark:text-[#D4AF37] shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    <LayoutGrid className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode('row')}
                    title={language === 'en' ? 'Folder List Rows' : 'فولڈر فہرست'}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                      viewMode === 'row'
                        ? 'bg-white dark:bg-zinc-800 text-[#0B192C] dark:text-[#D4AF37] shadow-2xs'
                        : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                    }`}
                  >
                    <List className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Customer Folders Rendering */}
          {filteredFolders.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-12 text-center">
              <div className="mx-auto h-12 w-12 rounded-2xl bg-slate-100 dark:bg-zinc-800 flex items-center justify-center text-slate-400 mb-3">
                <Folder className="h-6 w-6" />
              </div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                {customers.length === 0
                  ? language === 'en'
                    ? 'No Customer Folders Yet'
                    : 'ابھی کوئی گاہک فولڈر موجود نہیں'
                  : language === 'en'
                  ? 'No Matching Customer Folders'
                  : 'تلاش کے مطابق کوئی فولڈر نہیں ملا'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mb-5">
                {customers.length === 0
                  ? language === 'en'
                    ? 'Create your first customer folder to start recording credit (Udhaar) and payment transactions separately for each customer.'
                    : 'ہر گاہک کا الگ کھاتہ اور لین دین محفوظ کرنے کے لیے پہلا گاہک فولڈر بنائیں۔'
                  : language === 'en'
                  ? 'Try clearing your search query or switching the balance filter.'
                  : 'اپنی تلاش یا فلٹر تبدیل کر کے دوبارہ کوشش کریں۔'}
              </p>
              {customers.length === 0 ? (
                <button
                  type="button"
                  onClick={openAddCustomerModal}
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>{language === 'en' ? 'Create First Customer Folder' : 'پہلا گاہک فولڈر بنائیں'}</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    setFolderSearch('');
                    setFolderFilter('all');
                  }}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {language === 'en' ? 'Reset Filters' : 'فلٹر صاف کریں'}
                </button>
              )}
            </div>
          ) : viewMode === 'grid' ? (
            /* FOLDER GRID CARDS */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFolders.map((customer) => {
                const summary = customerFolderSummaries.get(customer.id) || {
                  txCount: 0,
                  totalCredit: 0,
                  totalDebit: 0,
                  lastTxDate: null
                };
                const isReceivable = customer.balance > 0;
                const isPayable = customer.balance < 0;

                return (
                  <div
                    key={customer.id}
                    id={`customer-folder-${customer.id}`}
                    onClick={() => onSelectCustomer(customer.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCustomer(customer.id);
                      }
                    }}
                    className="group relative bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 hover:border-[#0B192C]/50 dark:hover:border-[#D4AF37]/60 rounded-2xl p-5 transition-all duration-150 hover:shadow-md cursor-pointer flex flex-col justify-between focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B192C]"
                  >
                    {/* Top Folder Header & Quick Edit/Delete Actions */}
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-3.5">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="h-10 w-10 rounded-xl bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 border border-[#0B192C]/15 dark:border-[#D4AF37]/30 text-[#0B192C] dark:text-[#D4AF37] flex items-center justify-center shrink-0 group-hover:bg-[#0B192C] group-hover:text-[#D4AF37] transition-colors">
                            <Folder className="h-5 w-5" />
                          </div>
                          <div className="min-w-0">
                            <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-[#0B192C] dark:group-hover:text-[#D4AF37] transition-colors">
                              {customer.name}
                            </h3>
                            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{customer.phone}</span>
                            </p>
                          </div>
                        </div>

                        {/* Edit & Delete Buttons */}
                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => openEditCustomerModal(customer, e)}
                            title={language === 'en' ? 'Edit Customer' : 'گاہک میں ترمیم کریں'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {userRole !== 'Employee' && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomer(customer.id)}
                              title={language === 'en' ? 'Delete Customer Folder' : 'فولڈر حذف کریں'}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>

                      {/* Balance Display Block */}
                      <div className="py-3 px-3.5 rounded-xl bg-slate-50 dark:bg-zinc-950/70 border border-slate-100 dark:border-zinc-800/80 mb-3.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                            {language === 'en' ? 'Outstanding Balance' : 'موجودہ بقایا'}
                          </span>
                          <span className="text-[11px] font-medium text-slate-500 dark:text-zinc-400">
                            {customer.balance === 0
                              ? language === 'en'
                                ? 'Settled'
                                : 'بے باق'
                              : isReceivable
                              ? language === 'en'
                                ? 'Receivable (Udhaar)'
                                : 'واجب الوصول'
                              : language === 'en'
                              ? 'Advance / Payable'
                              : 'ایڈوانس'}
                          </span>
                        </div>
                        <div
                          className={`mt-1 text-lg font-extrabold font-mono tabular-nums ${
                            customer.balance === 0
                              ? 'text-slate-600 dark:text-zinc-400'
                              : isReceivable
                              ? 'text-amber-600 dark:text-amber-400'
                              : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                        >
                          PKR {Math.abs(customer.balance).toLocaleString()}
                        </div>
                      </div>
                    </div>

                    {/* Bottom Metadata & Open Folder CTA */}
                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {summary.txCount}{' '}
                          {language === 'en'
                            ? summary.txCount === 1
                              ? 'transaction'
                              : 'transactions'
                            : 'لین دین'}
                        </span>
                      </div>

                      <span className="font-semibold text-[#0B192C] dark:text-[#D4AF37] group-hover:underline flex items-center gap-1">
                        <span>{language === 'en' ? 'Open Folder' : 'فولڈر کھولیں'}</span>
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            /* FOLDER ROW LIST VIEW (Mobile Cards < md, Table md+) */
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-xs">
              {/* Mobile Compact Folder Rows */}
              <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800/70">
                {filteredFolders.map((customer) => {
                  const summary = customerFolderSummaries.get(customer.id) || {
                    txCount: 0,
                    totalCredit: 0,
                    totalDebit: 0,
                    lastTxDate: null
                  };
                  const isReceivable = customer.balance > 0;
                  return (
                    <div
                      key={`mob-row-${customer.id}`}
                      onClick={() => onSelectCustomer(customer.id)}
                      className="p-3.5 hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer flex flex-col gap-2"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="h-8 w-8 rounded-lg bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 text-[#0B192C] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                            <Folder className="h-4 w-4" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{customer.name}</p>
                            <p className="text-xs font-mono text-slate-500 dark:text-zinc-400 truncate">{customer.phone}</p>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <span
                            className={`text-sm font-extrabold font-mono tabular-nums ${
                              customer.balance === 0
                                ? 'text-slate-400'
                                : isReceivable
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-emerald-600 dark:text-emerald-400'
                            }`}
                          >
                            PKR {Math.abs(customer.balance).toLocaleString()}
                          </span>
                          <span className="block text-[10px] text-slate-400">
                            {customer.balance === 0
                              ? language === 'en'
                                ? 'Settled'
                                : 'بے باق'
                              : isReceivable
                              ? language === 'en'
                                ? 'Receivable'
                                : 'وصولی'
                              : language === 'en'
                              ? 'Advance'
                              : 'ایڈوانس'}
                          </span>
                        </div>
                      </div>

                      <div
                        className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-zinc-800/60"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <span className="text-[11px] font-mono text-slate-400">
                          {summary.txCount} {language === 'en' ? 'txs' : 'لین دین'}
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectCustomer(customer.id)}
                            className="px-2.5 py-1 rounded-lg bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 text-[#0B192C] dark:text-[#D4AF37] text-xs font-semibold cursor-pointer"
                          >
                            {language === 'en' ? 'Open' : 'کھولیں'}
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openEditCustomerModal(customer, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          {userRole !== 'Employee' && (
                            <button
                              type="button"
                              onClick={() => onDeleteCustomer(customer.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop / Tablet Table */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/70 dark:bg-zinc-950/50 text-slate-500 dark:text-zinc-400 text-[11px] font-semibold">
                      <th className="py-3 px-4">{language === 'en' ? 'Customer Folder' : 'گاہک فولڈر'}</th>
                      <th className="py-3 px-4">{language === 'en' ? 'Phone Number' : 'فون نمبر'}</th>
                      <th className="py-3 px-4 text-right">{language === 'en' ? 'Transactions' : 'کل لین دین'}</th>
                      <th className="py-3 px-4 text-right">{language === 'en' ? 'Outstanding Balance' : 'موجودہ بقایا'}</th>
                      <th className="py-3 px-4 text-right">{language === 'en' ? 'Actions' : 'عمل'}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70 text-sm">
                    {filteredFolders.map((customer) => {
                      const summary = customerFolderSummaries.get(customer.id) || {
                        txCount: 0,
                        totalCredit: 0,
                        totalDebit: 0,
                        lastTxDate: null
                      };
                      const isReceivable = customer.balance > 0;
                      return (
                        <tr
                          key={customer.id}
                          onClick={() => onSelectCustomer(customer.id)}
                          className="hover:bg-slate-50/80 dark:hover:bg-zinc-800/40 transition-colors cursor-pointer"
                        >
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-3">
                              <div className="h-8 w-8 rounded-lg bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 text-[#0B192C] dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                                <Folder className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-semibold text-slate-900 dark:text-white">{customer.name}</p>
                                {customer.email && (
                                  <p className="text-xs text-slate-400 truncate max-w-[200px]">{customer.email}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-3.5 px-4 font-mono tabular-nums text-xs text-slate-600 dark:text-zinc-300">
                            {customer.phone}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums text-xs text-slate-600 dark:text-zinc-300">
                            {summary.txCount}
                          </td>
                          <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold">
                            <span
                              className={
                                customer.balance === 0
                                  ? 'text-slate-400'
                                  : isReceivable
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }
                            >
                              PKR {Math.abs(customer.balance).toLocaleString()}
                            </span>
                            <span className="block text-[10px] font-sans font-normal text-slate-400">
                              {customer.balance === 0
                                ? language === 'en'
                                  ? 'Settled'
                                  : 'بے باق'
                                : isReceivable
                                ? language === 'en'
                                  ? 'Receivable'
                                  : 'وصولی'
                                : language === 'en'
                                ? 'Advance'
                                : 'ایڈوانس'}
                            </span>
                          </td>
                          <td
                            className="py-3.5 px-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center justify-end gap-1.5">
                              <button
                                type="button"
                                onClick={() => onSelectCustomer(customer.id)}
                                className="px-2.5 py-1.5 rounded-lg bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 text-[#0B192C] dark:text-[#D4AF37] hover:bg-[#0B192C]/10 text-xs font-semibold transition-colors cursor-pointer"
                              >
                                {language === 'en' ? 'Open' : 'کھولیں'}
                              </button>
                              <button
                                type="button"
                                onClick={(e) => openEditCustomerModal(customer, e)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                title={language === 'en' ? 'Edit Customer' : 'ترمیم'}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              {userRole !== 'Employee' && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteCustomer(customer.id)}
                                  className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                  title={language === 'en' ? 'Delete Customer' : 'حذف'}
                                >
                                  <Trash2 className="h-3.5 w-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: OPEN CUSTOMER FOLDER DETAIL PAGE & DEDICATED LEDGER           */
        /* ===================================================================== */
        <div className="space-y-5">
          {/* Top Breadcrumb & Customer Folder Header Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-xs space-y-4 sm:space-y-5">
            {/* Back Navigation & Folder Actions */}
            <div className="flex flex-wrap items-center justify-between gap-2.5 pb-3.5 border-b border-slate-100 dark:border-zinc-800">
              <button
                id="back-to-folders-btn"
                type="button"
                onClick={() => {
                  onSelectCustomer(null);
                  setTxSearch('');
                  setTxTypeFilter('all');
                  setDateFrom('');
                  setDateTo('');
                }}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 dark:text-zinc-300 hover:text-[#0B192C] dark:hover:text-[#D4AF37] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{language === 'en' ? 'Back to All Folders' : 'واپس تمام فولڈرز پر'}</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => openEditCustomerModal(selectedCustomer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{language === 'en' ? 'Edit Profile' : 'پروفائل ترمیم'}</span>
                </button>

                {userRole !== 'Employee' && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomer(selectedCustomer.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200/80 dark:border-red-950 text-xs font-semibold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{language === 'en' ? 'Delete Folder' : 'فولڈر حذف کریں'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customer Profile Identity + Primary Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-3 min-w-0">
                <div className="h-11 w-11 sm:h-12 sm:w-12 rounded-2xl bg-[#0B192C] text-[#D4AF37] border border-[#D4AF37]/40 flex items-center justify-center shadow-xs shrink-0">
                  <FolderOpen className="h-5 w-5 sm:h-6 sm:w-6" />
                </div>
                <div className="min-w-0 flex-1">
                  <h2 className="text-base sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight break-words">
                    {selectedCustomer.name}
                  </h2>
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-500 dark:text-zinc-400 mt-1">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      {selectedCustomer.phone}
                    </span>
                    {selectedCustomer.email && (
                      <span className="inline-flex items-center gap-1 truncate max-w-[220px]">
                        <Mail className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{selectedCustomer.email}</span>
                      </span>
                    )}
                    <span className="text-[11px] text-slate-400">
                      {language === 'en' ? 'Updated' : 'اپ ڈیٹ'}{' '}
                      {new Date(selectedCustomer.updatedAt).toLocaleDateString(
                        language === 'en' ? 'en-US' : 'ur-PK',
                        { month: 'short', day: 'numeric', year: 'numeric' }
                      )}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Inside Folder: Credit, Payment, WhatsApp Statement, SMS */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  id="folder-give-credit-btn"
                  type="button"
                  onClick={() => openAddTransactionModal('credit')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                  <span className="truncate">{language === 'en' ? 'Add Credit' : 'ادھار لکھیں'}</span>
                </button>

                <button
                  id="folder-receive-payment-btn"
                  type="button"
                  onClick={() => openAddTransactionModal('debit')}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowDownLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">{language === 'en' ? 'Record Payment' : 'وصولی لکھیں'}</span>
                </button>

                <button
                  id="folder-whatsapp-statement-btn"
                  type="button"
                  onClick={() => setIsStatementModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/80 text-emerald-800 dark:text-emerald-300 text-xs font-semibold transition-colors cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{language === 'en' ? 'WhatsApp Statement' : 'واٹس ایپ اسٹیٹمنٹ'}</span>
                </button>

                <a
                  id="folder-sms-btn"
                  href={getCustomerSmsUrl(selectedCustomer)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2.5 min-h-[42px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold transition-colors"
                >
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{language === 'en' ? 'SMS Reminder' : 'ایس ایم ایس'}</span>
                </a>
              </div>
            </div>

            {/* 4 Financial Summary KPIs for this Customer Folder */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              {/* Total Credit */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800/80">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                  {language === 'en' ? 'Total Credit (Given)' : 'کل ادھار (Credit)'}
                </span>
                <span className="mt-1 block text-base sm:text-xl font-extrabold font-mono tabular-nums text-amber-600 dark:text-amber-400 break-words">
                  PKR {(selectedCustomerSummary?.totalCredit || 0).toLocaleString()}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {language === 'en' ? 'Charged to customer' : 'گاہک کو دیا گیا ادھار'}
                </span>
              </div>

              {/* Total Debit / Payments */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800/80">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                  {language === 'en' ? 'Total Debit (Received)' : 'کل وصولی (Payments)'}
                </span>
                <span className="mt-1 block text-base sm:text-xl font-extrabold font-mono tabular-nums text-emerald-600 dark:text-emerald-400 break-words">
                  PKR {(selectedCustomerSummary?.totalDebit || 0).toLocaleString()}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {language === 'en' ? 'Payments received' : 'گاہک سے وصول شدہ رقم'}
                </span>
              </div>

              {/* Current Outstanding Balance */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800/80">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                  {language === 'en' ? 'Outstanding Balance' : 'موجودہ بقایا بیلنس'}
                </span>
                <span
                  className={`mt-1 block text-base sm:text-xl font-extrabold font-mono tabular-nums break-words ${
                    selectedCustomer.balance === 0
                      ? 'text-slate-700 dark:text-zinc-300'
                      : selectedCustomer.balance > 0
                      ? 'text-amber-600 dark:text-amber-400'
                      : 'text-emerald-600 dark:text-emerald-400'
                  }`}
                >
                  PKR {Math.abs(selectedCustomer.balance).toLocaleString()}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {selectedCustomer.balance === 0
                    ? language === 'en'
                      ? 'Account settled'
                      : 'کھاتہ بے باق ہے'
                    : selectedCustomer.balance > 0
                    ? language === 'en'
                      ? 'Customer owes you'
                      : 'گاہک سے لینے ہیں'
                    : language === 'en'
                    ? 'Customer advance credit'
                    : 'گاہک کی ایڈوانس رقم'}
                </span>
              </div>

              {/* Total Transactions */}
              <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/60 dark:border-zinc-800/80">
                <span className="text-xs font-medium text-slate-500 dark:text-zinc-400 block">
                  {language === 'en' ? 'Total Transactions' : 'کل لین دین کی تعداد'}
                </span>
                <span className="mt-1 block text-base sm:text-xl font-extrabold font-mono tabular-nums text-slate-900 dark:text-white">
                  {selectedCustomerSummary?.txCount || 0}
                </span>
                <span className="mt-0.5 block text-[11px] text-slate-400">
                  {language === 'en' ? 'Entries in this folder' : 'اس فولڈر میں موجود ریکارڈز'}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Transaction History Section */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                  {language === 'en'
                    ? `${selectedCustomer.name}'s Transaction History`
                    : `${selectedCustomer.name} کا لین دین ریکارڈ`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {language === 'en'
                    ? 'Showing only transactions linked to this customer folder.'
                    : 'صرف اس گاہک کے فولڈر سے منسلک لین دین کی تفصیل۔'}
                </p>
              </div>

              {/* Sort Order Toggle (Newest First vs Oldest First) */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTxSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-emerald-600" />
                  <span>
                    {txSortOrder === 'newest'
                      ? language === 'en'
                        ? 'Sorted: Newest First (View Older First)'
                        : 'ترتیب: نئے پہلے (پرانے پہلے دیکھیں)'
                      : language === 'en'
                      ? 'Sorted: Oldest First (View Newest First)'
                      : 'ترتیب: پرانے پہلے (نئے پہلے دیکھیں)'}
                  </span>
                </button>
              </div>
            </div>

            {/* Search & Date Filter Bar inside Folder */}
            {selectedCustomerEnrichedTxs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                {/* Search note / amount */}
                <div className="relative md:col-span-5">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'Search notes, description, or amount...'
                        : 'تفصیل یا رقم تلاش کریں...'
                    }
                    className="w-full ltr:pl-9 rtl:pr-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  />
                </div>

                {/* Type filter */}
                <div className="md:col-span-3">
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950 text-xs text-slate-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-emerald-600"
                  >
                    <option value="all">{language === 'en' ? 'All Types (Credit & Payment)' : 'تمام اقسام'}</option>
                    <option value="credit">{language === 'en' ? 'Credit Only (Udhaar Given)' : 'صرف ادھار (Credit)'}</option>
                    <option value="debit">{language === 'en' ? 'Payments Only (Received)' : 'صرف وصولی (Payment)'}</option>
                  </select>
                </div>

                {/* Date From & To */}
                <div className="md:col-span-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      title={language === 'en' ? 'From Date' : 'اس تاریخ سے'}
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950 text-xs font-mono text-slate-700 dark:text-zinc-300 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 shrink-0">–</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      title={language === 'en' ? 'To Date' : 'اس تاریخ تک'}
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50/60 dark:bg-zinc-950 text-xs font-mono text-slate-700 dark:text-zinc-300 focus:outline-none"
                    />
                  </div>
                  {(txSearch || txTypeFilter !== 'all' || dateFrom || dateTo) && (
                    <button
                      type="button"
                      onClick={() => {
                        setTxSearch('');
                        setTxTypeFilter('all');
                        setDateFrom('');
                        setDateTo('');
                      }}
                      title={language === 'en' ? 'Clear filters' : 'فلٹر صاف کریں'}
                      className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer shrink-0 flex items-center justify-center gap-1 text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                      <span className="sm:hidden">{language === 'en' ? 'Clear' : 'صاف کریں'}</span>
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Empty Folder State vs Populated Ledger Table / Mobile Cards */}
            {selectedCustomerEnrichedTxs.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-[#0B192C]/5 dark:bg-[#D4AF37]/15 text-[#0B192C] dark:text-[#D4AF37] flex items-center justify-center mb-3">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white mb-1">
                  {language === 'en' ? 'No transactions yet' : 'ابھی کوئی لین دین موجود نہیں'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mb-5">
                  {language === 'en'
                    ? `This folder for ${selectedCustomer.name} is currently empty. Add your first credit or payment entry to start tracking their balance.`
                    : `${selectedCustomer.name} کے فولڈر میں ابھی کوئی اندراج نہیں ہے۔ پہلا لین دین شامل کریں۔`}
                </p>
                <div className="flex items-center justify-center gap-2.5 flex-wrap">
                  <button
                    type="button"
                    onClick={() => openAddTransactionModal('credit')}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    <span>{language === 'en' ? 'Add Transaction' : 'نیا لین دین شامل کریں'}</span>
                  </button>
                </div>
              </div>
            ) : displayedCustomerTxs.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                {language === 'en'
                  ? 'No transactions match the selected date or search filters.'
                  : 'منتخب کردہ فلٹر کے مطابق کوئی لین دین نہیں ملا۔'}
              </div>
            ) : (
              <>
                {/* MOBILE TRANSACTION CARDS (< md) */}
                <div className="md:hidden space-y-2.5">
                  {displayedCustomerTxs.slice(0, visibleTxLimit).map((tx) => {
                    const { dateStr, timeStr } = formatTxDateTime(tx);
                    const isCredit = tx.type === 'credit';
                    return (
                      <div
                        key={`mob-${tx.id}`}
                        className="p-3.5 rounded-xl border border-slate-200/80 dark:border-zinc-800 bg-slate-50/40 dark:bg-zinc-950/50 space-y-2.5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-bold ${
                                isCredit
                                  ? 'text-amber-700 dark:text-amber-400'
                                  : 'text-emerald-700 dark:text-emerald-400'
                              }`}
                            >
                              {isCredit ? (
                                <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                              ) : (
                                <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />
                              )}
                              <span>
                                {isCredit
                                  ? language === 'en'
                                    ? 'Credit (Udhaar)'
                                    : 'ادھار (Credit)'
                                  : language === 'en'
                                  ? 'Payment Received'
                                  : 'وصولی (Payment)'}
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5 text-[11px] font-mono text-slate-400 mt-0.5">
                              <span>{dateStr}</span>
                              {timeStr && (
                                <>
                                  <span>•</span>
                                  <span>{timeStr}</span>
                                </>
                              )}
                            </div>
                          </div>

                          <div className="text-right">
                            <div
                              className={`text-sm font-extrabold font-mono tabular-nums ${
                                isCredit
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isCredit ? '+' : '-'} PKR {tx.amount.toLocaleString()}
                            </div>
                            <div className="text-[11px] font-mono text-slate-500 dark:text-zinc-400 mt-0.5">
                              {language === 'en' ? 'Bal:' : 'بقایا:'} PKR {tx.runningBalance.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-200/60 dark:border-zinc-800/80">
                          <p className="text-xs text-slate-600 dark:text-zinc-300 break-words flex-1">
                            {tx.description || (
                              <span className="text-slate-400 italic">
                                {language === 'en' ? 'No note added' : 'کوئی تفصیل نہیں'}
                              </span>
                            )}
                          </p>
                          {userRole !== 'Employee' && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditTransactionModal(tx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-200/60 dark:hover:bg-zinc-800 cursor-pointer"
                                title={language === 'en' ? 'Edit' : 'ترمیم'}
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                                title={language === 'en' ? 'Delete' : 'حذف'}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* DESKTOP & TABLET TRANSACTION TABLE (md+) */}
                <div className="hidden md:block overflow-x-auto border border-slate-100 dark:border-zinc-800/80 rounded-xl">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 text-slate-500 dark:text-zinc-400 text-[11px] font-semibold">
                        <th className="py-3 px-4">{language === 'en' ? 'Date & Time' : 'تاریخ اور وقت'}</th>
                        <th className="py-3 px-4">{language === 'en' ? 'Type' : 'قسم'}</th>
                        <th className="py-3 px-4">{language === 'en' ? 'Description / Note' : 'تفصیل / نوٹ'}</th>
                        <th className="py-3 px-4 text-right">{language === 'en' ? 'Amount (PKR)' : 'رقم (PKR)'}</th>
                        <th className="py-3 px-4 text-right">{language === 'en' ? 'Updated Balance' : 'بقایا بیلنس'}</th>
                        <th className="py-3 px-4 text-right">{language === 'en' ? 'Actions' : 'عمل'}</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-zinc-800/70 text-xs sm:text-sm">
                      {displayedCustomerTxs.slice(0, visibleTxLimit).map((tx) => {
                        const { dateStr, timeStr } = formatTxDateTime(tx);
                        const isCredit = tx.type === 'credit';

                        return (
                          <tr
                            key={tx.id}
                            className="hover:bg-slate-50/60 dark:hover:bg-zinc-800/30 transition-colors"
                          >
                            {/* Date & Time */}
                            <td className="py-3.5 px-4 font-mono tabular-nums whitespace-nowrap">
                              <div className="font-semibold text-slate-800 dark:text-zinc-200">{dateStr}</div>
                              <div className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                                <Clock className="h-3 w-3" />
                                <span>{timeStr || (language === 'en' ? 'Recorded' : 'درج شدہ')}</span>
                              </div>
                            </td>

                            {/* Transaction Type: Credit or Payment */}
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div
                                className={`inline-flex items-center gap-1.5 font-semibold text-xs ${
                                  isCredit
                                    ? 'text-amber-700 dark:text-amber-400'
                                    : 'text-emerald-700 dark:text-emerald-400'
                                }`}
                              >
                                {isCredit ? (
                                  <ArrowUpRight className="h-3.5 w-3.5 shrink-0" />
                                ) : (
                                  <ArrowDownLeft className="h-3.5 w-3.5 shrink-0" />
                                )}
                                <span>
                                  {isCredit
                                    ? language === 'en'
                                      ? 'Credit (Udhaar)'
                                      : 'ادھار (Credit)'
                                    : language === 'en'
                                    ? 'Payment Received'
                                    : 'وصولی (Payment)'}
                                </span>
                              </div>
                            </td>

                            {/* Description or Note */}
                            <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 max-w-xs">
                              {tx.description ? (
                                <span>{tx.description}</span>
                              ) : (
                                <span className="text-slate-400 italic">
                                  {language === 'en' ? 'No note added' : 'کوئی تفصیل نہیں'}
                                </span>
                              )}
                            </td>

                            {/* Transaction Amount in PKR */}
                            <td
                              className={`py-3.5 px-4 text-right font-mono tabular-nums font-bold whitespace-nowrap ${
                                isCredit
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                              }`}
                            >
                              {isCredit ? '+' : '-'} PKR {tx.amount.toLocaleString()}
                            </td>

                            {/* Updated Outstanding Balance */}
                            <td className="py-3.5 px-4 text-right font-mono tabular-nums font-semibold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                              PKR {tx.runningBalance.toLocaleString()}
                            </td>

                            {/* Edit & Delete Actions */}
                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {userRole !== 'Employee' ? (
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditTransactionModal(tx)}
                                    title={language === 'en' ? 'Edit Transaction' : 'لین دین میں ترمیم کریں'}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTransaction(tx.id)}
                                    title={language === 'en' ? 'Delete Transaction' : 'لین دین حذف کریں'}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                                  >
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <span className="text-[11px] text-slate-400">—</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Option to View Older / More Transactions */}
                {displayedCustomerTxs.length > visibleTxLimit && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleTxLimit((prev) => prev + 25)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                    >
                      {language === 'en'
                        ? `View Older Transactions (${displayedCustomerTxs.length - visibleTxLimit} more)`
                        : `مزید پرانے لین دین دیکھیں (${displayedCustomerTxs.length - visibleTxLimit})`}
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD NEW CUSTOMER FOLDER                                      */}
      {/* ===================================================================== */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsAddCustomerOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-4 pr-6">
              <div className="h-9 w-9 rounded-xl bg-[#0B192C] text-[#D4AF37] flex items-center justify-center shrink-0">
                <Folder className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? 'New Customer Folder' : 'نیا گاہک فولڈر بنائیں'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {language === 'en'
                    ? 'Create an isolated account ledger for this customer.'
                    : 'اس گاہک کے لیے الگ کھاتہ فولڈر بنائیں۔'}
                </p>
              </div>
            </div>

            <form onSubmit={handleSaveNewCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.customerName} *
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  placeholder={language === 'en' ? 'e.g. Tariq Mahmood' : 'گاہک کا نام'}
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.phone} *
                </label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  placeholder="+92 300 1234567"
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  placeholder="customer@example.com"
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.initialBalance} (PKR)
                </label>
                <input
                  type="number"
                  value={custInitialBalance}
                  onChange={(e) => setCustInitialBalance(e.target.value)}
                  placeholder="0"
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
                <span className="block text-[11px] text-slate-400 mt-1">
                  {language === 'en'
                    ? 'Positive if customer owes you (Receivable), negative if advance received.'
                    : 'مثبت اگر ادھار لینا ہے، منفی اگر ایڈوانس وصول ہوا ہے۔'}
                </span>
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsAddCustomerOpen(false)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCustomer ? (language === 'en' ? 'Creating...' : 'بن رہا ہے...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 2: EDIT CUSTOMER PROFILE                                        */}
      {/* ===================================================================== */}
      {editingCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setEditingCustomer(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 pr-6">
              {language === 'en' ? 'Edit Customer Folder' : 'گاہک فولڈر میں ترمیم کریں'}
            </h3>

            <form onSubmit={handleSaveEditCustomer} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.customerName} *
                </label>
                <input
                  type="text"
                  required
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.phone} *
                </label>
                <input
                  type="text"
                  required
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.email}
                </label>
                <input
                  type="email"
                  value={custEmail}
                  onChange={(e) => setCustEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingCustomer(null)}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingCustomer}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingCustomer ? (language === 'en' ? 'Saving...' : 'محفوظ ہو رہا ہے...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 3: ADD OR EDIT TRANSACTION INSIDE CUSTOMER FOLDER               */}
      {/* ===================================================================== */}
      {(isAddTxOpen || editingTx) && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => {
                setIsAddTxOpen(false);
                setEditingTx(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1 pr-6">
              {editingTx
                ? language === 'en'
                  ? 'Edit Transaction'
                  : 'لین دین میں ترمیم کریں'
                : language === 'en'
                ? 'New Folder Transaction'
                : 'نیا لین دین شامل کریں'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
              {language === 'en' ? 'Customer Folder:' : 'گاہک فولڈر:'}{' '}
              <span className="font-semibold text-slate-800 dark:text-zinc-200">{selectedCustomer.name}</span>
            </p>

            <form
              onSubmit={editingTx ? handleSaveEditTransaction : handleSaveNewTransaction}
              className="space-y-4"
            >
              {/* Transaction Type Selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-2">
                  {language === 'en' ? 'Transaction Type' : 'لین دین کی قسم'}
                </label>
                <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => setTxType('credit')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                      txType === 'credit'
                        ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 border-amber-400 ring-2 ring-amber-500/50 font-bold'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <ArrowUpRight className="h-5 w-5 mb-1 text-amber-600" />
                    <span className="text-xs">{language === 'en' ? 'Credit (Udhaar)' : 'ادھار دیا (Credit)'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxType('debit')}
                    className={`p-3 rounded-xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                      txType === 'debit'
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300 border-emerald-400 ring-2 ring-emerald-500/50 font-bold'
                        : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                    }`}
                  >
                    <ArrowDownLeft className="h-5 w-5 mb-1 text-emerald-600" />
                    <span className="text-xs">{language === 'en' ? 'Payment Received' : 'وصولی ہوئی (Payment)'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.amount} (PKR) *
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    step="any"
                    value={txAmount}
                    onChange={(e) => setTxAmount(e.target.value)}
                    placeholder="0"
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.date} *
                  </label>
                  <input
                    type="date"
                    required
                    value={txDate}
                    onChange={(e) => setTxDate(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-zinc-300 mb-1">
                  {t.description}
                </label>
                <input
                  type="text"
                  value={txDesc}
                  onChange={(e) => setTxDesc(e.target.value)}
                  placeholder={
                    language === 'en'
                      ? 'Item details, invoice reference, or payment note...'
                      : 'سامان کی تفصیل یا ادائیگی کا نوٹ...'
                  }
                  className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0B192C] dark:focus:ring-[#D4AF37]"
                />
              </div>

              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTxOpen(false);
                    setEditingTx(null);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingTx}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#0B192C] hover:bg-[#132847] dark:bg-[#D4AF37] dark:hover:bg-[#C5A028] text-white dark:text-[#0B192C] text-xs font-semibold cursor-pointer disabled:opacity-50"
                >
                  {isSubmittingTx ? (language === 'en' ? 'Saving...' : 'محفوظ ہو رہا ہے...') : t.save}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 4: WHATSAPP STATEMENT & REMINDER MODAL FOR THIS CUSTOMER ONLY   */}
      {/* ===================================================================== */}
      {isStatementModalOpen && selectedCustomer && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4">
          <div className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative">
            <button
              type="button"
              onClick={() => setIsStatementModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2.5 mb-3 pr-6">
              <div className="h-9 w-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <MessageSquare className="h-5 w-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'en' ? 'Customer WhatsApp Statement' : 'گاہک واٹس ایپ اسٹیٹمنٹ'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {language === 'en'
                    ? `Generated exclusively from ${selectedCustomer.name}'s folder records.`
                    : `صرف ${selectedCustomer.name} کے کھاتہ ریکارڈ سے تیار کردہ۔`}
                </p>
              </div>
            </div>

            <div className="p-3.5 sm:p-4 rounded-xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 font-mono text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed mb-4 break-words">
              {buildCustomerWhatsAppStatement(selectedCustomer)}
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
              <button
                type="button"
                onClick={handleCopyStatement}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                {copiedStatement ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                <span>
                  {copiedStatement
                    ? language === 'en'
                      ? 'Copied!'
                      : 'کاپی ہو گیا!'
                    : language === 'en'
                    ? 'Copy Statement Text'
                    : 'تحریر کاپی کریں'}
                </span>
              </button>

              <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="w-full sm:w-auto px-3.5 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-semibold text-slate-600 dark:text-zinc-400 cursor-pointer"
                >
                  {t.cancel}
                </button>
                <a
                  href={getCustomerWhatsAppUrl(selectedCustomer)}
                  target="_blank"
                  rel="noreferrer"
                  onClick={() => setIsStatementModalOpen(false)}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
                >
                  <MessageSquare className="h-4 w-4" />
                  <span>{language === 'en' ? 'Send via WhatsApp' : 'واٹس ایپ پر بھیجیں'}</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
