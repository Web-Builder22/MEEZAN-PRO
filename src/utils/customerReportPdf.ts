import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Customer, Transaction } from '../types';
import { BRAND } from '../brand';
import { formatPlainDescriptionText } from '../components/VoiceTransactionInput';

export interface StatementTransactionRow {
  index: number;
  id: string;
  date: string;
  time: string;
  referenceNumber: string;
  type: 'credit' | 'debit';
  typeLabel: string;
  description: string;
  amount: number;
  paymentGiven: number; // Credit given to customer (increases receivable)
  paymentReceived: number; // Payment received from customer (decreases receivable)
  runningBalance: number;
}

export interface CustomerStatementData {
  appName: string;
  businessName: string;
  customer: Customer;
  generatedAtIso: string;
  generatedAtFormatted: string;
  periodMode: 'all' | 'custom';
  startDate: string;
  endDate: string;
  periodLabel: string;
  openingBalance: number;
  rows: StatementTransactionRow[];
  totalCredit: number; // Total credit / payment given in selected period
  totalDebit: number; // Total debit / payment received in selected period
  totalPaymentGiven: number;
  totalPaymentReceived: number;
  closingBalance: number; // Final balance at end of selected period
  currentAccountBalance: number; // Overall latest balance on customer profile
  balanceDirection: 'receivable' | 'payable' | 'settled';
  balanceDirectionLabel: string;
  balanceSummarySentence: string;
}

/**
 * Formats a number as "Rs 12,345" or "-Rs 12,345"
 */
export function formatRs(amount: number, includeSign = false): string {
  const num = Number(amount) || 0;
  const absFormatted = Math.abs(num).toLocaleString('en-US', {
    maximumFractionDigits: 2
  });
  if (!includeSign) {
    return `Rs ${absFormatted}`;
  }
  if (num > 0) return `+Rs ${absFormatted}`;
  if (num < 0) return `-Rs ${absFormatted}`;
  return `Rs 0`;
}

/**
 * Formats balance with accounting status suffix (Receivable / Payable / Settled)
 */
export function formatBalanceWithStatus(balance: number): string {
  const num = Number(balance) || 0;
  const abs = Math.abs(num).toLocaleString('en-US', { maximumFractionDigits: 2 });
  if (num > 0) {
    return `Rs ${abs} (Receivable / You'll Get)`;
  }
  if (num < 0) {
    return `Rs ${abs} (Payable / You'll Give)`;
  }
  return `Rs 0 (Settled)`;
}

/**
 * Builds complete, isolated, chronologically accurate CustomerStatementData
 * strictly from the selected customer's stored transactions.
 */
