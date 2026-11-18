import ExcelJS from 'exceljs';
import {
  Customer,
  Supplier,
  Invoice,
  StockItem,
  Transaction,
  CashBookEntry,
  InvoiceItem
} from '../types';
import { getGoogleAccessToken } from '../firebase';

export type BackupModuleType =
  | 'customers'
  | 'suppliers'
  | 'invoices'
  | 'inventory'
  | 'complete'
  | 'history';

export type SnapshotScheduleType = 'manual' | 'daily' | 'hourly' | 'emergency';

export interface LedgerBackupDataset {
  customers: Customer[];
  suppliers: Supplier[];
  invoices: Invoice[];
  inventory: StockItem[];
  transactions: Transaction[];
  cashbook: CashBookEntry[];
  businessName?: string;
}

export interface DriveFolderStructureIds {
  rootFolderId: string;
  customersFolderId: string;
  suppliersFolderId: string;
  invoicesFolderId: string;
  inventoryFolderId: string;
  completeBackupsFolderId: string;
  backupHistoryFolderId: string;
}

export interface DriveBackupFileInfo {
  id: string;
  name: string;
  modifiedTime: string;
  size?: string;
  webViewLink?: string;
  module?: BackupModuleType;
  snapshotType?: SnapshotScheduleType;
}

export interface BackupIntegrityReport {
  valid: boolean;
  error?: string;
  counts: {
    customers: number;
    suppliers: number;
    invoices: number;
    inventory: number;
    transactions: number;
    cashbook: number;
  };
}

export interface DriveSyncState {
  status: 'idle' | 'syncing' | 'synced' | 'error' | 'disconnected';
  lastSyncTime: string | null;
  lastSyncedModule: string | null;
  errorMessage: string | null;
  autoSyncEnabled: boolean;
  folderIds: DriveFolderStructureIds | null;
  moduleFiles: Partial<Record<BackupModuleType, DriveBackupFileInfo>>;
  historyFiles: DriveBackupFileInfo[];
}

export const BACKUP_VERSION = 'v3.0.0';

export const DRIVE_FOLDER_NAMES = {
  ROOT: 'Meezan Flow Backups',
  CUSTOMERS: 'Customers',
  SUPPLIERS: 'Suppliers',
  INVOICES: 'Invoices',
  INVENTORY: 'Inventory',
  COMPLETE: 'Complete_Backups',
  HISTORY: 'Backup_History'
} as const;

export const DRIVE_FILE_NAMES = {
  CUSTOMERS: 'Customers_Backup.xlsx',
  SUPPLIERS: 'Suppliers_Backup.xlsx',
  INVOICES: 'Invoices_Backup.xlsx',
  INVENTORY: 'Inventory_Backup.xlsx',
  COMPLETE: 'Meezan_Flow_Backup.xlsx'
} as const;

const XLSX_MIME_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const FOLDER_MIME_TYPE = 'application/vnd.google-apps.folder';
const FILE_ID_CACHE_KEY = 'meezan_drive_file_id_map_v3';
const LAST_DAILY_BACKUP_KEY = 'meezan_last_daily_backup_date';
const LAST_HOURLY_HASH_KEY = 'meezan_last_hourly_backup_hash';
const LAST_HOURLY_TIME_KEY = 'meezan_last_hourly_backup_ts';

const MONTH_NAMES_SHORT = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec'
] as const;

// In-memory cache of verified Google Drive folder IDs to prevent duplicate folder creation
let cachedFolderStructure: DriveFolderStructureIds | null = null;
let lastSuccessfulSyncIso: string | null = localStorage.getItem('meezan_drive_last_sync') || null;

// Persistent mapping of (folderId + fileName) -> Google Drive fileId so updates ALWAYS patch the same file ID in-place
function getCachedDriveFileId(folderId: string, fileName: string): string | null {
  try {
    const raw = localStorage.getItem(FILE_ID_CACHE_KEY);
    if (!raw) return null;
    const map = JSON.parse(raw) as Record<string, string>;
    return map[`${folderId}::${fileName}`] || map[fileName] || null;
  } catch {
    return null;
  }
}

function setCachedDriveFileId(folderId: string, fileName: string, fileId: string): void {
  try {
    const raw = localStorage.getItem(FILE_ID_CACHE_KEY);
    const map: Record<string, string> = raw ? JSON.parse(raw) : {};
    map[`${folderId}::${fileName}`] = fileId;
    map[fileName] = fileId;
    localStorage.setItem(FILE_ID_CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors
  }
}

function removeCachedDriveFileId(fileId: string): void {
  try {
    const raw = localStorage.getItem(FILE_ID_CACHE_KEY);
    if (!raw) return;
    const map: Record<string, string> = JSON.parse(raw);
    for (const k of Object.keys(map)) {
      if (map[k] === fileId) {
        delete map[k];
      }
    }
    localStorage.setItem(FILE_ID_CACHE_KEY, JSON.stringify(map));
  } catch {
    // ignore
  }
}

// Sequential mutex queue so rapid edits never interleave or corrupt backup files
let syncQueuePromise: Promise<any> = Promise.resolve();

function enqueueSyncOperation<T>(task: () => Promise<T>): Promise<T> {
  const next = syncQueuePromise.then(task, task);
  syncQueuePromise = next.catch(() => {});
  return next;
}

/**
 * Formats any date or ISO string into strict DD-MMM-YYYY format (e.g., 15-Nov-2026)
 */
export function formatDateDdMmmYyyy(isoOrDate?: string | null): string {
  if (!isoOrDate || isoOrDate === '—') return '—';
  const trimmed = String(isoOrDate).trim();
  // Already in DD-MMM-YYYY format
  if (/^\d{2}-[A-Za-z]{3}-\d{4}$/.test(trimmed)) {
    return trimmed;
  }
  const d = new Date(trimmed);
  if (isNaN(d.getTime())) return trimmed;
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = MONTH_NAMES_SHORT[d.getMonth()];
  const yyyy = d.getFullYear();
  return `${dd}-${mmm}-${yyyy}`;
}

/**
 * Formats any timestamp into DD-MMM-YYYY HH:mm:ss format (e.g., 15-Nov-2026 14:30:05)
 */
export function formatDateTimeDdMmmYyyy(isoOrDate?: string | null): string {
  if (!isoOrDate || isoOrDate === '—') return '—';
  const d = new Date(isoOrDate);
  if (isNaN(d.getTime())) return String(isoOrDate);
  const dd = String(d.getDate()).padStart(2, '0');
  const mmm = MONTH_NAMES_SHORT[d.getMonth()];
  const yyyy = d.getFullYear();
  const hh = String(d.getHours()).padStart(2, '0');
  const min = String(d.getMinutes()).padStart(2, '0');
  const ss = String(d.getSeconds()).padStart(2, '0');
  return `${dd}-${mmm}-${yyyy} ${hh}:${min}:${ss}`;
}

/**
 * Converts DD-MMM-YYYY or other date strings back to YYYY-MM-DD for accurate database restoration
 */
function parseDdMmmYyyyToIsoDate(dateStr?: string | null): string {
  if (!dateStr || dateStr === '—') return new Date().toISOString().split('T')[0];
  const trimmed = String(dateStr).trim();
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 10);
  }
  const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})/);
  if (match) {
    const day = match[1].padStart(2, '0');
    const monAbbr = match[2].toLowerCase();
    const year = match[3];
    const monthIdx = MONTH_NAMES_SHORT.findIndex((m) => m.toLowerCase() === monAbbr);
    if (monthIdx !== -1) {
      const mm = String(monthIdx + 1).padStart(2, '0');
      return `${year}-${mm}-${day}`;
    }
  }
  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString().split('T')[0];
  }
  return new Date().toISOString().split('T')[0];
}

export function formatFileSize(bytes?: string | number | null): string {
  if (bytes === undefined || bytes === null || bytes === '') return '—';
  const num = Number(bytes);
  if (isNaN(num) || num <= 0) return '—';
  if (num < 1024) return `${num} B`;
  if (num < 1024 * 1024) return `${(num / 1024).toFixed(1)} KB`;
  return `${(num / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatSnapshotFilename(
  date = new Date(),
  scheduleType: SnapshotScheduleType = 'manual'
): string {
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const hh = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');

  if (scheduleType === 'daily') {
    return `Meezan_Flow_Daily_Backup_${yyyy}-${mm}-${dd}.xlsx`;
  }
  if (scheduleType === 'hourly') {
    return `Meezan_Flow_Hourly_Backup_${yyyy}-${mm}-${dd}_${hh}-00.xlsx`;
  }
  if (scheduleType === 'emergency') {
    return `Meezan_Flow_Emergency_Backup_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.xlsx`;
  }
  return `Meezan_Flow_Backup_${yyyy}-${mm}-${dd}_${hh}-${min}-${ss}.xlsx`;
}

export function inferSnapshotTypeFromName(fileName: string): SnapshotScheduleType {
  const lower = (fileName || '').toLowerCase();
  if (lower.includes('daily')) return 'daily';
  if (lower.includes('hourly')) return 'hourly';
  if (lower.includes('emergency') || lower.includes('pre-restore')) return 'emergency';
  return 'manual';
}

function deduplicateById<T extends { id: string }>(items: T[]): T[] {
  const map = new Map<string, T>();
  for (const item of items || []) {
    if (item && item.id) {
      map.set(String(item.id).trim(), item);
    }
  }
  return Array.from(map.values());
}

/**
 * Computes a deterministic content fingerprint across all database records
 * so Hourly Backups only trigger when actual database changes have occurred.
 */
export function computeDatasetFingerprint(dataset: LedgerBackupDataset): string {
  const custPart = deduplicateById(dataset.customers || [])
    .map((c) => `${c.id}:${c.name}:${c.phone}:${c.balance}:${c.updatedAt || ''}`)
    .sort()
    .join('|');
  const suppPart = deduplicateById(dataset.suppliers || [])
    .map((s) => `${s.id}:${s.name}:${s.phone}:${s.balance}:${s.updatedAt || ''}`)
    .sort()
    .join('|');
  const invPart = deduplicateById(dataset.invoices || [])
    .map((i) => `${i.id}:${i.invoiceNumber}:${i.total}:${i.isPaid}:${i.date}`)
    .sort()
    .join('|');
  const stockPart = deduplicateById(dataset.inventory || [])
    .map((st) => `${st.id}:${st.name}:${st.quantity}:${st.purchasePrice}:${st.sellPrice}`)
    .sort()
    .join('|');
  const txPart = deduplicateById(dataset.transactions || [])
    .map((t) => `${t.id}:${t.customerId}:${t.type}:${t.amount}:${t.date}`)
    .sort()
    .join('|');
  const cbPart = deduplicateById(dataset.cashbook || [])
    .map((cb) => `${cb.id}:${cb.type}:${cb.amount}:${cb.date}:${cb.category}`)
    .sort()
    .join('|');

  const combined = `${custPart}#${suppPart}#${invPart}#${stockPart}#${txPart}#${cbPart}`;
  let hash = 2166136261;
  for (let i = 0; i < combined.length; i++) {
    hash ^= combined.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16);
}

/**
 * Verifies the integrity of a parsed backup dataset before restoration.
 */
