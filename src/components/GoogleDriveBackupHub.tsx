import React, { useState } from 'react';
import {
  Database,
  X,
  Download,
  UploadCloud,
  RefreshCw,
  History,
  FolderTree,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  Cloud,
  ShieldCheck,
  Users,
  Truck,
  FileText,
  Package,
  Layers,
  Trash2,
  Calendar,
  Clock,
  Lock
} from 'lucide-react';
import { motion } from 'motion/react';
import {
  BackupModuleType,
  DriveBackupFileInfo,
  DriveFolderStructureIds,
  DRIVE_FILE_NAMES,
  DRIVE_FOLDER_NAMES,
  BACKUP_VERSION,
  formatDateTimeDdMmmYyyy,
  formatFileSize,
  inferSnapshotTypeFromName
} from '../services/googleDriveBackup';
import { UserRole } from '../types';

interface GoogleDriveBackupHubProps {
  language: 'en' | 'ur';
  businessName: string;
  userRole: UserRole;
  counts: {
    customers: number;
    suppliers: number;
    invoices: number;
    inventory: number;
    transactions: number;
    cashbook: number;
    totalSales: number;
    totalOutstandingPayments: number;
  };
  isDriveConnected: boolean;
  driveSyncStatus: 'idle' | 'syncing' | 'synced' | 'error';
  driveLastSync: string | null;
  driveLastModule: string | null;
  driveError: string | null;
  autoDriveSync: boolean;
  driveFolders: DriveFolderStructureIds | null;
  driveModuleFiles: Partial<Record<BackupModuleType, DriveBackupFileInfo>>;
  driveHistoryFiles: DriveBackupFileInfo[];
  onClose: () => void;
  onConnectDrive: () => void;
  onToggleAutoSync: (enabled: boolean) => void;
  onSyncAllToDrive: () => void;
  onSyncSingleModuleToDrive: (module: 'customers' | 'suppliers' | 'invoices' | 'inventory') => void;
  onTriggerDailyBackup: () => void;
  onTriggerHourlyBackup: () => void;
  onRestoreFromDriveFile: (fileId: string, fileName: string, fileSize?: string, modifiedTime?: string) => void;
  onDeleteDriveHistoryFile: (fileId: string, fileName: string) => void;
  onDownloadLocalExcel: (module: BackupModuleType) => void;
  onDownloadLocalJson: () => void;
  onUploadBackupFile: (e: React.ChangeEvent<HTMLInputElement>) => void;
  backupLabel: string;
  setBackupLabel: (val: string) => void;
  isSavingBackup: boolean;
  onCreateLocalCheckpoint: (e: React.FormEvent) => void;
  backups: any[];
  isLoadingBackups: boolean;
  onRestoreLocalCheckpoint: (id: string, label: string, counts?: any, timestamp?: string, size?: number) => void;
  onDeleteLocalCheckpoint: (id: string, label: string) => void;
}

