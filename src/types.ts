/**
 * Types and interfaces for DigiKhata Ledger Web Application.
 */

export type UserRole = 'Owner' | 'Manager' | 'Employee';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  businessName: string;
  token?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  email: string;
  balance: number; // Positive means customer owes us (Receivable), negative means we owe customer (Payable)
  updatedAt: string;
  businessId: string;
}

export interface Supplier {
  id: string;
  name: string;
  phone: string;
  email: string;
  balance: number; // Positive means we owe supplier (Payable), negative means supplier owes us
  updatedAt: string;
  businessId: string;
}

export type TransactionType = 'credit' | 'debit'; // credit = customer took from us (receivable increases), debit = customer paid us (receivable decreases)

export interface Transaction {
  id: string;
  customerId: string; // References Customer id
  customerName: string;
  type: TransactionType; // 'credit' (gave on credit / Udhaar given) or 'debit' (received cash / payment received)
  amount: number;
  date: string;
  createdAt?: string; // ISO timestamp for exact date & time
  description: string;
  invoiceId?: string;
  createdBy: string; // User email or ID
  businessId: string;
}

export type CashBookType = 'cash-in' | 'cash-out';

export interface CashBookEntry {
  id: string;
  type: CashBookType;
  amount: number;
  date: string;
  category: string;
  description: string;
  createdBy: string;
  businessId: string;
}

export interface StockItem {
  id: string;
  name: string;
  sku: string;
  purchasePrice: number;
  sellPrice: number;
  quantity: number;
  minQuantity: number; // For low-stock alerts
  category: string;
  unit: string; // e.g., 'pcs', 'kg', 'ltr', 'box'
  businessId: string;
}

export interface InvoiceItem {
  name: string;
  quantity: number;
  price: number;
  total: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  customerId?: string; // Optional client reference
  customerName: string;
  customerPhone?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  subTotal: number;
  discount: number;
  tax: number;
  total: number;
  isPaid: boolean;
  createdBy: string;
  businessId: string;
}

// Stats summary response
export interface FinancialStats {
  totalSales: number;
  totalExpenses: number;
  profit: number;
  receivables: number; // Sum of positive customer balances
  payables: number; // Sum of positive supplier balances + negative customer balances
  cashInHand: number;
}