export function computeCustomerStatementData(params: {
  customer: Customer;
  allTransactions: Transaction[];
  businessName?: string;
  startDate?: string;
  endDate?: string;
}): CustomerStatementData {
  const { customer, allTransactions, businessName, startDate = '', endDate = '' } = params;

  // Strictly isolate transactions belonging ONLY to this customer
  const customerOnlyTxs = (allTransactions || []).filter(
    (tx) => tx && tx.customerId === customer.id
  );

  // Sort chronologically (oldest -> newest) with deterministic tie-breaker
  const indexed = customerOnlyTxs.map((tx, idx) => ({ tx, idx }));
  indexed.sort((a, b) => {
    const dateA = a.tx.date || (a.tx.createdAt ? a.tx.createdAt.split('T')[0] : '');
    const dateB = b.tx.date || (b.tx.createdAt ? b.tx.createdAt.split('T')[0] : '');
    const dateCmp = dateA.localeCompare(dateB);
    if (dateCmp !== 0) return dateCmp;

    const timeA = a.tx.createdAt || '';
    const timeB = b.tx.createdAt || '';
    if (timeA && timeB && timeA !== timeB) {
      return timeA.localeCompare(timeB);
    }

    return b.idx - a.idx;
  });

  // Calculate net effect of all recorded transactions to derive true account-inception opening balance
  // Accounting rule in Meezan Flow:
  // - 'credit': Credit / goods / payment given to customer -> increases customer balance (+amount)
  // - 'debit': Payment received from customer -> decreases customer balance (-amount)
  const totalNetAllTime = indexed.reduce((acc, { tx }) => {
    const amt = Number(tx.amount) || 0;
    return tx.type === 'credit' ? acc + amt : acc - amt;
  }, 0);

  const currentAccountBalance = Number(customer.balance) || 0;
  const inceptionOpeningBalance = currentAccountBalance - totalNetAllTime;

  const isCustomPeriod = Boolean(startDate || endDate);

  // Calculate opening balance at the start of the selected reporting period
  let running = inceptionOpeningBalance;
  const periodTxs: { tx: Transaction; runningBalance: number }[] = [];

  for (const { tx } of indexed) {
    const txDate = tx.date || (tx.createdAt ? tx.createdAt.split('T')[0] : '');
    const amt = Number(tx.amount) || 0;

    // If transaction occurred strictly before startDate, fold it into the period's opening balance
    if (startDate && txDate < startDate) {
      running += tx.type === 'credit' ? amt : -amt;
      continue;
    }

    // If transaction occurred strictly after endDate, stop including in the period
    if (endDate && txDate > endDate) {
      continue;
    }

    running += tx.type === 'credit' ? amt : -amt;
    periodTxs.push({ tx, runningBalance: running });
  }

  // Opening balance for the selected period is `running` before the first periodTx was applied
  let periodOpeningBalance = inceptionOpeningBalance;
  if (startDate) {
    periodOpeningBalance = indexed.reduce((acc, { tx }) => {
      const txDate = tx.date || (tx.createdAt ? tx.createdAt.split('T')[0] : '');
      const amt = Number(tx.amount) || 0;
      if (txDate < startDate) {
        return tx.type === 'credit' ? acc + amt : acc - amt;
      }
      return acc;
    }, inceptionOpeningBalance);
  }

  let totalCredit = 0;
  let totalDebit = 0;

  const rows: StatementTransactionRow[] = periodTxs.map(({ tx, runningBalance }, idx) => {
    const amt = Number(tx.amount) || 0;
    const isCredit = tx.type === 'credit';

    const paymentGiven = isCredit ? amt : 0;
    const paymentReceived = !isCredit ? amt : 0;

    totalCredit += paymentGiven;
    totalDebit += paymentReceived;

    const dateStr = tx.date || (tx.createdAt ? tx.createdAt.split('T')[0] : '—');
    let timeStr = '—';
    if (tx.createdAt) {
      const parsed = new Date(tx.createdAt);
      if (!isNaN(parsed.getTime())) {
        timeStr = parsed.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
      }
    }

    const referenceNumber = tx.invoiceId
      ? String(tx.invoiceId)
      : tx.id
      ? `TX-${String(tx.id).replace(/[^a-zA-Z0-9]/g, '').slice(-6).toUpperCase()}`
      : `TX-${String(idx + 1).padStart(4, '0')}`;

    return {
      index: idx + 1,
      id: tx.id || `row-${idx}`,
      date: dateStr,
      time: timeStr,
      referenceNumber,
      type: tx.type,
      typeLabel: isCredit ? 'Credit (Gave)' : 'Debit (Received)',
      description: formatPlainDescriptionText(tx.description, 'Standard ledger entry'),
      amount: amt,
      paymentGiven,
      paymentReceived,
      runningBalance
    };
  });

  const closingBalance = periodOpeningBalance + totalCredit - totalDebit;

  const balanceDirection: 'receivable' | 'payable' | 'settled' =
    closingBalance > 0 ? 'receivable' : closingBalance < 0 ? 'payable' : 'settled';

  const resolvedBusinessName = (businessName || '').trim() || BRAND.displayName;

  const balanceDirectionLabel =
    balanceDirection === 'receivable'
      ? "Customer Owes Business (You'll Get)"
      : balanceDirection === 'payable'
      ? "Business Owes Customer (You'll Give)"
      : 'Account Settled (Zero Balance)';

  const balanceSummarySentence =
    balanceDirection === 'receivable'
      ? `${customer.name} owes ${resolvedBusinessName} a net outstanding balance of ${formatRs(
          Math.abs(closingBalance)
        )}.`
      : balanceDirection === 'payable'
      ? `${resolvedBusinessName} owes ${customer.name} a net advance/payable balance of ${formatRs(
          Math.abs(closingBalance)
        )}.`
      : `${customer.name}'s account with ${resolvedBusinessName} is completely settled with Rs 0 outstanding.`;

  const now = new Date();
  const generatedAtIso = now.toISOString();
  const generatedAtFormatted = now.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  let periodLabel = 'Complete Account History (All Time)';
  if (startDate && endDate) {
    periodLabel = `${startDate} to ${endDate}`;
  } else if (startDate) {
    periodLabel = `From ${startDate} to Present`;
  } else if (endDate) {
    periodLabel = `Up to ${endDate}`;
  } else if (rows.length > 0) {
    periodLabel = `Full History (${rows[0].date} to ${rows[rows.length - 1].date})`;
  }

  return {
    appName: BRAND.displayName,
    businessName: resolvedBusinessName,
    customer,
    generatedAtIso,
    generatedAtFormatted,
    periodMode: isCustomPeriod ? 'custom' : 'all',
    startDate,
    endDate,
    periodLabel,
    openingBalance: periodOpeningBalance,
    rows,
    totalCredit,
    totalDebit,
    totalPaymentGiven: totalCredit,
    totalPaymentReceived: totalDebit,
    closingBalance,
    currentAccountBalance,
    balanceDirection,
    balanceDirectionLabel,
    balanceSummarySentence
  };
}