export const GoogleDriveBackupHub: React.FC<GoogleDriveBackupHubProps> = ({
  language,
  businessName,
  userRole,
  counts,
  isDriveConnected,
  driveSyncStatus,
  driveLastSync,
  driveLastModule,
  driveError,
  autoDriveSync,
  driveFolders,
  driveModuleFiles,
  driveHistoryFiles,
  onClose,
  onConnectDrive,
  onToggleAutoSync,
  onSyncAllToDrive,
  onSyncSingleModuleToDrive,
  onTriggerDailyBackup,
  onTriggerHourlyBackup,
  onRestoreFromDriveFile,
  onDeleteDriveHistoryFile,
  onDownloadLocalExcel,
  onDownloadLocalJson,
  onUploadBackupFile,
  backupLabel,
  setBackupLabel,
  isSavingBackup,
  onCreateLocalCheckpoint,
  backups,
  isLoadingBackups,
  onRestoreLocalCheckpoint,
  onDeleteLocalCheckpoint
}) => {
  const isSyncing = driveSyncStatus === 'syncing';
  const isAdmin = userRole === 'Owner';
  const [historyFilter, setHistoryFilter] = useState<'all' | 'daily' | 'hourly' | 'manual' | 'emergency'>('all');

  const moduleRows: {
    key: 'customers' | 'suppliers' | 'invoices' | 'inventory';
    folderName: string;
    fileName: string;
    title: string;
    columnsDesc: string;
    count: number;
    icon: React.ReactNode;
  }[] = [
    {
      key: 'customers',
      folderName: DRIVE_FOLDER_NAMES.CUSTOMERS,
      fileName: DRIVE_FILE_NAMES.CUSTOMERS,
      title: language === 'en' ? 'Customers Worksheet & Backup' : 'گاہک بیک اپ شیٹ',
      columnsDesc:
        'Customer ID, Customer Name, Phone Number, Email Address, Complete Address, Registration Date (DD-MMM-YYYY)',
      count: counts.customers,
      icon: <Users className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
    },
    {
      key: 'suppliers',
      folderName: DRIVE_FOLDER_NAMES.SUPPLIERS,
      fileName: DRIVE_FILE_NAMES.SUPPLIERS,
      title: language === 'en' ? 'Suppliers Worksheet & Backup' : 'سپلائرز بیک اپ شیٹ',
      columnsDesc:
        'Supplier ID, Supplier Name, Contact Person, Phone Number, Email Address, Address',
      count: counts.suppliers,
      icon: <Truck className="h-4 w-4 text-amber-600 dark:text-amber-400" />
    },
    {
      key: 'invoices',
      folderName: DRIVE_FOLDER_NAMES.INVOICES,
      fileName: DRIVE_FILE_NAMES.INVOICES,
      title: language === 'en' ? 'Invoices Worksheet & Backup' : 'بل اور انوائس بیک اپ شیٹ',
      columnsDesc:
        'Invoice Number, Customer Name, Invoice Date, Due Date, Subtotal, Discount, Tax, Total Amount, Paid Amount, Remaining Balance, Payment Status',
      count: counts.invoices,
      icon: <FileText className="h-4 w-4 text-teal-600 dark:text-teal-400" />
    },
    {
      key: 'inventory',
      folderName: DRIVE_FOLDER_NAMES.INVENTORY,
      fileName: DRIVE_FILE_NAMES.INVENTORY,
      title: language === 'en' ? 'Inventory Worksheet & Backup' : 'اسٹاک اور انوینٹری بیک اپ شیٹ',
      columnsDesc:
        'Product ID, Product Name, Category, Available Quantity, Purchase Price, Selling Price, Total Stock Value, Stock Status',
      count: counts.inventory,
      icon: <Package className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
    }
  ];

  const completeFile = driveModuleFiles.complete;

  const filteredHistoryFiles = driveHistoryFiles.filter((file) => {
    if (historyFilter === 'all') return true;
    const type = file.snapshotType || inferSnapshotTypeFromName(file.name);
    return type === historyFilter;
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/65 backdrop-blur-xs flex justify-center items-center p-2.5 sm:p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 12 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        className="bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-800 rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 shadow-2xl relative my-auto text-left"
      >
        <button
          type="button"
          id="close-backups-modal"
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 transition-colors cursor-pointer p-1 rounded-lg"
        >
          <X className="h-5 w-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-start sm:items-center gap-3.5 border-b border-slate-100 dark:border-zinc-800 pb-4 mb-5 pr-8">
          <div className="p-3 bg-[#042F24] rounded-xl text-[#D4AF37] shrink-0 shadow-sm">
            <Database className="h-6 w-6" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white tracking-tight">
                {language === 'en'
                  ? 'Meezan Flow Accounting Excel Report & Backup Vault'
                  : 'میزان فلو پروفیشنل ایکسل رپورٹ اور بیک اپ سسٹم'}
              </h3>
              <span className="text-[11px] font-mono text-slate-500 dark:text-zinc-400">
                {DRIVE_FILE_NAMES.COMPLETE} · {BACKUP_VERSION}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-zinc-400 mt-0.5 leading-relaxed">
              {language === 'en'
                ? 'Publication-grade accounting workbook (Dashboard, Customers, Suppliers, Invoices, Inventory, Transactions, Cashbook) with in-place Google Drive updates, Daily & Hourly snapshots, and 5-step restore protection.'
                : 'گوگل ڈرائیو میں منظم فولڈرز اور پروفیشنل ایکسل (.xlsx) اکاؤنٹنگ رپورٹ کے ساتھ روزانہ اور گھنٹہ وار خودکار بیک اپ۔'}
            </p>
          </div>
        </div>

        {/* Administrator Security Notice if not Owner */}
        {!isAdmin && (
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 flex items-center gap-2.5">
            <Lock className="h-4 w-4 text-amber-700 dark:text-amber-400 shrink-0" />
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300">
              {language === 'en'
                ? 'Administrator Security Policy: Only authorized Administrators (Owner role) can restore or delete historical backups.'
                : 'سیکیورٹی پالیسی: صرف ایڈمنسٹریٹر (Owner) بیک اپ بحال یا حذف کر سکتے ہیں۔'}
            </p>
          </div>
        )}

        {/* Prominent Error Alert with Retry */}
        {driveError && (
          <div className="mb-5 p-3.5 rounded-xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800/70 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-5 w-5 text-red-600 dark:text-red-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-extrabold text-red-800 dark:text-red-300">
                  {language === 'en'
                    ? 'Google Drive Backup Sync Failed — Action Required'
                    : 'گوگل ڈرائیو بیک اپ سنک میں خرابی'}
                </p>
                <p className="text-[11px] text-red-600 dark:text-red-400 mt-0.5">{driveError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={isDriveConnected ? onSyncAllToDrive : onConnectDrive}
              className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold shrink-0 cursor-pointer transition-colors whitespace-nowrap"
            >
              {isDriveConnected
                ? language === 'en'
                  ? 'Retry Backup Sync'
                  : 'دوبارہ کوشش کریں'
                : language === 'en'
                  ? 'Reconnect Google Drive'
                  : 'گوگل ڈرائیو منسلک کریں'}
            </button>
          </div>
        )}

        {/* Section 1: Google Drive Connection & Live Synchronization Bar */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#042F24] to-[#064E3B] text-white mb-6 shadow-md border border-emerald-800/50">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Cloud className="h-4 w-4 text-[#D4AF37]" />
                <span className="text-xs font-extrabold uppercase tracking-wider text-[#D4AF37]">
                  {language === 'en'
                    ? 'In-Place Google Drive & Excel Sync Engine'
                    : 'گوگل ڈرائیو ان پلیس ایکسل سنک'}
                </span>
                <span className="text-xs text-emerald-200">·</span>
                <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-100">
                  {isSyncing ? (
                    <>
                      <RefreshCw className="h-3.5 w-3.5 animate-spin text-[#D4AF37]" />
                      <span>
                        {language === 'en'
                          ? 'Updating Meezan_Flow_Backup.xlsx...'
                          : 'اپڈیٹ ہو رہا ہے...'}
                      </span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                      <span>
                        {language === 'en'
                          ? 'Confirmed & Synchronized'
                          : 'تصدیق شدہ اور فعال'}
                      </span>
                    </>
                  )}
                </span>
              </div>

              <p className="text-xs text-emerald-100/90 leading-relaxed">
                {language === 'en'
                  ? `Updates the SAME "${DRIVE_FILE_NAMES.COMPLETE}" file ID in place whenever records change, preserving all worksheet styling, frozen headers, filters, and DD-MMM-YYYY dates.`
                  : `ہر تبدیلی پر "${DRIVE_FILE_NAMES.COMPLETE}" کو اسی فائل آئی ڈی پر مکمل فارمیٹنگ کے ساتھ اپڈیٹ کرتا ہے۔`}
              </p>

              <div className="flex items-center gap-3 flex-wrap text-[11px] text-emerald-200/85 pt-1 font-mono tabular-nums">
                <span>
                  {language === 'en' ? 'Last Successful Backup:' : 'آخری کامیاب بیک اپ:'}{' '}
                  <strong className="text-white">
                    {driveLastSync
                      ? formatDateTimeDdMmmYyyy(driveLastSync)
                      : language === 'en'
                        ? 'Not synced yet'
                        : 'ابھی تک نہیں'}
                  </strong>
                </span>
                {driveLastModule && (
                  <>
                    <span>·</span>
                    <span>
                      {language === 'en' ? 'Updated:' : 'اپڈیٹ:'}{' '}
                      <strong className="text-[#D4AF37]">{driveLastModule}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-col items-stretch sm:items-center lg:items-end gap-2.5 shrink-0">
              <div className="flex items-center gap-2 flex-wrap">
                {isAdmin && (
                  <button
                    type="button"
                    id="sync-all-drive-btn"
                    disabled={isSyncing}
                    onClick={onSyncAllToDrive}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-[#D4AF37] hover:bg-[#c59f2d] text-[#042F24] rounded-xl text-xs font-black shadow-sm transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap"
                  >
                    <RefreshCw className={`h-3.5 w-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                    <span>
                      {language === 'en'
                        ? 'Update Meezan_Flow_Backup.xlsx Now'
                        : 'ایکسل بیک اپ ابھی اپڈیٹ کریں'}
                    </span>
                  </button>
                )}

                {driveFolders?.rootFolderId?.startsWith('local:') && isAdmin && (
                  <button
                    type="button"
                    id="connect-google-drive-btn"
                    onClick={onConnectDrive}
                    className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white/10 hover:bg-white/20 text-white border border-white/20 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap"
                  >
                    <Cloud className="h-3.5 w-3.5 text-[#D4AF37]" />
                    <span>
                      {language === 'en' ? 'Link Google Account' : 'گوگل اکاؤنٹ لنک کریں'}
                    </span>
                  </button>
                )}
              </div>

              {/* Automatic Backup Updates Toggle */}
              {isAdmin && (
                <label className="inline-flex items-center gap-2 text-xs text-emerald-100 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={autoDriveSync}
                    onChange={(e) => onToggleAutoSync(e.target.checked)}
                    className="rounded border-emerald-400 text-[#059669] focus:ring-[#D4AF37]"
                  />
                  <span className="font-semibold">
                    {language === 'en'
                      ? 'Auto-update Meezan_Flow_Backup.xlsx on changes'
                      : 'ہر تبدیلی پر خودکار ایکسل اپڈیٹ'}
                  </span>
                </label>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Executive "Dashboard" Worksheet Summary Cards Preview */}
        <div className="mb-6 p-4 rounded-xl bg-slate-50 dark:bg-zinc-950/60 border border-slate-200/80 dark:border-zinc-800">
          <div className="flex items-center justify-between gap-2 mb-3 flex-wrap">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-4 w-4 text-[#059669] dark:text-[#D4AF37]" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200">
                {language === 'en'
                  ? 'Worksheet 1: "Dashboard" Executive Summary Cards (Included in Meezan_Flow_Backup.xlsx)'
                  : 'ورک شیٹ ۱: ڈیش بورڈ ایگزیکٹو سمری کارڈز'}
              </h4>
            </div>
            <span className="text-[11px] font-semibold text-slate-500 dark:text-zinc-400">
              {businessName}
            </span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-2.5">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Customers</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                {counts.customers.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Suppliers</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                {counts.suppliers.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Invoices</p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                {counts.invoices.toLocaleString()}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Total Inventory Products
              </p>
              <p className="text-sm font-black text-slate-900 dark:text-white mt-0.5 font-mono tabular-nums">
                {counts.inventory.toLocaleString()}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">Total Sales</p>
              <p className="text-sm font-black text-emerald-600 dark:text-emerald-400 mt-0.5 font-mono tabular-nums">
                Rs {Number(counts.totalSales || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Total Outstanding Payments
              </p>
              <p className="text-sm font-black text-rose-600 dark:text-rose-400 mt-0.5 font-mono tabular-nums">
                Rs {Number(counts.totalOutstandingPayments || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </p>
            </div>
            <div className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/60 dark:border-zinc-800">
              <p className="text-[10px] font-bold uppercase text-slate-400">
                Last Backup Date and Time
              </p>
              <p className="text-xs font-extrabold text-slate-900 dark:text-white mt-1 font-mono tabular-nums">
                {driveLastSync ? formatDateTimeDdMmmYyyy(driveLastSync) : 'Pending first sync'}
              </p>
            </div>
          </div>
        </div>

        {/* Section 3: Automated Daily Full & Change-Driven Hourly Backup Schedule */}
        <div className="mb-6 p-4 rounded-xl bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="h-4 w-4 text-[#059669] dark:text-[#D4AF37]" />
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-white">
                {language === 'en'
                  ? 'Automated Daily Full & Change-Driven Hourly Backups'
                  : 'روزانہ مکمل اور گھنٹہ وار بیک اپ شیڈول'}
              </h4>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-zinc-400 leading-relaxed">
              {language === 'en'
                ? '1 complete Daily snapshot is created automatically each day. Hourly snapshots run only when actual database changes have occurred. Historical backups are never automatically deleted.'
                : 'روزانہ ایک مکمل بیک اپ اور تبدیلی ہونے پر ہر گھنٹے خودکار بیک اپ محفوظ کیا جاتا ہے۔ پرانے بیک اپ کبھی خودکار طور پر حذف نہیں ہوتے۔'}
            </p>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <button
                type="button"
                disabled={isSyncing}
                onClick={onTriggerDailyBackup}
                className="px-3 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-[#042F24] dark:text-emerald-300 border border-emerald-200/70 dark:border-emerald-800/50 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Calendar className="h-3.5 w-3.5 text-[#059669]" />
                <span>{language === 'en' ? 'Run Daily Snapshot' : 'ڈیلی بیک اپ'}</span>
              </button>
              <button
                type="button"
                disabled={isSyncing}
                onClick={onTriggerHourlyBackup}
                className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-800 dark:text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap disabled:opacity-50"
              >
                <Clock className="h-3.5 w-3.5 text-[#059669]" />
                <span>{language === 'en' ? 'Run Hourly Check' : 'گھنٹہ وار چیک'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Section 4: Master Workbook (Meezan_Flow_Backup.xlsx) & Organized Module Files */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-900 dark:text-zinc-100 flex items-center gap-2">
              <FolderTree className="h-4 w-4 text-[#059669] dark:text-[#D4AF37]" />
              <span>
                {language === 'en'
                  ? `Master Accounting Workbook & Module Files (${DRIVE_FOLDER_NAMES.ROOT}/)`
                  : `ماسٹر ایکسل بیک اپ اور ماڈیول فائلیں (${DRIVE_FOLDER_NAMES.ROOT}/)`}
              </span>
            </h4>
            {driveFolders?.rootFolderId && !driveFolders.rootFolderId.startsWith('local:') && (
              <a
                href={`https://drive.google.com/drive/folders/${driveFolders.rootFolderId}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs font-bold text-[#059669] dark:text-[#D4AF37] hover:underline"
              >
                <span>{language === 'en' ? 'Open Folder in Google Drive' : 'گوگل ڈرائیو کھولیں'}</span>
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            )}
          </div>

          {/* Master Accounting Report Card (Meezan_Flow_Backup.xlsx) */}
          <div className="p-4 rounded-xl bg-emerald-50/70 dark:bg-emerald-950/25 border border-emerald-200 dark:border-emerald-900/60 mb-3 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="flex items-start gap-3 min-w-0">
              <div className="p-2.5 rounded-xl bg-[#042F24] text-[#D4AF37] shrink-0 mt-0.5">
                <Layers className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-[11px] font-mono font-bold text-[#059669] dark:text-emerald-400">
                    {DRIVE_FOLDER_NAMES.ROOT}/{DRIVE_FOLDER_NAMES.COMPLETE}/
                  </span>
                  <span className="text-xs font-black text-slate-900 dark:text-white">
                    {DRIVE_FILE_NAMES.COMPLETE}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 dark:text-zinc-400 mt-0.5">
                  {language === 'en'
                    ? 'Worksheets: 1. Dashboard · 2. Customers · 3. Suppliers · 4. Invoices · 5. Inventory · 6. Transactions · 7. Cashbook'
                    : 'ورک شیٹس: ڈیش بورڈ، گاہک، سپلائرز، انوائسز، انوینٹری، کھاتہ لین دین اور کیش بک'}
                </p>
                <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400 mt-1">
                  {completeFile?.modifiedTime && (
                    <span>Created/Updated: {formatDateTimeDdMmmYyyy(completeFile.modifiedTime)}</span>
                  )}
                  {completeFile?.size && (
                    <>
                      <span>·</span>
                      <span>Size: {formatFileSize(completeFile.size)}</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto justify-end shrink-0">
              <button
                type="button"
                onClick={() => onDownloadLocalExcel('complete')}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 hover:border-[#059669] text-slate-800 dark:text-zinc-200 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer transition-colors whitespace-nowrap"
              >
                <Download className="h-3.5 w-3.5 text-[#059669]" />
                <span>Download .xlsx</span>
              </button>
              {completeFile?.webViewLink && !completeFile.webViewLink.startsWith('/api/') && (
                <a
                  href={completeFile.webViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-3 py-1.5 rounded-lg bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-300 text-xs font-bold inline-flex items-center gap-1 whitespace-nowrap"
                >
                  <span>Sheets</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              {completeFile?.id && isAdmin && (
                <button
                  type="button"
                  onClick={() =>
                    onRestoreFromDriveFile(
                      completeFile.id,
                      completeFile.name,
                      completeFile.size,
                      completeFile.modifiedTime
                    )
                  }
                  className="px-3 py-1.5 rounded-lg bg-[#042F24] hover:bg-[#064E3B] text-[#D4AF37] text-xs font-extrabold cursor-pointer transition-colors whitespace-nowrap"
                >
                  {language === 'en' ? 'Restore Master Report' : 'مکمل بحال کریں'}
                </button>
              )}
            </div>
          </div>

          {/* 4 Module Excel Backups Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {moduleRows.map((mod) => {
              const driveFile = driveModuleFiles[mod.key];
              return (
                <div
                  key={mod.key}
                  className="p-3.5 rounded-xl bg-white dark:bg-zinc-900/80 border border-slate-200/80 dark:border-zinc-800 flex flex-col justify-between gap-3 shadow-2xs"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="p-2 rounded-lg bg-slate-100 dark:bg-zinc-800 shrink-0 mt-0.5">
                      {mod.icon}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10px] font-mono font-bold text-slate-400 truncate">
                          {mod.folderName}/{mod.fileName}
                        </span>
                        <span className="text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400 shrink-0">
                          {mod.count} rows
                          {driveFile?.size ? ` · ${formatFileSize(driveFile.size)}` : ''}
                        </span>
                      </div>
                      <h5 className="text-xs font-extrabold text-slate-900 dark:text-white mt-0.5">
                        {mod.title}
                      </h5>
                      <p className="text-[10px] text-slate-500 dark:text-zinc-400 mt-0.5 leading-snug">
                        {mod.columnsDesc}
                      </p>
                      {driveFile?.modifiedTime && (
                        <p className="text-[10px] font-mono tabular-nums text-emerald-600 dark:text-emerald-400 mt-1">
                          ✓ Updated: {formatDateTimeDdMmmYyyy(driveFile.modifiedTime)}
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80 flex-wrap">
                    <button
                      type="button"
                      onClick={() => onDownloadLocalExcel(mod.key)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-50 hover:bg-slate-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-slate-700 dark:text-zinc-200 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer transition-colors whitespace-nowrap"
                    >
                      <FileSpreadsheet className="h-3.5 w-3.5 text-[#059669]" />
                      <span>Download .xlsx</span>
                    </button>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          disabled={isSyncing}
                          onClick={() => onSyncSingleModuleToDrive(mod.key)}
                          className="px-2.5 py-1.5 rounded-lg bg-emerald-50 hover:bg-emerald-100 dark:bg-emerald-950/50 text-[#059669] dark:text-emerald-300 text-[11px] font-bold cursor-pointer transition-colors disabled:opacity-50 whitespace-nowrap"
                        >
                          {language === 'en' ? 'Sync File' : 'سنک'}
                        </button>
                        {driveFile?.id && (
                          <button
                            type="button"
                            onClick={() =>
                              onRestoreFromDriveFile(
                                driveFile.id,
                                driveFile.name,
                                driveFile.size,
                                driveFile.modifiedTime
                              )
                            }
                            className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 text-[11px] font-bold cursor-pointer transition-colors whitespace-nowrap"
                          >
                            {language === 'en' ? 'Restore' : 'بحال'}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 5: Unlimited Historical Backup Versions (Backup_History/) with Size, Date & Manual Admin Deletion */}
        <div className="mb-6 p-4 rounded-xl bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-200/80 dark:border-zinc-800">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
            <div>
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-800 dark:text-zinc-200 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5 text-[#059669]" />
                <span>
                  {DRIVE_FOLDER_NAMES.ROOT}/{DRIVE_FOLDER_NAMES.HISTORY}/ — All Retained Versions (
                  {driveHistoryFiles.length})
                </span>
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-zinc-400 mt-0.5">
                {language === 'en'
                  ? 'Retention Policy: Historical backups are never automatically deleted. Manual deletion requires administrator confirmation.'
                  : 'پالیسی: تاریخی بیک اپ کبھی خودکار طور پر حذف نہیں ہوتے۔'}
              </p>
            </div>

            {/* Interactive Filter Controls */}
            <div className="flex items-center gap-1 p-1 bg-slate-200/70 dark:bg-zinc-800 rounded-lg self-start sm:self-auto flex-wrap">
              {(
                [
                  { id: 'all', label: 'All' },
                  { id: 'daily', label: 'Daily' },
                  { id: 'hourly', label: 'Hourly' },
                  { id: 'manual', label: 'Manual' },
                  { id: 'emergency', label: 'Emergency' }
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setHistoryFilter(tab.id)}
                  className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                    historyFilter === tab.id
                      ? 'bg-white dark:bg-zinc-900 text-slate-900 dark:text-white shadow-2xs'
                      : 'text-slate-600 dark:text-zinc-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {filteredHistoryFiles.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-zinc-400 py-4 text-center">
              {language === 'en'
                ? 'No historical Excel snapshots match the selected filter.'
                : 'اس فلٹر میں کوئی تاریخی بیک اپ موجود نہیں۔'}
            </p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {filteredHistoryFiles.map((hFile) => {
                const sType = hFile.snapshotType || inferSnapshotTypeFromName(hFile.name);
                const typeLabel =
                  sType === 'daily'
                    ? 'Daily Full'
                    : sType === 'hourly'
                      ? 'Hourly Change'
                      : sType === 'emergency'
                        ? 'Emergency Pre-Restore'
                        : 'Dated Snapshot';
                return (
                  <div
                    key={hFile.id}
                    className="p-2.5 rounded-lg bg-white dark:bg-zinc-900 border border-slate-200/70 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-900 dark:text-zinc-100 truncate">
                        {hFile.name}
                      </p>
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono tabular-nums text-slate-500 dark:text-zinc-400 mt-0.5">
                        <span className="font-semibold text-[#059669] dark:text-[#D4AF37]">
                          {typeLabel}
                        </span>
                        <span>·</span>
                        <span>Created: {formatDateTimeDdMmmYyyy(hFile.modifiedTime)}</span>
                        <span>·</span>
                        <span>Size: {formatFileSize(hFile.size)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {hFile.webViewLink && (
                        <a
                          href={hFile.webViewLink}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="px-2.5 py-1 rounded bg-slate-100 hover:bg-slate-200 dark:bg-zinc-800 text-[11px] font-bold text-slate-700 dark:text-zinc-300 inline-flex items-center gap-1 whitespace-nowrap"
                        >
                          <Download className="h-3 w-3 text-[#059669]" />
                          <span>.xlsx</span>
                        </a>
                      )}
                      {isAdmin && (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              onRestoreFromDriveFile(
                                hFile.id,
                                hFile.name,
                                hFile.size,
                                hFile.modifiedTime
                              )
                            }
                            className="px-2.5 py-1 rounded bg-emerald-50 hover:bg-emerald-100 dark:bg-zinc-800 text-[#042F24] dark:text-[#D4AF37] text-[11px] font-extrabold cursor-pointer whitespace-nowrap"
                          >
                            {language === 'en' ? 'Restore' : 'بحال کریں'}
                          </button>
                          <button
                            type="button"
                            title="Delete backup (Administrator confirmation required)"
                            onClick={() => onDeleteDriveHistoryFile(hFile.id, hFile.name)}
                            className="p-1.5 rounded bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 cursor-pointer transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Section 6: Local Excel (.xlsx) / JSON Import & Export */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
          <div className="p-4 bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-200/70 dark:border-zinc-800/80 rounded-xl flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider mb-1">
                {language === 'en'
                  ? `Export ${DRIVE_FILE_NAMES.COMPLETE} Locally`
                  : 'مکمل ایکسل بیک اپ ڈاؤن لوڈ کریں'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal mb-3">
                {language === 'en'
                  ? `Download ${DRIVE_FILE_NAMES.COMPLETE} (with Dashboard, Customers, Suppliers, Invoices, Inventory, Transactions & Cashbook) or JSON archive.`
                  : 'مائیکروسافٹ ایکسل اور گوگل شیٹس کے لیے مکمل بیک اپ فائل ڈاؤن لوڈ کریں۔'}
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                type="button"
                onClick={() => onDownloadLocalExcel('complete')}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 bg-meezan-btn text-white transition-colors rounded-xl text-xs font-bold shadow-xs cursor-pointer whitespace-nowrap"
              >
                <FileSpreadsheet className="h-4 w-4 text-[#D4AF37]" />
                <span>
                  {language === 'en'
                    ? `Download ${DRIVE_FILE_NAMES.COMPLETE}`
                    : 'ایکسل (.xlsx) ڈاؤن لوڈ'}
                </span>
              </button>
              <button
                type="button"
                onClick={onDownloadLocalJson}
                className="px-3 py-2.5 bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 text-slate-700 dark:text-zinc-200 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
              >
                JSON
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50/70 dark:bg-zinc-950/40 border border-slate-200/70 dark:border-zinc-800/80 rounded-xl flex flex-col justify-between">
            <div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-zinc-200 uppercase tracking-wider mb-1">
                {language === 'en'
                  ? 'Protected Restore from Excel (.xlsx) or JSON File'
                  : 'ایکسل (.xlsx) یا JSON بیک اپ بحال کریں'}
              </h4>
              <p className="text-xs text-slate-500 dark:text-zinc-400 leading-normal mb-3">
                {language === 'en'
                  ? 'Verifies backup integrity, saves an automatic Emergency Pre-Restore Snapshot, and restores all modules with record count verification.'
                  : 'فائل کی درستگی چیک کر کے اور موجودہ کھاتے کا ایمرجنسی بیک اپ بنا کر ڈیٹا بحال کرتا ہے۔'}
              </p>
            </div>

            {isAdmin ? (
              <label className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border border-dashed border-slate-300 dark:border-zinc-700 hover:border-[#059669] dark:hover:border-[#D4AF37] text-slate-700 dark:text-zinc-300 transition-colors rounded-xl text-xs font-bold shadow-xs cursor-pointer">
                <UploadCloud className="h-4 w-4 text-[#059669]" />
                <span>
                  {language === 'en'
                    ? 'Select Backup File (.xlsx or .json)'
                    : 'بیک اپ فائل منتخب کریں (.xlsx / .json)'}
                </span>
                <input
                  type="file"
                  accept=".xlsx,.json"
                  onChange={onUploadBackupFile}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-zinc-800 text-xs text-slate-400 text-center font-semibold">
                {language === 'en' ? 'Administrator (Owner) role required' : 'صرف ایڈمنسٹریٹر کے لیے'}
              </div>
            )}
          </div>
        </div>

        {/* Section 7: Manual Safety Checkpoint & Database Snapshots */}
        {isAdmin && (
          <div className="p-4 bg-slate-50 dark:bg-zinc-950/30 border border-slate-200/80 dark:border-zinc-800 rounded-xl mb-5">
            <h4 className="text-xs font-bold text-[#042F24] dark:text-[#D4AF37] uppercase tracking-wider mb-2">
              {language === 'en'
                ? 'Create a Manual Administrator Checkpoint (+ Sync Excel Report)'
                : 'دستی بیک اپ پوائنٹ محفوظ کریں'}
            </h4>
            <form onSubmit={onCreateLocalCheckpoint} className="flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                required
                placeholder={
                  language === 'en'
                    ? 'e.g. Month-end closing, Before bulk price update, Audit checkpoint...'
                    : 'مثال کے طور پر: ماہانہ کلوزنگ، عید سیل سے پہلے...'
                }
                value={backupLabel}
                onChange={(e) => setBackupLabel(e.target.value)}
                className="flex-1 px-3.5 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-[#059669]"
              />
              <button
                type="submit"
                disabled={isSavingBackup}
                className="px-4 py-2.5 bg-meezan-btn text-white rounded-xl text-xs font-bold transition-colors shrink-0 cursor-pointer flex items-center justify-center gap-1.5 shadow-xs disabled:opacity-50 whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 text-[#D4AF37] ${isSavingBackup ? 'animate-spin' : ''}`}
                />
                <span>{language === 'en' ? 'Save Checkpoint' : 'سیو بیک اپ'}</span>
              </button>
            </form>
          </div>
        )}

        {/* Database Checkpoints List (Unlimited Retention, Size & Date Displayed, Admin Delete) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-slate-100 dark:border-zinc-800 pb-2">
            <h4 className="text-xs font-extrabold text-slate-900 dark:text-zinc-200 flex items-center gap-1.5 uppercase tracking-wider">
              <History className="h-3.5 w-3.5 text-slate-400" />
              <span>
                {language === 'en'
                  ? `Database Checkpoints & Emergency Snapshots (${backups.length})`
                  : `محفوظ ڈیٹا بیس چیک پوائنٹس (${backups.length})`}
              </span>
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
              {language === 'en' ? 'Unlimited Retention Active' : 'مستقل ریکارڈ'}
            </span>
          </div>

          {isLoadingBackups ? (
            <div className="py-8 text-center text-xs text-slate-400 flex flex-col items-center justify-center gap-2">
              <RefreshCw className="h-5 w-5 animate-spin text-[#059669]" />
              <span>
                {language === 'en' ? 'Querying stored checkpoints...' : 'پوائنٹس لوڈ ہو رہے ہیں...'}
              </span>
            </div>
          ) : backups.length === 0 ? (
            <div className="py-8 text-center border border-dashed border-slate-200 dark:border-zinc-800 rounded-xl text-xs text-slate-400">
              <p>
                {language === 'en'
                  ? 'No database checkpoints created yet.'
                  : 'کوئی بیک اپ نہیں پایا گیا۔'}
              </p>
            </div>
          ) : (
            <div className="space-y-2 max-h-52 overflow-y-auto pr-1">
              {backups.map((bc: any) => {
                const bType =
                  bc.backupType ||
                  (bc.label?.toLowerCase().includes('emergency')
                    ? 'emergency'
                    : bc.label?.toLowerCase().includes('daily')
                      ? 'daily'
                      : bc.label?.toLowerCase().includes('hourly')
                        ? 'hourly'
                        : bc.label?.startsWith('Before') || bc.label?.includes('Auto-backup')
                          ? 'auto'
                          : 'manual');

                const typeLabel =
                  bType === 'emergency'
                    ? 'Emergency Pre-Restore'
                    : bType === 'daily'
                      ? 'Daily Full'
                      : bType === 'hourly'
                        ? 'Hourly Change'
                        : bType === 'auto'
                          ? 'Safety Auto-Save'
                          : 'Manual Checkpoint';

                return (
                  <div
                    key={bc.id}
                    className="p-3 bg-white dark:bg-zinc-900/60 border border-slate-200/70 dark:border-zinc-800 rounded-xl hover:border-slate-300 dark:hover:border-zinc-700 transition-all flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-2xs"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-slate-900 dark:text-zinc-100 break-words">
                          {bc.label}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 flex-wrap text-[11px] text-slate-500 dark:text-zinc-400 font-mono tabular-nums">
                        <span className="font-semibold text-[#059669] dark:text-[#D4AF37]">
                          {typeLabel}
                        </span>
                        <span>·</span>
                        <span>Created: {formatDateTimeDdMmmYyyy(bc.timestamp)}</span>
                        <span>·</span>
                        <span>Size: {formatFileSize(bc.size)}</span>
                        {bc.counts && (
                          <>
                            <span>·</span>
                            <span>
                              {bc.counts.customers ?? 0} Cust / {bc.counts.suppliers ?? 0} Supp /{' '}
                              {bc.counts.invoices ?? 0} Inv / {bc.counts.inventory ?? 0} Stock
                            </span>
                          </>
                        )}
                      </div>
                    </div>

                    {isAdmin && (
                      <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                        <button
                          type="button"
                          onClick={() =>
                            onRestoreLocalCheckpoint(
                              bc.id,
                              bc.label,
                              bc.counts,
                              bc.timestamp,
                              bc.size
                            )
                          }
                          className="px-3 py-1.5 text-[#042F24] dark:text-[#D4AF37] bg-emerald-50 hover:bg-emerald-100 dark:bg-zinc-800 dark:hover:bg-zinc-700 rounded-lg text-xs font-extrabold transition-all duration-200 cursor-pointer whitespace-nowrap"
                        >
                          {language === 'en' ? 'Restore' : 'بحال کریں'}
                        </button>
                        <button
                          type="button"
                          title="Delete checkpoint (Administrator confirmation required)"
                          onClick={() => onDeleteLocalCheckpoint(bc.id, bc.label)}
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 dark:bg-red-950/30 text-red-600 dark:text-red-400 cursor-pointer transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};
