import { Invoice } from '../types';
import { Printer, User, Tag, FileText } from 'lucide-react';
import { BRAND } from '../brand';

interface InvoicePrinterProps {
  invoice: Invoice;
  businessName: string;
  lang: 'en' | 'ur';
  onClose: () => void;
}

export default function InvoicePrinter({ invoice, businessName, lang, onClose }: InvoicePrinterProps) {
  const triggerPrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-sm flex justify-center items-center p-2.5 sm:p-4">
      <div className="bg-white text-gray-800 rounded-2xl w-full max-w-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header toolbar */}
        <div className="bg-[#0B192C] text-white p-3 sm:p-4 flex flex-wrap justify-between items-center gap-2.5 print:hidden">
          <div className="flex items-center gap-2 min-w-0">
            <FileText className="h-[18px] w-[18px] text-[#D4AF37] shrink-0" />
            <span className="font-semibold text-xs sm:text-sm truncate">
              {lang === 'en' ? `Invoice Preview: ${invoice.invoiceNumber}` : `بل کا معائنہ: ${invoice.invoiceNumber}`}
            </span>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              id="print-btn"
              onClick={triggerPrint}
              className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#D4AF37] hover:bg-[#C5A028] text-[#0B192C] text-xs font-bold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Printer className="h-3.5 w-3.5 shrink-0" />
              <span>{lang === 'en' ? 'Print / Save PDF' : 'پرنٹ / پی ڈی ایف'}</span>
            </button>
            <button
              id="close-preview-btn"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white text-xs font-semibold cursor-pointer whitespace-nowrap"
            >
              {lang === 'en' ? 'Dismiss' : 'بند کریں'}
            </button>
          </div>
        </div>

        {/* Invoice Sheets (Actual Printable Paper) */}
        <div id="printable-invoice-sheet" className="p-4 sm:p-8 overflow-y-auto flex-1 bg-white print:p-0">
          {/* Store Title */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center border-b border-slate-200 pb-4 sm:pb-6 mb-5 sm:mb-6 gap-3 sm:gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-[#0B192C] tracking-tight select-all break-words">
                {businessName}
              </h2>
              <p className="text-xs text-slate-500 mt-1 select-all font-mono">
                {lang === 'en' ? `${BRAND.name} · Authorized Invoice Receipt` : `${BRAND.name} · تصدیق شدہ رسید`}
              </p>
            </div>
            <div className="text-left md:text-right font-mono">
              <span className={`inline-block px-2.5 py-1 rounded-md text-[10px] font-bold uppercase mb-2 ${
                invoice.isPaid 
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' 
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {invoice.isPaid ? (lang === 'en' ? 'PAID' : 'ادا شدہ') : (lang === 'en' ? 'PENDING' : 'بقایا')}
              </span>
              <p className="text-xs text-slate-500">{lang === 'en' ? 'Invoice' : 'بل نمبر'}: <strong className="text-slate-900">{invoice.invoiceNumber}</strong></p>
              <p className="text-xs text-slate-500">{lang === 'en' ? 'Date' : 'تاریخ'}: {invoice.date}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-6 mb-6 sm:mb-8">
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 select-all">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">{lang === 'en' ? 'Bill To:' : 'بل بنام:'}</span>
              <h4 className="font-bold text-slate-800 flex items-center gap-1.5 text-sm break-words">
                <User id="invoice-user-icon" className="h-4 w-4 text-[#0B192C] shrink-0" />
                <span>{invoice.customerName}</span>
              </h4>
              {invoice.customerPhone && (
                <p className="text-xs text-slate-500 mt-1 font-mono">Ph: {invoice.customerPhone}</p>
              )}
            </div>
            <div className="bg-slate-50 p-3.5 sm:p-4 rounded-xl border border-slate-200/80 font-mono text-xs">
              <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold block mb-1.5">{lang === 'en' ? 'Ledger Metadata:' : 'لیجر معلومات:'}</span>
              <p className="text-slate-600">{lang === 'en' ? 'Issued By' : 'جاری کنندہ'}: {invoice.createdBy}</p>
              <p className="text-slate-600 mt-1">{lang === 'en' ? 'Terms' : 'شروط'}: {lang === 'en' ? 'Due on Receipt / 10 Days' : '۱۰ یوم کے اندر ادائیگی لازمی ہے'}</p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6 sm:mb-8">
            <table className="w-full text-left border-collapse min-w-[280px]">
              <thead>
                <tr className="border-b border-slate-200 text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                  <th className="py-2.5 px-1.5 sm:px-2">{lang === 'en' ? 'Item Name' : 'اشیاء'}</th>
                  <th className="py-2.5 px-1.5 sm:px-2 text-right">{lang === 'en' ? 'Qty' : 'تعداد'}</th>
                  <th className="py-2.5 px-1.5 sm:px-2 text-right">{lang === 'en' ? 'Price' : 'فروخت قیمت'}</th>
                  <th className="py-2.5 px-1.5 sm:px-2 text-right">{lang === 'en' ? 'Total' : 'کل رقم'}</th>
                </tr>
              </thead>
              <tbody>
                {invoice.items.map((item, index) => (
                  <tr key={index} className="border-b border-slate-100 text-xs sm:text-sm">
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 font-medium text-slate-900 break-words">{item.name}</td>
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-right text-slate-600 font-mono whitespace-nowrap">{item.quantity}</td>
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-right text-slate-600 font-mono whitespace-nowrap">Rs {item.price.toLocaleString()}</td>
                    <td className="py-2.5 sm:py-3 px-1.5 sm:px-2 text-right font-semibold text-[#0B192C] font-mono whitespace-nowrap">Rs {item.total.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Sums */}
          <div className="flex justify-end font-mono">
            <div className="w-full max-w-xs text-right text-sm space-y-2 select-all">
              <div className="flex justify-between border-b border-slate-100 pb-2 text-slate-500">
                <span>{lang === 'en' ? 'Subtotal' : 'سب ٹوٹل'}:</span>
                <span>Rs {invoice.subTotal.toLocaleString()}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between border-b border-slate-100 pb-2 text-emerald-700">
                  <span className="flex items-center gap-1 justify-end">
                    <Tag id="discount-invoice-tag" className="h-3 w-3" />
                    {lang === 'en' ? 'Discount:-' : 'رعایت:-'}
                  </span>
                  <span>- Rs {invoice.discount.toLocaleString()}</span>
                </div>
              )}
              {invoice.tax > 0 && (
                <div className="flex justify-between border-b border-slate-100 pb-2 text-slate-500">
                  <span>{lang === 'en' ? 'Tax/VAT' : 'ٹیکس'}:</span>
                  <span>+ Rs {invoice.tax.toLocaleString()}</span>
                </div>
              )}
              <div className="flex justify-between font-black text-lg text-[#0B192C] border-t-2 border-[#0B192C] pt-2 text-right leading-none">
                <span>{lang === 'en' ? 'Total' : 'کل رقم'}:</span>
                <span>Rs {invoice.total.toLocaleString()}</span>
              </div>
            </div>
          </div>

          <div className="mt-12 text-center text-[10px] text-slate-400 border-t border-slate-100 pt-6 font-mono select-none">
            <p>{lang === 'en' ? `Thank you for your business! Powered by ${BRAND.name} — ${BRAND.tagline}` : `کاروبار کا شکریہ! ${BRAND.name} کی تصدیق شدہ رسید`}</p>
            <p className="mt-1">Generated electronically at {new Date().toLocaleString()}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