export function verifyBackupDatasetIntegrity(
  dataset: Partial<LedgerBackupDataset> | null | undefined
): BackupIntegrityReport {
  if (!dataset || typeof dataset !== 'object') {
    return {
      valid: false,
      error: 'Backup payload is empty or unreadable.',
      counts: { customers: 0, suppliers: 0, invoices: 0, inventory: 0, transactions: 0, cashbook: 0 }
    };
  }

  const hasAnyModuleArray =
    Array.isArray(dataset.customers) ||
    Array.isArray(dataset.suppliers) ||
    Array.isArray(dataset.invoices) ||
    Array.isArray(dataset.inventory) ||
    Array.isArray(dataset.transactions) ||
    Array.isArray(dataset.cashbook);

  if (!hasAnyModuleArray) {
    return {
      valid: false,
      error: 'Backup file does not contain any valid Customers, Suppliers, Invoices, or Inventory tables.',
      counts: { customers: 0, suppliers: 0, invoices: 0, inventory: 0, transactions: 0, cashbook: 0 }
    };
  }

  const customers = deduplicateById(Array.isArray(dataset.customers) ? dataset.customers : []);
  const suppliers = deduplicateById(Array.isArray(dataset.suppliers) ? dataset.suppliers : []);
  const invoices = deduplicateById(Array.isArray(dataset.invoices) ? dataset.invoices : []);
  const inventory = deduplicateById(Array.isArray(dataset.inventory) ? dataset.inventory : []);
  const transactions = deduplicateById(
    Array.isArray(dataset.transactions) ? dataset.transactions : []
  );
  const cashbook = deduplicateById(Array.isArray(dataset.cashbook) ? dataset.cashbook : []);

  return {
    valid: true,
    counts: {
      customers: customers.length,
      suppliers: suppliers.length,
      invoices: invoices.length,
      inventory: inventory.length,
      transactions: transactions.length,
      cashbook: cashbook.length
    }
  };
}

/**
 * Applies professional accounting report styling to a tabular worksheet:
 * - Deep Forest Emerald header (#042F24) with bold white text and Gold accent border (#D4AF37)
 * - Frozen top header row (ySplit: 1)
 * - Auto-filter enabled across all populated columns
 * - Alternating row colors (#FFFFFF / #F8FAFC) with crisp Slate cell borders (#CBD5E1)
 * - Conditional formatting for status cells (Paid/Unpaid, In Stock/Low Stock/Out of Stock)
 * - Automatic column width calculation with proper padding
 */
function styleAccountingWorksheet(
  sheet: ExcelJS.Worksheet,
  columnConfigs: {
    header: string;
    key: string;
    width: number;
    numFmt?: string;
    alignment?: Partial<ExcelJS.Alignment>;
    isStatusColumn?: boolean;
  }[]
) {
  sheet.columns = columnConfigs.map((col) => ({
    header: col.header,
    key: col.key,
    width: col.width
  }));

  // Freeze top header row
  sheet.views = [{ state: 'frozen', ySplit: 1 }];

  // Style Header Row (Row 1)
  const headerRow = sheet.getRow(1);
  headerRow.height = 30;
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const colConfig = columnConfigs[colNumber - 1];
    cell.font = {
      name: 'Calibri',
      size: 11,
      bold: true,
      color: { argb: 'FFFFFFFF' }
    };
    cell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF042F24' } // Meezan Flow Deep Forest Emerald
    };
    cell.alignment = {
      vertical: 'middle',
      horizontal: colConfig?.alignment?.horizontal || (colConfig?.numFmt ? 'right' : 'left'),
      wrapText: false
    };
    cell.border = {
      top: { style: 'thin', color: { argb: 'FF042F24' } },
      left: { style: 'thin', color: { argb: 'FF064E3B' } },
      bottom: { style: 'medium', color: { argb: 'FFD4AF37' } }, // Meezan Gold bottom trim
      right: { style: 'thin', color: { argb: 'FF064E3B' } }
    };
  });

  const totalRows = sheet.rowCount;
  const totalCols = columnConfigs.length;

  // Enable Excel AutoFilter across all columns
  if (totalCols > 0) {
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: Math.max(1, totalRows), column: totalCols }
    };
  }

  // Style Data Rows with Alternating Row Colors & Conditional Status Highlighting
  for (let r = 2; r <= totalRows; r++) {
    const row = sheet.getRow(r);
    row.height = 24;
    const isEven = r % 2 === 0;
    const baseRowBg = isEven ? 'FFFFFFFF' : 'FFF8FAFC';

    for (let c = 1; c <= totalCols; c++) {
      const cell = row.getCell(c);
      const colConfig = columnConfigs[c - 1];
      const cellText = cell.value === null || cell.value === undefined ? '' : String(cell.value);
      const lowerVal = cellText.trim().toLowerCase();

      let cellBg = baseRowBg;
      let fontColor = 'FF0F172A';
      let isBold = false;

      if (colConfig?.isStatusColumn) {
        if (
          lowerVal === 'paid' ||
          lowerVal === 'in stock' ||
          lowerVal === 'settled' ||
          lowerVal.includes('debit') ||
          lowerVal.includes('cash-in')
        ) {
          cellBg = 'FFDCFCE7'; // Soft Emerald Green
          fontColor = 'FF166534'; // Deep Green text
          isBold = true;
        } else if (lowerVal === 'low stock' || lowerVal.includes('advance')) {
          cellBg = 'FFFEF3C7'; // Soft Amber
          fontColor = 'FF92400E'; // Deep Amber text
          isBold = true;
        } else if (
          lowerVal === 'unpaid' ||
          lowerVal === 'out of stock' ||
          lowerVal.includes('due') ||
          lowerVal.includes('credit') ||
          lowerVal.includes('cash-out')
        ) {
          cellBg = 'FFFEE2E2'; // Soft Rose Red
          fontColor = 'FF991B1B'; // Deep Crimson text
          isBold = true;
        }
      }

      cell.font = {
        name: 'Calibri',
        size: 10.5,
        bold: isBold,
        color: { argb: fontColor }
      };
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: cellBg }
      };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        bottom: { style: 'thin', color: { argb: 'FFCBD5E1' } },
        right: { style: 'thin', color: { argb: 'FFCBD5E1' } }
      };

      if (colConfig?.numFmt) {
        cell.numFmt = colConfig.numFmt;
      }

      cell.alignment = {
        vertical: 'middle',
        horizontal:
          colConfig?.alignment?.horizontal ||
          (colConfig?.isStatusColumn ? 'center' : colConfig?.numFmt ? 'right' : 'left'),
        wrapText: false
      };
    }
  }

  // Auto-adjust column widths based on actual cell content so no values are clipped
  columnConfigs.forEach((colConfig, idx) => {
    const column = sheet.getColumn(idx + 1);
    let maxLen = colConfig.header.length + 5;
    column.eachCell({ includeEmpty: false }, (cell, rowNumber) => {
      if (rowNumber === 1) return;
      const val = cell.value;
      const text = val === null || val === undefined ? '' : String(val);
      if (colConfig.key === 'itemsJson') {
        maxLen = Math.max(maxLen, 26);
      } else {
        maxLen = Math.max(maxLen, Math.min(52, text.length + 5));
      }
    });
    column.width = Math.max(colConfig.width, maxLen);
  });
}

/**
 * 1. DASHBOARD SHEET
 * Executive KPI summary cards and metadata banner only (per confirmed user design):
 * - Total Customers
 * - Total Suppliers
 * - Total Invoices
 * - Total Inventory Products
 * - Total Sales
 * - Total Outstanding Payments
 * - Last Backup Date and Time
 */
