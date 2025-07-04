
export type UserRole = "finance" | "commercial" | "admin";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatar?: string;
}

export interface Transaction {
  id: string;
  date: string;
  account: string; // Last 4 digits of card/account
  merchant: string;
  amount: number;
  currency: string;
  category?: string;
  subcategory?: string; // Para subcategorías como en Travel expenses
  project?: string;
  comments?: string;
  status: "pending" | "classified" | "approved" | "completed";
  assignedTo?: string; // User ID
}

export interface BankStatement {
  id: string;
  fileName: string;
  uploadDate: string;
  period: string; // e.g., "March 2025"
  status: "processing" | "processed" | "error";
  transactionCount: number;
  accounts: string[]; // List of accounts detected
}

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Project {
  id: string;
  name: string;
  code?: string;
  isActive: boolean;
}

export interface ClassificationStats {
  total: number;
  classified: number;
  pending: number;
  percentComplete: number;
}

export interface AccountSummary {
  account: string;
  transactions: number;
  totalAmount: number;
  currency: string;
  assignedTo?: string;
  status: "pending" | "complete" | "partial";
}

export interface DashboardMetrics {
  totalTransactions: number;
  classifiedTransactions: number;
  pendingTransactions: number;
  completionRate: number;
  accountSummaries: AccountSummary[];
}
