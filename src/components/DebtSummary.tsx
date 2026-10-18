import React, { useState, useMemo } from 'react';
import {
  AlertTriangle,
  ArrowDownLeft,
  ArrowUpRight,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  ExternalLink,
  MessageSquare,
  PlusCircle,
  Send,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
  Truck,
  UserCheck,
  Users
} from 'lucide-react';
import { Customer, Supplier, Transaction } from '../types';
import { Language, translations } from '../translations';

export type RiskLevel = 'high' | 'medium' | 'low';

export interface CategorizedAccount {
  id: string;
  name: string;
  phone: string;
  amount: number;
  sharePercent: number;
  riskLevel: RiskLevel;
  riskReasonEn: string;
  riskReasonUr: string;
  updatedAt: string;
  daysSinceActivity: number | null;
  accountType: 'customer' | 'supplier' | 'customer-advance' | 'supplier-advance';
  rawCustomer?: Customer;
}

interface DebtSummaryProps {
  customers: Customer[];
  suppliers: Supplier[];
  transactions: Transaction[];
  lang: Language;
  getSingleSmsLink: (customerName: string, phone: string, balance: number) => string;
  getWhatsAppLink: (customerName: string, phone: string, balance: number) => string;
  onQuickRecordPayment: (customer: Customer) => void;
  onNavigateToAccount: (tab: 'customers' | 'suppliers', searchName: string) => void;
}