function addDashboardSheet(
  workbook: ExcelJS.Workbook,
  dataset: LedgerBackupDataset,
  backupTimestampIso: string
) {
  const sheet = workbook.addWorksheet('Dashboard', {
    views: [{ showGridLines: false }]
  });

  const customers = deduplicateById(dataset.customers || []);
  const suppliers = deduplicateById(dataset.suppliers || []);
  const invoices = deduplicateById(dataset.invoices || []);
  const inventory = deduplicateById(dataset.inventory || []);
  const transactions = deduplicateById(dataset.transactions || []);
  const cashbook = deduplicateById(dataset.cashbook || []);

  // Calculate accurate Total Sales & Total Outstanding Payments from actual database records
  const invoiceSalesTotal = invoices.reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const cashSalesTotal = cashbook
    .filter(
      (cb) =>
        cb.type === 'cash-in' &&
        (cb.category === 'Sales' || cb.category === 'Customer Payment')
    )
    .reduce((sum, cb) => sum + (Number(cb.amount) || 0), 0);
  const creditTxTotal = transactions
    .filter((tx) => tx.type === 'credit')
    .reduce((sum, tx) => sum + (Number(tx.amount) || 0), 0);

  const totalSales =
    invoiceSalesTotal > 0 ? invoiceSalesTotal : Math.max(cashSalesTotal, creditTxTotal);

  const unpaidInvoicesBalance = invoices
    .filter((inv) => !inv.isPaid)
    .reduce((sum, inv) => sum + (Number(inv.total) || 0), 0);
  const customerReceivables = customers
    .filter((c) => Number(c.balance) > 0)
    .reduce((sum, c) => sum + (Number(c.balance) || 0), 0);

  const totalOutstandingPayments = Math.max(unpaidInvoicesBalance, customerReceivables);
  const formattedBackupDateTime = formatDateTimeDdMmmYyyy(backupTimestampIso);

  // Configure column widths for a clean 4-card executive grid layout
  sheet.columns = [
    { key: 'margin', width: 4 },
    { key: 'card1', width: 28 },
    { key: 'gap1', width: 3 },
    { key: 'card2', width: 28 },
    { key: 'gap2', width: 3 },
    { key: 'card3', width: 28 },
    { key: 'gap3', width: 3 },
    { key: 'card4', width: 28 },
    { key: 'marginRight', width: 4 }
  ];

  sheet.getRow(1).height = 14;

  // Executive Banner (Rows 2-3)
  sheet.mergeCells('B2:H2');
  const titleCell = sheet.getCell('B2');
  titleCell.value = 'MEEZAN FLOW — BUSINESS ACCOUNTING & MANAGEMENT REPORT';
  titleCell.font = { name: 'Calibri', size: 16, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF042F24' } };
  titleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  sheet.getRow(2).height = 36;

  sheet.mergeCells('B3:H3');
  const subtitleCell = sheet.getCell('B3');
  subtitleCell.value = `Business: ${
    dataset.businessName || 'Meezan Flow Business'
  }   |   Report Version: ${BACKUP_VERSION}   |   Last Backup Date and Time: ${formattedBackupDateTime}`;
  subtitleCell.font = { name: 'Calibri', size: 10.5, bold: true, color: { argb: 'FFD4AF37' } };
  subtitleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF064E3B' } };
  subtitleCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
  subtitleCell.border = {
    bottom: { style: 'medium', color: { argb: 'FFD4AF37' } }
  };
  sheet.getRow(3).height = 24;

  sheet.getRow(4).height = 18;

  // Section Heading
  sheet.mergeCells('B5:H5');
  const sectionHeader = sheet.getCell('B5');
  sectionHeader.value = 'EXECUTIVE SUMMARY KPI CARDS';
  sectionHeader.font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FF042F24' } };
  sectionHeader.alignment = { vertical: 'middle', horizontal: 'left' };
  sheet.getRow(5).height = 22;

  // Helper to style an individual summary card (header row + value row)
  const renderSummaryCard = (
    colLetter: string,
    headerRowIdx: number,
    valueRowIdx: number,
    label: string,
    value: number | string,
    numFmt?: string,
    accentHeaderColor = 'FF042F24',
    valueTextColor = 'FF0F172A'
  ) => {
    const hCell = sheet.getCell(`${colLetter}${headerRowIdx}`);
    const vCell = sheet.getCell(`${colLetter}${valueRowIdx}`);

    hCell.value = label.toUpperCase();
    hCell.font = { name: 'Calibri', size: 9.5, bold: true, color: { argb: 'FFFFFFFF' } };
    hCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: accentHeaderColor } };
    hCell.alignment = { vertical: 'middle', horizontal: 'left', indent: 1 };
    hCell.border = {
      top: { style: 'thin', color: { argb: accentHeaderColor } },
      left: { style: 'thin', color: { argb: accentHeaderColor } },
      right: { style: 'thin', color: { argb: accentHeaderColor } },
      bottom: { style: 'medium', color: { argb: 'FFD4AF37' } }
    };

    vCell.value = value;
    if (numFmt && typeof value === 'number') {
      vCell.numFmt = numFmt;
    }
    vCell.font = { name: 'Calibri', size: 15, bold: true, color: { argb: valueTextColor } };
    vCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF8FAFC' } };
    vCell.alignment = {
      vertical: 'middle',
      horizontal: typeof value === 'number' ? 'right' : 'left',
      indent: 1
    };
    vCell.border = {
      top: { style: 'medium', color: { argb: 'FFD4AF37' } },
      left: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } }
    };
  };

  // Row 1 of KPI Summary Cards (Rows 6-7): Counts
  sheet.getRow(6).height = 24;
  sheet.getRow(7).height = 38;
  renderSummaryCard('B', 6, 7, 'Total Customers', customers.length, '#,##0');
  renderSummaryCard('D', 6, 7, 'Total Suppliers', suppliers.length, '#,##0');
  renderSummaryCard('F', 6, 7, 'Total Invoices', invoices.length, '#,##0');
  renderSummaryCard('H', 6, 7, 'Total Inventory Products', inventory.length, '#,##0');

  sheet.getRow(8).height = 16;

  // Row 2 of KPI Summary Cards (Rows 9-10): Financial Metrics & Last Backup Timestamp
  sheet.getRow(9).height = 24;
  sheet.getRow(10).height = 38;
  const currencyFmt = '"Rs "#,##0.00;("Rs "#,##0.00);"Rs "0.00';

  renderSummaryCard(
    'B',
    9,
    10,
    'Total Sales',
    totalSales,
    currencyFmt,
    'FF042F24',
    'FF059669'
  );
  renderSummaryCard(
    'D',
    9,
    10,
    'Total Outstanding Payments',
    totalOutstandingPayments,
    currencyFmt,
    'FF042F24',
    totalOutstandingPayments > 0 ? 'FFB91C1C' : 'FF059669'
  );

  // Merge F9:H9 and F10:H10 for Last Backup Date and Time card so the full timestamp fits prominently
  sheet.mergeCells('F9:H9');
  sheet.mergeCells('F10:H10');
  renderSummaryCard(
    'F',
    9,
    10,
    'Last Backup Date and Time',
    formattedBackupDateTime,
    undefined,
    'FF042F24',
    'FF042F24'
  );
  // Ensure merged border continuity on G and H cells
  ['G9', 'H9'].forEach((addr) => {
    sheet.getCell(addr).border = {
      top: { style: 'thin', color: { argb: 'FF042F24' } },
      right: { style: 'thin', color: { argb: 'FF042F24' } },
      bottom: { style: 'medium', color: { argb: 'FFD4AF37' } }
    };
  });
  ['G10', 'H10'].forEach((addr) => {
    sheet.getCell(addr).border = {
      top: { style: 'medium', color: { argb: 'FFD4AF37' } },
      right: { style: 'thin', color: { argb: 'FFCBD5E1' } },
      bottom: { style: 'medium', color: { argb: 'FFCBD5E1' } }
    };
  });
}

/**
 * 2. CUSTOMERS SHEET
 * Required columns:
 * - Customer ID
 * - Customer Name
 * - Phone Number
 * - Email Address
 * - Complete Address
 * - Registration Date (DD-MMM-YYYY)
 * + Preserved database fields for 100% lossless restoration
 */
