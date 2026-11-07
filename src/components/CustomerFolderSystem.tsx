import React, { useState, useMemo } from 'react';
import {
  FolderOpen,
  Search,
  Plus,
  UserPlus,
  Edit3,
  Trash2,
  ArrowLeft,
  ArrowUpRight,
  ArrowDownLeft,
  Phone,
  Mail,
  Clock,
  MessageSquare,
  Send,
  LayoutGrid,
  List,
  X,
  FileText,
  Filter,
  ArrowUpDown,
  Copy,
  Check,
  Share2,
  Download,
  CalendarClock,
  BellRing,
  CheckSquare,
  Square,
  AlertTriangle,
  CheckCircle2,
  ExternalLink
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Customer, Transaction, UserRole } from '../types';
import { Language } from '../translations';
import { BRAND, PartyAvatar } from '../brand';
import CustomerAccountReportModal from './CustomerAccountReportModal';
import VoiceDescriptionField, { TransactionDescriptionView } from './VoiceTransactionInput';
import {
  computeCustomerStatementData,
  generateCustomerStatementPdf,
  buildConciseReportSummaryText
} from '../utils/customerReportPdf';

export type AccountPaymentStatus = 'paid' | 'overdue' | 'partial' | 'pending' | 'advance';

interface CustomerFolderSystemProps {
  customers: Customer[];
  transactions: Transaction[];
  language: Language;
  businessName: string;
  userRole: UserRole;
  selectedCustomerId: string | null;
  onSelectCustomer: (customerId: string | null) => void;
  onCreateCustomer: (payload: {
    name: string;
    phone: string;
    email: string;
    initialBalance: string;
    promisedPaymentDate?: string;
    promisedPaymentNote?: string;
  }) => Promise<void>;
  onUpdateCustomer: (
    id: string,
    payload: {
      name: string;
      phone: string;
      email: string;
      promisedPaymentDate?: string;
      promisedPaymentNote?: string;
      lastReminderOpenedAt?: string;
    }
  ) => Promise<void>;
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
  hideBalance?: boolean;
  t: Record<string, string>;
}

interface EnrichedTransaction extends Transaction {
  runningBalance: number;
  originalIndex: number;
}

type FolderFilterType =
  | 'all'
  | 'receivable'
  | 'payable'
  | 'settled'
  | 'overdue'
  | 'partial'
  | 'pending'
  | 'promisedDue';