export default function DebtSummary({
  customers,
  suppliers,
  transactions,
  lang,
  getSingleSmsLink,
  getWhatsAppLink,
  onQuickRecordPayment,
  onNavigateToAccount
}: DebtSummaryProps) {
  const t = translations[lang];
  const [riskFilter, setRiskFilter] = useState<'all' | 'high'>('all');
  const [showAllDebtors, setShowAllDebtors] = useState(false);
  const [showAllCreditors, setShowAllCreditors] = useState(false);

  // Calculate days since last payment or account update
  const getDaysSince = (dateStr?: string): number | null => {
    if (!dateStr) return null;
    const parsed = new Date(dateStr).getTime();
    if (isNaN(parsed)) return null;
    const diffMs = Date.now() - parsed;
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  };

  // Map last transaction date per customer
  const lastTxByCustomer = useMemo(() => {
    const map: Record<string, string> = {};
    transactions.forEach((tx) => {
      if (!tx.customerId || !tx.date) return;
      if (!map[tx.customerId] || tx.date > map[tx.customerId]) {
        map[tx.customerId] = tx.date;
      }
    });
    return map;
  }, [transactions]);

  // Evaluate Risk Level based on amount, share of total portfolio, and inactivity
  const evaluateAccountRisk = (
    amount: number,
    sharePercent: number,
    daysSinceActivity: number | null
  ): { level: RiskLevel; reasonEn: string; reasonUr: string } => {
    if (amount >= 25000 || (amount >= 10000 && sharePercent >= 30) || (amount >= 10000 && (daysSinceActivity ?? 0) >= 30)) {
      if ((daysSinceActivity ?? 0) >= 30) {
        return {
          level: 'high',
          reasonEn: `${daysSinceActivity}d overdue • High exposure`,
          reasonUr: `${daysSinceActivity} دن پرانا • بڑی رقم`
        };
      }
      if (sharePercent >= 30) {
        return {
          level: 'high',
          reasonEn: `${sharePercent.toFixed(0)}% concentration risk`,
          reasonUr: `کل ادھار کا ${sharePercent.toFixed(0)}% حصہ`
        };
      }
      return {
        level: 'high',
        reasonEn: 'Exceeds Rs 25,000 limit',
        reasonUr: '25,000 روپے سے زائد بقایا'
      };
    }

    if (amount >= 10000 || sharePercent >= 20 || (daysSinceActivity ?? 0) >= 14) {
      return {
        level: 'medium',
        reasonEn: `${sharePercent.toFixed(0)}% of total • Follow up`,
        reasonUr: `کل کا ${sharePercent.toFixed(0)}% • یاد دہانی کریں`
      };
    }

    return {
      level: 'low',
      reasonEn: 'Within normal credit limit',
      reasonUr: 'معمول کی حد کے اندر'
    };
  };

  // Categorize Debtors (Receivables owed to the business)
  const categorizedDebtors = useMemo<CategorizedAccount[]>(() => {
    const rawDebtors: {
      id: string;
      name: string;
      phone: string;
      amount: number;
      updatedAt: string;
      accountType: 'customer' | 'supplier-advance';
      rawCustomer?: Customer;
    }[] = [];

    customers.forEach((c) => {
      if (c && typeof c.balance === 'number' && c.balance > 0) {
        rawDebtors.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          amount: c.balance,
          updatedAt: lastTxByCustomer[c.id] || c.updatedAt,
          accountType: 'customer',
          rawCustomer: c
        });
      }
    });

    suppliers.forEach((s) => {
      if (s && typeof s.balance === 'number' && s.balance < 0) {
        rawDebtors.push({
          id: s.id,
          name: s.name,
          phone: s.phone,
          amount: Math.abs(s.balance),
          updatedAt: s.updatedAt,
          accountType: 'supplier-advance'
        });
      }
    });

    const totalReceivableAmount = rawDebtors.reduce((sum, item) => sum + item.amount, 0);

    return rawDebtors
      .sort((a, b) => b.amount - a.amount)
      .map((item) => {
        const sharePercent = totalReceivableAmount > 0 ? (item.amount / totalReceivableAmount) * 100 : 0;
        const days = getDaysSince(item.updatedAt);
        const risk = evaluateAccountRisk(item.amount, sharePercent, days);
        return {
          ...item,
          sharePercent,
          daysSinceActivity: days,
          riskLevel: risk.level,
          riskReasonEn: risk.reasonEn,
          riskReasonUr: risk.reasonUr
        };
      });
  }, [customers, suppliers, lastTxByCustomer]);

  // Categorize Creditors (Payables the business owes to Suppliers or Customer advances)
  const categorizedCreditors = useMemo<CategorizedAccount[]>(() => {
    const rawCreditors: {
      id: string;
      name: string;
      phone: string;
      amount: number;
      updatedAt: string;
      accountType: 'supplier' | 'customer-advance';
    }[] = [];

    suppliers.forEach((s) => {
      if (s && typeof s.balance === 'number' && s.balance > 0) {
        rawCreditors.push({
          id: s.id,
          name: s.name,
          phone: s.phone,
          amount: s.balance,
          updatedAt: s.updatedAt,
          accountType: 'supplier'
        });
      }
    });

    customers.forEach((c) => {
      if (c && typeof c.balance === 'number' && c.balance < 0) {
        rawCreditors.push({
          id: c.id,
          name: c.name,
          phone: c.phone,
          amount: Math.abs(c.balance),
          updatedAt: lastTxByCustomer[c.id] || c.updatedAt,
          accountType: 'customer-advance'
        });
      }
    });

    const totalPayableAmount = rawCreditors.reduce((sum, item) => sum + item.amount, 0);

    return rawCreditors
      .sort((a, b) => b.amount - a.amount)
      .map((item) => {
        const sharePercent = totalPayableAmount > 0 ? (item.amount / totalPayableAmount) * 100 : 0;
        const days = getDaysSince(item.updatedAt);
        const risk = evaluateAccountRisk(item.amount, sharePercent, days);
        return {
          ...item,
          sharePercent,
          daysSinceActivity: days,
          riskLevel: risk.level,
          riskReasonEn: risk.reasonEn,
          riskReasonUr: risk.reasonUr
        };
      });
  }, [suppliers, customers, lastTxByCustomer]);

  // Summary metrics
  const totalReceivables = useMemo(
    () => categorizedDebtors.reduce((sum, d) => sum + d.amount, 0),
    [categorizedDebtors]
  );
  const totalPayables = useMemo(
    () => categorizedCreditors.reduce((sum, c) => sum + c.amount, 0),
    [categorizedCreditors]
  );

  const highRiskDebtors = useMemo(
    () => categorizedDebtors.filter((d) => d.riskLevel === 'high'),
    [categorizedDebtors]
  );
  const highRiskCreditors = useMemo(
    () => categorizedCreditors.filter((c) => c.riskLevel === 'high'),
    [categorizedCreditors]
  );

  const highRiskDebtorExposure = useMemo(
    () => highRiskDebtors.reduce((sum, d) => sum + d.amount, 0),
    [highRiskDebtors]
  );
  const highRiskCreditorExposure = useMemo(
    () => highRiskCreditors.reduce((sum, c) => sum + c.amount, 0),
    [highRiskCreditors]
  );

  const filteredDebtors = useMemo(() => {
    const list = riskFilter === 'high' ? highRiskDebtors : categorizedDebtors;
    return showAllDebtors ? list : list.slice(0, 5);
  }, [categorizedDebtors, highRiskDebtors, riskFilter, showAllDebtors]);

  const filteredCreditors = useMemo(() => {
    const list = riskFilter === 'high' ? highRiskCreditors : categorizedCreditors;
    return showAllCreditors ? list : list.slice(0, 5);
  }, [categorizedCreditors, highRiskCreditors, riskFilter, showAllCreditors]);

  const totalDebtorsMatchingFilter = riskFilter === 'high' ? highRiskDebtors.length : categorizedDebtors.length;
  const totalCreditorsMatchingFilter = riskFilter === 'high' ? highRiskCreditors.length : categorizedCreditors.length;

  const netPosition = totalReceivables - totalPayables;
  const combinedVolume = totalReceivables + totalPayables;
  const receivableRatio = combinedVolume > 0 ? Math.round((totalReceivables / combinedVolume) * 100) : 50;

  const getRiskBadge = (level: RiskLevel) => {
    if (level === 'high') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-red-50 text-red-700 border border-red-200/80 dark:bg-red-950/50 dark:text-red-400 dark:border-red-900/60">
          <ShieldAlert className="h-2.5 w-2.5 shrink-0" />
          {t.highRisk}
        </span>
      );
    }
    if (level === 'medium') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-amber-50 text-amber-700 border border-amber-200/80 dark:bg-amber-950/50 dark:text-amber-400 dark:border-amber-900/60">
          <AlertTriangle className="h-2.5 w-2.5 shrink-0" />
          {t.mediumRisk}
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200/80 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/50">
        <CheckCircle2 className="h-2.5 w-2.5 shrink-0" />
        {t.lowRisk}
      </span>
    );
  };

  return (
    <section
      id="debt-summary-section"
      aria-label={t.debtSummaryTitle}
      className="bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 rounded-2xl p-4 sm:p-6 shadow-xs space-y-5"
    >
      {/* Section Header & Risk Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 border-b border-slate-100 dark:border-zinc-800/80 pb-4">
        <div className="min-w-0">
          <div className="flex items-start sm:items-center gap-2.5">
            <div className="h-8 w-8 rounded-xl bg-[#0B192C] text-[#D4AF37] border border-[#D4AF37]/30 flex items-center justify-center shrink-0">
              <ShieldAlert className="h-4.5 w-4.5" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white tracking-tight flex flex-wrap items-center gap-2">
                <span>{t.debtSummaryTitle}</span>
                {(highRiskDebtors.length > 0 || highRiskCreditors.length > 0) && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-400 border border-red-200 dark:border-red-900/60">
                    {highRiskDebtors.length + highRiskCreditors.length} {t.highRisk}
                  </span>
                )}
              </h2>
              <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5">
                {t.debtSummarySubtitle}
              </p>
            </div>
          </div>
        </div>

        {/* Filter Segmented Control */}
        <div className="grid grid-cols-2 sm:flex items-center gap-1.5 w-full sm:w-auto bg-slate-100 dark:bg-zinc-800/70 p-1 rounded-xl border border-slate-200/60 dark:border-zinc-700/50">
          <button
            type="button"
            id="debt-filter-all"
            onClick={() => setRiskFilter('all')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer text-center truncate ${
              riskFilter === 'all'
                ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {t.filterAllRisk} ({categorizedDebtors.length + categorizedCreditors.length})
          </button>
          <button
            type="button"
            id="debt-filter-high-risk"
            onClick={() => setRiskFilter('high')}
            className={`flex items-center justify-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-[11px] sm:text-xs font-semibold transition-all cursor-pointer truncate ${
              riskFilter === 'high'
                ? 'bg-red-600 text-white shadow-xs'
                : 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30'
            }`}
          >
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">
              {t.filterHighRiskOnly} ({highRiskDebtors.length + highRiskCreditors.length})
            </span>
          </button>
        </div>
      </div>

      {/* High-Level Risk & Exposure Overview Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Card 1: High-Risk Debtor Exposure */}
        <div className="p-4 rounded-xl bg-amber-50/40 dark:bg-amber-950/15 border border-amber-200/60 dark:border-amber-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-amber-900 dark:text-amber-300">
            <span>{lang === 'en' ? 'High-Risk Receivables (Debtors)' : 'ہائی رسک وصول طلب ادھار'}</span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-900/50 text-amber-800 dark:text-amber-300">
              {highRiskDebtors.length} {lang === 'en' ? 'accts' : 'کھاتے'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl font-black font-mono text-amber-700 dark:text-amber-400">
              Rs {highRiskDebtorExposure.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-amber-700/80 dark:text-amber-400/80">
              {totalReceivables > 0
                ? `${Math.round((highRiskDebtorExposure / totalReceivables) * 100)}% ${t.ofTotalReceivables}`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Card 2: High-Risk Creditor Exposure */}
        <div className="p-4 rounded-xl bg-red-50/40 dark:bg-red-950/15 border border-red-200/60 dark:border-red-900/40 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-red-900 dark:text-red-300">
            <span>{lang === 'en' ? 'Urgent Payables (Creditors)' : 'واجب الادا ہائی رسک قرض'}</span>
            <span className="font-mono text-[11px] px-1.5 py-0.5 rounded bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-300">
              {highRiskCreditors.length} {lang === 'en' ? 'accts' : 'کھاتے'}
            </span>
          </div>
          <div className="mt-2 flex items-baseline justify-between gap-2">
            <span className="text-xl font-black font-mono text-red-600 dark:text-red-400">
              Rs {highRiskCreditorExposure.toLocaleString()}
            </span>
            <span className="text-[11px] font-mono text-red-600/80 dark:text-red-400/80">
              {totalPayables > 0
                ? `${Math.round((highRiskCreditorExposure / totalPayables) * 100)}% ${t.ofTotalPayables}`
                : '0%'}
            </span>
          </div>
        </div>

        {/* Card 3: Net Debt Balance & Ratio Bar */}
        <div className="p-4 rounded-xl bg-slate-50 dark:bg-zinc-800/40 border border-slate-200/70 dark:border-zinc-800 flex flex-col justify-between">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 dark:text-zinc-300">
            <span>{t.netPosition}</span>
            <span
              className={`inline-flex items-center gap-0.5 font-mono text-[11px] font-bold ${
                netPosition >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {netPosition >= 0 ? (
                <TrendingUp className="h-3 w-3" />
              ) : (
                <TrendingDown className="h-3 w-3" />
              )}
              {netPosition >= 0
                ? lang === 'en'
                  ? 'Net Receivable'
                  : 'وصولی زیادہ ہے'
                : lang === 'en'
                ? 'Net Payable'
                : 'ادائیگی زیادہ ہے'}
            </span>
          </div>
          <div className="mt-1.5 flex items-baseline justify-between">
            <span
              className={`text-xl font-black font-mono ${
                netPosition >= 0
                  ? 'text-emerald-700 dark:text-emerald-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
            >
              {netPosition >= 0 ? '+' : '-'} Rs {Math.abs(netPosition).toLocaleString()}
            </span>
            <span className="text-[10px] font-mono text-slate-400">
              {receivableRatio}% / {100 - receivableRatio}%
            </span>
          </div>
          {/* Visual Ratio Bar */}
          <div className="mt-2 h-1.5 w-full rounded-full bg-red-200 dark:bg-red-950 overflow-hidden flex">
            <div
              className="h-full bg-amber-500 transition-all duration-300"
              style={{ width: `${receivableRatio}%` }}
              title={`${t.receivables}: Rs ${totalReceivables.toLocaleString()}`}
            />
          </div>
        </div>
      </div>

      {/* Categorized Columns: Top Debtors vs Top Creditors */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT COLUMN: TOP DEBTORS (CUSTOMERS WHO OWE US) */}
        <div className="flex flex-col border border-gray-100 dark:border-zinc-800/90 rounded-xl overflow-hidden bg-gray-50/30 dark:bg-zinc-900/40">
          {/* Column Header */}
          <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-amber-100/80 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 flex items-center justify-center">
                <ArrowUpRight className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{t.topDebtors}</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                    {totalDebtorsMatchingFilter}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400 font-mono">
                  {lang === 'en' ? 'Total Receivable:' : 'کل وصول طلب:'}{' '}
                  <strong className="text-amber-600 dark:text-amber-400">
                    Rs {totalReceivables.toLocaleString()}
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToAccount('customers', '')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-[11px] font-semibold transition-all cursor-pointer"
            >
              <Users className="h-3 w-3" />
              <span>{lang === 'en' ? 'Manage Customers' : 'گاہک کھاتہ'}</span>
            </button>
          </div>

          {/* Debtors List */}
          <div className="divide-y divide-gray-100 dark:divide-zinc-800/70 flex-1">
            {filteredDebtors.length > 0 ? (
              filteredDebtors.map((debtor, idx) => (
                <div
                  key={`${debtor.accountType}-${debtor.id}`}
                  className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`h-6 w-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          debtor.riskLevel === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                            {debtor.name}
                          </span>
                          {getRiskBadge(debtor.riskLevel)}
                          {debtor.accountType === 'supplier-advance' && (
                            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300">
                              {t.supplierAdvance}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 flex-wrap">
                          {debtor.phone && <span className="font-mono">{debtor.phone}</span>}
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-gray-500 dark:text-zinc-400">
                            <Clock className="h-3 w-3" />
                            {lang === 'en' ? debtor.riskReasonEn : debtor.riskReasonUr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black font-mono text-amber-600 dark:text-amber-400">
                        Rs {debtor.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">
                        {debtor.sharePercent.toFixed(1)}% {t.ofTotalReceivables}
                      </div>
                    </div>
                  </div>

                  {/* Exposure Bar & Quick Actions Row */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex-1 max-w-[180px] h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          debtor.riskLevel === 'high'
                            ? 'bg-red-500'
                            : debtor.riskLevel === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-emerald-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(6, debtor.sharePercent))}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {debtor.accountType === 'customer' && debtor.rawCustomer && (
                        <>
                          <button
                            type="button"
                            onClick={() => onQuickRecordPayment(debtor.rawCustomer!)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-emerald-50 text-emerald-700 hover:bg-emerald-100 dark:bg-emerald-950/40 dark:text-emerald-400 dark:hover:bg-emerald-900/50 transition-colors cursor-pointer"
                            title={t.recordRecovery}
                          >
                            <PlusCircle className="h-3 w-3" />
                            <span>{t.recordRecovery}</span>
                          </button>
                          {debtor.phone && (
                            <>
                              <a
                                href={getSingleSmsLink(debtor.name, debtor.phone, debtor.amount)}
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/40 dark:text-blue-400 transition-colors"
                                title={t.sendSMS}
                              >
                                <Send className="h-2.5 w-2.5" />
                                <span>SMS</span>
                              </a>
                              <a
                                href={getWhatsAppLink(debtor.name, debtor.phone, debtor.amount)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950/40 dark:text-green-400 transition-colors"
                                title={t.whatsappReminder}
                              >
                                <MessageSquare className="h-2.5 w-2.5" />
                                <span>WA</span>
                              </a>
                            </>
                          )}
                        </>
                      )}
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToAccount(
                            debtor.accountType === 'customer' ? 'customers' : 'suppliers',
                            debtor.name
                          )
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-1 rounded-md text-gray-500 hover:text-gray-800 hover:bg-gray-100 dark:text-zinc-400 dark:hover:text-zinc-200 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                      >
                        <span>{t.viewAccount}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-zinc-500 flex flex-col items-center gap-2">
                <UserCheck className="h-6 w-6 text-emerald-500/70" />
                <span>{t.noDebtors}</span>
              </div>
            )}
          </div>

          {/* Expand / Collapse Footer */}
          {totalDebtorsMatchingFilter > 5 && (
            <button
              type="button"
              onClick={() => setShowAllDebtors(!showAllDebtors)}
              className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-xs font-semibold text-gray-600 dark:text-zinc-400 flex items-center justify-center gap-1.5 border-t border-gray-100 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              <span>
                {showAllDebtors
                  ? lang === 'en'
                    ? 'Show Top 5 Only'
                    : 'صرف ٹاپ 5 دکھائیں'
                  : lang === 'en'
                  ? `View All ${totalDebtorsMatchingFilter} Debtors`
                  : `تمام ${totalDebtorsMatchingFilter} مقروض کھاتے دیکھیں`}
              </span>
              {showAllDebtors ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>

        {/* RIGHT COLUMN: TOP CREDITORS (SUPPLIERS & ADVANCE CUSTOMERS WE OWE) */}
        <div className="flex flex-col border border-gray-100 dark:border-zinc-800/90 rounded-xl overflow-hidden bg-gray-50/30 dark:bg-zinc-900/40">
          {/* Column Header */}
          <div className="p-4 bg-white dark:bg-zinc-900 border-b border-gray-100 dark:border-zinc-800 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-red-100/80 dark:bg-red-950/60 text-red-600 dark:text-red-400 flex items-center justify-center">
                <ArrowDownLeft className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900 dark:text-white flex items-center gap-2">
                  <span>{t.topCreditors}</span>
                  <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-300">
                    {totalCreditorsMatchingFilter}
                  </span>
                </h3>
                <p className="text-[11px] text-gray-400 font-mono">
                  {lang === 'en' ? 'Total Payable:' : 'کل واجب الادا:'}{' '}
                  <strong className="text-red-600 dark:text-red-400">
                    Rs {totalPayables.toLocaleString()}
                  </strong>
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigateToAccount('suppliers', '')}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-gray-200 dark:border-zinc-700 hover:bg-gray-50 dark:hover:bg-zinc-800 text-gray-700 dark:text-zinc-300 text-[11px] font-semibold transition-all cursor-pointer"
            >
              <Truck className="h-3 w-3" />
              <span>{lang === 'en' ? 'Manage Suppliers' : 'سپلائرز کھاتہ'}</span>
            </button>
          </div>

          {/* Creditors List */}
          <div className="divide-y divide-gray-100 dark:divide-zinc-800/70 flex-1">
            {filteredCreditors.length > 0 ? (
              filteredCreditors.map((creditor, idx) => (
                <div
                  key={`${creditor.accountType}-${creditor.id}`}
                  className="p-3.5 sm:p-4 bg-white dark:bg-zinc-900 hover:bg-gray-50/70 dark:hover:bg-zinc-800/40 transition-colors flex flex-col gap-2.5"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <span
                        className={`h-6 w-6 rounded-lg font-mono text-xs font-bold flex items-center justify-center shrink-0 mt-0.5 ${
                          creditor.riskLevel === 'high'
                            ? 'bg-red-100 text-red-700 dark:bg-red-950/70 dark:text-red-400'
                            : 'bg-gray-100 text-gray-600 dark:bg-zinc-800 dark:text-zinc-400'
                        }`}
                      >
                        #{idx + 1}
                      </span>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-sm font-bold text-gray-900 dark:text-zinc-100 truncate">
                            {creditor.name}
                          </span>
                          {getRiskBadge(creditor.riskLevel)}
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 dark:bg-zinc-800 dark:text-zinc-300">
                            {creditor.accountType === 'supplier' ? (
                              <>
                                <Truck className="h-2.5 w-2.5" />
                                {t.supplierAccount}
                              </>
                            ) : (
                              <>
                                <Users className="h-2.5 w-2.5" />
                                {t.customerAdvance}
                              </>
                            )}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-400 dark:text-zinc-500 mt-0.5 flex-wrap">
                          {creditor.phone && <span className="font-mono">{creditor.phone}</span>}
                          <span>•</span>
                          <span className="inline-flex items-center gap-1 text-gray-500 dark:text-zinc-400">
                            <Clock className="h-3 w-3" />
                            {lang === 'en' ? creditor.riskReasonEn : creditor.riskReasonUr}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="text-sm sm:text-base font-black font-mono text-red-600 dark:text-red-400">
                        Rs {creditor.amount.toLocaleString()}
                      </div>
                      <div className="text-[10px] font-mono text-gray-400">
                        {creditor.sharePercent.toFixed(1)}% {t.ofTotalPayables}
                      </div>
                    </div>
                  </div>

                  {/* Exposure Bar & Action Link */}
                  <div className="flex items-center justify-between gap-3 pt-1">
                    <div className="flex-1 max-w-[180px] h-1.5 bg-gray-100 dark:bg-zinc-800 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          creditor.riskLevel === 'high'
                            ? 'bg-red-600'
                            : creditor.riskLevel === 'medium'
                            ? 'bg-amber-500'
                            : 'bg-slate-500'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(6, creditor.sharePercent))}%` }}
                      />
                    </div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          onNavigateToAccount(
                            creditor.accountType === 'supplier' ? 'suppliers' : 'customers',
                            creditor.name
                          )
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-semibold px-2.5 py-1 rounded-md bg-gray-100 hover:bg-gray-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 transition-colors cursor-pointer"
                      >
                        <span>{t.viewAccount}</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 text-center text-xs text-gray-400 dark:text-zinc-500 flex flex-col items-center gap-2">
                <CheckCircle2 className="h-6 w-6 text-emerald-500/70" />
                <span>{t.noCreditors}</span>
              </div>
            )}
          </div>

          {/* Expand / Collapse Footer */}
          {totalCreditorsMatchingFilter > 5 && (
            <button
              type="button"
              onClick={() => setShowAllCreditors(!showAllCreditors)}
              className="w-full py-2.5 px-4 bg-gray-50 hover:bg-gray-100 dark:bg-zinc-850 dark:hover:bg-zinc-800 text-xs font-semibold text-gray-600 dark:text-zinc-400 flex items-center justify-center gap-1.5 border-t border-gray-100 dark:border-zinc-800 transition-colors cursor-pointer"
            >
              <span>
                {showAllCreditors
                  ? lang === 'en'
                    ? 'Show Top 5 Only'
                    : 'صرف ٹاپ 5 دکھائیں'
                  : lang === 'en'
                  ? `View All ${totalCreditorsMatchingFilter} Creditors`
                  : `تمام ${totalCreditorsMatchingFilter} قرض خواہ کھاتے دیکھیں`}
              </span>
              {showAllCreditors ? (
                <ChevronUp className="h-3.5 w-3.5" />
              ) : (
                <ChevronDown className="h-3.5 w-3.5" />
              )}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