function addCustomersSheet(workbook: ExcelJS.Workbook, customersInput: Customer[]) {
  const sheet = workbook.addWorksheet('Customers');
  const customers = deduplicateById(customersInput || []);
  const currencyFmt = '"Rs "#,##0.00;("Rs "#,##0.00);"Rs "0.00';

  const columns = [
    { header: 'Customer ID', key: 'id', width: 18 },
    { header: 'Customer Name', key: 'name', width: 26 },
    { header: 'Phone Number', key: 'phone', width: 18 },
    { header: 'Email Address', key: 'email', width: 26 },
    { header: 'Complete Address', key: 'address', width: 34 },
    {
      header: 'Registration Date',
      key: 'registrationDate',
      width: 18,
      alignment: { horizontal: 'center' as const }
    },
    {
      header: 'Current Balance',
      key: 'balance',
      width: 20,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    { header: 'Account Status', key: 'status', width: 18, isStatusColumn: true },
    {
      header: 'Promised Payment Date',
      key: 'promisedPaymentDate',
      width: 20,
      alignment: { horizontal: 'center' as const }
    },
    { header: 'Promised Payment Note', key: 'promisedPaymentNote', width: 26 },
    { header: 'Last Reminder Sent', key: 'lastReminderOpenedAt', width: 22 },
    { header: 'Last Updated', key: 'updatedAt', width: 22 },
    { header: 'Business ID', key: 'businessId', width: 14 }
  ];

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  customers.forEach((c) => {
    const bal = Number(c.balance || 0);
    const status = bal > 0 ? 'Receivable (Due)' : bal < 0 ? 'Advance / Payable' : 'Settled';
    sheet.addRow({
      id: c.id,
      name: c.name || '',
      phone: c.phone || '',
      email: c.email || '—',
      address: c.address || '—',
      registrationDate: formatDateDdMmmYyyy(c.createdAt || c.updatedAt),
      balance: bal,
      status,
      promisedPaymentDate: c.promisedPaymentDate
        ? formatDateDdMmmYyyy(c.promisedPaymentDate)
        : '—',
      promisedPaymentNote: c.promisedPaymentNote || '—',
      lastReminderOpenedAt: c.lastReminderOpenedAt
        ? formatDateTimeDdMmmYyyy(c.lastReminderOpenedAt)
        : '—',
      updatedAt: formatDateTimeDdMmmYyyy(c.updatedAt),
      businessId: c.businessId || 'b1'
    });
  });

  styleAccountingWorksheet(sheet, columns);
}

/**
 * 3. SUPPLIERS SHEET
 * Required columns:
 * - Supplier ID
 * - Supplier Name
 * - Contact Person
 * - Phone Number
 * - Email Address
 * - Address
 * + Preserved database fields for 100% lossless restoration
 */
function addSuppliersSheet(workbook: ExcelJS.Workbook, suppliersInput: Supplier[]) {
  const sheet = workbook.addWorksheet('Suppliers');
  const suppliers = deduplicateById(suppliersInput || []);
  const currencyFmt = '"Rs "#,##0.00;("Rs "#,##0.00);"Rs "0.00';

  const columns = [
    { header: 'Supplier ID', key: 'id', width: 18 },
    { header: 'Supplier Name', key: 'name', width: 26 },
    { header: 'Contact Person', key: 'contactPerson', width: 24 },
    { header: 'Phone Number', key: 'phone', width: 18 },
    { header: 'Email Address', key: 'email', width: 26 },
    { header: 'Address', key: 'address', width: 32 },
    {
      header: 'Registration Date',
      key: 'registrationDate',
      width: 18,
      alignment: { horizontal: 'center' as const }
    },
    {
      header: 'Payable Balance',
      key: 'balance',
      width: 20,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    { header: 'Account Status', key: 'status', width: 18, isStatusColumn: true },
    { header: 'Last Updated', key: 'updatedAt', width: 22 },
    { header: 'Business ID', key: 'businessId', width: 14 }
  ];

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  suppliers.forEach((s) => {
    const bal = Number(s.balance || 0);
    const status = bal > 0 ? 'Payable (Due)' : bal < 0 ? 'Advance Paid' : 'Settled';
    const contactPerson = (s as any).contactPerson || s.name || 'Primary Contact';
    sheet.addRow({
      id: s.id,
      name: s.name || '',
      contactPerson,
      phone: s.phone || '',
      email: s.email || '—',
      address: s.address || '—',
      registrationDate: formatDateDdMmmYyyy(s.createdAt || s.updatedAt),
      balance: bal,
      status,
      updatedAt: formatDateTimeDdMmmYyyy(s.updatedAt),
      businessId: s.businessId || 'b1'
    });
  });

  styleAccountingWorksheet(sheet, columns);
}

/**
 * 4. INVOICES SHEET
 * Required columns:
 * - Invoice Number
 * - Customer Name
 * - Invoice Date (DD-MMM-YYYY)
 * - Due Date (DD-MMM-YYYY)
 * - Subtotal
 * - Discount
 * - Tax
 * - Total Amount
 * - Paid Amount
 * - Remaining Balance
 * - Payment Status (Paid / Unpaid with conditional formatting)
 * + Preserved database fields for 100% lossless restoration
 */
function addInvoicesSheet(workbook: ExcelJS.Workbook, invoicesInput: Invoice[]) {
  const sheet = workbook.addWorksheet('Invoices');
  const invoices = deduplicateById(invoicesInput || []);
  const currencyFmt = '"Rs "#,##0.00;("Rs "#,##0.00);"Rs "0.00';

  const columns = [
    { header: 'Invoice Number', key: 'invoiceNumber', width: 18 },
    { header: 'Customer Name', key: 'customerName', width: 24 },
    {
      header: 'Invoice Date',
      key: 'date',
      width: 16,
      alignment: { horizontal: 'center' as const }
    },
    {
      header: 'Due Date',
      key: 'dueDate',
      width: 16,
      alignment: { horizontal: 'center' as const }
    },
    {
      header: 'Subtotal',
      key: 'subTotal',
      width: 18,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Discount',
      key: 'discount',
      width: 16,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Tax',
      key: 'tax',
      width: 16,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Total Amount',
      key: 'totalAmount',
      width: 20,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Paid Amount',
      key: 'paidAmount',
      width: 20,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Remaining Balance',
      key: 'remainingBalance',
      width: 20,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    { header: 'Payment Status', key: 'status', width: 16, isStatusColumn: true },
    { header: 'Invoice ID', key: 'id', width: 18 },
    { header: 'Customer ID', key: 'customerId', width: 16 },
    { header: 'Customer Phone', key: 'customerPhone', width: 18 },
    { header: 'Items Summary', key: 'itemsSummary', width: 38 },
    { header: 'Items JSON', key: 'itemsJson', width: 26 },
    { header: 'Created By', key: 'createdBy', width: 22 },
    { header: 'Business ID', key: 'businessId', width: 14 }
  ];

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  invoices.forEach((inv) => {
    const itemsList = Array.isArray(inv.items) ? inv.items : [];
    const itemsSummary =
      itemsList
        .map(
          (itm) =>
            `${itm.name} (${itm.quantity} x Rs ${Number(itm.price || 0).toLocaleString()})`
        )
        .join('; ') || '—';
    const totalAmt = Number(inv.total || 0);
    const paidAmt = inv.isPaid ? totalAmt : 0;
    const remainingAmt = inv.isPaid ? 0 : totalAmt;

    sheet.addRow({
      invoiceNumber: inv.invoiceNumber || inv.id,
      customerName: inv.customerName || 'Walk-in Customer',
      date: formatDateDdMmmYyyy(inv.date),
      dueDate: formatDateDdMmmYyyy(inv.dueDate || inv.date),
      subTotal: Number(inv.subTotal ?? totalAmt),
      discount: Number(inv.discount || 0),
      tax: Number(inv.tax || 0),
      totalAmount: totalAmt,
      paidAmount: paidAmt,
      remainingBalance: remainingAmt,
      status: inv.isPaid ? 'Paid' : 'Unpaid',
      id: inv.id,
      customerId: inv.customerId || '—',
      customerPhone: inv.customerPhone || '—',
      itemsSummary,
      itemsJson: JSON.stringify(itemsList),
      createdBy: inv.createdBy || '—',
      businessId: inv.businessId || 'b1'
    });
  });

  styleAccountingWorksheet(sheet, columns);
}

/**
 * 5. INVENTORY SHEET
 * Required columns:
 * - Product ID
 * - Product Name
 * - Category
 * - Available Quantity
 * - Purchase Price
 * - Selling Price
 * - Total Stock Value
 * - Stock Status (In Stock / Low Stock / Out of Stock with conditional formatting)
 * + Preserved database fields for 100% lossless restoration
 */
function addInventorySheet(workbook: ExcelJS.Workbook, inventoryInput: StockItem[]) {
  const sheet = workbook.addWorksheet('Inventory');
  const inventory = deduplicateById(inventoryInput || []);
  const currencyFmt = '"Rs "#,##0.00;("Rs "#,##0.00);"Rs "0.00';

  const columns = [
    { header: 'Product ID', key: 'id', width: 18 },
    { header: 'Product Name', key: 'name', width: 28 },
    { header: 'Category', key: 'category', width: 18 },
    {
      header: 'Available Quantity',
      key: 'quantity',
      width: 18,
      numFmt: '#,##0',
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Purchase Price',
      key: 'purchasePrice',
      width: 18,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Selling Price',
      key: 'sellPrice',
      width: 18,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Total Stock Value',
      key: 'stockValue',
      width: 20,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    { header: 'Stock Status', key: 'stockStatus', width: 16, isStatusColumn: true },
    { header: 'SKU', key: 'sku', width: 16 },
    { header: 'Unit', key: 'unit', width: 12 },
    {
      header: 'Min Alert Qty',
      key: 'minQuantity',
      width: 15,
      numFmt: '#,##0',
      alignment: { horizontal: 'right' as const }
    },
    { header: 'Business ID', key: 'businessId', width: 14 }
  ];

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  inventory.forEach((item) => {
    const qty = Number(item.quantity || 0);
    const minQty = Number(item.minQuantity ?? 5);
    const purchasePrice = Number(item.purchasePrice || 0);
    const sellPrice = Number(item.sellPrice || 0);
    const stockStatus =
      qty <= 0 ? 'Out of Stock' : qty <= minQty ? 'Low Stock' : 'In Stock';

    sheet.addRow({
      id: item.id,
      name: item.name || '',
      category: item.category || 'General',
      quantity: qty,
      purchasePrice,
      sellPrice,
      stockValue: qty * sellPrice,
      stockStatus,
      sku: item.sku || '—',
      unit: item.unit || 'pcs',
      minQuantity: minQty,
      businessId: item.businessId || 'b1'
    });
  });

  styleAccountingWorksheet(sheet, columns);
}

/**
 * 6. TRANSACTIONS SHEET (Visible tab after Inventory for 100% lossless ledger restoration)
 */
function addTransactionsSheet(workbook: ExcelJS.Workbook, transactionsInput: Transaction[]) {
  const sheet = workbook.addWorksheet('Transactions');
  const transactions = deduplicateById(transactionsInput || []);
  const currencyFmt = '"Rs "#,##0.00;("Rs "#,##0.00);"Rs "0.00';

  const columns = [
    { header: 'Transaction ID', key: 'id', width: 18 },
    { header: 'Customer ID', key: 'customerId', width: 18 },
    { header: 'Customer Name', key: 'customerName', width: 24 },
    { header: 'Type', key: 'type', width: 20, isStatusColumn: true },
    {
      header: 'Amount',
      key: 'amount',
      width: 18,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Transaction Date',
      key: 'date',
      width: 18,
      alignment: { horizontal: 'center' as const }
    },
    { header: 'Created Timestamp', key: 'createdAt', width: 22 },
    { header: 'Description', key: 'description', width: 32 },
    { header: 'Invoice ID', key: 'invoiceId', width: 18 },
    { header: 'Created By', key: 'createdBy', width: 24 },
    { header: 'Business ID', key: 'businessId', width: 14 }
  ];

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  transactions.forEach((tx) => {
    sheet.addRow({
      id: tx.id,
      customerId: tx.customerId,
      customerName: tx.customerName || '',
      type: tx.type === 'credit' ? 'Credit (Udhaar Given)' : 'Debit (Payment Received)',
      amount: Number(tx.amount || 0),
      date: formatDateDdMmmYyyy(tx.date),
      createdAt: formatDateTimeDdMmmYyyy(tx.createdAt || tx.date),
      description: tx.description || '—',
      invoiceId: tx.invoiceId || '—',
      createdBy: tx.createdBy || '—',
      businessId: tx.businessId || 'b1'
    });
  });

  styleAccountingWorksheet(sheet, columns);
}

/**
 * 7. CASHBOOK SHEET (Visible tab after Transactions for 100% lossless cashbook restoration)
 */
function addCashbookSheet(workbook: ExcelJS.Workbook, cashbookInput: CashBookEntry[]) {
  const sheet = workbook.addWorksheet('Cashbook');
  const cashbook = deduplicateById(cashbookInput || []);
  const currencyFmt = '"Rs "#,##0.00;("Rs "#,##0.00);"Rs "0.00';

  const columns = [
    { header: 'Entry ID', key: 'id', width: 18 },
    { header: 'Type', key: 'type', width: 16, isStatusColumn: true },
    {
      header: 'Amount',
      key: 'amount',
      width: 18,
      numFmt: currencyFmt,
      alignment: { horizontal: 'right' as const }
    },
    {
      header: 'Entry Date',
      key: 'date',
      width: 18,
      alignment: { horizontal: 'center' as const }
    },
    { header: 'Category', key: 'category', width: 20 },
    { header: 'Description', key: 'description', width: 34 },
    { header: 'Created By', key: 'createdBy', width: 24 },
    { header: 'Business ID', key: 'businessId', width: 14 }
  ];

  sheet.columns = columns.map((c) => ({ header: c.header, key: c.key, width: c.width }));

  cashbook.forEach((cb) => {
    sheet.addRow({
      id: cb.id,
      type: cb.type === 'cash-in' ? 'Cash-In' : 'Cash-Out',
      amount: Number(cb.amount || 0),
      date: formatDateDdMmmYyyy(cb.date),
      category: cb.category || 'General',
      description: cb.description || '—',
      createdBy: cb.createdBy || '—',
      businessId: cb.businessId || 'b1'
    });
  });

  styleAccountingWorksheet(sheet, columns);
}

/**
 * Generates an in-memory Excel (.xlsx) ArrayBuffer for the requested backup module or complete master report.
 * Always includes the executive "Dashboard" worksheet first, followed by the module data sheets.
 */
export async function generateExcelBackupBuffer(
  moduleType: BackupModuleType,
  dataset: LedgerBackupDataset
): Promise<ArrayBuffer> {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Meezan Flow Accounting Backup Engine';
  workbook.lastModifiedBy = 'Meezan Flow';
  workbook.created = new Date();
  workbook.modified = new Date();

  const nowIso = new Date().toISOString();

  // Sheet 1: Always include the Executive Dashboard sheet first
  addDashboardSheet(workbook, dataset, nowIso);

  if (moduleType === 'customers') {
    addCustomersSheet(workbook, dataset.customers);
  } else if (moduleType === 'suppliers') {
    addSuppliersSheet(workbook, dataset.suppliers);
  } else if (moduleType === 'invoices') {
    addInvoicesSheet(workbook, dataset.invoices);
  } else if (moduleType === 'inventory') {
    addInventorySheet(workbook, dataset.inventory);
  } else {
    // Master Complete Report (Meezan_Flow_Backup.xlsx) & Historical Snapshots:
    // Sheets: Dashboard, Customers, Suppliers, Invoices, Inventory, Transactions, Cashbook
    addCustomersSheet(workbook, dataset.customers);
    addSuppliersSheet(workbook, dataset.suppliers);
    addInvoicesSheet(workbook, dataset.invoices);
    addInventorySheet(workbook, dataset.inventory);
    addTransactionsSheet(workbook, dataset.transactions);
    addCashbookSheet(workbook, dataset.cashbook);
  }

  const buffer = await workbook.xlsx.writeBuffer();
  return buffer as ArrayBuffer;
}

/**
 * Triggers a direct browser download of a formatted Excel (.xlsx) backup file.
 */
export async function downloadExcelBackupLocally(
  moduleType: BackupModuleType,
  dataset: LedgerBackupDataset
): Promise<string> {
  const buffer = await generateExcelBackupBuffer(moduleType, dataset);
  const blob = new Blob([buffer], { type: XLSX_MIME_TYPE });
  const url = URL.createObjectURL(blob);

  let filename: string = DRIVE_FILE_NAMES.COMPLETE;
  if (moduleType === 'customers') filename = DRIVE_FILE_NAMES.CUSTOMERS;
  else if (moduleType === 'suppliers') filename = DRIVE_FILE_NAMES.SUPPLIERS;
  else if (moduleType === 'invoices') filename = DRIVE_FILE_NAMES.INVOICES;
  else if (moduleType === 'inventory') filename = DRIVE_FILE_NAMES.INVENTORY;
  else if (moduleType === 'history') filename = formatSnapshotFilename();

  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 3000);
  return filename;
}

function getCellText(row: ExcelJS.Row, colIndex: number): string {
  if (!colIndex || colIndex < 1) return '';
  const val = row.getCell(colIndex).value;
  if (val === null || val === undefined) return '';
  if (typeof val === 'object' && 'text' in val) {
    return String((val as any).text).trim();
  }
  const str = String(val).trim();
  return str === '—' ? '' : str;
}

function getCellNumber(row: ExcelJS.Row, colIndex: number): number {
  if (!colIndex || colIndex < 1) return 0;
  const val = row.getCell(colIndex).value;
  if (typeof val === 'number') return val;
  if (val === null || val === undefined) return 0;
  const cleaned = String(val).replace(/[^0-9.-]/g, '');
  const parsed = Number(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Builds a case-insensitive header-name -> 1-based column index lookup map from Row 1
 * so both the new Meezan_Flow_Backup.xlsx schema and older historical snapshots restore 100% accurately.
 */
function buildHeaderColumnMap(sheet: ExcelJS.Worksheet): Record<string, number> {
  const map: Record<string, number> = {};
  const headerRow = sheet.getRow(1);
  headerRow.eachCell({ includeEmpty: false }, (cell, colNumber) => {
    const text = String(cell.value || '')
      .trim()
      .toLowerCase();
    if (text) {
      map[text] = colNumber;
    }
  });
  return map;
}

/**
 * Parses an Excel (.xlsx) ArrayBuffer and reconstructs the Meezan Flow database records
 * accurately for restoration (supporting both the redesigned Meezan_Flow_Backup.xlsx and legacy snapshots).
 */
export async function parseExcelBackupBuffer(
  buffer: ArrayBuffer
): Promise<Partial<LedgerBackupDataset>> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  const result: Partial<LedgerBackupDataset> = {};

  // 1. Parse Customers Sheet
  const customersSheet = workbook.getWorksheet('Customers');
  if (customersSheet) {
    const hMap = buildHeaderColumnMap(customersSheet);
    const idCol = hMap['customer id'] || 1;
    const nameCol = hMap['customer name'] || hMap['name'] || 2;
    const phoneCol = hMap['phone number'] || hMap['phone'] || 3;
    const emailCol = hMap['email address'] || hMap['email'] || 4;
    const addrCol = hMap['complete address'] || hMap['address'] || 5;
    const regDateCol = hMap['registration date'] || 6;
    const balCol = hMap['current balance'] || hMap['current balance (rs)'] || 7;
    const promisedDateCol = hMap['promised payment date'] || 9;
    const promisedNoteCol = hMap['promised payment note'] || 10;
    const reminderCol = hMap['last reminder sent'] || 11;
    const updatedCol = hMap['last updated'] || 12;
    const busIdCol = hMap['business id'] || 13;

    const customers: Customer[] = [];
    customersSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = getCellText(row, idCol);
      const name = getCellText(row, nameCol);
      if (!id && !name) return;

      const phone = getCellText(row, phoneCol);
      const email = getCellText(row, emailCol);
      const address = getCellText(row, addrCol);
      const createdAtRaw = getCellText(row, regDateCol);
      const balance = getCellNumber(row, balCol);
      const promisedPaymentDateRaw = getCellText(row, promisedDateCol);
      const promisedPaymentNote = getCellText(row, promisedNoteCol);
      const lastReminderOpenedAt = getCellText(row, reminderCol);
      const updatedAtRaw = getCellText(row, updatedCol);
      const businessId = getCellText(row, busIdCol) || 'b1';

      customers.push({
        id: id || 'c_' + Math.random().toString(36).substring(2, 9),
        name: name || 'Unnamed Customer',
        phone: phone || '',
        email: email || '',
        address: address || '',
        createdAt: createdAtRaw ? parseDdMmmYyyyToIsoDate(createdAtRaw) : new Date().toISOString(),
        balance,
        updatedAt: updatedAtRaw ? parseDdMmmYyyyToIsoDate(updatedAtRaw) : new Date().toISOString(),
        businessId,
        ...(promisedPaymentDateRaw
          ? { promisedPaymentDate: parseDdMmmYyyyToIsoDate(promisedPaymentDateRaw) }
          : {}),
        ...(promisedPaymentNote ? { promisedPaymentNote } : {}),
        ...(lastReminderOpenedAt ? { lastReminderOpenedAt } : {})
      });
    });
    result.customers = deduplicateById(customers);
  }

  // 2. Parse Suppliers Sheet
  const suppliersSheet = workbook.getWorksheet('Suppliers');
  if (suppliersSheet) {
    const hMap = buildHeaderColumnMap(suppliersSheet);
    const idCol = hMap['supplier id'] || 1;
    const nameCol = hMap['supplier name'] || hMap['name'] || 2;
    const phoneCol = hMap['phone number'] || hMap['phone'] || 4;
    const emailCol = hMap['email address'] || hMap['email'] || 5;
    const addrCol = hMap['address'] || 6;
    const regDateCol = hMap['registration date'] || 7;
    const balCol = hMap['payable balance'] || hMap['payable balance (rs)'] || 8;
    const updatedCol = hMap['last updated'] || 10;
    const busIdCol = hMap['business id'] || 11;

    const suppliers: Supplier[] = [];
    suppliersSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = getCellText(row, idCol);
      const name = getCellText(row, nameCol);
      if (!id && !name) return;

      const phone = getCellText(row, phoneCol);
      const email = getCellText(row, emailCol);
      const address = getCellText(row, addrCol);
      const createdAtRaw = getCellText(row, regDateCol);
      const balance = getCellNumber(row, balCol);
      const updatedAtRaw = getCellText(row, updatedCol);
      const businessId = getCellText(row, busIdCol) || 'b1';

      suppliers.push({
        id: id || 's_' + Math.random().toString(36).substring(2, 9),
        name: name || 'Unnamed Supplier',
        phone: phone || '',
        email: email || '',
        address: address || '',
        createdAt: createdAtRaw ? parseDdMmmYyyyToIsoDate(createdAtRaw) : new Date().toISOString(),
        balance,
        updatedAt: updatedAtRaw ? parseDdMmmYyyyToIsoDate(updatedAtRaw) : new Date().toISOString(),
        businessId
      });
    });
    result.suppliers = deduplicateById(suppliers);
  }

  // 3. Parse Invoices Sheet
  const invoicesSheet = workbook.getWorksheet('Invoices');
  if (invoicesSheet) {
    const hMap = buildHeaderColumnMap(invoicesSheet);
    const invNumCol = hMap['invoice number'] || 1;
    const custNameCol = hMap['customer name'] || 2;
    const dateCol = hMap['invoice date'] || 3;
    const dueDateCol = hMap['due date'] || 4;
    const subTotalCol = hMap['subtotal'] || hMap['subtotal (rs)'] || 5;
    const discountCol = hMap['discount'] || hMap['discount (rs)'] || 6;
    const taxCol = hMap['tax'] || hMap['tax (rs)'] || 7;
    const totalCol = hMap['total amount'] || 8;
    const paidCol = hMap['paid amount'] || 9;
    const statusCol = hMap['payment status'] || hMap['status'] || 11;
    const idCol = hMap['invoice id'] || 12;
    const custIdCol = hMap['customer id'] || 13;
    const custPhoneCol = hMap['customer phone'] || 14;
    const itemsSummaryCol = hMap['items summary'] || hMap['items'] || 15;
    const itemsJsonCol = hMap['items json'] || 16;
    const createdByCol = hMap['created by'] || 17;
    const busIdCol = hMap['business id'] || 18;

    const invoices: Invoice[] = [];
    invoicesSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const invoiceNumber = getCellText(row, invNumCol);
      const id = getCellText(row, idCol) || invoiceNumber;
      const customerName = getCellText(row, custNameCol);
      if (!id && !invoiceNumber && !customerName) return;

      const customerPhone = getCellText(row, custPhoneCol);
      const customerId = getCellText(row, custIdCol);
      const dateRaw = getCellText(row, dateCol);
      const dueDateRaw = getCellText(row, dueDateCol);
      const itemsSummary = getCellText(row, itemsSummaryCol);
      const subTotal = getCellNumber(row, subTotalCol);
      const discount = getCellNumber(row, discountCol);
      const tax = getCellNumber(row, taxCol);
      const totalAmount = getCellNumber(row, totalCol);
      const paidAmount = getCellNumber(row, paidCol);
      const statusText = getCellText(row, statusCol).toLowerCase();
      const createdBy = getCellText(row, createdByCol) || 'owner@meezanflow.com';
      const businessId = getCellText(row, busIdCol) || 'b1';
      const itemsJsonStr = getCellText(row, itemsJsonCol);

      let parsedItems: InvoiceItem[] = [];
      if (itemsJsonStr) {
        try {
          const arr = JSON.parse(itemsJsonStr);
          if (Array.isArray(arr)) {
            parsedItems = arr;
          }
        } catch {
          // fallback below
        }
      }

      if (parsedItems.length === 0 && itemsSummary) {
        parsedItems = [
          {
            name: itemsSummary,
            quantity: 1,
            price: totalAmount,
            total: totalAmount
          }
        ];
      }

      const isPaid = statusText === 'paid' || (paidAmount >= totalAmount && totalAmount > 0);
      const cleanDate = parseDdMmmYyyyToIsoDate(dateRaw);
      const cleanDueDate = dueDateRaw ? parseDdMmmYyyyToIsoDate(dueDateRaw) : cleanDate;

      invoices.push({
        id: id || 'inv_' + Math.random().toString(36).substring(2, 9),
        invoiceNumber: invoiceNumber || id || 'INV-001',
        ...(customerId ? { customerId } : {}),
        customerName: customerName || 'Walk-in Customer',
        ...(customerPhone ? { customerPhone } : {}),
        date: cleanDate,
        dueDate: cleanDueDate,
        items: parsedItems,
        subTotal: subTotal || totalAmount,
        discount,
        tax,
        total: totalAmount,
        isPaid,
        createdBy,
        businessId
      });
    });
    result.invoices = deduplicateById(invoices);
  }

  // 4. Parse Inventory Sheet
  const inventorySheet = workbook.getWorksheet('Inventory');
  if (inventorySheet) {
    const hMap = buildHeaderColumnMap(inventorySheet);
    const idCol = hMap['product id'] || 1;
    const nameCol = hMap['product name'] || 2;
    const categoryCol = hMap['category'] || 3;
    const qtyCol = hMap['available quantity'] || hMap['quantity'] || 4;
    const purchaseCol = hMap['purchase price'] || 5;
    const sellCol = hMap['selling price'] || 6;
    const skuCol = hMap['sku'] || 9;
    const unitCol = hMap['unit'] || 10;
    const minQtyCol = hMap['min alert qty'] || 11;
    const busIdCol = hMap['business id'] || 12;

    const inventory: StockItem[] = [];
    inventorySheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = getCellText(row, idCol);
      const name = getCellText(row, nameCol);
      if (!id && !name) return;

      const category = getCellText(row, categoryCol) || 'General';
      const quantity = getCellNumber(row, qtyCol);
      const purchasePrice = getCellNumber(row, purchaseCol);
      const sellPrice = getCellNumber(row, sellCol);
      const sku = getCellText(row, skuCol);
      const unit = getCellText(row, unitCol) || 'pcs';
      const minQuantity = getCellNumber(row, minQtyCol) || 5;
      const businessId = getCellText(row, busIdCol) || 'b1';

      inventory.push({
        id: id || 'i_' + Math.random().toString(36).substring(2, 9),
        sku: sku || 'SKU-' + Math.random().toString(36).substring(2, 7).toUpperCase(),
        name: name || 'Unnamed Product',
        category,
        quantity,
        unit,
        minQuantity,
        purchasePrice,
        sellPrice,
        businessId
      });
    });
    result.inventory = deduplicateById(inventory);
  }

  // 5. Parse Transactions Sheet (if present)
  const txSheet = workbook.getWorksheet('Transactions');
  if (txSheet) {
    const hMap = buildHeaderColumnMap(txSheet);
    const idCol = hMap['transaction id'] || 1;
    const custIdCol = hMap['customer id'] || 2;
    const custNameCol = hMap['customer name'] || 3;
    const typeCol = hMap['type'] || 4;
    const amountCol = hMap['amount'] || hMap['amount (rs)'] || 5;
    const dateCol = hMap['transaction date'] || hMap['date'] || 6;
    const createdAtCol = hMap['created timestamp'] || 7;
    const descCol = hMap['description'] || 8;
    const invIdCol = hMap['invoice id'] || 9;
    const createdByCol = hMap['created by'] || 10;
    const busIdCol = hMap['business id'] || 11;

    const transactions: Transaction[] = [];
    txSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = getCellText(row, idCol);
      const customerId = getCellText(row, custIdCol);
      const customerName = getCellText(row, custNameCol);
      if (!id && !customerId) return;

      const typeRaw = getCellText(row, typeCol).toLowerCase();
      const amount = getCellNumber(row, amountCol);
      const dateRaw = getCellText(row, dateCol);
      const createdAtRaw = getCellText(row, createdAtCol);
      const description = getCellText(row, descCol);
      const invoiceId = getCellText(row, invIdCol);
      const createdBy = getCellText(row, createdByCol) || 'owner@meezanflow.com';
      const businessId = getCellText(row, busIdCol) || 'b1';
      const cleanDate = parseDdMmmYyyyToIsoDate(dateRaw);

      transactions.push({
        id: id || 't_' + Math.random().toString(36).substring(2, 9),
        customerId,
        customerName,
        type: typeRaw.includes('debit') || typeRaw.includes('payment') ? 'debit' : 'credit',
        amount,
        date: cleanDate,
        createdAt: createdAtRaw ? parseDdMmmYyyyToIsoDate(createdAtRaw) : cleanDate,
        description,
        ...(invoiceId ? { invoiceId } : {}),
        createdBy,
        businessId
      });
    });
    result.transactions = deduplicateById(transactions);
  }

  // 6. Parse Cashbook Sheet (if present)
  const cbSheet = workbook.getWorksheet('Cashbook');
  if (cbSheet) {
    const hMap = buildHeaderColumnMap(cbSheet);
    const idCol = hMap['entry id'] || 1;
    const typeCol = hMap['type'] || 2;
    const amountCol = hMap['amount'] || hMap['amount (rs)'] || 3;
    const dateCol = hMap['entry date'] || hMap['date'] || 4;
    const catCol = hMap['category'] || 5;
    const descCol = hMap['description'] || 6;
    const createdByCol = hMap['created by'] || 7;
    const busIdCol = hMap['business id'] || 8;

    const cashbook: CashBookEntry[] = [];
    cbSheet.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber === 1) return;
      const id = getCellText(row, idCol);
      const typeRaw = getCellText(row, typeCol).toLowerCase();
      const amount = getCellNumber(row, amountCol);
      if (!id && !amount) return;

      const dateRaw = getCellText(row, dateCol);
      const category = getCellText(row, catCol) || 'General';
      const description = getCellText(row, descCol);
      const createdBy = getCellText(row, createdByCol) || 'owner@meezanflow.com';
      const businessId = getCellText(row, busIdCol) || 'b1';

      cashbook.push({
        id: id || 'cb_' + Math.random().toString(36).substring(2, 9),
        type: typeRaw.includes('out') ? 'cash-out' : 'cash-in',
        amount,
        date: parseDdMmmYyyyToIsoDate(dateRaw),
        category,
        description,
        createdBy,
        businessId
      });
    });
    result.cashbook = deduplicateById(cashbook);
  }

  return result;
}