/**
 * Generates a concise text summary suitable for Share Summary / WhatsApp / SMS / Clipboard
 */
export function buildConciseReportSummaryText(
  statement: CustomerStatementData,
  language: 'en' | 'ur' = 'en'
): string {
  const {
    appName,
    businessName,
    customer,
    generatedAtFormatted,
    periodLabel,
    openingBalance,
    rows,
    totalCredit,
    totalDebit,
    closingBalance,
    balanceDirection
  } = statement;

  const titleHeader =
    businessName && businessName.toLowerCase() !== appName.toLowerCase()
      ? `${appName} (${businessName})`
      : appName;

  if (language === 'ur') {
    const statusUr =
      balanceDirection === 'receivable'
        ? `گاہک کے ذمہ واجب الادا (آپ لیں گے)`
        : balanceDirection === 'payable'
        ? `کاروبار کے ذمہ واجب الادا (آپ دیں گے)`
        : `کھاتہ بے باق ہے`;

    return (
      `*${titleHeader} — مکمل کھاتہ رپورٹ*\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*گاہک:* ${customer.name}\n` +
      `*فون:* ${customer.phone || '—'}\n` +
      `${customer.email ? `*ای میل:* ${customer.email}\n` : ''}` +
      `*مدت:* ${periodLabel}\n` +
      `*تاریخ اجرا:* ${generatedAtFormatted}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `• ابتدائی بیلنس (Opening): ${formatRs(openingBalance, true)}\n` +
      `• کل ادھار / دیا گیا (Total Credit): ${formatRs(totalCredit)}\n` +
      `• کل وصولی (Total Received): ${formatRs(totalDebit)}\n` +
      `• کل لین دین (Transactions): ${rows.length}\n` +
      `━━━━━━━━━━━━━━━━━━━━\n` +
      `*حتمی بقایا بیلنس: ${formatRs(Math.abs(closingBalance))}*\n` +
      `*کیفیت:* ${statusUr}\n\n` +
      `شکریہ! — *${appName}*`
    );
  }

  return (
    `*${titleHeader} — Official Account Statement*\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Customer:* ${customer.name}\n` +
    `*Phone:* ${customer.phone || 'N/A'}\n` +
    `${customer.email ? `*Email:* ${customer.email}\n` : ''}` +
    `*Reporting Period:* ${periodLabel}\n` +
    `*Generated On:* ${generatedAtFormatted}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Account Summary:*\n` +
    `• Opening Balance: ${formatBalanceWithStatus(openingBalance)}\n` +
    `• Total Credit / Payment Given: ${formatRs(totalCredit)}\n` +
    `• Total Debit / Payment Received: ${formatRs(totalDebit)}\n` +
    `• Total Transactions in Period: ${rows.length}\n` +
    `━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n` +
    `*Final Outstanding Balance:* ${formatRs(Math.abs(closingBalance))}\n` +
    `*Status:* ${statement.balanceDirectionLabel}\n` +
    `${statement.balanceSummarySentence}\n\n` +
    `Generated via *${appName}* — ${BRAND.tagline}`
  );
}

/**
 * Generates a clean, multi-page, printable PDF Document (jsPDF instance + Blob + Filename)
 * with Meezan Flow orange-red gradient branding, structured table, running balances,
 * summary cards, and page numbers.
 */
export function generateCustomerStatementPdf(statement: CustomerStatementData): {
  doc: jsPDF;
  blob: Blob;
  file: File;
  fileName: string;
} {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth(); // 210mm
  const pageHeight = doc.internal.pageSize.getHeight(); // 297mm
  const margin = 12;
  const contentWidth = pageWidth - margin * 2;

  // =========================================================================
  // 1. MEEZANFLOW DEEP EMERALD & FOREST GREEN GRADIENT TOP BANNER
  // =========================================================================
  const headerHeight = 34;
  const gradientSteps = 36;
  const stepWidth = pageWidth / gradientSteps;
  const startRGB = [2, 44, 34]; // #022C22 (Dark Forest Green)
  const endRGB = [6, 95, 70]; // #065F46 (Deep Emerald Green)

  for (let i = 0; i < gradientSteps; i++) {
    const ratio = i / (gradientSteps - 1);
    const r = Math.round(startRGB[0] + (endRGB[0] - startRGB[0]) * ratio);
    const g = Math.round(startRGB[1] + (endRGB[1] - startRGB[1]) * ratio);
    const b = Math.round(startRGB[2] + (endRGB[2] - startRGB[2]) * ratio);
    doc.setFillColor(r, g, b);
    doc.rect(i * stepWidth, 0, stepWidth + 0.5, headerHeight, 'F');
  }

  // Subtle Gold Accent Bar under header
  doc.setFillColor(212, 175, 55); // #D4AF37
  doc.rect(0, headerHeight - 1.2, pageWidth, 1.2, 'F');

  // Brand Title: MEEZANFLOW
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('MeezanFlow', margin, 14);

  // Business Name & Tagline Subtitle
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9.5);
  const subHeaderTitle =
    statement.businessName &&
    statement.businessName.toLowerCase() !== statement.appName.toLowerCase()
      ? `${statement.businessName} • ${BRAND.tagline}`
      : BRAND.tagline;
  doc.text(subHeaderTitle, margin, 20.5);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.text('COMPLETE CUSTOMER ACCOUNT STATEMENT', margin, 27.5);

  // Right-aligned Report Metadata inside Header
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('ACCOUNT STATEMENT', pageWidth - margin, 13.5, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(`Generated: ${statement.generatedAtFormatted}`, pageWidth - margin, 19.5, {
    align: 'right'
  });
  doc.text(`Period: ${statement.periodLabel}`, pageWidth - margin, 25.5, {
    align: 'right'
  });

  let cursorY = headerHeight + 7;

  // =========================================================================
  // 2. CUSTOMER INFORMATION & REPORTING PERIOD CARD
  // =========================================================================
  doc.setFillColor(249, 250, 251); // #F9FAFB
  doc.setDrawColor(229, 231, 235); // #E5E7EB
  doc.setLineWidth(0.3);
  doc.roundedRect(margin, cursorY, contentWidth, 26, 2.5, 2.5, 'FD');

  // Left Column: Customer Identity
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('CUSTOMER / ACCOUNT HOLDER', margin + 4, cursorY + 5.5);

  doc.setTextColor(17, 24, 39);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  const safeCustomerName = (statement.customer.name || 'Customer').slice(0, 48);
  doc.text(safeCustomerName, margin + 4, cursorY + 11.5);

  doc.setTextColor(55, 65, 81);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  const phoneLine = `Phone: ${statement.customer.phone || 'Not provided'}`;
  const emailLine = statement.customer.email ? `  |  Email: ${statement.customer.email}` : '';
  doc.text(`${phoneLine}${emailLine}`, margin + 4, cursorY + 17.5);

  doc.setTextColor(107, 114, 128);
  doc.setFontSize(8);
  const promisedLine = statement.customer.promisedPaymentDate
    ? `  |  Promised Due: ${statement.customer.promisedPaymentDate}`
    : '';
  doc.text(
    `Account ID: ${statement.customer.id.slice(0, 10)}  |  Business: ${statement.businessName}${promisedLine}`,
    margin + 4,
    cursorY + 22.8
  );

  // Right Column inside Customer Card: Period & Status
  const rightColX = pageWidth - margin - 4;
  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('FINAL OUTSTANDING BALANCE', rightColX, cursorY + 5.5, { align: 'right' });

  // Color-code closing balance: Dark Maroon for Receivable, Green for Payable, Gray for Settled
  if (statement.balanceDirection === 'receivable') {
    doc.setTextColor(122, 28, 28); // #7A1C1C Dark Maroon
  } else if (statement.balanceDirection === 'payable') {
    doc.setTextColor(22, 163, 74); // #16A34A Payable Green
  } else {
    doc.setTextColor(75, 85, 99);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13.5);
  doc.text(formatRs(Math.abs(statement.closingBalance)), rightColX, cursorY + 12, {
    align: 'right'
  });

  doc.setFontSize(8.5);
  doc.text(statement.balanceDirectionLabel, rightColX, cursorY + 17.5, { align: 'right' });

  doc.setTextColor(107, 114, 128);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.text(`Entries in Report: ${statement.rows.length}`, rightColX, cursorY + 22.8, {
    align: 'right'
  });

  cursorY += 31;

  // =========================================================================
  // 3. FOUR FINANCIAL SUMMARY KPI BOXES
  // =========================================================================
  const boxGap = 3;
  const boxWidth = (contentWidth - boxGap * 3) / 4;
  const boxHeight = 18;

  const kpiCards = [
    {
      label: 'OPENING BALANCE',
      value: formatRs(Math.abs(statement.openingBalance)),
      sub:
        statement.openingBalance > 0
          ? "Receivable (You'll Get)"
          : statement.openingBalance < 0
          ? "Payable (You'll Give)"
          : 'Settled (Rs 0)',
      color: [31, 41, 55] as [number, number, number]
    },
    {
      label: 'TOTAL CREDIT (GIVEN)',
      value: formatRs(statement.totalCredit),
      sub: 'Payment / Credit Given',
      color: [122, 28, 28] as [number, number, number] // Dark Maroon
    },
    {
      label: 'TOTAL DEBIT (RECEIVED)',
      value: formatRs(statement.totalDebit),
      sub: 'Payments Received',
      color: [22, 163, 74] as [number, number, number] // Green
    },
    {
      label: 'CLOSING BALANCE',
      value: formatRs(Math.abs(statement.closingBalance)),
      sub:
        statement.balanceDirection === 'receivable'
          ? 'Customer Owes You'
          : statement.balanceDirection === 'payable'
          ? 'You Owe Customer'
          : 'Settled Account',
      color:
        statement.balanceDirection === 'receivable'
          ? ([122, 28, 28] as [number, number, number])
          : statement.balanceDirection === 'payable'
          ? ([22, 163, 74] as [number, number, number])
          : ([55, 65, 81] as [number, number, number])
    }
  ];

  kpiCards.forEach((card, idx) => {
    const x = margin + idx * (boxWidth + boxGap);
    doc.setFillColor(255, 255, 255);
    doc.setDrawColor(229, 231, 235);
    doc.roundedRect(x, cursorY, boxWidth, boxHeight, 2, 2, 'FD');

    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6.8);
    doc.text(card.label, x + 3, cursorY + 4.8);

    doc.setTextColor(card.color[0], card.color[1], card.color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text(card.value, x + 3, cursorY + 11.2);

    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.text(card.sub, x + 3, cursorY + 15.6);
  });

  cursorY += boxHeight + 6;

  // =========================================================================
  // 4. COMPLETE TRANSACTION LEDGER TABLE (MULTI-PAGE WITH RUNNING BALANCE)
  // =========================================================================
  const formatRunningCell = (bal: number) => {
    const abs = Math.abs(bal).toLocaleString('en-US', { maximumFractionDigits: 2 });
    if (bal > 0) return `Rs ${abs} (Dr)`;
    if (bal < 0) return `Rs ${abs} (Cr)`;
    return `Rs 0`;
  };

  // Construct table rows starting with an explicit Opening Balance row
  const tableBody: any[] = [
    [
      '—',
      statement.startDate || 'Account Start',
      'OPEN-BAL',
      'Opening Balance',
      'Balance brought forward at start of reporting period',
      statement.openingBalance > 0 ? formatRs(statement.openingBalance) : '—',
      statement.openingBalance < 0 ? formatRs(Math.abs(statement.openingBalance)) : '—',
      formatRunningCell(statement.openingBalance)
    ]
  ];

  if (statement.rows.length === 0) {
    tableBody.push([
      '—',
      '—',
      '—',
      'No Activity',
      'No transactions recorded during the selected reporting period.',
      'Rs 0',
      'Rs 0',
      formatRunningCell(statement.closingBalance)
    ]);
  } else {
    statement.rows.forEach((row) => {
      const dateTimeCell = row.time && row.time !== '—' ? `${row.date}\n${row.time}` : row.date;
      tableBody.push([
        String(row.index),
        dateTimeCell,
        row.referenceNumber,
        row.typeLabel,
        row.description,
        row.paymentGiven > 0 ? formatRs(row.paymentGiven) : '—',
        row.paymentReceived > 0 ? formatRs(row.paymentReceived) : '—',
        formatRunningCell(row.runningBalance)
      ]);
    });
  }

  autoTable(doc, {
    startY: cursorY,
    margin: { left: margin, right: margin, bottom: 22 },
    head: [
      [
        '#',
        'Date & Time',
        'Ref #',
        'Type',
        'Description / Particulars',
        'Credit / Given\n(Rs)',
        'Debit / Received\n(Rs)',
        'Running Balance\n(Rs)'
      ]
    ],
    body: tableBody,
    foot: [
      [
        '',
        '',
        '',
        'PERIOD TOTALS',
        `${statement.rows.length} Transaction(s)`,
        formatRs(statement.totalCredit),
        formatRs(statement.totalDebit),
        formatRunningCell(statement.closingBalance)
      ]
    ],
    showFoot: 'lastPage',
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 8,
      cellPadding: 2.4,
      textColor: [31, 41, 55],
      lineColor: [229, 231, 235],
      lineWidth: 0.2,
      valign: 'middle',
      overflow: 'linebreak'
    },
    headStyles: {
      fillColor: [6, 78, 59], // MeezanFlow Deep Emerald #064E3B
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7.8,
      halign: 'left'
    },
    footStyles: {
      fillColor: [243, 244, 246],
      textColor: [17, 24, 39],
      fontStyle: 'bold',
      fontSize: 8.2,
      lineColor: [209, 213, 219],
      lineWidth: 0.3
    },
    alternateRowStyles: {
      fillColor: [252, 252, 253]
    },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 23 },
      2: { cellWidth: 19 },
      3: { cellWidth: 24 },
      4: { cellWidth: 45 },
      5: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [122, 28, 28] },
      6: { cellWidth: 22, halign: 'right', fontStyle: 'bold', textColor: [22, 163, 74] },
      7: { cellWidth: 22, halign: 'right', fontStyle: 'bold' }
    },
    didParseCell: (data) => {
      // Highlight the Opening Balance row subtly
      if (data.section === 'body' && data.row.index === 0) {
        data.cell.styles.fillColor = [236, 253, 245]; // Soft emerald tint
        data.cell.styles.fontStyle = 'bold';
      }
      // Align numeric header and footer columns to the right
      if ((data.section === 'head' || data.section === 'foot') && data.column.index >= 5) {
        data.cell.styles.halign = 'right';
      }
    }
  });

  // =========================================================================
  // 5. PROFESSIONAL END-OF-REPORT SUMMARY BLOCK
  // =========================================================================
  const finalY = (doc as any).lastAutoTable?.finalY || cursorY + 20;
  let summaryY = finalY + 7;

  // If the summary block won't fit before the footer on the current page, add a new page
  if (summaryY + 36 > pageHeight - 20) {
    doc.addPage();
    summaryY = 18;
  }

  doc.setFillColor(236, 253, 245); // Soft emerald tint #ECFDF5
  doc.setDrawColor(6, 78, 59); // #064E3B border
  doc.setLineWidth(0.35);
  doc.roundedRect(margin, summaryY, contentWidth, 32, 2.5, 2.5, 'FD');

  doc.setTextColor(6, 78, 59); // #064E3B
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9.5);
  doc.text('FINAL ACCOUNT RECONCILIATION & SUMMARY', margin + 4, summaryY + 6.5);

  doc.setTextColor(31, 41, 55);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.3);
  const summaryLines = [
    `• Opening Balance: ${formatBalanceWithStatus(statement.openingBalance)}`,
    `• Total Credit / Payment Given (${statement.rows.filter((r) => r.type === 'credit').length} entries): ${formatRs(statement.totalCredit)}   |   Total Debit / Payment Received (${statement.rows.filter((r) => r.type === 'debit').length} entries): ${formatRs(statement.totalDebit)}`,
    `• Final Outstanding Balance: ${formatRs(Math.abs(statement.closingBalance))} — ${statement.balanceDirectionLabel}`,
    `• Summary: ${statement.balanceSummarySentence}`
  ];

  summaryLines.forEach((line, i) => {
    if (i === 2) {
      doc.setFont('helvetica', 'bold');
    } else {
      doc.setFont('helvetica', 'normal');
    }
    const wrapped = doc.splitTextToSize(line, contentWidth - 8);
    doc.text(wrapped[0], margin + 4, summaryY + 12.5 + i * 5.4);
  });

  // =========================================================================
  // 6. STAMP PAGE NUMBERS & GENERATION TIMESTAMP ON ALL PAGES
  // =========================================================================
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.line(margin, pageHeight - 13, pageWidth - margin, pageHeight - 13);

    doc.setTextColor(107, 114, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      `${BRAND.displayName} (${statement.businessName}) • Official Customer Account Statement • Generated ${statement.generatedAtFormatted}`,
      margin,
      pageHeight - 8
    );

    doc.setFont('helvetica', 'bold');
    doc.text(`Page ${p} of ${totalPages}`, pageWidth - margin, pageHeight - 8, {
      align: 'right'
    });
  }

  // Create clean filename
  const cleanCustName = (statement.customer.name || 'Customer')
    .replace(/[^a-zA-Z0-9_-]/g, '_')
    .replace(/_+/g, '_')
    .slice(0, 30);
  const dateStamp = new Date().toISOString().split('T')[0];
  const fileName = `MeezanFlow_Statement_${cleanCustName}_${dateStamp}.pdf`;

  const blob = doc.output('blob');
  const file = new File([blob], fileName, { type: 'application/pdf' });

  return {
    doc,
    blob,
    file,
    fileName
  };
}
