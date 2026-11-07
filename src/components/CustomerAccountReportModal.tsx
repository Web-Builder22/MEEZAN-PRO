import React, { useState, useMemo } from 'react';
import {
  X,
  Share2,
  Download,
  FileText,
  Calendar,
  MessageSquare,
  Copy,
  Check,
  Printer,
  ArrowUpRight,
  ArrowDownLeft,
  CheckCircle2,
  AlertCircle,
  Phone,
  Mail,
  Building2,
  Clock
} from 'lucide-react';
import { Customer, Transaction } from '../types';
import { Language } from '../translations';
import { BRAND, MeezanFlowLogo, PartyAvatar } from '../brand';
import { motion } from 'motion/react';
import {
  computeCustomerStatementData,
  generateCustomerStatementPdf,
  buildConciseReportSummaryText,
  formatRs,
  formatBalanceWithStatus
} from '../utils/customerReportPdf';

interface CustomerAccountReportModalProps {
  customer: Customer;
  allTransactions: Transaction[];
  businessName: string;
  language: Language;
  initialStartDate?: string;
  initialEndDate?: string;
  onClose: () => void;
}

type DatePreset = 'all' | 'thisMonth' | 'last30' | 'last90' | 'custom';

export default function CustomerAccountReportModal({
  customer,
  allTransactions,
  businessName,
  language,
  initialStartDate = '',
  initialEndDate = '',
  onClose
}: CustomerAccountReportModalProps) {
  const [datePreset, setDatePreset] = useState<DatePreset>(() =>
    initialStartDate || initialEndDate ? 'custom' : 'all'
  );
  const [startDate, setStartDate] = useState<string>(initialStartDate);
  const [endDate, setEndDate] = useState<string>(initialEndDate);

  // Action states & feedback banner
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [feedbackBanner, setFeedbackBanner] = useState<{
    type: 'info' | 'success' | 'error';
    message: string;
  } | null>(null);

  // Apply date range presets
  const handleSelectPreset = (preset: DatePreset) => {
    setDatePreset(preset);
    setFeedbackBanner(null);

    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    if (preset === 'all') {
      setStartDate('');
      setEndDate('');
    } else if (preset === 'thisMonth') {
      const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const yyyy = firstOfMonth.getFullYear();
      const mm = String(firstOfMonth.getMonth() + 1).padStart(2, '0');
      setStartDate(`${yyyy}-${mm}-01`);
      setEndDate(todayStr);
    } else if (preset === 'last30') {
      const d = new Date(today);
      d.setDate(today.getDate() - 30);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    } else if (preset === 'last90') {
      const d = new Date(today);
      d.setDate(today.getDate() - 90);
      setStartDate(d.toISOString().split('T')[0]);
      setEndDate(todayStr);
    }
  };

  // Compute full isolated customer statement data
  const statement = useMemo(() => {
    return computeCustomerStatementData({
      customer,
      allTransactions,
      businessName,
      startDate,
      endDate
    });
  }, [customer, allTransactions, businessName, startDate, endDate]);

  // Concise text summary for "Share Summary"
  const conciseSummaryText = useMemo(() => {
    return buildConciseReportSummaryText(statement, language);
  }, [statement, language]);

  // Helper: Trigger browser download of a Blob
  const triggerBlobDownload = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setTimeout(() => URL.revokeObjectURL(url), 5000);
  };

  // =========================================================================
  // 1. DOWNLOAD PDF STATEMENT
  // =========================================================================
  const handleDownloadPdf = async () => {
    setIsGeneratingPdf(true);
    setFeedbackBanner(null);
    try {
      const { blob, fileName } = generateCustomerStatementPdf(statement);
      triggerBlobDownload(blob, fileName);
      setFeedbackBanner({
        type: 'success',
        message:
          language === 'en'
            ? `PDF statement "${fileName}" has been downloaded to your device.`
            : `پی ڈی ایف اسٹیٹمنٹ (${fileName}) آپ کے ڈیوائس میں محفوظ کر دی گئی ہے۔`
      });
    } catch (err: any) {
      console.error('PDF generation failed:', err);
      setFeedbackBanner({
        type: 'error',
        message:
          language === 'en'
            ? `Could not generate PDF: ${err?.message || 'Unexpected error'}. Please try again.`
            : 'پی ڈی ایف تیار کرنے میں مسئلہ پیش آیا۔ دوبارہ کوشش کریں۔'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // =========================================================================
  // 2. SHARE PDF (Native Web Share API with PDF file attachment)
  // =========================================================================
  const handleSharePdf = async () => {
    setIsGeneratingPdf(true);
    setFeedbackBanner(null);
    try {
      const { blob, file, fileName } = generateCustomerStatementPdf(statement);
      const shareTitle = `${BRAND.displayName} — Account Statement (${customer.name})`;
      const shareText = `Official ${BRAND.displayName} Account Statement for ${customer.name} (${statement.periodLabel}). Final Balance: ${formatBalanceWithStatus(statement.closingBalance)}`;

      const nav = navigator as any;

      // Check if device/browser supports sharing PDF files via native share sheet
      if (typeof nav.share === 'function' && typeof nav.canShare === 'function' && nav.canShare({ files: [file] })) {
        try {
          await nav.share({
            files: [file],
            title: shareTitle,
            text: shareText
          });
          setFeedbackBanner({
            type: 'info',
            message:
              language === 'en'
                ? 'Native share sheet completed. Please confirm in your chosen app (WhatsApp, Email, etc.) that the message was sent.'
                : 'شیئر مینو کھل گیا۔ براہ کرم اپنی منتخب کردہ ایپ میں بھیجنے کی تصدیق کریں۔'
          });
          return;
        } catch (shareErr: any) {
          if (shareErr?.name === 'AbortError') {
            setFeedbackBanner({
              type: 'info',
              message:
                language === 'en'
                  ? 'Sharing was cancelled before sending.'
                  : 'شیئر کرنے کا عمل مکمل ہونے سے پہلے منسوخ کر دیا گیا۔'
            });
            return;
          }
          // Fall through to fallback if iframe/browser blocked file share
        }
      }

      // Fallback when browser does not support native file sharing:
      // Download the PDF automatically and invoke text share (if supported)
      triggerBlobDownload(blob, fileName);

      if (typeof nav.share === 'function') {
        try {
          await nav.share({
            title: shareTitle,
            text: conciseSummaryText
          });
          setFeedbackBanner({
            type: 'info',
            message:
              language === 'en'
                ? `PDF downloaded ("${fileName}") and share menu opened. Attach the downloaded PDF in your app to send the file.`
                : `پی ڈی ایف ڈاؤن لوڈ ہو گئی ہے (${fileName})۔ اپنی ایپ میں اس فائل کو منسلک کر کے بھیجیں۔`
          });
          return;
        } catch (textShareErr: any) {
          if (textShareErr?.name === 'AbortError') {
            setFeedbackBanner({
              type: 'info',
              message:
                language === 'en'
                  ? `Share menu closed. Your PDF statement ("${fileName}") was downloaded so you can share it manually.`
                  : `پی ڈی ایف فائل (${fileName}) آپ کے ڈیوائس پر ڈاؤن لوڈ کر دی گئی ہے۔`
            });
            return;
          }
        }
      }

      setFeedbackBanner({
        type: 'info',
        message:
          language === 'en'
            ? `Your browser does not support direct PDF file attachment in the system share sheet. We downloaded "${fileName}" to your device so you can attach it in WhatsApp or Email.`
            : `پی ڈی ایف فائل (${fileName}) آپ کے ڈیوائس میں محفوظ کر دی گئی ہے۔ آپ اسے واٹس ایپ یا ای میل میں اٹیچ کر کے بھیج سکتے ہیں۔`
      });
    } catch (err: any) {
      console.error('Share PDF error:', err);
      setFeedbackBanner({
        type: 'error',
        message:
          language === 'en'
            ? `Failed to prepare PDF for sharing: ${err?.message || 'Unknown error'}.`
            : 'پی ڈی ایف شیئر کرنے میں خرابی پیش آئی۔'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // =========================================================================
  // 3. SHARE SUMMARY (Concise Text Summary via Native Share or Clipboard)
  // =========================================================================
  const handleShareSummary = async () => {
    setFeedbackBanner(null);
    const nav = navigator as any;
    const shareTitle = `${BRAND.displayName} — ${customer.name} Account Summary`;

    if (typeof nav.share === 'function') {
      try {
        await nav.share({
          title: shareTitle,
          text: conciseSummaryText
        });
        setFeedbackBanner({
          type: 'info',
          message:
            language === 'en'
              ? 'Account summary shared via your device share menu.'
              : 'کھاتہ خلاصہ شیئر مینو کے ذریعے کھول دیا گیا۔'
        });
        return;
      } catch (err: any) {
        if (err?.name === 'AbortError') {
          setFeedbackBanner({
            type: 'info',
            message:
              language === 'en'
                ? 'Summary sharing was cancelled.'
                : 'خلاصہ شیئر کرنے کا عمل منسوخ کر دیا گیا۔'
          });
          return;
        }
      }
    }

    // Fallback: Copy summary to clipboard
    try {
      await navigator.clipboard.writeText(conciseSummaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
      setFeedbackBanner({
        type: 'success',
        message:
          language === 'en'
            ? 'Account summary copied to clipboard! You can now paste it into WhatsApp, SMS, or Email.'
            : 'کھاتہ کا خلاصہ کاپی ہو گیا ہے! اب آپ اسے واٹس ایپ یا میسج میں پیسٹ کر سکتے ہیں۔'
      });
    } catch {
      setFeedbackBanner({
        type: 'error',
        message:
          language === 'en'
            ? 'Unable to access clipboard automatically. Please use the WhatsApp button below.'
            : 'کلپ بورڈ تک رسائی ممکن نہیں۔ براہ کرم نیچے واٹس ایپ بٹن استعمال کریں۔'
      });
    }
  };

  // =========================================================================
  // 4. WHATSAPP SHARING (Native PDF Share for WhatsApp OR PDF Download + wa.me)
  // =========================================================================
  const handleShareViaWhatsApp = async () => {
    setIsGeneratingPdf(true);
    setFeedbackBanner(null);

    try {
      const { blob, file, fileName } = generateCustomerStatementPdf(statement);
      const nav = navigator as any;

      // On mobile devices that support sharing files natively, open the native share sheet
      // so the user can pick WhatsApp and send the actual PDF file directly.
      if (
        typeof nav.share === 'function' &&
        typeof nav.canShare === 'function' &&
        nav.canShare({ files: [file] })
      ) {
        try {
          await nav.share({
            files: [file],
            title: `${BRAND.displayName} Statement — ${customer.name}`,
            text: conciseSummaryText
          });
          setFeedbackBanner({
            type: 'info',
            message:
              language === 'en'
                ? 'Share sheet opened with the PDF file. Select WhatsApp and tap Send inside WhatsApp to complete sending.'
                : 'پی ڈی ایف فائل کے ساتھ شیئر مینو کھل گیا۔ واٹس ایپ منتخب کر کے بھیجنے کا عمل مکمل کریں۔'
          });
          return;
        } catch (err: any) {
          if (err?.name === 'AbortError') {
            setFeedbackBanner({
              type: 'info',
              message:
                language === 'en'
                  ? 'WhatsApp PDF sharing was cancelled before sending.'
                  : 'واٹس ایپ شیئرنگ مکمل ہونے سے پہلے منسوخ کر دی گئی۔'
            });
            return;
          }
        }
      }

      // If native file share is not supported (e.g. desktop web), download the PDF first
      // and open WhatsApp with the full formatted account statement text.
      triggerBlobDownload(blob, fileName);

      const cleanPhone = (customer.phone || '').replace(/[^0-9]/g, '');
      const waUrl = cleanPhone
        ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(conciseSummaryText)}`
        : `https://wa.me/?text=${encodeURIComponent(conciseSummaryText)}`;

      window.open(waUrl, '_blank', 'noopener,noreferrer');

      setFeedbackBanner({
        type: 'info',
        message:
          language === 'en'
            ? `PDF statement "${fileName}" has been saved to your device and WhatsApp has been opened. Attach the downloaded PDF in WhatsApp and press Send to complete sharing.`
            : `پی ڈی ایف فائل (${fileName}) ڈاؤن لوڈ ہو گئی ہے اور واٹس ایپ کھول دیا گیا ہے۔ واٹس ایپ میں پی ڈی ایف فائل اٹیچ کر کے سینڈ بٹن دبائیں۔`
      });
    } catch (err: any) {
      console.error('WhatsApp share error:', err);
      setFeedbackBanner({
        type: 'error',
        message:
          language === 'en'
            ? `Could not prepare WhatsApp report: ${err?.message || 'Unknown error'}.`
            : 'واٹس ایپ رپورٹ تیار کرنے میں مسئلہ پیش آیا۔'
      });
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  // Copy concise summary helper
  const handleCopySummary = async () => {
    try {
      await navigator.clipboard.writeText(conciseSummaryText);
      setCopiedSummary(true);
      setTimeout(() => setCopiedSummary(false), 2500);
      setFeedbackBanner({
        type: 'success',
        message:
          language === 'en'
            ? 'Concise account summary copied to clipboard.'
            : 'کھاتہ کا خلاصہ کلپ بورڈ پر کاپی ہو گیا۔'
      });
    } catch {
      // ignore
    }
  };

  // Open PDF in a new tab / print dialog
  const handlePrintStatement = () => {
    try {
      const { blob, fileName } = generateCustomerStatementPdf(statement);
      const blobUrl = URL.createObjectURL(blob);
      const printWin = window.open(blobUrl, '_blank');
      if (!printWin) {
        triggerBlobDownload(blob, fileName);
        setFeedbackBanner({
          type: 'info',
          message:
            language === 'en'
              ? `Popup was blocked by your browser, so "${fileName}" was downloaded directly for printing.`
              : `پرنٹ کے لیے پی ڈی ایف فائل (${fileName}) ڈاؤن لوڈ کر دی گئی ہے۔`
        });
      }
    } catch (err: any) {
      setFeedbackBanner({
        type: 'error',
        message: err?.message || 'Unable to print statement.'
      });
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex justify-center items-start sm:items-center p-2 sm:p-4 overflow-y-auto"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 14 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
        className="bg-[#FAF9F6] dark:bg-zinc-950 border border-slate-200 dark:border-zinc-800 rounded-3xl w-full max-w-5xl max-h-[94vh] flex flex-col shadow-2xl overflow-hidden my-auto"
      >
        {/* ================================================================= */}
        {/* TOP MODAL BAR (EMERALD FINTECH MEEZANFLOW HEADER)                 */}
        {/* ================================================================= */}
        <div className="bg-meezan-header text-white px-4 py-3.5 sm:px-6 sm:py-4 flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <MeezanFlowLogo size={36} />
            <div className="min-w-0">
              <h2 className="text-base sm:text-lg font-black text-outline tracking-wide truncate">
                {language === 'en'
                  ? 'Complete Customer Account Report & Share'
                  : 'مکمل گاہک کھاتہ رپورٹ اور شیئرنگ'}
              </h2>
              <p className="text-[11px] sm:text-xs text-white/90 font-bold truncate">
                {statement.appName} • {customer.name} ({customer.phone || 'No Phone'})
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close report modal"
            className="p-2 rounded-full bg-black/15 hover:bg-black/25 text-white transition-colors cursor-pointer shrink-0"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* ================================================================= */}
        {/* SCROLLABLE BODY: CONTROLS + SHARING + LIVE FULL STATEMENT         */}
        {/* ================================================================= */}
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-5">
          {/* 1. DATE RANGE & REPORTING PERIOD BAR */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-[#059669]" />
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                  {language === 'en' ? 'Select Reporting Period' : 'رپورٹ کی مدت منتخب کریں'}
                </span>
              </div>

              {/* Date Range Preset Pills */}
              <div className="flex flex-wrap items-center gap-1.5">
                {(
                  [
                    { id: 'all', labelEn: 'Complete History', labelUr: 'مکمل ریکارڈ' },
                    { id: 'thisMonth', labelEn: 'This Month', labelUr: 'اس ماہ' },
                    { id: 'last30', labelEn: 'Last 30 Days', labelUr: 'پچھلے 30 دن' },
                    { id: 'last90', labelEn: 'Last 90 Days', labelUr: 'پچھلے 90 دن' },
                    { id: 'custom', labelEn: 'Custom Dates', labelUr: 'مخصوص تاریخ' }
                  ] as const
                ).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
                      datePreset === preset.id
                        ? 'bg-meezan-btn text-white shadow-2xs'
                        : 'bg-slate-100 dark:bg-zinc-800 text-slate-700 dark:text-zinc-300 hover:bg-slate-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {language === 'en' ? preset.labelEn : preset.labelUr}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Start & End Date Inputs */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1 items-end">
              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase mb-1">
                  {language === 'en' ? 'Start Date (From)' : 'شروع کی تاریخ'}
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    setDatePreset('custom');
                    setStartDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase mb-1">
                  {language === 'en' ? 'End Date (To)' : 'آخری تاریخ'}
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => {
                    setDatePreset('custom');
                    setEndDate(e.target.value);
                  }}
                  className="w-full px-3 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-950 text-xs font-mono font-bold text-slate-800 dark:text-zinc-200 focus:outline-none focus:ring-2 focus:ring-[#059669]"
                />
              </div>

              <div className="flex items-center justify-between sm:justify-end gap-2">
                {(startDate || endDate) && (
                  <button
                    type="button"
                    onClick={() => handleSelectPreset('all')}
                    className="px-3.5 py-2 min-h-[40px] rounded-xl border border-slate-200 dark:border-zinc-700 text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 cursor-pointer"
                  >
                    {language === 'en' ? 'Reset to All History' : 'مکمل ریکارڈ دکھائیں'}
                  </button>
                )}
                <div className="text-right">
                  <span className="block text-[11px] text-slate-400 font-bold">
                    {language === 'en' ? 'Active Period' : 'منتخب مدت'}
                  </span>
                  <span className="text-xs font-extrabold text-[#059669] dark:text-[#10B981]">
                    {statement.periodLabel}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SHARING & EXPORT ACTION BUTTONS GRID */}
          <div className="bg-white dark:bg-zinc-900 border border-slate-200/90 dark:border-zinc-800 rounded-2xl p-4 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Share or Export Official Statement'
                  : 'رپورٹ شیئر یا ڈاؤن لوڈ کریں'}
              </span>
              <span className="text-[11px] font-bold text-slate-500 dark:text-zinc-400">
                {statement.rows.length}{' '}
                {language === 'en' ? 'transaction(s) in report' : 'لین دین شامل ہیں'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              {/* Option 1: Share PDF (Native Share Sheet) */}
              <button
                id="report-share-pdf-btn"
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleSharePdf}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl bg-meezan-btn text-white font-extrabold text-xs sm:text-sm shadow-sm hover:opacity-95 active:scale-98 transition-all cursor-pointer disabled:opacity-50"
              >
                <Share2 className="h-4 w-4 shrink-0" />
                <span className="text-outline">
                  {language === 'en' ? 'SHARE PDF' : 'پی ڈی ایف شیئر کریں'}
                </span>
              </button>

              {/* Option 2: Download PDF */}
              <button
                id="report-download-pdf-btn"
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleDownloadPdf}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl border-2 border-[#059669] bg-emerald-50/70 dark:bg-zinc-800 text-[#064E3B] dark:text-emerald-400 font-extrabold text-xs sm:text-sm hover:bg-emerald-100/70 transition-all cursor-pointer disabled:opacity-50"
              >
                <Download className="h-4 w-4 shrink-0" />
                <span>{language === 'en' ? 'Download PDF' : 'پی ڈی ایف ڈاؤن لوڈ'}</span>
              </button>

              {/* Option 3: WhatsApp PDF / Statement Share */}
              <button
                id="report-whatsapp-share-btn"
                type="button"
                disabled={isGeneratingPdf}
                onClick={handleShareViaWhatsApp}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl bg-[#16A34A] hover:bg-[#15803D] text-white font-extrabold text-xs sm:text-sm shadow-sm transition-all cursor-pointer disabled:opacity-50"
              >
                <MessageSquare className="h-4 w-4 shrink-0" />
                <span className="text-outline">
                  {language === 'en' ? 'WHATSAPP SHARE' : 'واٹس ایپ شیئر'}
                </span>
              </button>

              {/* Option 4: Share Summary Text */}
              <button
                id="report-share-summary-btn"
                type="button"
                onClick={handleShareSummary}
                className="flex items-center justify-center gap-2 px-4 py-3 min-h-[48px] rounded-2xl border border-slate-300 dark:border-zinc-700 bg-white dark:bg-zinc-900 text-slate-800 dark:text-zinc-200 font-extrabold text-xs sm:text-sm hover:bg-slate-50 dark:hover:bg-zinc-800 transition-all cursor-pointer"
              >
                <FileText className="h-4 w-4 text-[#059669] shrink-0" />
                <span>{language === 'en' ? 'Share Summary' : 'خلاصہ شیئر کریں'}</span>
              </button>
            </div>

            {/* Secondary Quick Utility Bar: Copy Summary & Print */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-100 dark:border-zinc-800">
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={handleCopySummary}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  {copiedSummary ? (
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                  )}
                  <span>
                    {copiedSummary
                      ? language === 'en'
                        ? 'Summary Copied!'
                        : 'خلاصہ کاپی ہو گیا!'
                      : language === 'en'
                      ? 'Copy Text Summary'
                      : 'خلاصہ کاپی کریں'}
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handlePrintStatement}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-slate-600 dark:text-zinc-300 hover:bg-slate-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5 text-[#059669]" />
                  <span>{language === 'en' ? 'Print / Open PDF' : 'پرنٹ کریں'}</span>
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                {language === 'en'
                  ? 'Supports WhatsApp, Email, Bluetooth & system share sheet'
                  : 'واٹس ایپ، ای میل اور بلوٹوتھ کے ذریعے شیئر کریں'}
              </span>
            </div>

            {/* Honest Status Feedback Banner */}
            {feedbackBanner && (
              <div
                className={`p-3 rounded-xl border text-xs font-bold flex items-start gap-2.5 ${
                  feedbackBanner.type === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-900 text-emerald-800 dark:text-emerald-300'
                    : feedbackBanner.type === 'error'
                    ? 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-900 text-red-700 dark:text-red-300'
                    : 'bg-emerald-50/70 dark:bg-zinc-800 border-emerald-200 dark:border-zinc-700 text-slate-800 dark:text-zinc-200'
                }`}
              >
                {feedbackBanner.type === 'error' ? (
                  <AlertCircle className="h-4 w-4 shrink-0 mt-0.5 text-red-600" />
                ) : (
                  <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-[#059669]" />
                )}
                <span className="flex-1 leading-relaxed">{feedbackBanner.message}</span>
                <button
                  type="button"
                  onClick={() => setFeedbackBanner(null)}
                  className="text-slate-400 hover:text-slate-600 cursor-pointer"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* ================================================================= */}
          {/* 3. COMPLETE ACCOUNT STATEMENT DOCUMENT PREVIEW                    */}
          {/* ================================================================= */}
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-2xl overflow-hidden shadow-sm">
            {/* Statement Document Branded Header */}
            <div className="bg-meezan-header text-white p-5 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <MeezanFlowLogo size={44} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-xl sm:text-2xl font-black text-outline tracking-wide">
                        {statement.appName}
                      </h3>
                      {statement.businessName &&
                        statement.businessName.toLowerCase() !==
                          statement.appName.toLowerCase() && (
                          <span className="text-xs font-extrabold bg-black/20 px-2.5 py-0.5 rounded-full">
                            {statement.businessName}
                          </span>
                        )}
                    </div>
                    <p className="text-xs text-white/90 font-semibold mt-0.5">
                      {BRAND.tagline}
                    </p>
                  </div>
                </div>

                <div className="sm:text-right border-t sm:border-t-0 border-white/20 pt-3 sm:pt-0">
                  <div className="text-xs font-black uppercase tracking-wider text-white/90">
                    {language === 'en' ? 'OFFICIAL ACCOUNT STATEMENT' : 'مکمل کھاتہ اسٹیٹمنٹ'}
                  </div>
                  <div className="text-xs font-bold text-white/95 mt-1 flex sm:justify-end items-center gap-1.5">
                    <Clock className="h-3.5 w-3.5 shrink-0" />
                    <span>
                      {language === 'en' ? 'Generated:' : 'تاریخ اجرا:'}{' '}
                      {statement.generatedAtFormatted}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white/90 mt-0.5">
                    {language === 'en' ? 'Period:' : 'مدت:'} {statement.periodLabel}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-4 sm:p-6 space-y-6">
              {/* Customer Contact Info & Final Status Row */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-4 rounded-2xl bg-gray-50 dark:bg-zinc-950/70 border border-gray-200/80 dark:border-zinc-800">
                <div className="flex items-start gap-3.5">
                  <PartyAvatar name={customer.name} size="lg" />
                  <div className="min-w-0 flex-1">
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-gray-400 block">
                      {language === 'en' ? 'Customer Account Holder' : 'گاہک کی تفصیل'}
                    </span>
                    <h4 className="text-base sm:text-lg font-extrabold text-gray-900 dark:text-white break-words">
                      {customer.name}
                    </h4>
                    <div className="space-y-1 mt-1 text-xs text-slate-600 dark:text-zinc-300">
                      <div className="flex items-center gap-1.5 font-mono">
                        <Phone className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                        <span>{customer.phone || 'Not provided'}</span>
                      </div>
                      {customer.email && (
                        <div className="flex items-center gap-1.5 break-all">
                          <Mail className="h-3.5 w-3.5 text-[#059669] shrink-0" />
                          <span>{customer.email}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                        <Building2 className="h-3.5 w-3.5 shrink-0" />
                        <span>
                          {language === 'en' ? 'Managed by:' : 'کاروبار:'}{' '}
                          {statement.businessName}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col justify-center md:items-end md:text-right border-t md:border-t-0 pt-3 md:pt-0 border-slate-200/70 dark:border-zinc-800">
                  <span className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
                    {language === 'en' ? 'Final Outstanding Balance' : 'حتمی بقایا بیلنس'}
                  </span>
                  <div
                    className={`text-2xl sm:text-3xl font-black tabular-nums mt-0.5 ${
                      statement.balanceDirection === 'receivable'
                        ? 'text-receivable-maroon'
                        : statement.balanceDirection === 'payable'
                        ? 'text-payable-green'
                        : 'text-slate-500'
                    }`}
                  >
                    {formatRs(Math.abs(statement.closingBalance))}
                  </div>
                  <span className="text-xs text-outline-label mt-1">
                    {statement.balanceDirection === 'receivable'
                      ? language === 'en'
                        ? "Customer Owes Business (You'll Get)"
                        : 'گاہک کے ذمہ واجب الادا (آپ لیں گے)'
                      : statement.balanceDirection === 'payable'
                      ? language === 'en'
                        ? "Business Owes Customer (You'll Give)"
                        : 'کاروبار کے ذمہ واجب الادا (آپ دیں گے)'
                      : language === 'en'
                      ? 'Account Settled (Zero Balance)'
                      : 'کھاتہ بے باق ہے'}
                  </span>
                </div>
              </div>

              {/* 4 Key Accounting Metrics Row */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* 1. Opening Balance */}
                <div className="p-3.5 rounded-2xl bg-emerald-50/50 dark:bg-zinc-950 border border-emerald-200/60 dark:border-zinc-800">
                  <span className="text-[11px] font-extrabold text-slate-500 dark:text-zinc-400 uppercase block">
                    {language === 'en' ? 'Opening Balance' : 'ابتدائی بیلنس'}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold tabular-nums text-slate-900 dark:text-white mt-1 block">
                    {formatRs(Math.abs(statement.openingBalance))}
                  </span>
                  <span className="text-[11px] text-slate-500 dark:text-zinc-400">
                    {statement.openingBalance > 0
                      ? language === 'en'
                        ? "Receivable (You'll Get)"
                        : 'وصول طلب'
                      : statement.openingBalance < 0
                      ? language === 'en'
                        ? "Payable (You'll Give)"
                        : 'واجب الادا'
                      : language === 'en'
                      ? 'Zero / Settled'
                      : 'بے باق'}
                  </span>
                </div>

                {/* 2. Total Credit / Payment Given */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-extrabold text-gray-500 dark:text-zinc-400 uppercase block">
                    {language === 'en'
                      ? 'Total Credit (Payment Given)'
                      : 'کل ادھار / دیا گیا (Credit)'}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold tabular-nums text-receivable-maroon mt-1 block">
                    {formatRs(statement.totalCredit)}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    {statement.rows.filter((r) => r.type === 'credit').length}{' '}
                    {language === 'en' ? 'credit entries' : 'ادھار اندراجات'}
                  </span>
                </div>

                {/* 3. Total Debit / Payment Received */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-extrabold text-gray-500 dark:text-zinc-400 uppercase block">
                    {language === 'en'
                      ? 'Total Debit (Payment Received)'
                      : 'کل وصولی (Payment Received)'}
                  </span>
                  <span className="text-base sm:text-lg font-extrabold tabular-nums text-payable-green mt-1 block">
                    {formatRs(statement.totalDebit)}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    {statement.rows.filter((r) => r.type === 'debit').length}{' '}
                    {language === 'en' ? 'payment entries' : 'وصولی اندراجات'}
                  </span>
                </div>

                {/* 4. Final Closing Balance */}
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-zinc-950 border border-gray-200/80 dark:border-zinc-800">
                  <span className="text-[11px] font-extrabold text-gray-500 dark:text-zinc-400 uppercase block">
                    {language === 'en' ? 'Closing Balance' : 'حتمی بقایا بیلنس'}
                  </span>
                  <span
                    className={`text-base sm:text-lg font-extrabold tabular-nums mt-1 block ${
                      statement.balanceDirection === 'receivable'
                        ? 'text-receivable-maroon'
                        : statement.balanceDirection === 'payable'
                        ? 'text-payable-green'
                        : 'text-gray-600 dark:text-zinc-300'
                    }`}
                  >
                    {formatRs(Math.abs(statement.closingBalance))}
                  </span>
                  <span className="text-[11px] text-gray-500 dark:text-zinc-400">
                    {statement.balanceDirection === 'receivable'
                      ? language === 'en'
                        ? 'Customer Owes You'
                        : 'گاہک نے دینے ہیں'
                      : statement.balanceDirection === 'payable'
                      ? language === 'en'
                        ? 'You Owe Customer'
                        : 'آپ نے دینے ہیں'
                      : language === 'en'
                      ? 'Account Settled'
                      : 'حساب برابر'}
                  </span>
                </div>
              </div>

              {/* Complete Chronological Ledger Table */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs sm:text-sm font-extrabold text-gray-900 dark:text-white uppercase tracking-wider">
                    {language === 'en'
                      ? 'Itemized Transaction Ledger & Running Balance'
                      : 'مکمل لین دین اور بقایا بیلنس کی تفصیل'}
                  </h4>
                  <span className="text-xs text-gray-500">
                    {language === 'en' ? 'Chronological Order' : 'تاریخ وار ترتیب'}
                  </span>
                </div>

                <div className="overflow-x-auto border border-gray-200 dark:border-zinc-800 rounded-2xl">
                  <table className="w-full text-left border-collapse min-w-[720px]">
                    <thead>
                      <tr className="bg-meezan-header text-white text-[11px] font-extrabold uppercase">
                        <th className="py-3 px-3 text-center w-10">#</th>
                        <th className="py-3 px-3">{language === 'en' ? 'Date & Time' : 'تاریخ و وقت'}</th>
                        <th className="py-3 px-3">{language === 'en' ? 'Ref #' : 'حوالہ نمبر'}</th>
                        <th className="py-3 px-3">{language === 'en' ? 'Type' : 'قسم'}</th>
                        <th className="py-3 px-3">{language === 'en' ? 'Description' : 'تفصیل'}</th>
                        <th className="py-3 px-3 text-right">
                          {language === 'en' ? 'Credit / Given (Rs)' : 'ادھار / دیا گیا'}
                        </th>
                        <th className="py-3 px-3 text-right">
                          {language === 'en' ? 'Debit / Received (Rs)' : 'وصولی'}
                        </th>
                        <th className="py-3 px-3 text-right">
                          {language === 'en' ? 'Running Balance' : 'بقایا بیلنس'}
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200/80 dark:divide-zinc-800 text-xs">
                      {/* Explicit Opening Balance Row */}
                      <tr className="bg-emerald-50/50 dark:bg-zinc-900/90 font-bold">
                        <td className="py-2.5 px-3 text-center text-gray-400">—</td>
                        <td className="py-2.5 px-3 font-mono text-gray-700 dark:text-zinc-300">
                          {statement.startDate || (language === 'en' ? 'Account Start' : 'شروع سے')}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-gray-500">OPEN-BAL</td>
                        <td className="py-2.5 px-3 text-gray-800 dark:text-zinc-200">
                          {language === 'en' ? 'Opening Balance' : 'ابتدائی بیلنس'}
                        </td>
                        <td className="py-2.5 px-3 text-gray-600 dark:text-zinc-400">
                          {language === 'en'
                            ? 'Balance brought forward at start of reporting period'
                            : 'منتخب مدت کے آغاز پر ابتدائی بیلنس'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-receivable-maroon">
                          {statement.openingBalance > 0 ? formatRs(statement.openingBalance) : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono text-payable-green">
                          {statement.openingBalance < 0
                            ? formatRs(Math.abs(statement.openingBalance))
                            : '—'}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-extrabold text-gray-900 dark:text-white">
                          {formatRs(Math.abs(statement.openingBalance))}{' '}
                          <span className="text-[10px] text-gray-500">
                            {statement.openingBalance > 0
                              ? '(Dr)'
                              : statement.openingBalance < 0
                              ? '(Cr)'
                              : ''}
                          </span>
                        </td>
                      </tr>

                      {/* Transaction Rows */}
                      {statement.rows.length === 0 ? (
                        <tr>
                          <td
                            colSpan={8}
                            className="py-8 px-4 text-center text-gray-400 dark:text-zinc-500 italic"
                          >
                            {language === 'en'
                              ? 'No transactions recorded during the selected reporting period.'
                              : 'اس منتخب مدت کے دوران کوئی لین دین درج نہیں ہے۔'}
                          </td>
                        </tr>
                      ) : (
                        statement.rows.map((row) => {
                          const isCredit = row.type === 'credit';
                          return (
                            <tr
                              key={row.id}
                              className="hover:bg-emerald-50/30 dark:hover:bg-zinc-800/40 transition-colors"
                            >
                              <td className="py-3 px-3 text-center font-mono text-gray-400">
                                {row.index}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <div className="font-bold text-gray-800 dark:text-zinc-200 font-mono">
                                  {row.date}
                                </div>
                                {row.time !== '—' && (
                                  <div className="text-[11px] text-gray-400 font-mono">
                                    {row.time}
                                  </div>
                                )}
                              </td>
                              <td className="py-3 px-3 font-mono text-[11px] text-gray-500 dark:text-zinc-400 whitespace-nowrap">
                                {row.referenceNumber}
                              </td>
                              <td className="py-3 px-3 whitespace-nowrap">
                                <span
                                  className={`inline-flex items-center gap-1 font-extrabold ${
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
                                        ? 'Credit (Gave)'
                                        : 'ادھار (Credit)'
                                      : language === 'en'
                                      ? 'Payment (Got)'
                                      : 'وصولی (Payment)'}
                                  </span>
                                </span>
                              </td>
                              <td className="py-3 px-3 text-gray-700 dark:text-zinc-300 max-w-xs break-words">
                                {row.description}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-extrabold text-receivable-maroon whitespace-nowrap">
                                {row.paymentGiven > 0 ? formatRs(row.paymentGiven) : '—'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-extrabold text-payable-green whitespace-nowrap">
                                {row.paymentReceived > 0 ? formatRs(row.paymentReceived) : '—'}
                              </td>
                              <td className="py-3 px-3 text-right font-mono font-extrabold text-gray-900 dark:text-white whitespace-nowrap">
                                {formatRs(Math.abs(row.runningBalance))}{' '}
                                <span
                                  className={`text-[10px] ${
                                    row.runningBalance > 0
                                      ? 'text-receivable-maroon'
                                      : row.runningBalance < 0
                                      ? 'text-payable-green'
                                      : 'text-gray-400'
                                  }`}
                                >
                                  {row.runningBalance > 0
                                    ? '(Dr)'
                                    : row.runningBalance < 0
                                    ? '(Cr)'
                                    : ''}
                                </span>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-100 dark:bg-zinc-800/90 border-t-2 border-gray-300 dark:border-zinc-700 font-extrabold text-xs">
                        <td colSpan={4} className="py-3.5 px-3 text-gray-900 dark:text-white uppercase">
                          {language === 'en' ? 'Period Totals & Closing Balance' : 'میزان اور حتمی بیلنس'}
                        </td>
                        <td className="py-3.5 px-3 text-gray-600 dark:text-zinc-300">
                          {statement.rows.length}{' '}
                          {language === 'en' ? 'Transaction(s)' : 'لین دین'}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-receivable-maroon whitespace-nowrap">
                          {formatRs(statement.totalCredit)}
                        </td>
                        <td className="py-3.5 px-3 text-right font-mono text-payable-green whitespace-nowrap">
                          {formatRs(statement.totalDebit)}
                        </td>
                        <td
                          className={`py-3.5 px-3 text-right font-mono whitespace-nowrap ${
                            statement.balanceDirection === 'receivable'
                              ? 'text-receivable-maroon'
                              : statement.balanceDirection === 'payable'
                              ? 'text-payable-green'
                              : 'text-gray-700 dark:text-zinc-200'
                          }`}
                        >
                          {formatRs(Math.abs(statement.closingBalance))}{' '}
                          <span className="text-[10px]">
                            {statement.closingBalance > 0
                              ? '(Dr)'
                              : statement.closingBalance < 0
                              ? '(Cr)'
                              : ''}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              {/* Professional End-of-Statement Summary Box */}
              <div className="p-4 sm:p-5 rounded-2xl bg-emerald-50/60 dark:bg-zinc-950 border border-[#059669]/30 space-y-2">
                <h5 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#064E3B] dark:text-[#10B981]">
                  {language === 'en'
                    ? 'Final Account Summary & Reconciliation'
                    : 'کھاتہ کا حتمی خلاصہ اور تصدیق'}
                </h5>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-zinc-300">
                  <div>
                    • <strong>{language === 'en' ? 'Opening Balance:' : 'ابتدائی بیلنس:'}</strong>{' '}
                    {formatBalanceWithStatus(statement.openingBalance)}
                  </div>
                  <div>
                    •{' '}
                    <strong>
                      {language === 'en'
                        ? 'Total Credit / Payment Given:'
                        : 'کل ادھار / دیا گیا:'}
                    </strong>{' '}
                    <span className="text-receivable-maroon font-extrabold">
                      {formatRs(statement.totalCredit)}
                    </span>
                  </div>
                  <div>
                    •{' '}
                    <strong>
                      {language === 'en'
                        ? 'Total Debit / Payment Received:'
                        : 'کل وصولی:'}
                    </strong>{' '}
                    <span className="text-payable-green font-extrabold">
                      {formatRs(statement.totalDebit)}
                    </span>
                  </div>
                  <div>
                    •{' '}
                    <strong>
                      {language === 'en' ? 'Final Outstanding Balance:' : 'حتمی بقایا بیلنس:'}
                    </strong>{' '}
                    <span
                      className={`font-extrabold ${
                        statement.balanceDirection === 'receivable'
                          ? 'text-receivable-maroon'
                          : statement.balanceDirection === 'payable'
                          ? 'text-payable-green'
                          : ''
                      }`}
                    >
                      {formatRs(Math.abs(statement.closingBalance))} ({statement.balanceDirectionLabel})
                    </span>
                  </div>
                </div>
                <p className="text-xs font-extrabold text-slate-900 dark:text-white pt-1 border-t border-emerald-200/60 dark:border-zinc-800">
                  {statement.balanceSummarySentence}
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