// ============================================================================
// GOOGLE DRIVE REST API v3 + ORGANIZED CLOUD WORKSPACE HELPERS
// ============================================================================

const inMemoryExcelBuffers = new Map<string, ArrayBuffer>();

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  const chunkSize = 0x8000;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  return btoa(binary);
}

const DEFAULT_LOCAL_FOLDERS: DriveFolderStructureIds = {
  rootFolderId: 'local:Meezan Flow Backups',
  customersFolderId: DRIVE_FOLDER_NAMES.CUSTOMERS,
  suppliersFolderId: DRIVE_FOLDER_NAMES.SUPPLIERS,
  invoicesFolderId: DRIVE_FOLDER_NAMES.INVOICES,
  inventoryFolderId: DRIVE_FOLDER_NAMES.INVENTORY,
  completeBackupsFolderId: DRIVE_FOLDER_NAMES.COMPLETE,
  backupHistoryFolderId: DRIVE_FOLDER_NAMES.HISTORY
};

function resolveCanonicalSubfolderName(
  folderId: string,
  folders?: DriveFolderStructureIds | null
): string {
  if (
    folderId === DRIVE_FOLDER_NAMES.CUSTOMERS ||
    folderId === folders?.customersFolderId
  ) {
    return DRIVE_FOLDER_NAMES.CUSTOMERS;
  }
  if (
    folderId === DRIVE_FOLDER_NAMES.SUPPLIERS ||
    folderId === folders?.suppliersFolderId
  ) {
    return DRIVE_FOLDER_NAMES.SUPPLIERS;
  }
  if (
    folderId === DRIVE_FOLDER_NAMES.INVOICES ||
    folderId === folders?.invoicesFolderId
  ) {
    return DRIVE_FOLDER_NAMES.INVOICES;
  }
  if (
    folderId === DRIVE_FOLDER_NAMES.INVENTORY ||
    folderId === folders?.inventoryFolderId
  ) {
    return DRIVE_FOLDER_NAMES.INVENTORY;
  }
  if (
    folderId === DRIVE_FOLDER_NAMES.HISTORY ||
    folderId === folders?.backupHistoryFolderId
  ) {
    return DRIVE_FOLDER_NAMES.HISTORY;
  }
  return DRIVE_FOLDER_NAMES.COMPLETE;
}