type BulkDispatchStatus = 'ready' | 'missing_phone' | 'whatsapp_opened' | 'pdf_downloaded';

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
  hideBalance = false,
  t
}: CustomerFolderSystemProps) {
  const todayIso = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Folder List View States
  const [folderSearch, setFolderSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState<FolderFilterType>('all');
  const [folderSort, setFolderSort] = useState<'updated' | 'name' | 'balance' | 'txCount' | 'promised'>('updated');
  const [viewMode, setViewMode] = useState<'grid' | 'row'>('row');
  const [showFilterBar, setShowFilterBar] = useState(false);

  // Bulk Selection & Bulk WhatsApp Dispatcher States
  const [selectedBulkIds, setSelectedBulkIds] = useState<string[]>([]);
  const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
  const [bulkDispatchMap, setBulkDispatchMap] = useState<Record<string, BulkDispatchStatus>>({});
  const [bulkCopiedAll, setBulkCopiedAll] = useState(false);

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
  const [reportCustomer, setReportCustomer] = useState<Customer | null>(null);

  // Promised Payment Date Quick Modal / Editor State
  const [promisedModalCustomer, setPromisedModalCustomer] = useState<Customer | null>(null);
  const [promisedDateInput, setPromisedDateInput] = useState('');
  const [promisedNoteInput, setPromisedNoteInput] = useState('');
  const [isSavingPromised, setIsSavingPromised] = useState(false);

  // Customer Form State
  const [custName, setCustName] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custEmail, setCustEmail] = useState('');
  const [custInitialBalance, setCustInitialBalance] = useState('');
  const [custPromisedDate, setCustPromisedDate] = useState('');
  const [custPromisedNote, setCustPromisedNote] = useState('');
  const [isSubmittingCustomer, setIsSubmittingCustomer] = useState(false);

  // Transaction Form State
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txAmount, setTxAmount] = useState('');
  const [txDate, setTxDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [txDesc, setTxDesc] = useState('');
  const [isSubmittingTx, setIsSubmittingTx] = useState(false);

  // Map customerId -> strictly that customer's transactions
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

  // Compute summary stats & payment status per customer folder
  const customerFolderSummaries = useMemo(() => {
    const summaryMap = new Map<
      string,
      {
        txCount: number;
        totalCredit: number;
        totalDebit: number;
        lastTxDate: string | null;
        status: AccountPaymentStatus;
        isPromisedDueOrOverdue: boolean;
        isPromisedDueToday: boolean;
        isPromisedOverdue: boolean;
      }
    >();

    const nowMs = Date.now();

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

      const rawActivity = lastTxDate || c.updatedAt;
      const activityMs = rawActivity ? new Date(rawActivity).getTime() : nowMs;
      const daysSinceActivity = !isNaN(activityMs)
        ? Math.floor((nowMs - activityMs) / (1000 * 60 * 60 * 24))
        : 0;

      const promisedDate = (c.promisedPaymentDate || '').trim();
      const isPromisedDueToday = c.balance > 0 && Boolean(promisedDate) && promisedDate === todayIso;
      const isPromisedOverdue = c.balance > 0 && Boolean(promisedDate) && promisedDate < todayIso;
      const isPromisedDueOrOverdue = isPromisedDueToday || isPromisedOverdue;

      let status: AccountPaymentStatus = 'paid';
      if (c.balance === 0) {
        status = 'paid';
      } else if (c.balance < 0) {
        status = 'advance';
      } else if (isPromisedOverdue || daysSinceActivity >= 30) {
        status = 'overdue';
      } else if (totalDebit > 0) {
        status = 'partial';
      } else {
        status = 'pending';
      }

      summaryMap.set(c.id, {
        txCount: custTxs.length,
        totalCredit,
        totalDebit,
        lastTxDate,
        status,
        isPromisedDueOrOverdue,
        isPromisedDueToday,
        isPromisedOverdue
      });
    }

    return summaryMap;
  }, [customers, transactionsByCustomerId, todayIso]);

  // Customers whose promised payment date is Due Today or Overdue (Automatic Reminder Workflow)
  const promisedDueCustomers = useMemo(() => {
    return customers
      .filter((c) => {
        const sum = customerFolderSummaries.get(c.id);
        return Boolean(sum?.isPromisedDueOrOverdue);
      })
      .sort((a, b) => (a.promisedPaymentDate || '').localeCompare(b.promisedPaymentDate || ''));
  }, [customers, customerFolderSummaries]);

  // Render Account Status Badge
  const renderAccountStatusBadge = (customer: Customer) => {
    const sum = customerFolderSummaries.get(customer.id);
    const status = sum?.status || 'paid';

    if (status === 'paid') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/50 dark:text-emerald-400 dark:border-emerald-900/60">
          <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
          <span>{language === 'en' ? 'Paid / Settled' : 'بے باق'}</span>
        </span>
      );
    }
    if (status === 'overdue') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/60">
          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          <span>{language === 'en' ? 'Overdue' : 'مدت ختم'}</span>
        </span>
      );
    }
    if (status === 'partial') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-amber-50 text-amber-800 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900/60">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          <span>{language === 'en' ? 'Partially Paid' : 'جزوی وصولی'}</span>
        </span>
      );
    }
    if (status === 'pending') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200 dark:bg-zinc-800 dark:text-zinc-300 dark:border-zinc-700">
          <Clock className="h-2.5 w-2.5 shrink-0" />
          <span>{language === 'en' ? 'Pending' : 'واجب الادا'}</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase tracking-wider bg-teal-50 text-teal-800 border border-teal-200/80 dark:bg-teal-950/50 dark:text-teal-300 dark:border-teal-900/60">
        <span>{language === 'en' ? 'Advance' : 'ایڈوانس'}</span>
      </span>
    );
  };

  // Format relative timestamp
  const formatPartyTimestamp = (customer: Customer) => {
    const summary = customerFolderSummaries.get(customer.id);
    const rawStamp = summary?.lastTxDate || customer.updatedAt;
    if (!rawStamp) return language === 'en' ? 'Today • Active' : 'آج • فعال';

    const parsed = new Date(rawStamp);
    if (isNaN(parsed.getTime())) {
      return rawStamp;
    }

    const now = new Date();
    const isToday =
      parsed.getDate() === now.getDate() &&
      parsed.getMonth() === now.getMonth() &&
      parsed.getFullYear() === now.getFullYear();

    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday =
      parsed.getDate() === yesterday.getDate() &&
      parsed.getMonth() === yesterday.getMonth() &&
      parsed.getFullYear() === yesterday.getFullYear();

    const timePart = parsed.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });

    if (isToday) {
      return `${language === 'en' ? 'Today' : 'آج'} • ${timePart}`;
    }
    if (isYesterday) {
      return `${language === 'en' ? 'Yesterday' : 'کل'} • ${timePart}`;
    }

    const datePart = parsed.toLocaleDateString(language === 'en' ? 'en-US' : 'ur-PK', {
      month: 'short',
      day: 'numeric'
    });
    return `${datePart} • ${timePart}`;
  };

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

      const sum = customerFolderSummaries.get(c.id);
      if (folderFilter === 'receivable' && c.balance <= 0) return false;
      if (folderFilter === 'payable' && c.balance >= 0) return false;
      if (folderFilter === 'settled' && c.balance !== 0) return false;
      if (folderFilter === 'overdue' && sum?.status !== 'overdue') return false;
      if (folderFilter === 'partial' && sum?.status !== 'partial') return false;
      if (folderFilter === 'pending' && sum?.status !== 'pending') return false;
      if (folderFilter === 'promisedDue' && !sum?.isPromisedDueOrOverdue) return false;

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
      if (folderSort === 'promised') {
        const pA = a.promisedPaymentDate || '9999-12-31';
        const pB = b.promisedPaymentDate || '9999-12-31';
        return pA.localeCompare(pB);
      }
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

    const indexed = rawTxs.map((tx, idx) => ({ tx, originalIndex: idx }));

    indexed.sort((a, b) => {
      const dateCmp = (a.tx.date || '').localeCompare(b.tx.date || '');
      if (dateCmp !== 0) return dateCmp;

      if (a.tx.createdAt && b.tx.createdAt) {
        const timeCmp = a.tx.createdAt.localeCompare(b.tx.createdAt);
        if (timeCmp !== 0) return timeCmp;
      }

      return b.originalIndex - a.originalIndex;
    });

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

  // Build customer-specific WhatsApp Statement / Reminder message (works for any customer in the list)
  const buildCustomerWhatsAppStatement = (customer: Customer) => {
    const summary = customerFolderSummaries.get(customer.id) || {
      txCount: 0,
      totalCredit: 0,
      totalDebit: 0,
      lastTxDate: null
    };
    const custRawTxs = transactionsByCustomerId.get(customer.id) || [];
    const recentTxs = [...custRawTxs]
      .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
      .slice(0, 5);
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

      const promisedLine = customer.promisedPaymentDate
        ? `وعدہ ادائیگی کی تاریخ: ${customer.promisedPaymentDate}${
            customer.promisedPaymentNote ? ` (${customer.promisedPaymentNote})` : ''
          }\n`
        : '';

      return (
        `*${shopTitle} - کھاتہ اسٹیٹمنٹ*\n` +
        `محترم *${customer.name}* صاحب،\n\n` +
        `آپ کے کھاتہ کی تفصیل درج ذیل ہے:\n` +
        `کل ادھار (Credit): Rs ${summary.totalCredit.toLocaleString()}\n` +
        `کل وصولی (Paid): Rs ${summary.totalDebit.toLocaleString()}\n` +
        `*موجودہ بقایا (Balance): Rs ${customer.balance.toLocaleString()}*\n` +
        promisedLine +
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

    const promisedLine = customer.promisedPaymentDate
      ? `• Promised Payment Date: ${customer.promisedPaymentDate}${
          customer.promisedPaymentNote ? ` (${customer.promisedPaymentNote})` : ''
        }\n`
      : '';

    const txLines =
      recentTxs.length > 0
        ? recentTxs
            .map(
              (tx) =>
                `• ${tx.date}: ${tx.type === 'credit' ? 'Credit' : 'Payment'} PKR ${tx.amount.toLocaleString()}${
                  tx.description ? ` - ${tx.description}` : ''
                }`
            )
            .join('\n')
        : '• No transactions recorded yet';

    return (
      `*${shopTitle} — Account Statement*\n` +
      `Customer: *${customer.name}* (${customer.phone || 'No Phone'})\n\n` +
      `*Account Summary:*\n` +
      `• Total Credit (Charged): PKR ${summary.totalCredit.toLocaleString()}\n` +
      `• Total Payments Received: PKR ${summary.totalDebit.toLocaleString()}\n` +
      `• *Current Outstanding Balance: ${balanceStatus}*\n` +
      promisedLine +
      `• Total Transactions: ${summary.txCount}\n\n` +
      `*Recent Ledger Activity:*\n${txLines}\n\n` +
      `Thank you for your business!`
    );
  };

  const getCustomerWhatsAppUrl = (customer: Customer) => {
    const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
    const text = buildCustomerWhatsAppStatement(customer);
    return cleanPhone
      ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(text)}`
      : `https://wa.me/?text=${encodeURIComponent(text)}`;
  };

  const getCustomerSmsUrl = (customer: Customer) => {
    const isApple =
      typeof navigator !== 'undefined' && /iPhone|iPad|iPod|Macintosh/i.test(navigator.userAgent);
    const queryChar = isApple ? '&' : '?';
    const cleanPhone = (customer.phone || '').trim().replace(/[\s-]/g, '');
    const summary = customerFolderSummaries.get(customer.id) || {
      txCount: 0,
      totalCredit: 0,
      totalDebit: 0
    };
    const shopTitle = businessName || BRAND.name;
    const promisedPart = customer.promisedPaymentDate
      ? language === 'ur'
        ? ` وعدہ تاریخ: ${customer.promisedPaymentDate}۔`
        : ` Promised date: ${customer.promisedPaymentDate}.`
      : '';
    const message =
      language === 'ur'
        ? `محترم ${customer.name}، ${shopTitle} کھاتہ: کل ادھار Rs ${summary.totalCredit.toLocaleString()}، وصولی Rs ${summary.totalDebit.toLocaleString()}، موجودہ بقایا Rs ${customer.balance.toLocaleString()}۔${promisedPart} شکریہ!`
        : `Dear ${customer.name}, ${shopTitle} statement: Total Credit PKR ${summary.totalCredit.toLocaleString()}, Paid PKR ${summary.totalDebit.toLocaleString()}, Outstanding Balance PKR ${customer.balance.toLocaleString()}.${promisedPart} Thank you!`;
    return `sms:${cleanPhone}${queryChar}body=${encodeURIComponent(message)}`;
  };

  // =========================================================================
  // BULK SELECTION & BULK WHATSAPP DISPATCH HANDLERS
  // =========================================================================
  const toggleCustomerSelection = (customerId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedBulkIds((prev) =>
      prev.includes(customerId) ? prev.filter((id) => id !== customerId) : [...prev, customerId]
    );
  };

  const toggleSelectAllFiltered = () => {
    const visibleIds = filteredFolders.map((c) => c.id);
    const allSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedBulkIds.includes(id));
    if (allSelected) {
      setSelectedBulkIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedBulkIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const selectedBulkCustomers = useMemo(() => {
    return customers.filter((c) => selectedBulkIds.includes(c.id));
  }, [customers, selectedBulkIds]);

  const openBulkDispatcherModal = () => {
    const initialMap: Record<string, BulkDispatchStatus> = {};
    selectedBulkCustomers.forEach((c) => {
      const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
      initialMap[c.id] = cleanPhone ? 'ready' : 'missing_phone';
    });
    setBulkDispatchMap(initialMap);
    setIsBulkModalOpen(true);
  };

  const handleBulkOpenWhatsAppForCustomer = async (customer: Customer, downloadPdfFirst: boolean) => {
    if (downloadPdfFirst) {
      try {
        const statement = computeCustomerStatementData({
          customer,
          allTransactions: transactions,
          businessName: businessName || BRAND.displayName
        });
        const { blob, fileName } = generateCustomerStatementPdf(statement);
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 5000);
      } catch (err) {
        console.error('Bulk PDF download error:', err);
      }
    }

    const waUrl = getCustomerWhatsAppUrl(customer);
    window.open(waUrl, '_blank', 'noopener,noreferrer');

    const nowStamp = new Date().toISOString();
    setBulkDispatchMap((prev) => ({
      ...prev,
      [customer.id]: downloadPdfFirst ? 'pdf_downloaded' : 'whatsapp_opened'
    }));

    // Persist honest reminder timestamp on customer record
    try {
      await onUpdateCustomer(customer.id, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        promisedPaymentDate: customer.promisedPaymentDate || '',
        promisedPaymentNote: customer.promisedPaymentNote || '',
        lastReminderOpenedAt: nowStamp
      });
    } catch {
      // Non-fatal
    }
  };

  const handleCopyAllBulkStatements = async () => {
    const combinedText = selectedBulkCustomers
      .map((c) => buildCustomerWhatsAppStatement(c))
      .join('\n\n────────────────────────\n\n');
    try {
      await navigator.clipboard.writeText(combinedText);
      setBulkCopiedAll(true);
      setTimeout(() => setBulkCopiedAll(false), 2500);
    } catch {
      // ignore
    }
  };

  // =========================================================================
  // PROMISED PAYMENT DATE & AUTOMATIC REMINDER HANDLERS
  // =========================================================================
  const openPromisedDateModal = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setPromisedModalCustomer(customer);
    setPromisedDateInput(customer.promisedPaymentDate || '');
    setPromisedNoteInput(customer.promisedPaymentNote || '');
  };

  const handleSavePromisedDate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!promisedModalCustomer) return;
    setIsSavingPromised(true);
    try {
      await onUpdateCustomer(promisedModalCustomer.id, {
        name: promisedModalCustomer.name,
        phone: promisedModalCustomer.phone,
        email: promisedModalCustomer.email || '',
        promisedPaymentDate: promisedDateInput,
        promisedPaymentNote: promisedNoteInput.trim(),
        lastReminderOpenedAt: promisedModalCustomer.lastReminderOpenedAt || ''
      });
      setPromisedModalCustomer(null);
    } finally {
      setIsSavingPromised(false);
    }
  };

  const handleTriggerPromisedReminder = async (customer: Customer, channel: 'whatsapp' | 'sms') => {
    const nowIso = new Date().toISOString();
    if (channel === 'whatsapp') {
      window.open(getCustomerWhatsAppUrl(customer), '_blank', 'noopener,noreferrer');
    } else {
      window.location.href = getCustomerSmsUrl(customer);
    }
    try {
      await onUpdateCustomer(customer.id, {
        name: customer.name,
        phone: customer.phone,
        email: customer.email || '',
        promisedPaymentDate: customer.promisedPaymentDate || '',
        promisedPaymentNote: customer.promisedPaymentNote || '',
        lastReminderOpenedAt: nowIso
      });
    } catch {
      // ignore
    }
  };

  // Handlers for Customer Create / Edit
  const openAddCustomerModal = () => {
    setCustName('');
    setCustPhone('');
    setCustEmail('');
    setCustInitialBalance('');
    setCustPromisedDate('');
    setCustPromisedNote('');
    setIsAddCustomerOpen(true);
  };

  const openEditCustomerModal = (customer: Customer, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCustName(customer.name);
    setCustPhone(customer.phone);
    setCustEmail(customer.email || '');
    setCustPromisedDate(customer.promisedPaymentDate || '');
    setCustPromisedNote(customer.promisedPaymentNote || '');
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
        initialBalance: custInitialBalance,
        promisedPaymentDate: custPromisedDate,
        promisedPaymentNote: custPromisedNote.trim()
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
        email: custEmail.trim(),
        promisedPaymentDate: custPromisedDate,
        promisedPaymentNote: custPromisedNote.trim(),
        lastReminderOpenedAt: editingCustomer.lastReminderOpenedAt || ''
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

  const selectedCustomerSummary = selectedCustomer
    ? customerFolderSummaries.get(selectedCustomer.id) || {
        txCount: 0,
        totalCredit: 0,
        totalDebit: 0,
        lastTxDate: null,
        status: 'paid' as AccountPaymentStatus,
        isPromisedDueOrOverdue: false,
        isPromisedDueToday: false,
        isPromisedOverdue: false
      }
    : null;

  const allFilteredSelected =
    filteredFolders.length > 0 && filteredFolders.every((c) => selectedBulkIds.includes(c.id));

  return (
    <div className="space-y-4 pb-16">
      {/* ===================================================================== */}
      {/* VIEW 1: CUSTOMER FOLDERS DIRECTORY                                    */}
      {/* ===================================================================== */}
      {!selectedCustomer ? (
        <>
          {/* AUTOMATIC PROMISED PAYMENT DUE REMINDER WORKFLOW BANNER */}
          <AnimatePresence>
            {promisedDueCustomers.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-amber-50/90 dark:bg-amber-950/30 border border-amber-300/80 dark:border-amber-800/70 rounded-2xl p-4 shadow-2xs space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <div className="h-9 w-9 rounded-xl bg-[#D4AF37]/25 text-amber-900 dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                      <BellRing className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-xs sm:text-sm font-extrabold text-amber-950 dark:text-amber-200 flex items-center gap-2">
                        <span>
                          {language === 'en'
                            ? 'Promised Payment Due Reminders'
                            : 'وعدہ ادائیگی کی یاد دہانی (آج واجب الادا)'}
                        </span>
                        <span className="px-2 py-0.5 rounded-md bg-amber-200/80 dark:bg-amber-900 text-amber-950 dark:text-amber-200 font-mono text-[11px]">
                          {promisedDueCustomers.length}
                        </span>
                      </h3>
                      <p className="text-[11px] text-amber-800/90 dark:text-amber-300/80">
                        {language === 'en'
                          ? 'These accounts have reached or passed their promised payment date. Dispatch a verified WhatsApp or SMS reminder below.'
                          : 'ان گاہکوں کی وعدہ کردہ تاریخ آ چکی ہے یا گزر چکی ہے۔ ایک کلک میں واٹس ایپ یا ایس ایم ایس یاد دہانی بھیجیں۔'}
                      </p>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const ids = promisedDueCustomers.map((c) => c.id);
                      setSelectedBulkIds(ids);
                      const initialMap: Record<string, BulkDispatchStatus> = {};
                      promisedDueCustomers.forEach((c) => {
                        const cleanPhone = (c.phone || '').replace(/[^0-9]/g, '');
                        initialMap[c.id] = cleanPhone ? 'ready' : 'missing_phone';
                      });
                      setBulkDispatchMap(initialMap);
                      setIsBulkModalOpen(true);
                    }}
                    className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl bg-meezan-btn text-white text-xs font-extrabold shadow-2xs cursor-pointer shrink-0"
                  >
                    <MessageSquare className="h-3.5 w-3.5" />
                    <span>
                      {language === 'en'
                        ? `Bulk Dispatch (${promisedDueCustomers.length})`
                        : `اجتماعی واٹس ایپ (${promisedDueCustomers.length})`}
                    </span>
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-1">
                  {promisedDueCustomers.slice(0, 4).map((cust) => {
                    const isOverdue = (cust.promisedPaymentDate || '') < todayIso;
                    return (
                      <div
                        key={`due-${cust.id}`}
                        className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-amber-200/80 dark:border-zinc-800 flex items-center justify-between gap-3"
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-extrabold text-slate-900 dark:text-white truncate">
                              {cust.name}
                            </span>
                            <span
                              className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md ${
                                isOverdue
                                  ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300'
                                  : 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              }`}
                            >
                              {isOverdue
                                ? language === 'en'
                                  ? `Due ${cust.promisedPaymentDate}`
                                  : `تاریخ: ${cust.promisedPaymentDate}`
                                : language === 'en'
                                ? 'Due Today'
                                : 'آج وعدہ ہے'}
                            </span>
                          </div>
                          <div className="text-[11px] font-mono font-bold text-receivable-maroon mt-0.5">
                            Rs {cust.balance.toLocaleString()}
                            {cust.promisedPaymentNote && (
                              <span className="font-sans font-normal text-slate-500 dark:text-zinc-400">
                                {' '}
                                • {cust.promisedPaymentNote}
                              </span>
                            )}
                          </div>
                          {cust.lastReminderOpenedAt && (
                            <div className="text-[10px] text-emerald-700 dark:text-emerald-400 mt-0.5">
                              {language === 'en'
                                ? `Last opened in app: ${new Date(cust.lastReminderOpenedAt).toLocaleDateString()}`
                                : 'یاد دہانی کھولی گئی'}
                            </div>
                          )}
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleTriggerPromisedReminder(cust, 'whatsapp')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#16A34A] hover:bg-[#15803D] text-white text-[11px] font-extrabold cursor-pointer"
                            title="Open WhatsApp Reminder"
                          >
                            <MessageSquare className="h-3 w-3" />
                            <span>WA</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleTriggerPromisedReminder(cust, 'sms')}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-slate-700 dark:text-zinc-200 text-[11px] font-extrabold cursor-pointer"
                            title="Open SMS Reminder"
                          >
                            <Send className="h-3 w-3" />
                            <span>SMS</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search Bar + Select All + Filter & PDF Action Icons Row */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Bulk Select All Checkbox Button */}
              {filteredFolders.length > 0 && (
                <button
                  type="button"
                  onClick={toggleSelectAllFiltered}
                  title={
                    allFilteredSelected
                      ? language === 'en'
                        ? 'Deselect all visible customers'
                        : 'سب ختم کریں'
                      : language === 'en'
                      ? 'Select all visible customers for bulk WhatsApp statement'
                      : 'اجتماعی واٹس ایپ کے لیے سب منتخب کریں'
                  }
                  className={`min-h-[44px] px-3 rounded-xl border flex items-center gap-2 text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                    allFilteredSelected || selectedBulkIds.length > 0
                      ? 'bg-emerald-50 dark:bg-emerald-950/50 border-[#059669] text-[#064E3B] dark:text-emerald-300'
                      : 'bg-white dark:bg-zinc-900 border-slate-300 dark:border-zinc-700 text-slate-600 dark:text-zinc-300 hover:bg-slate-50'
                  }`}
                >
                  {allFilteredSelected ? (
                    <CheckSquare className="h-4 w-4 text-[#059669]" />
                  ) : (
                    <Square className="h-4 w-4 text-slate-400" />
                  )}
                  <span className="hidden sm:inline">
                    {selectedBulkIds.length > 0
                      ? `${selectedBulkIds.length} ${language === 'en' ? 'Selected' : 'منتخب'}`
                      : language === 'en'
                      ? 'Select'
                      : 'منتخب کریں'}
                  </span>
                </button>
              )}

              {/* Search Input */}
              <div className="relative flex-1 min-w-0">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-slate-400 pointer-events-none" />
                <input
                  id="customer-folder-search"
                  type="text"
                  value={folderSearch}
                  onChange={(e) => setFolderSearch(e.target.value)}
                  placeholder={
                    language === 'en'
                      ? `Search ${customers.length} Customer Accounts...`
                      : `${customers.length} گاہک کھاتے تلاش کریں...`
                  }
                  className="w-full ltr:pl-11 rtl:pr-11 ltr:pr-9 rtl:pl-9 py-2.5 min-h-[44px] rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-sm font-bold text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-zinc-500 focus:outline-none focus:ring-2 focus:ring-[#059669] shadow-2xs"
                />
                {folderSearch && (
                  <button
                    type="button"
                    onClick={() => setFolderSearch('')}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Funnel Icon Button */}
              <button
                type="button"
                onClick={() => setShowFilterBar((prev) => !prev)}
                title={language === 'en' ? 'Filter & Sort Customers' : 'فلٹر اور ترتیب'}
                className={`min-h-[44px] min-w-[44px] rounded-xl border flex items-center justify-center transition-colors cursor-pointer ${
                  showFilterBar || folderFilter !== 'all'
                    ? 'bg-emerald-50 dark:bg-emerald-950/50 text-[#059669] border-[#059669]'
                    : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 hover:bg-slate-100 dark:hover:bg-zinc-800 text-[#059669]'
                }`}
              >
                <Filter className="h-4.5 w-4.5 stroke-[2.2]" />
              </button>

              {/* View Mode Toggle (List Rows vs Folder Grid) */}
              <div className="hidden sm:flex items-center p-1 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-xl shrink-0">
                <button
                  type="button"
                  onClick={() => setViewMode('row')}
                  title={language === 'en' ? 'Party List View' : 'فہرست'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'row'
                      ? 'bg-[#064E3B] text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <List className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('grid')}
                  title={language === 'en' ? 'Folder Card Grid' : 'فولڈر کارڈز'}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    viewMode === 'grid'
                      ? 'bg-[#064E3B] text-white shadow-2xs'
                      : 'text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200'
                  }`}
                >
                  <LayoutGrid className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* BULK SELECTION ACTION TOOLBAR */}
            <AnimatePresence>
              {selectedBulkIds.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="bg-meezan-header text-white rounded-2xl p-3.5 sm:px-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <span className="inline-flex items-center justify-center h-7 px-2.5 rounded-lg bg-[#D4AF37] text-[#042F24] font-mono font-extrabold text-xs">
                      {selectedBulkIds.length}
                    </span>
                    <div>
                      <div className="text-xs sm:text-sm font-extrabold">
                        {language === 'en'
                          ? `${selectedBulkIds.length} Customer Account(s) Selected`
                          : `${selectedBulkIds.length} گاہک کھاتے منتخب ہیں`}
                      </div>
                      <div className="text-[11px] text-emerald-100/90 font-mono">
                        {language === 'en' ? 'Combined Receivable:' : 'مجموعی بقایا:'} Rs{' '}
                        {selectedBulkCustomers
                          .reduce((acc, c) => acc + (c.balance > 0 ? c.balance : 0), 0)
                          .toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setSelectedBulkIds([])}
                      className="px-3 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-colors cursor-pointer"
                    >
                      {language === 'en' ? 'Clear Selection' : 'ختم کریں'}
                    </button>
                    <button
                      id="open-bulk-whatsapp-modal-btn"
                      type="button"
                      onClick={openBulkDispatcherModal}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#D4AF37] hover:bg-[#C5A028] text-[#042F24] text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                    >
                      <MessageSquare className="h-3.5 w-3.5" />
                      <span>
                        {language === 'en'
                          ? 'Bulk WhatsApp Statements'
                          : 'اجتماعی واٹس ایپ اسٹیٹمنٹ'}
                      </span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Status & Balance Filter Bar */}
            {(showFilterBar || folderFilter !== 'all') && (
              <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-2.5 p-3 bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl shadow-2xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'all', labelEn: 'All Accounts', labelUr: 'تمام' },
                      { id: 'receivable', labelEn: "You'll Get", labelUr: 'وصول طلب' },
                      { id: 'overdue', labelEn: 'Overdue', labelUr: 'مدت ختم' },
                      { id: 'partial', labelEn: 'Partially Paid', labelUr: 'جزوی وصولی' },
                      { id: 'pending', labelEn: 'Pending', labelUr: 'واجب الادا' },
                      { id: 'settled', labelEn: 'Paid / Settled', labelUr: 'بے باق' },
                      { id: 'promisedDue', labelEn: 'Promised Due', labelUr: 'آج وعدہ' },
                      { id: 'payable', labelEn: 'Advance', labelUr: 'ایڈوانس' }
                    ] as const
                  ).map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setFolderFilter(tab.id)}
                      className={`px-3 py-1.5 text-xs font-extrabold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                        folderFilter === tab.id
                          ? 'bg-[#064E3B] text-white shadow-2xs'
                          : 'bg-slate-100 dark:bg-zinc-800 text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      {language === 'en' ? tab.labelEn : tab.labelUr}
                    </button>
                  ))}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <select
                    value={folderSort}
                    onChange={(e) => setFolderSort(e.target.value as any)}
                    aria-label="Sort customer folders"
                    className="w-full lg:w-auto px-3 py-2 min-h-[38px] rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-200 focus:outline-none cursor-pointer"
                  >
                    <option value="updated">{language === 'en' ? 'Sort: Recent Activity' : 'ترتیب: حالیہ سرگرمی'}</option>
                    <option value="balance">{language === 'en' ? 'Sort: Highest Balance' : 'ترتیب: زیادہ بقایا'}</option>
                    <option value="promised">{language === 'en' ? 'Sort: Promised Payment Date' : 'ترتیب: وعدہ تاریخ'}</option>
                    <option value="txCount">{language === 'en' ? 'Sort: Most Transactions' : 'ترتیب: زیادہ لین دین'}</option>
                    <option value="name">{language === 'en' ? 'Sort: Name (A–Z)' : 'ترتیب: نام'}</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Customer List Rendering */}
          {filteredFolders.length === 0 ? (
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-12 text-center shadow-2xs">
              <div className="mx-auto h-14 w-14 rounded-2xl bg-emerald-50 dark:bg-zinc-800 flex items-center justify-center text-[#059669] mb-3">
                <UserPlus className="h-7 w-7" />
              </div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1">
                {customers.length === 0
                  ? language === 'en'
                    ? 'No Customers Added Yet'
                    : 'ابھی کوئی گاہک موجود نہیں'
                  : language === 'en'
                  ? 'No Matching Customers'
                  : 'تلاش کے مطابق کوئی گاہک نہیں ملا'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto">
                {customers.length === 0
                  ? language === 'en'
                    ? 'Tap "+ ADD CUSTOMER" below to create your first customer party ledger and track receivables and payables.'
                    : 'پہلا گاہک کھاتہ بنانے کے لیے نیچے نیا گاہک بٹن دبائیں۔'
                  : language === 'en'
                  ? 'Try clearing your search query or switching the status filter.'
                  : 'اپنی تلاش یا فلٹر تبدیل کر کے دوبارہ کوشش کریں۔'}
              </p>
              {customers.length > 0 && (
                <div className="mt-5">
                  <button
                    type="button"
                    onClick={() => {
                      setFolderSearch('');
                      setFolderFilter('all');
                    }}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                  >
                    {language === 'en' ? 'Reset Filters' : 'فلٹر صاف کریں'}
                  </button>
                </div>
              )}
            </div>
          ) : viewMode === 'row' ? (
            /* PARTY LIST ROWS WITH BULK CHECKBOX, STATUS BADGE & PROMISED DATE */
            <div className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-2xs divide-y divide-slate-200/80 dark:divide-zinc-800">
              {filteredFolders.map((customer, idx) => {
                const isReceivable = customer.balance > 0;
                const timestampLabel = formatPartyTimestamp(customer);
                const isSelected = selectedBulkIds.includes(customer.id);
                const sum = customerFolderSummaries.get(customer.id);

                return (
                  <motion.div
                    key={customer.id}
                    id={`customer-folder-${customer.id}`}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: Math.min(idx * 0.025, 0.25) }}
                    onClick={() => onSelectCustomer(customer.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCustomer(customer.id);
                      }
                    }}
                    className={`group px-4 py-3.5 sm:px-5 sm:py-4 transition-colors cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-emerald-50/60 dark:bg-emerald-950/30'
                        : 'bg-white dark:bg-zinc-900 hover:bg-emerald-50/30 dark:hover:bg-zinc-800/50'
                    }`}
                  >
                    {/* Left: Bulk Checkbox + Avatar + Customer Details */}
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <button
                        type="button"
                        onClick={(e) => toggleCustomerSelection(customer.id, e)}
                        aria-label={`Select ${customer.name}`}
                        className="p-1 rounded-md text-slate-400 hover:text-[#059669] focus:outline-none cursor-pointer shrink-0"
                      >
                        {isSelected ? (
                          <CheckSquare className="h-4.5 w-4.5 text-[#059669]" />
                        ) : (
                          <Square className="h-4.5 w-4.5" />
                        )}
                      </button>

                      <PartyAvatar name={customer.name} size="md" />

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="text-[15px] sm:text-base font-extrabold text-slate-900 dark:text-white truncate leading-snug">
                            {customer.name}
                          </h3>
                          {renderAccountStatusBadge(customer)}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                          <span className="text-xs text-outline-label">
                            {timestampLabel}
                          </span>
                          {customer.phone && (
                            <span className="hidden sm:inline-block text-[11px] font-mono text-slate-400 dark:text-zinc-500">
                              • {customer.phone}
                            </span>
                          )}
                          {customer.promisedPaymentDate && (
                            <span
                              className={`inline-flex items-center gap-1 text-[11px] font-mono font-bold px-2 py-0.5 rounded-md ${
                                sum?.isPromisedOverdue
                                  ? 'bg-red-50 text-red-700 dark:bg-red-950/50 dark:text-red-300'
                                  : sum?.isPromisedDueToday
                                  ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-300'
                                  : 'bg-emerald-50 text-[#064E3B] dark:bg-zinc-800 dark:text-emerald-300'
                              }`}
                            >
                              <CalendarClock className="h-3 w-3 shrink-0" />
                              <span>
                                {language === 'en' ? 'Promised:' : 'وعدہ:'} {customer.promisedPaymentDate}
                              </span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount + Quick Actions */}
                    <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                      <div className="text-right">
                        <div
                          className={`text-base sm:text-lg font-extrabold tabular-nums leading-tight ${
                            customer.balance === 0
                              ? 'text-slate-400 dark:text-zinc-500'
                              : isReceivable
                              ? 'text-receivable-maroon'
                              : 'text-payable-green'
                          }`}
                        >
                          {hideBalance
                            ? 'Rs •••••'
                            : `Rs ${Math.abs(customer.balance).toLocaleString()}`}
                        </div>
                        <span className="block text-[11px] sm:text-xs text-outline-label mt-0.5">
                          {customer.balance === 0
                            ? language === 'en'
                              ? 'Settled'
                              : 'بے باق'
                            : isReceivable
                            ? language === 'en'
                              ? "You'll Get"
                              : 'آپ لیں گے'
                            : language === 'en'
                            ? "You'll Give"
                            : 'آپ دیں گے'}
                        </span>
                      </div>

                      {/* Desktop hover quick actions */}
                      <div
                        className="hidden md:flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => openPromisedDateModal(customer, e)}
                          title={language === 'en' ? 'Set Promised Payment Date' : 'وعدہ تاریخ مقرر کریں'}
                          className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <CalendarClock className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setReportCustomer(customer)}
                          title={language === 'en' ? 'Share Full Report' : 'مکمل رپورٹ شیئر کریں'}
                          className="p-1.5 rounded-lg text-[#059669] hover:bg-emerald-50 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Share2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={(e) => openEditCustomerModal(customer, e)}
                          title={language === 'en' ? 'Edit Customer' : 'ترمیم'}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                        >
                          <Edit3 className="h-3.5 w-3.5" />
                        </button>
                        {userRole !== 'Employee' && (
                          <button
                            type="button"
                            onClick={() => onDeleteCustomer(customer.id)}
                            title={language === 'en' ? 'Delete Customer' : 'حذف'}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          ) : (
            /* FOLDER GRID CARDS VIEW */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredFolders.map((customer, idx) => {
                const summary = customerFolderSummaries.get(customer.id);
                const isReceivable = customer.balance > 0;
                const isSelected = selectedBulkIds.includes(customer.id);

                return (
                  <motion.div
                    key={customer.id}
                    id={`customer-folder-card-${customer.id}`}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.25, delay: Math.min(idx * 0.03, 0.3) }}
                    whileHover={{ y: -3 }}
                    onClick={() => onSelectCustomer(customer.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onSelectCustomer(customer.id);
                      }
                    }}
                    className={`group relative bg-white dark:bg-zinc-900 border rounded-2xl p-5 transition-all duration-150 hover:shadow-md cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-[#059669] ring-2 ring-[#059669]/20'
                        : 'border-slate-200/90 dark:border-zinc-800 hover:border-[#059669]/60'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <button
                            type="button"
                            onClick={(e) => toggleCustomerSelection(customer.id, e)}
                            className="p-1 rounded-md text-slate-400 hover:text-[#059669] cursor-pointer shrink-0"
                          >
                            {isSelected ? (
                              <CheckSquare className="h-4 w-4 text-[#059669]" />
                            ) : (
                              <Square className="h-4 w-4" />
                            )}
                          </button>
                          <PartyAvatar name={customer.name} size="md" />
                          <div className="min-w-0">
                            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                              {customer.name}
                            </h3>
                            <p className="text-xs font-mono tabular-nums text-slate-500 dark:text-zinc-400 flex items-center gap-1.5 mt-0.5 truncate">
                              <Phone className="h-3 w-3 shrink-0 text-slate-400" />
                              <span>{customer.phone}</span>
                            </p>
                          </div>
                        </div>

                        <div
                          className="flex items-center gap-1 shrink-0"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => openPromisedDateModal(customer, e)}
                            title={language === 'en' ? 'Set Promised Date' : 'وعدہ تاریخ'}
                            className="p-1.5 rounded-lg text-amber-600 hover:bg-amber-50 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            <CalendarClock className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setReportCustomer(customer)}
                            title={language === 'en' ? 'Share Full Report' : 'مکمل رپورٹ شیئر کریں'}
                            className="p-1.5 rounded-lg text-[#059669] hover:bg-emerald-50 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            <Share2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => openEditCustomerModal(customer, e)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>

                      <div className="mb-3 flex items-center justify-between gap-2 flex-wrap">
                        {renderAccountStatusBadge(customer)}
                        {customer.promisedPaymentDate && (
                          <span className="text-[11px] font-mono font-semibold text-amber-700 dark:text-amber-300 flex items-center gap-1">
                            <CalendarClock className="h-3 w-3" />
                            {customer.promisedPaymentDate}
                          </span>
                        )}
                      </div>

                      <div className="py-3 px-3.5 rounded-xl bg-[#FAF9F6] dark:bg-zinc-950/70 border border-slate-100 dark:border-zinc-800/80 mb-3.5 flex items-center justify-between">
                        <div>
                          <span className="text-xs text-outline-label block">
                            {customer.balance === 0
                              ? language === 'en'
                                ? 'Settled'
                                : 'بے باق'
                              : isReceivable
                              ? language === 'en'
                                ? "You'll Get"
                                : 'آپ لیں گے'
                              : language === 'en'
                              ? "You'll Give"
                              : 'آپ دیں گے'}
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {formatPartyTimestamp(customer)}
                          </span>
                        </div>
                        <div
                          className={`text-lg font-extrabold tabular-nums ${
                            customer.balance === 0
                              ? 'text-slate-500'
                              : isReceivable
                              ? 'text-receivable-maroon'
                              : 'text-payable-green'
                          }`}
                        >
                          {hideBalance
                            ? 'Rs •••••'
                            : `Rs ${Math.abs(customer.balance).toLocaleString()}`}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-slate-500 dark:text-zinc-400">
                      <div className="flex items-center gap-1.5 font-mono tabular-nums">
                        <FileText className="h-3.5 w-3.5 text-slate-400" />
                        <span>
                          {summary?.txCount || 0} {language === 'en' ? 'entries' : 'لین دین'}
                        </span>
                      </div>

                      <span className="font-extrabold text-[#059669] dark:text-[#D4AF37] group-hover:underline flex items-center gap-1">
                        <span>{language === 'en' ? 'Open Ledger' : 'کھاتہ کھولیں'}</span>
                        <span aria-hidden="true">→</span>
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* PROMINENT FLOATING EMERALD "+ ADD CUSTOMER" BUTTON */}
          <div className="fixed bottom-20 md:bottom-8 right-4 sm:right-8 z-30">
            <motion.button
              whileHover={{ y: -2, scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              id="add-customer-btn"
              type="button"
              onClick={openAddCustomerModal}
              className="flex items-center gap-2.5 px-6 py-3.5 min-h-[50px] rounded-2xl bg-meezan-btn text-white shadow-lg cursor-pointer"
            >
              <UserPlus className="h-5 w-5 text-[#D4AF37] stroke-[2.5]" />
              <span className="text-sm sm:text-base font-extrabold tracking-wide uppercase">
                {language === 'en' ? 'ADD CUSTOMER' : 'نیا گاہک'}
              </span>
            </motion.button>
          </div>
        </>
      ) : (
        /* ===================================================================== */
        /* VIEW 2: OPEN CUSTOMER FOLDER DETAIL PAGE & DEDICATED LEDGER           */
        /* ===================================================================== */
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="space-y-5"
        >
          {/* Top Breadcrumb & Customer Folder Header Card */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4 sm:space-y-5">
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
                className="inline-flex items-center gap-1.5 text-xs font-extrabold text-slate-700 dark:text-zinc-300 hover:text-[#059669] transition-colors cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4 shrink-0" />
                <span>{language === 'en' ? 'Back to Customers' : 'واپس تمام گاہک کھاتوں پر'}</span>
              </button>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => openPromisedDateModal(selectedCustomer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-xs font-extrabold text-amber-800 dark:text-amber-300 hover:bg-amber-100/70 transition-colors cursor-pointer"
                >
                  <CalendarClock className="h-3.5 w-3.5" />
                  <span>
                    {selectedCustomer.promisedPaymentDate
                      ? `${language === 'en' ? 'Promised:' : 'وعدہ:'} ${selectedCustomer.promisedPaymentDate}`
                      : language === 'en'
                      ? 'Set Promised Date'
                      : 'وعدہ تاریخ مقرر کریں'}
                  </span>
                </button>

                <button
                  id="header-share-full-report-btn"
                  type="button"
                  onClick={() => setReportCustomer(selectedCustomer)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-50 dark:bg-zinc-800 border border-[#059669]/40 text-xs font-extrabold text-[#064E3B] dark:text-emerald-400 hover:bg-emerald-100/70 transition-colors cursor-pointer"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>{language === 'en' ? 'Share Full Report' : 'مکمل رپورٹ شیئر کریں'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => openEditCustomerModal(selectedCustomer)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Edit3 className="h-3.5 w-3.5" />
                  <span>{language === 'en' ? 'Edit Profile' : 'پروفائل ترمیم'}</span>
                </button>

                {userRole !== 'Employee' && (
                  <button
                    type="button"
                    onClick={() => onDeleteCustomer(selectedCustomer.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200/80 dark:border-red-950 text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{language === 'en' ? 'Delete' : 'حذف کریں'}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Customer Profile Identity + Primary Action Buttons */}
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-3.5 min-w-0">
                <PartyAvatar name={selectedCustomer.name} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-white tracking-tight break-words">
                      {selectedCustomer.name}
                    </h2>
                    {renderAccountStatusBadge(selectedCustomer)}
                  </div>
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
                    <span className="text-xs text-outline-label">
                      {formatPartyTimestamp(selectedCustomer)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Action Buttons Inside Folder */}
              <div className="grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2 w-full lg:w-auto">
                <button
                  id="folder-give-credit-btn"
                  type="button"
                  onClick={() => openAddTransactionModal('credit')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#991B1B] hover:bg-[#7F1D1D] text-white text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                >
                  <ArrowUpRight className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {language === 'en' ? 'GAVE / CREDIT' : 'ادھار دیا'}
                  </span>
                </button>

                <button
                  id="folder-receive-payment-btn"
                  type="button"
                  onClick={() => openAddTransactionModal('debit')}
                  className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-meezan-btn text-white text-xs font-extrabold shadow-xs transition-colors cursor-pointer"
                >
                  <ArrowDownLeft className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {language === 'en' ? 'GOT / PAYMENT' : 'وصولی ہوئی'}
                  </span>
                </button>

                <button
                  id="share-full-report-btn"
                  type="button"
                  onClick={() => setReportCustomer(selectedCustomer)}
                  className="col-span-2 sm:col-span-1 inline-flex items-center justify-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-xl bg-[#042F24] hover:bg-[#064E3B] text-[#D4AF37] border border-[#D4AF37]/40 text-xs font-extrabold shadow-xs transition-all cursor-pointer"
                >
                  <Share2 className="h-4 w-4 shrink-0" />
                  <span className="truncate">
                    {language === 'en' ? 'Share Full Report' : 'مکمل رپورٹ شیئر کریں'}
                  </span>
                </button>

                <button
                  id="folder-whatsapp-statement-btn"
                  type="button"
                  onClick={() => setIsStatementModalOpen(true)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-emerald-200 dark:border-emerald-900 bg-emerald-50/70 dark:bg-emerald-950/40 hover:bg-emerald-100/80 text-emerald-800 dark:text-emerald-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{language === 'en' ? 'WhatsApp' : 'واٹس ایپ'}</span>
                </button>

                <a
                  id="folder-sms-btn"
                  href={getCustomerSmsUrl(selectedCustomer)}
                  className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 min-h-[44px] rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 hover:bg-slate-50 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-bold transition-colors"
                >
                  <Send className="h-3.5 w-3.5 shrink-0" />
                  <span className="truncate">{language === 'en' ? 'SMS' : 'ایس ایم ایس'}</span>
                </a>
              </div>
            </div>

            {/* 4 Financial Summary KPIs for this Customer Folder */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 pt-1">
              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F6] dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800/80">
                <span className="text-xs text-outline-label block">
                  {language === 'en' ? 'Total Credit (Given)' : 'کل ادھار (Credit)'}
                </span>
                <span className="mt-1 block text-base sm:text-xl font-extrabold tabular-nums text-receivable-maroon break-words">
                  Rs {(selectedCustomerSummary?.totalCredit || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F6] dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800/80">
                <span className="text-xs text-outline-label block">
                  {language === 'en' ? 'Total Received' : 'کل وصولی (Paid)'}
                </span>
                <span className="mt-1 block text-base sm:text-xl font-extrabold tabular-nums text-payable-green break-words">
                  Rs {(selectedCustomerSummary?.totalDebit || 0).toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F6] dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800/80">
                <span className="text-xs text-outline-label block">
                  {selectedCustomer.balance >= 0
                    ? language === 'en'
                      ? "You'll Get (Balance)"
                      : 'واجب الوصول بیلنس'
                    : language === 'en'
                    ? "You'll Give (Advance)"
                    : 'واجب الادا ایڈوانس'}
                </span>
                <span
                  className={`mt-1 block text-base sm:text-xl font-extrabold tabular-nums break-words ${
                    selectedCustomer.balance === 0
                      ? 'text-slate-600 dark:text-zinc-300'
                      : selectedCustomer.balance > 0
                      ? 'text-receivable-maroon'
                      : 'text-payable-green'
                  }`}
                >
                  Rs {Math.abs(selectedCustomer.balance).toLocaleString()}
                </span>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-[#FAF9F6] dark:bg-zinc-950/60 border border-slate-200/70 dark:border-zinc-800/80">
                <span className="text-xs text-outline-label block">
                  {language === 'en' ? 'Entries Count' : 'کل لین دین'}
                </span>
                <span className="mt-1 block text-base sm:text-xl font-extrabold tabular-nums text-slate-900 dark:text-white">
                  {selectedCustomerSummary?.txCount || 0}
                </span>
              </div>
            </div>
          </div>

          {/* Customer Transaction History Section */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 sm:p-5 shadow-2xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white">
                  {language === 'en'
                    ? `${selectedCustomer.name}'s Ledger Entries`
                    : `${selectedCustomer.name} کا لین دین ریکارڈ`}
                </h3>
                <p className="text-xs text-slate-500 dark:text-zinc-400">
                  {language === 'en'
                    ? 'Complete chronological transaction history and running balance.'
                    : 'اس گاہک کے کھاتہ سے منسلک تمام لین دین کی تفصیل۔'}
                </p>
              </div>

              {/* Sort Order Toggle */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setTxSortOrder((prev) => (prev === 'newest' ? 'oldest' : 'newest'))}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <ArrowUpDown className="h-3.5 w-3.5 text-[#059669]" />
                  <span>
                    {txSortOrder === 'newest'
                      ? language === 'en'
                        ? 'Newest First'
                        : 'نئے پہلے'
                      : language === 'en'
                      ? 'Oldest First'
                      : 'پرانے پہلے'}
                  </span>
                </button>
              </div>
            </div>

            {/* Search & Date Filter Bar inside Folder */}
            {selectedCustomerEnrichedTxs.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-12 gap-3 pt-1">
                <div className="relative md:col-span-5">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={txSearch}
                    onChange={(e) => setTxSearch(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'Search notes, description, or amount...'
                        : 'تفصیل یا رقم تلاش کریں...'
                    }
                    className="w-full ltr:pl-9 rtl:pr-9 pr-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-semibold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div className="md:col-span-3">
                  <select
                    value={txTypeFilter}
                    onChange={(e) => setTxTypeFilter(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-bold text-slate-700 dark:text-zinc-300 focus:outline-none"
                  >
                    <option value="all">{language === 'en' ? 'All Entries' : 'تمام اقسام'}</option>
                    <option value="credit">{language === 'en' ? "You'll Get (Credit)" : 'ادھار (Credit)'}</option>
                    <option value="debit">{language === 'en' ? "You'll Give / Received" : 'وصولی (Payment)'}</option>
                  </select>
                </div>

                <div className="md:col-span-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-mono text-slate-700 dark:text-zinc-300 focus:outline-none"
                    />
                    <span className="text-xs text-slate-400 shrink-0">–</span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="flex-1 min-w-0 px-2.5 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-xs font-mono text-slate-700 dark:text-zinc-300 focus:outline-none"
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
                      className="p-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-slate-400 hover:text-slate-700 cursor-pointer shrink-0 flex items-center justify-center gap-1 text-xs"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* Empty Folder State vs Populated Ledger */}
            {selectedCustomerEnrichedTxs.length === 0 ? (
              <div className="py-12 px-4 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-2xl">
                <div className="mx-auto h-12 w-12 rounded-2xl bg-emerald-50 dark:bg-zinc-800 text-[#059669] flex items-center justify-center mb-3">
                  <FolderOpen className="h-6 w-6" />
                </div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white mb-1">
                  {language === 'en' ? 'No transactions yet' : 'ابھی کوئی لین دین موجود نہیں'}
                </h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto mb-5">
                  {language === 'en'
                    ? `Add your first credit or payment entry for ${selectedCustomer.name}.`
                    : `${selectedCustomer.name} کے کھاتہ میں پہلا اندراج شامل کریں۔`}
                </p>
                <button
                  type="button"
                  onClick={() => openAddTransactionModal('credit')}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-extrabold shadow-md cursor-pointer"
                >
                  <Plus className="h-4 w-4" />
                  <span>
                    {language === 'en' ? 'ADD TRANSACTION' : 'نیا لین دین شامل کریں'}
                  </span>
                </button>
              </div>
            ) : displayedCustomerTxs.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                {language === 'en'
                  ? 'No transactions match the selected filters.'
                  : 'منتخب کردہ فلٹر کے مطابق کوئی لین دین نہیں ملا۔'}
              </div>
            ) : (
              <>
                {/* MOBILE TRANSACTION CARDS (< md) */}
                <div className="md:hidden divide-y divide-slate-100 dark:divide-zinc-800">
                  {displayedCustomerTxs.slice(0, visibleTxLimit).map((tx) => {
                    const { dateStr, timeStr } = formatTxDateTime(tx);
                    const isCredit = tx.type === 'credit';
                    return (
                      <div key={`mob-${tx.id}`} className="py-3.5 px-2 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span
                              className={`inline-flex items-center gap-1 text-xs font-extrabold ${
                                isCredit ? 'text-receivable-maroon' : 'text-payable-green'
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
                                    ? "You'll Get (Credit)"
                                    : 'ادھار (Credit)'
                                  : language === 'en'
                                  ? 'Payment Received'
                                  : 'وصولی (Payment)'}
                              </span>
                            </span>
                            <div className="flex items-center gap-1.5 text-xs text-outline-label mt-0.5">
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
                              className={`text-base font-extrabold tabular-nums ${
                                isCredit ? 'text-receivable-maroon' : 'text-payable-green'
                              }`}
                            >
                              Rs {tx.amount.toLocaleString()}
                            </div>
                            <div className="text-[11px] font-bold text-slate-500 dark:text-zinc-400 mt-0.5">
                              {language === 'en' ? 'Bal:' : 'بقایا:'} Rs {tx.runningBalance.toLocaleString()}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-1">
                          <div className="text-xs text-slate-600 dark:text-zinc-300 break-words flex-1">
                            <TransactionDescriptionView
                              description={tx.description}
                              language={language}
                            />
                          </div>
                          {userRole !== 'Employee' && (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => openEditTransactionModal(tx)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 cursor-pointer"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => onDeleteTransaction(tx.id)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 cursor-pointer"
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
                      <tr className="border-b border-slate-100 dark:border-zinc-800 bg-slate-50/80 dark:bg-zinc-950/60 text-slate-500 dark:text-zinc-400 text-[11px] font-extrabold uppercase">
                        <th className="py-3 px-4">{language === 'en' ? 'Date & Time' : 'تاریخ اور وقت'}</th>
                        <th className="py-3 px-4">{language === 'en' ? 'Type' : 'قسم'}</th>
                        <th className="py-3 px-4">{language === 'en' ? 'Description / Note' : 'تفصیل / نوٹ'}</th>
                        <th className="py-3 px-4 text-right">{language === 'en' ? 'Amount (Rs)' : 'رقم'}</th>
                        <th className="py-3 px-4 text-right">{language === 'en' ? 'Running Balance' : 'بقایا بیلنس'}</th>
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
                            className="hover:bg-emerald-50/25 dark:hover:bg-zinc-800/30 transition-colors"
                          >
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div className="font-bold text-slate-800 dark:text-zinc-200">{dateStr}</div>
                              <div className="text-xs text-outline-label flex items-center gap-1 mt-0.5">
                                <span>{timeStr || (language === 'en' ? 'Recorded' : 'درج شدہ')}</span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap">
                              <div
                                className={`inline-flex items-center gap-1.5 font-extrabold text-xs ${
                                  isCredit ? 'text-receivable-maroon' : 'text-payable-green'
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
                                      ? "You'll Get (Credit)"
                                      : 'ادھار (Credit)'
                                    : language === 'en'
                                    ? 'Payment Received'
                                    : 'وصولی (Payment)'}
                                </span>
                              </div>
                            </td>

                            <td className="py-3.5 px-4 text-slate-600 dark:text-zinc-300 max-w-xs">
                              <TransactionDescriptionView
                                description={tx.description}
                                language={language}
                              />
                            </td>

                            <td
                              className={`py-3.5 px-4 text-right tabular-nums font-extrabold whitespace-nowrap ${
                                isCredit ? 'text-receivable-maroon' : 'text-payable-green'
                              }`}
                            >
                              Rs {tx.amount.toLocaleString()}
                            </td>

                            <td className="py-3.5 px-4 text-right tabular-nums font-bold text-slate-800 dark:text-zinc-200 whitespace-nowrap">
                              Rs {tx.runningBalance.toLocaleString()}
                            </td>

                            <td className="py-3.5 px-4 text-right whitespace-nowrap">
                              {userRole !== 'Employee' ? (
                                <div className="inline-flex items-center justify-end gap-1">
                                  <button
                                    type="button"
                                    onClick={() => openEditTransactionModal(tx)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                                  >
                                    <Edit3 className="h-3.5 w-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => onDeleteTransaction(tx.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 cursor-pointer"
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

                {displayedCustomerTxs.length > visibleTxLimit && (
                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => setVisibleTxLimit((prev) => prev + 25)}
                      className="px-4 py-2 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
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
        </motion.div>
      )}

      {/* ===================================================================== */}
      {/* MODAL 1: ADD NEW CUSTOMER FOLDER                                      */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isAddCustomerOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 pr-6">
                <div className="h-10 w-10 rounded-2xl bg-meezan-header text-[#D4AF37] flex items-center justify-center shrink-0 shadow-xs">
                  <UserPlus className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {language === 'en' ? 'Add New Customer' : 'نیا گاہک شامل کریں'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {language === 'en'
                      ? 'Create a party ledger account for this customer.'
                      : 'اس گاہک کے لیے الگ کھاتہ بنائیں۔'}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSaveNewCustomer} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.customerName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    placeholder={language === 'en' ? 'e.g. Abdul Wahid' : 'گاہک کا نام'}
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.phone} *
                  </label>
                  <input
                    type="text"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    placeholder="+92 300 1234567"
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    placeholder="customer@example.com"
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                      {t.initialBalance} (Rs)
                    </label>
                    <input
                      type="number"
                      value={custInitialBalance}
                      onChange={(e) => setCustInitialBalance(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                      {language === 'en' ? 'Promised Payment Date' : 'وعدہ ادائیگی کی تاریخ'}
                    </label>
                    <input
                      type="date"
                      value={custPromisedDate}
                      onChange={(e) => setCustPromisedDate(e.target.value)}
                      className="w-full px-3 py-2.5 min-h-[42px] text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCustomer}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <span>
                      {isSubmittingCustomer ? (language === 'en' ? 'SAVING...' : 'بن رہا ہے...') : t.save}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL 2: EDIT CUSTOMER PROFILE                                        */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {editingCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setEditingCustomer(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-4 pr-6">
                {language === 'en' ? 'Edit Customer Profile' : 'گاہک پروفائل میں ترمیم کریں'}
              </h3>

              <form onSubmit={handleSaveEditCustomer} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.customerName} *
                  </label>
                  <input
                    type="text"
                    required
                    value={custName}
                    onChange={(e) => setCustName(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.phone} *
                  </label>
                  <input
                    type="text"
                    required
                    value={custPhone}
                    onChange={(e) => setCustPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {t.email}
                  </label>
                  <input
                    type="email"
                    value={custEmail}
                    onChange={(e) => setCustEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[42px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                      {language === 'en' ? 'Promised Payment Date' : 'وعدہ ادائیگی کی تاریخ'}
                    </label>
                    <input
                      type="date"
                      value={custPromisedDate}
                      onChange={(e) => setCustPromisedDate(e.target.value)}
                      className="w-full px-3 py-2.5 min-h-[42px] text-xs font-mono font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                      {language === 'en' ? 'Commitment Note' : 'وعدہ نوٹ'}
                    </label>
                    <input
                      type="text"
                      value={custPromisedNote}
                      onChange={(e) => setCustPromisedNote(e.target.value)}
                      placeholder={language === 'en' ? 'e.g. Next Friday cash' : 'اگلے جمعہ ادائیگی'}
                      className="w-full px-3 py-2.5 min-h-[42px] text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                  </div>
                </div>

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingCustomer(null)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingCustomer}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <span>
                      {isSubmittingCustomer ? (language === 'en' ? 'SAVING...' : 'محفوظ ہو رہا ہے...') : t.save}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL 3: SET / UPDATE PROMISED PAYMENT DATE                           */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {promisedModalCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setPromisedModalCustomer(null)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-3 mb-4 pr-6">
                <div className="h-10 w-10 rounded-2xl bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-[#D4AF37] flex items-center justify-center shrink-0">
                  <CalendarClock className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {language === 'en' ? 'Promised Payment Schedule' : 'وعدہ ادائیگی کا شیڈول'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {promisedModalCustomer.name} • Rs {promisedModalCustomer.balance.toLocaleString()}
                  </p>
                </div>
              </div>

              <form onSubmit={handleSavePromisedDate} className="space-y-4">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {language === 'en' ? 'Promised Payment Date' : 'وعدہ کی تاریخ'}
                  </label>
                  <input
                    type="date"
                    value={promisedDateInput}
                    onChange={(e) => setPromisedDateInput(e.target.value)}
                    className="w-full px-3.5 py-2.5 min-h-[44px] text-sm font-mono font-bold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                  <span className="block text-[11px] text-slate-500 dark:text-zinc-400 mt-1">
                    {language === 'en'
                      ? 'MeezanFlow will automatically surface this customer in the Due Reminder Center on and after this date.'
                      : 'مقررہ تاریخ آنے پر سسٹم خودکار طور پر یاد دہانی الرٹ دکھائے گا۔'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                    {language === 'en' ? 'Commitment Note (Optional)' : 'وعدہ کی تفصیل (اختیاری)'}
                  </label>
                  <input
                    type="text"
                    value={promisedNoteInput}
                    onChange={(e) => setPromisedNoteInput(e.target.value)}
                    placeholder={
                      language === 'en'
                        ? 'e.g. Will clear Rs 15,000 via bank transfer'
                        : 'مثال: بینک ٹرانسفر کے ذریعے ادائیگی'
                    }
                    className="w-full px-3.5 py-2.5 min-h-[44px] text-sm rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                  />
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  {promisedDateInput && (
                    <button
                      type="button"
                      onClick={() => {
                        setPromisedDateInput('');
                        setPromisedNoteInput('');
                      }}
                      className="text-xs font-bold text-red-600 hover:underline cursor-pointer"
                    >
                      {language === 'en' ? 'Clear Date' : 'تاریخ ختم کریں'}
                    </button>
                  )}
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      type="button"
                      onClick={() => setPromisedModalCustomer(null)}
                      className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer"
                    >
                      {t.cancel}
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingPromised}
                      className="px-5 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-extrabold shadow-md cursor-pointer disabled:opacity-50"
                    >
                      {isSavingPromised
                        ? language === 'en'
                          ? 'Saving...'
                          : 'محفوظ ہو رہا ہے...'
                        : language === 'en'
                        ? 'Save Schedule'
                        : 'محفوظ کریں'}
                    </button>
                  </div>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL 4: BULK WHATSAPP STATEMENT DISPATCHER                           */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isBulkModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/65 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 14 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden shadow-2xl"
            >
              <div className="bg-meezan-header text-white px-5 py-4 flex items-center justify-between gap-3 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 rounded-xl bg-white/10 border border-[#D4AF37]/40 text-[#D4AF37] flex items-center justify-center shrink-0">
                    <MessageSquare className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-extrabold">
                      {language === 'en'
                        ? `Bulk WhatsApp Statement Dispatcher (${selectedBulkCustomers.length})`
                        : `اجتماعی واٹس ایپ اسٹیٹمنٹ (${selectedBulkCustomers.length})`}
                    </h3>
                    <p className="text-xs text-emerald-100/90">
                      {language === 'en'
                        ? 'Each customer receives strictly their own verified account statement.'
                        : 'ہر گاہک کو صرف اسی کے کھاتے کی تصدیق شدہ اسٹیٹمنٹ بھیجی جائے گی۔'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="p-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white cursor-pointer"
                >
                  <X className="h-4.5 w-4.5" />
                </button>
              </div>

              <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
                {/* Honest Delivery Notice */}
                <div className="p-3.5 rounded-xl bg-emerald-50/80 dark:bg-zinc-800/80 border border-emerald-200 dark:border-zinc-700 text-xs text-slate-700 dark:text-zinc-300 flex items-start gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-[#059669] shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>
                      {language === 'en' ? 'Verified Merchant Dispatch:' : 'تصدیق شدہ واٹس ایپ ترسیل:'}
                    </strong>{' '}
                    {language === 'en'
                      ? 'Clicking "Open WhatsApp" or "PDF + WhatsApp" launches WhatsApp pre-addressed to that customer’s linked phone number with their itemized balance. Confirm and tap Send inside WhatsApp to complete delivery.'
                      : 'واٹس ایپ بٹن دبانے سے متعلقہ گاہک کا نمبر اور مکمل حساب کھل جائے گا۔ واٹس ایپ میں سینڈ بٹن دبا کر پیغام مکمل کریں۔'}
                  </div>
                </div>

                {/* Selected Customers List */}
                <div className="divide-y divide-slate-200/80 dark:divide-zinc-800 border border-slate-200 dark:border-zinc-800 rounded-2xl overflow-hidden">
                  {selectedBulkCustomers.map((cust) => {
                    const status = bulkDispatchMap[cust.id] || 'ready';
                    const hasPhone = Boolean((cust.phone || '').replace(/[^0-9]/g, ''));

                    return (
                      <div
                        key={`bulk-row-${cust.id}`}
                        className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <PartyAvatar name={cust.name} size="sm" />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-extrabold text-slate-900 dark:text-white truncate">
                                {cust.name}
                              </span>
                              <span className="text-xs font-mono font-bold text-receivable-maroon">
                                Rs {cust.balance.toLocaleString()}
                              </span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 dark:text-zinc-400 mt-0.5 flex-wrap">
                              <span className="font-mono">{cust.phone || 'No phone number'}</span>
                              <span>•</span>
                              {status === 'whatsapp_opened' && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  {language === 'en'
                                    ? 'WhatsApp Opened — Confirm Send in App'
                                    : 'واٹس ایپ کھل گیا — سینڈ کی تصدیق کریں'}
                                </span>
                              )}
                              {status === 'pdf_downloaded' && (
                                <span className="text-emerald-700 dark:text-emerald-400 font-bold">
                                  {language === 'en'
                                    ? 'PDF Downloaded & WhatsApp Opened'
                                    : 'پی ڈی ایف ڈاؤن لوڈ اور واٹس ایپ کھل گیا'}
                                </span>
                              )}
                              {status === 'missing_phone' && (
                                <span className="text-red-600 font-bold">
                                  {language === 'en' ? 'Missing Phone Number' : 'فون نمبر موجود نہیں'}
                                </span>
                              )}
                              {status === 'ready' && (
                                <span className="text-slate-500">
                                  {language === 'en' ? 'Ready to open' : 'تیار ہے'}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            type="button"
                            disabled={!hasPhone}
                            onClick={() => handleBulkOpenWhatsAppForCustomer(cust, true)}
                            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#059669] bg-emerald-50/70 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-300 text-xs font-extrabold hover:bg-emerald-100/70 transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <Download className="h-3.5 w-3.5" />
                            <span>{language === 'en' ? 'PDF + WA' : 'پی ڈی ایف + واٹس ایپ'}</span>
                          </button>

                          <button
                            type="button"
                            disabled={!hasPhone}
                            onClick={() => handleBulkOpenWhatsAppForCustomer(cust, false)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold shadow-2xs transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <MessageSquare className="h-3.5 w-3.5" />
                            <span>{language === 'en' ? 'Open WhatsApp' : 'واٹس ایپ کھولیں'}</span>
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="p-4 bg-slate-50 dark:bg-zinc-950 border-t border-slate-200 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={handleCopyAllBulkStatements}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-100 cursor-pointer"
                >
                  {bulkCopiedAll ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                  <span>
                    {bulkCopiedAll
                      ? language === 'en'
                        ? 'All Statements Copied!'
                        : 'تمام اسٹیٹمنٹس کاپی ہو گئیں!'
                      : language === 'en'
                      ? 'Copy All Statements'
                      : 'تمام اسٹیٹمنٹس کاپی کریں'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsBulkModalOpen(false)}
                  className="px-5 py-2 rounded-xl bg-meezan-btn text-white text-xs font-extrabold cursor-pointer"
                >
                  {language === 'en' ? 'Done' : 'مکمل'}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL 5: ADD OR EDIT TRANSACTION INSIDE CUSTOMER FOLDER               */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {(isAddTxOpen || editingTx) && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-md max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative"
            >
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

              <h3 className="text-base font-extrabold text-slate-900 dark:text-white mb-1 pr-6">
                {editingTx
                  ? language === 'en'
                    ? 'Edit Transaction'
                    : 'لین دین میں ترمیم کریں'
                  : language === 'en'
                  ? 'New Ledger Entry'
                  : 'نیا لین دین شامل کریں'}
              </h3>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mb-4">
                {language === 'en' ? 'Party:' : 'گاہک:'}{' '}
                <span className="font-extrabold text-slate-800 dark:text-zinc-200">{selectedCustomer.name}</span>
              </p>

              <form
                onSubmit={editingTx ? handleSaveEditTransaction : handleSaveNewTransaction}
                className="space-y-4"
              >
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-2">
                    {language === 'en' ? 'Transaction Type' : 'لین دین کی قسم'}
                  </label>
                  <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                    <button
                      type="button"
                      onClick={() => setTxType('credit')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                        txType === 'credit'
                          ? 'bg-red-50 dark:bg-red-950/40 text-receivable-maroon border-[#991B1B] ring-2 ring-[#991B1B]/30 font-extrabold'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <ArrowUpRight className="h-5 w-5 mb-1 text-receivable-maroon" />
                      <span className="text-xs">{language === 'en' ? "You'll Get (Credit)" : 'ادھار دیا (Credit)'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTxType('debit')}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center cursor-pointer ${
                        txType === 'debit'
                          ? 'bg-emerald-50 dark:bg-emerald-950/40 text-payable-green border-[#059669] ring-2 ring-[#059669]/40 font-extrabold'
                          : 'bg-white dark:bg-zinc-900 border-slate-200 dark:border-zinc-800 text-slate-600 dark:text-zinc-400'
                      }`}
                    >
                      <ArrowDownLeft className="h-5 w-5 mb-1 text-payable-green" />
                      <span className="text-xs">{language === 'en' ? 'Payment Received' : 'وصولی ہوئی (Payment)'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                      {t.amount} (Rs) *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="any"
                      value={txAmount}
                      onChange={(e) => setTxAmount(e.target.value)}
                      placeholder="0"
                      className="w-full px-3.5 py-2.5 min-h-[44px] text-sm font-mono font-extrabold rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-extrabold text-slate-700 dark:text-zinc-300 mb-1">
                      {t.date} *
                    </label>
                    <input
                      type="date"
                      required
                      value={txDate}
                      onChange={(e) => setTxDate(e.target.value)}
                      className="w-full px-3.5 py-2.5 min-h-[44px] text-sm font-mono rounded-xl border border-slate-200 dark:border-zinc-800 bg-slate-50 dark:bg-zinc-950 text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#059669]"
                    />
                  </div>
                </div>

                <VoiceDescriptionField
                  value={txDesc}
                  onChange={setTxDesc}
                  language={language}
                  label={t.description}
                  placeholder={
                    language === 'en'
                      ? 'Item details, bill reference, or payment note...'
                      : 'سامان کی تفصیل یا ادائیگی کا نوٹ...'
                  }
                />

                <div className="flex flex-col-reverse sm:flex-row justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setIsAddTxOpen(false);
                      setEditingTx(null);
                    }}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmittingTx}
                    className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-meezan-btn text-white text-xs font-extrabold cursor-pointer disabled:opacity-50 shadow-md"
                  >
                    <span>
                      {isSubmittingTx ? (language === 'en' ? 'SAVING...' : 'محفوظ ہو رہا ہے...') : t.save}
                    </span>
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL 6: WHATSAPP STATEMENT & REMINDER MODAL                          */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {isStatementModalOpen && selectedCustomer && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex justify-center items-center p-3 sm:p-4"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.96, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.96, y: 12 }}
              className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-5 sm:p-6 shadow-2xl relative"
            >
              <button
                type="button"
                onClick={() => setIsStatementModalOpen(false)}
                className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-3 pr-6">
                <div className="h-10 w-10 rounded-2xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                  <MessageSquare className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                    {language === 'en' ? 'Customer WhatsApp Statement' : 'گاہک واٹس ایپ اسٹیٹمنٹ'}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-zinc-400">
                    {language === 'en'
                      ? `Generated from ${selectedCustomer.name}'s verified ledger.`
                      : `صرف ${selectedCustomer.name} کے کھاتہ ریکارڈ سے تیار کردہ۔`}
                  </p>
                </div>
              </div>

              <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-zinc-950 border border-slate-200/80 dark:border-zinc-800 font-mono text-xs text-slate-700 dark:text-zinc-300 whitespace-pre-wrap max-h-60 overflow-y-auto leading-relaxed mb-4 break-words">
                {buildCustomerWhatsAppStatement(selectedCustomer)}
              </div>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <button
                  type="button"
                  onClick={handleCopyStatement}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {copiedStatement ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
                  <span>
                    {copiedStatement
                      ? language === 'en'
                        ? 'Copied!'
                        : 'کاپی ہو گیا!'
                      : language === 'en'
                      ? 'Copy Text'
                      : 'تحریر کاپی کریں'}
                  </span>
                </button>

                <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsStatementModalOpen(false)}
                    className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800 text-xs font-bold text-slate-600 dark:text-zinc-400 cursor-pointer"
                  >
                    {t.cancel}
                  </button>
                  <a
                    href={getCustomerWhatsAppUrl(selectedCustomer)}
                    target="_blank"
                    rel="noreferrer"
                    onClick={() => setIsStatementModalOpen(false)}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-[#16A34A] hover:bg-[#15803D] text-white text-xs font-extrabold shadow-sm transition-colors"
                  >
                    <MessageSquare className="h-4 w-4" />
                    <span>
                      {language === 'en' ? 'OPEN WHATSAPP' : 'واٹس ایپ پر بھیجیں'}
                    </span>
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ===================================================================== */}
      {/* MODAL 7: COMPLETE CUSTOMER ACCOUNT REPORT & SHARING MODAL             */}
      {/* ===================================================================== */}
      <AnimatePresence>
        {reportCustomer && (
          <CustomerAccountReportModal
            customer={reportCustomer}
            allTransactions={transactions}
            businessName={businessName || BRAND.displayName}
            language={language}
            initialStartDate={reportCustomer.id === selectedCustomer?.id ? dateFrom : ''}
            initialEndDate={reportCustomer.id === selectedCustomer?.id ? dateTo : ''}
            onClose={() => setReportCustomer(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