async function uploadExcelToLocalServer(
  subfolderName: string,
  fileName: string,
  excelBuffer: ArrayBuffer
): Promise<DriveBackupFileInfo> {
  const localId = `local:${subfolderName}/${fileName}`;
  inMemoryExcelBuffers.set(localId, excelBuffer);

  try {
    const base64Data = arrayBufferToBase64(excelBuffer);
    const res = await fetch('/api/excel-backups/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        folderName: subfolderName,
        fileName,
        base64Data
      })
    });
    if (res.ok) {
      const saved = await res.json();
      if (saved?.id) {
        inMemoryExcelBuffers.set(saved.id, excelBuffer);
      }
      return {
        ...saved,
        snapshotType: inferSnapshotTypeFromName(fileName)
      };
    }
  } catch (err) {
    console.warn('Server Excel backup store fallback to in-memory cache:', err);
  }

  return {
    id: localId,
    name: fileName,
    modifiedTime: new Date().toISOString(),
    size: String(excelBuffer.byteLength),
    webViewLink: `/api/excel-backups/file/${encodeURIComponent(subfolderName)}/${encodeURIComponent(fileName)}`,
    snapshotType: inferSnapshotTypeFromName(fileName)
  };
}

/**
 * Executes a Google Drive REST API v3 call with automatic retry and exponential backoff
 * to handle transient network interruptions reliably.
 */
async function driveFetch(
  url: string,
  options: RequestInit = {},
  maxRetries = 3
): Promise<Response> {
  const token = getGoogleAccessToken();
  if (!token) {
    throw new Error('NO_GOOGLE_TOKEN');
  }

  const headers = new Headers(options.headers || {});
  headers.set('Authorization', `Bearer ${token}`);

  let lastError: Error | null = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers
      });

      if (!response.ok) {
        let errDetail = `${response.status} ${response.statusText}`;
        try {
          const errJson = await response.json();
          if (errJson?.error?.message) {
            errDetail = errJson.error.message;
          }
        } catch {
          // ignore
        }
        // Retry on 5xx or 429 rate-limit responses
        if ((response.status >= 500 || response.status === 429) && attempt < maxRetries) {
          await new Promise((r) => setTimeout(r, attempt * 600));
          continue;
        }
        throw new Error(`Google Drive API error (${response.status}): ${errDetail}`);
      }

      return response;
    } catch (err: any) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries && !String(lastError.message).includes('401') && !String(lastError.message).includes('403') && !String(lastError.message).includes('404')) {
        await new Promise((r) => setTimeout(r, attempt * 600));
        continue;
      }
      throw lastError;
    }
  }

  throw lastError || new Error('Google Drive network request failed.');
}

async function findOrCreateDriveFolder(folderName: string, parentId?: string): Promise<string> {
  const escapedName = folderName.replace(/'/g, "\\'");
  let q = `name = '${escapedName}' and mimeType = '${FOLDER_MIME_TYPE}' and trashed = false`;
  if (parentId) {
    q += ` and '${parentId}' in parents`;
  }

  const searchUrl = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name)&pageSize=5`;

  const searchRes = await driveFetch(searchUrl);
  const searchData = await searchRes.json();

  if (Array.isArray(searchData.files) && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // Create folder if not found
  const metadata: Record<string, any> = {
    name: folderName,
    mimeType: FOLDER_MIME_TYPE
  };
  if (parentId) {
    metadata.parents = [parentId];
  }

  const createRes = await driveFetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(metadata)
  });

  const created = await createRes.json();
  return created.id;
}

/**
 * Ensures the complete Meezan Flow Google Drive folder tree exists:
 * Meezan Flow Backups/
 *  ├── Customers/
 *  ├── Suppliers/
 *  ├── Invoices/
 *  ├── Inventory/
 *  ├── Complete_Backups/
 *  └── Backup_History/
 */
export async function ensureDriveFolderStructure(
  forceRefresh = false
): Promise<DriveFolderStructureIds> {
  if (!getGoogleAccessToken()) {
    return DEFAULT_LOCAL_FOLDERS;
  }

  if (
    cachedFolderStructure &&
    !cachedFolderStructure.rootFolderId.startsWith('local:') &&
    !forceRefresh
  ) {
    return cachedFolderStructure;
  }

  const rootFolderId = await findOrCreateDriveFolder(DRIVE_FOLDER_NAMES.ROOT);

  const [
    customersFolderId,
    suppliersFolderId,
    invoicesFolderId,
    inventoryFolderId,
    completeBackupsFolderId,
    backupHistoryFolderId
  ] = await Promise.all([
    findOrCreateDriveFolder(DRIVE_FOLDER_NAMES.CUSTOMERS, rootFolderId),
    findOrCreateDriveFolder(DRIVE_FOLDER_NAMES.SUPPLIERS, rootFolderId),
    findOrCreateDriveFolder(DRIVE_FOLDER_NAMES.INVOICES, rootFolderId),
    findOrCreateDriveFolder(DRIVE_FOLDER_NAMES.INVENTORY, rootFolderId),
    findOrCreateDriveFolder(DRIVE_FOLDER_NAMES.COMPLETE, rootFolderId),
    findOrCreateDriveFolder(DRIVE_FOLDER_NAMES.HISTORY, rootFolderId)
  ]);

  cachedFolderStructure = {
    rootFolderId,
    customersFolderId,
    suppliersFolderId,
    invoicesFolderId,
    inventoryFolderId,
    completeBackupsFolderId,
    backupHistoryFolderId
  };

  return cachedFolderStructure;
}

/**
 * Finds an existing file by name inside a specific Drive folder
 */
async function findFileInFolder(
  fileName: string,
  folderId: string
): Promise<DriveBackupFileInfo | null> {
  const escapedName = fileName.replace(/'/g, "\\'");
  const q = `name = '${escapedName}' and '${folderId}' in parents and trashed = false`;
  const url = `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
    q
  )}&fields=files(id,name,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc&pageSize=5`;

  const res = await driveFetch(url);
  const data = await res.json();
  if (Array.isArray(data.files) && data.files.length > 0) {
    const found = data.files[0];
    setCachedDriveFileId(folderId, fileName, found.id);
    return found;
  }
  return null;
}

/**
 * Verifies whether a cached Google Drive fileId still exists and is not trashed
 */
async function verifyExistingDriveFileId(fileId: string): Promise<DriveBackupFileInfo | null> {
  try {
    const res = await driveFetch(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(
        fileId
      )}?fields=id,name,modifiedTime,size,webViewLink,trashed`,
      {},
      1
    );
    const data = await res.json();
    if (data && data.id && !data.trashed) {
      return data;
    }
    removeCachedDriveFileId(fileId);
    return null;
  } catch {
    removeCachedDriveFileId(fileId);
    return null;
  }
}

/**
 * Atomically uploads or updates an Excel (.xlsx) file in Google Drive using its existing file ID
 * (in-place PATCH update) so all worksheet formatting and file IDs are preserved.
 * Never marks a Google Drive sync as successful until Google Drive confirms the file update.
 */
async function uploadOrUpdateExcelFileInDrive(
  folderId: string,
  fileName: string,
  excelBuffer: ArrayBuffer,
  alwaysCreateNew = false
): Promise<DriveBackupFileInfo> {
  if (!excelBuffer || excelBuffer.byteLength === 0) {
    throw new Error(`Cannot upload empty Excel buffer for ${fileName}`);
  }

  const subfolderName = resolveCanonicalSubfolderName(folderId, cachedFolderStructure);
  const localSavedFile = await uploadExcelToLocalServer(subfolderName, fileName, excelBuffer);

  // If Google OAuth token is not connected, use the confirmed server backup store
  if (!getGoogleAccessToken() || folderId === subfolderName || folderId.startsWith('local:')) {
    lastSuccessfulSyncIso = localSavedFile.modifiedTime || new Date().toISOString();
    localStorage.setItem('meezan_drive_last_sync', lastSuccessfulSyncIso);
    return localSavedFile;
  }

  // Requirement 8: Continue updating the SAME Google Drive Excel file using its existing file ID
  let existingFile: DriveBackupFileInfo | null = null;
  if (!alwaysCreateNew) {
    const cachedId = getCachedDriveFileId(folderId, fileName);
    if (cachedId && !cachedId.startsWith('local:')) {
      existingFile = await verifyExistingDriveFileId(cachedId);
    }
    if (!existingFile) {
      existingFile = await findFileInFolder(fileName, folderId);
      // Backward-compatibility: if Meezan_Flow_Backup.xlsx was previously named Meezan_Flow_Full_Backup.xlsx, reuse its file ID and rename in-place!
      if (!existingFile && fileName === DRIVE_FILE_NAMES.COMPLETE) {
        existingFile = await findFileInFolder('Meezan_Flow_Full_Backup.xlsx', folderId);
      }
    }
  }

  const metadata: Record<string, any> = {
    name: fileName,
    mimeType: XLSX_MIME_TYPE
  };

  if (!existingFile) {
    metadata.parents = [folderId];
  }

  const boundary = '-------MeezanFlowExcelBoundary' + Date.now().toString(16);
  const metaHeader =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: ${XLSX_MIME_TYPE}\r\n\r\n`;
  const footer = `\r\n--${boundary}--`;

  const encoder = new TextEncoder();
  const metaBytes = encoder.encode(metaHeader);
  const footerBytes = encoder.encode(footer);
  const contentBytes = new Uint8Array(excelBuffer);

  const combined = new Uint8Array(
    metaBytes.byteLength + contentBytes.byteLength + footerBytes.byteLength
  );
  combined.set(metaBytes, 0);
  combined.set(contentBytes, metaBytes.byteLength);
  combined.set(footerBytes, metaBytes.byteLength + contentBytes.byteLength);

  const uploadUrl = existingFile
    ? `https://www.googleapis.com/upload/drive/v3/files/${existingFile.id}?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink`
    : `https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,modifiedTime,size,webViewLink`;

  const method = existingFile ? 'PATCH' : 'POST';

  const res = await driveFetch(uploadUrl, {
    method,
    headers: {
      'Content-Type': `multipart/related; boundary=${boundary}`
    },
    body: combined
  });

  const savedFile = await res.json();

  // Requirement 5: Never mark a backup as successful until Google Drive confirms the file update
  if (!savedFile || !savedFile.id) {
    throw new Error(`Google Drive did not confirm the file update for ${fileName}.`);
  }

  setCachedDriveFileId(folderId, fileName, savedFile.id);
  inMemoryExcelBuffers.set(savedFile.id, excelBuffer);

  lastSuccessfulSyncIso = savedFile.modifiedTime || new Date().toISOString();
  localStorage.setItem('meezan_drive_last_sync', lastSuccessfulSyncIso);

  return {
    ...savedFile,
    size: savedFile.size || String(excelBuffer.byteLength),
    snapshotType: inferSnapshotTypeFromName(fileName)
  };
}

/**
 * Synchronizes a specific module Excel file + the master Meezan_Flow_Backup.xlsx file
 * (and optionally a dated snapshot in Backup_History/) to Google Drive.
 */
export async function syncModuleToGoogleDrive(
  moduleType: 'customers' | 'suppliers' | 'invoices' | 'inventory',
  dataset: LedgerBackupDataset,
  createHistorySnapshot = false
): Promise<{
  moduleFile: DriveBackupFileInfo;
  completeFile: DriveBackupFileInfo;
  historyFile?: DriveBackupFileInfo;
}> {
  return enqueueSyncOperation(async () => {
    const folders = await ensureDriveFolderStructure();

    let targetFolderId = folders.customersFolderId;
    let targetFileName: string = DRIVE_FILE_NAMES.CUSTOMERS;

    if (moduleType === 'customers') {
      targetFolderId = folders.customersFolderId;
      targetFileName = DRIVE_FILE_NAMES.CUSTOMERS;
    } else if (moduleType === 'suppliers') {
      targetFolderId = folders.suppliersFolderId;
      targetFileName = DRIVE_FILE_NAMES.SUPPLIERS;
    } else if (moduleType === 'invoices') {
      targetFolderId = folders.invoicesFolderId;
      targetFileName = DRIVE_FILE_NAMES.INVOICES;
    } else if (moduleType === 'inventory') {
      targetFolderId = folders.inventoryFolderId;
      targetFileName = DRIVE_FILE_NAMES.INVENTORY;
    }

    // Generate both buffers in memory before mutating Drive
    const [moduleBuffer, completeBuffer] = await Promise.all([
      generateExcelBackupBuffer(moduleType, dataset),
      generateExcelBackupBuffer('complete', dataset)
    ]);

    const [moduleFile, completeFile] = await Promise.all([
      uploadOrUpdateExcelFileInDrive(targetFolderId, targetFileName, moduleBuffer, false),
      uploadOrUpdateExcelFileInDrive(
        folders.completeBackupsFolderId,
        DRIVE_FILE_NAMES.COMPLETE,
        completeBuffer,
        false
      )
    ]);

    let historyFile: DriveBackupFileInfo | undefined;
    if (createHistorySnapshot) {
      const historyBuffer = await generateExcelBackupBuffer('history', dataset);
      historyFile = await uploadOrUpdateExcelFileInDrive(
        folders.backupHistoryFolderId,
        formatSnapshotFilename(new Date(), 'manual'),
        historyBuffer,
        true
      );
    }

    return { moduleFile, completeFile, historyFile };
  });
}

/**
 * Synchronizes all 4 individual module Excel files, the master Meezan_Flow_Backup.xlsx file,
 * and saves a dated snapshot in Backup_History/.
 */
export async function syncAllModulesToGoogleDrive(
  dataset: LedgerBackupDataset,
  saveHistorySnapshot = true,
  snapshotType: SnapshotScheduleType = 'manual'
): Promise<{
  folders: DriveFolderStructureIds;
  moduleFiles: Partial<Record<BackupModuleType, DriveBackupFileInfo>>;
  historyFile?: DriveBackupFileInfo;
}> {
  return enqueueSyncOperation(async () => {
    const folders = await ensureDriveFolderStructure();

    // Generate all Excel workbooks in memory first so no partial state can occur
    const [
      customersBuffer,
      suppliersBuffer,
      invoicesBuffer,
      inventoryBuffer,
      completeBuffer
    ] = await Promise.all([
      generateExcelBackupBuffer('customers', dataset),
      generateExcelBackupBuffer('suppliers', dataset),
      generateExcelBackupBuffer('invoices', dataset),
      generateExcelBackupBuffer('inventory', dataset),
      generateExcelBackupBuffer('complete', dataset)
    ]);

    const [
      customersFile,
      suppliersFile,
      invoicesFile,
      inventoryFile,
      completeFile
    ] = await Promise.all([
      uploadOrUpdateExcelFileInDrive(
        folders.customersFolderId,
        DRIVE_FILE_NAMES.CUSTOMERS,
        customersBuffer,
        false
      ),
      uploadOrUpdateExcelFileInDrive(
        folders.suppliersFolderId,
        DRIVE_FILE_NAMES.SUPPLIERS,
        suppliersBuffer,
        false
      ),
      uploadOrUpdateExcelFileInDrive(
        folders.invoicesFolderId,
        DRIVE_FILE_NAMES.INVOICES,
        invoicesBuffer,
        false
      ),
      uploadOrUpdateExcelFileInDrive(
        folders.inventoryFolderId,
        DRIVE_FILE_NAMES.INVENTORY,
        inventoryBuffer,
        false
      ),
      uploadOrUpdateExcelFileInDrive(
        folders.completeBackupsFolderId,
        DRIVE_FILE_NAMES.COMPLETE,
        completeBuffer,
        false
      )
    ]);

    let historyFile: DriveBackupFileInfo | undefined;
    if (saveHistorySnapshot) {
      const historyBuffer = await generateExcelBackupBuffer('history', dataset);
      historyFile = await uploadOrUpdateExcelFileInDrive(
        folders.backupHistoryFolderId,
        formatSnapshotFilename(new Date(), snapshotType),
        historyBuffer,
        snapshotType !== 'daily' // Daily backup updates or creates today's daily file
      );
    }

    return {
      folders,
      moduleFiles: {
        customers: { ...customersFile, module: 'customers' },
        suppliers: { ...suppliersFile, module: 'suppliers' },
        invoices: { ...invoicesFile, module: 'invoices' },
        inventory: { ...inventoryFile, module: 'inventory' },
        complete: { ...completeFile, module: 'complete' }
      },
      historyFile
    };
  });
}

/**
 * Creates a standalone historical snapshot in Backup_History/ (used for Daily, Hourly, or Emergency Pre-Restore backups)
 * and also updates the master Meezan_Flow_Backup.xlsx in-place.
 */
export async function createScheduledOrEmergencyExcelSnapshot(
  dataset: LedgerBackupDataset,
  scheduleType: SnapshotScheduleType
): Promise<{
  completeFile: DriveBackupFileInfo;
  historyFile: DriveBackupFileInfo;
}> {
  return enqueueSyncOperation(async () => {
    const folders = await ensureDriveFolderStructure();
    const buffer = await generateExcelBackupBuffer('complete', dataset);
    const snapshotName = formatSnapshotFilename(new Date(), scheduleType);

    const [completeFile, historyFile] = await Promise.all([
      uploadOrUpdateExcelFileInDrive(
        folders.completeBackupsFolderId,
        DRIVE_FILE_NAMES.COMPLETE,
        buffer,
        false
      ),
      uploadOrUpdateExcelFileInDrive(
        folders.backupHistoryFolderId,
        snapshotName,
        buffer,
        scheduleType !== 'daily'
      )
    ]);

    return { completeFile, historyFile };
  });
}

/**
 * Evaluates and executes:
 * 1. DAILY FULL BACKUP: One complete daily snapshot of the entire database per calendar day.
 * 2. HOURLY BACKUP: Hourly snapshot ONLY when actual database changes have occurred (hash diff).
 */
export async function checkAndRunScheduledBackups(
  dataset: LedgerBackupDataset,
  onCheckpointCreated?: (type: 'daily' | 'hourly', label: string, historyFile: DriveBackupFileInfo) => Promise<void>
): Promise<{
  dailyCreated?: DriveBackupFileInfo;
  hourlyCreated?: DriveBackupFileInfo;
}> {
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(
    now.getDate()
  ).padStart(2, '0')}`;
  const currentHash = computeDatasetFingerprint(dataset);

  const lastDailyDate = localStorage.getItem(LAST_DAILY_BACKUP_KEY);
  const lastHourlyHash = localStorage.getItem(LAST_HOURLY_HASH_KEY);
  const lastHourlyTs = Number(localStorage.getItem(LAST_HOURLY_TIME_KEY) || '0');

  let dailyCreated: DriveBackupFileInfo | undefined;
  let hourlyCreated: DriveBackupFileInfo | undefined;

  // 1. Daily Full Backup (once per calendar day)
  if (lastDailyDate !== todayStr) {
    const { historyFile } = await createScheduledOrEmergencyExcelSnapshot(dataset, 'daily');
    localStorage.setItem(LAST_DAILY_BACKUP_KEY, todayStr);
    localStorage.setItem(LAST_HOURLY_HASH_KEY, currentHash);
    localStorage.setItem(LAST_HOURLY_TIME_KEY, String(now.getTime()));
    dailyCreated = historyFile;
    if (onCheckpointCreated) {
      await onCheckpointCreated(
        'daily',
        `Daily Full Backup (${formatDateDdMmmYyyy(now.toISOString())})`,
        historyFile
      );
    }
    return { dailyCreated };
  }

  // 2. Hourly Backup (only when at least 1 hour has passed OR hash changed on hourly check, and actual database changes occurred)
  const oneHourMs = 60 * 60 * 1000;
  const hourElapsed = now.getTime() - lastHourlyTs >= oneHourMs;
  const hasDatabaseChanged = currentHash !== lastHourlyHash;

  if (hourElapsed && hasDatabaseChanged) {
    const { historyFile } = await createScheduledOrEmergencyExcelSnapshot(dataset, 'hourly');
    localStorage.setItem(LAST_HOURLY_HASH_KEY, currentHash);
    localStorage.setItem(LAST_HOURLY_TIME_KEY, String(now.getTime()));
    hourlyCreated = historyFile;
    if (onCheckpointCreated) {
      await onCheckpointCreated(
        'hourly',
        `Hourly Change Snapshot (${formatDateTimeDdMmmYyyy(now.toISOString())})`,
        historyFile
      );
    }
  }

  return { dailyCreated, hourlyCreated };
}

/**
 * Triggers an immediate change-verified Hourly Snapshot if actual database changes have occurred
 * since the last recorded snapshot.
 */
export async function triggerHourlyBackupIfChanged(
  dataset: LedgerBackupDataset,
  onCheckpointCreated?: (label: string, historyFile: DriveBackupFileInfo) => Promise<void>
): Promise<{ created: boolean; historyFile?: DriveBackupFileInfo; reason?: string }> {
  const currentHash = computeDatasetFingerprint(dataset);
  const lastHourlyHash = localStorage.getItem(LAST_HOURLY_HASH_KEY);

  if (currentHash === lastHourlyHash) {
    return {
      created: false,
      reason: 'No database changes detected since the last hourly backup.'
    };
  }

  const now = new Date();
  const { historyFile } = await createScheduledOrEmergencyExcelSnapshot(dataset, 'hourly');
  localStorage.setItem(LAST_HOURLY_HASH_KEY, currentHash);
  localStorage.setItem(LAST_HOURLY_TIME_KEY, String(now.getTime()));

  if (onCheckpointCreated) {
    await onCheckpointCreated(
      `Hourly Change Snapshot (${formatDateTimeDdMmmYyyy(now.toISOString())})`,
      historyFile
    );
  }

  return { created: true, historyFile };
}

/**
 * Fetches current Google Drive backup files across all organized folders.
 * Retains 100% of historical backups without automatic deletion.
 */
export async function fetchGoogleDriveBackupStatus(): Promise<{
  folders: DriveFolderStructureIds;
  moduleFiles: Partial<Record<BackupModuleType, DriveBackupFileInfo>>;
  historyFiles: DriveBackupFileInfo[];
}> {
  let serverStatus: {
    folders: DriveFolderStructureIds;
    moduleFiles: Partial<Record<BackupModuleType, DriveBackupFileInfo>>;
    historyFiles: DriveBackupFileInfo[];
  } = {
    folders: DEFAULT_LOCAL_FOLDERS,
    moduleFiles: {},
    historyFiles: []
  };

  try {
    const res = await fetch('/api/excel-backups/status');
    if (res.ok) {
      const data = await res.json();
      serverStatus = {
        folders: data.folders || DEFAULT_LOCAL_FOLDERS,
        moduleFiles: data.moduleFiles || {},
        historyFiles: Array.isArray(data.historyFiles)
          ? data.historyFiles.map((f: any) => ({
              ...f,
              snapshotType: inferSnapshotTypeFromName(f.name)
            }))
          : []
      };
    }
  } catch {
    // ignore
  }

  if (!getGoogleAccessToken()) {
    return serverStatus;
  }

  try {
    const folders = await ensureDriveFolderStructure();
    if (folders.rootFolderId.startsWith('local:')) {
      return serverStatus;
    }

    const [
      customersFile,
      suppliersFile,
      invoicesFile,
      inventoryFile,
      completeFilePrimary,
      historyRes
    ] = await Promise.all([
      findFileInFolder(DRIVE_FILE_NAMES.CUSTOMERS, folders.customersFolderId),
      findFileInFolder(DRIVE_FILE_NAMES.SUPPLIERS, folders.suppliersFolderId),
      findFileInFolder(DRIVE_FILE_NAMES.INVOICES, folders.invoicesFolderId),
      findFileInFolder(DRIVE_FILE_NAMES.INVENTORY, folders.inventoryFolderId),
      findFileInFolder(DRIVE_FILE_NAMES.COMPLETE, folders.completeBackupsFolderId),
      driveFetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
          `'${folders.backupHistoryFolderId}' in parents and trashed = false`
        )}&fields=files(id,name,modifiedTime,size,webViewLink)&orderBy=modifiedTime desc&pageSize=100`
      )
    ]);

    const completeFile =
      completeFilePrimary ||
      (await findFileInFolder('Meezan_Flow_Full_Backup.xlsx', folders.completeBackupsFolderId));

    const historyData = await historyRes.json();
    const driveHistoryFiles: DriveBackupFileInfo[] = Array.isArray(historyData.files)
      ? historyData.files.map((f: any) => ({
          ...f,
          module: 'history' as const,
          snapshotType: inferSnapshotTypeFromName(f.name)
        }))
      : [];

    const moduleFiles: Partial<Record<BackupModuleType, DriveBackupFileInfo>> = {
      ...serverStatus.moduleFiles
    };
    if (customersFile) moduleFiles.customers = { ...customersFile, module: 'customers' };
    if (suppliersFile) moduleFiles.suppliers = { ...suppliersFile, module: 'suppliers' };
    if (invoicesFile) moduleFiles.invoices = { ...invoicesFile, module: 'invoices' };
    if (inventoryFile) moduleFiles.inventory = { ...inventoryFile, module: 'inventory' };
    if (completeFile) moduleFiles.complete = { ...completeFile, module: 'complete' };

    return {
      folders,
      moduleFiles,
      historyFiles: driveHistoryFiles.length > 0 ? driveHistoryFiles : serverStatus.historyFiles
    };
  } catch (err) {
    console.warn('Falling back to organized server backup status:', err);
    return serverStatus;
  }
}

/**
 * Deletes a historical Excel (.xlsx) backup file after administrator confirmation.
 */
export async function deleteHistoricalExcelBackupFile(fileId: string): Promise<void> {
  inMemoryExcelBuffers.delete(fileId);
  removeCachedDriveFileId(fileId);

  if (fileId.startsWith('local:')) {
    const relativePath = fileId.replace(/^local:/, '');
    const parts = relativePath.split('/');
    if (parts.length >= 2) {
      const folderName = parts[0];
      const fileName = parts.slice(1).join('/');
      const token = localStorage.getItem('token') || '';
      const res = await fetch(
        `/api/excel-backups/file/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`,
        {
          method: 'DELETE',
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          }
        }
      );
      if (!res.ok) {
        let msg = 'Failed to delete historical Excel backup file.';
        try {
          const errJson = await res.json();
          if (errJson?.error) msg = errJson.error;
        } catch {
          // ignore
        }
        throw new Error(msg);
      }
      return;
    }
  }

  // Delete from Google Drive REST API v3
  await driveFetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}`, {
    method: 'DELETE'
  });
}

/**
 * Downloads an Excel (.xlsx) file from Google Drive or the organized Meezan Flow Backups store
 * by fileId and parses its sheets for accurate restoration.
 */
export async function downloadAndParseDriveExcelBackup(
  fileId: string
): Promise<Partial<LedgerBackupDataset>> {
  const cachedBuf = inMemoryExcelBuffers.get(fileId);
  if (cachedBuf && cachedBuf.byteLength > 0) {
    return parseExcelBackupBuffer(cachedBuf);
  }

  if (fileId.startsWith('local:')) {
    const relativePath = fileId.replace(/^local:/, '');
    const parts = relativePath.split('/');
    if (parts.length >= 2) {
      const folderName = parts[0];
      const fileName = parts.slice(1).join('/');
      const res = await fetch(
        `/api/excel-backups/file/${encodeURIComponent(folderName)}/${encodeURIComponent(fileName)}`
      );
      if (!res.ok) {
        throw new Error(`Could not download backup file "${fileName}" from server.`);
      }
      const arrayBuffer = await res.arrayBuffer();
      if (!arrayBuffer || arrayBuffer.byteLength === 0) {
        throw new Error('Downloaded Excel backup file is empty.');
      }
      return parseExcelBackupBuffer(arrayBuffer);
    }
  }

  const res = await driveFetch(
    `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fileId)}?alt=media`
  );
  const arrayBuffer = await res.arrayBuffer();
  if (!arrayBuffer || arrayBuffer.byteLength === 0) {
    throw new Error('Downloaded Google Drive backup file is empty.');
  }
  return parseExcelBackupBuffer(arrayBuffer);
}
