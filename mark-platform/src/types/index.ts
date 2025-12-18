// User types
export type UserRole = 'ADMIN' | 'STUDENT' | 'SUPER_ADMIN';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  schoolId: string;
}

// Authentication types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

// Rule types
export interface SchoolRule {
  id: string;
  ruleName: string;
  marksToAward: number;
  isActive: boolean;
  createdAt: string;
  targetGrade?: string; // Optional: Specific grade/class this rule applies to
}

export interface CreateRuleRequest {
  ruleName: string;
  marksToAward: number;
}

// Award types
export interface AwardMarksRequest {
  studentId: string;
  ruleId: string;
  description?: string;
}

export interface AwardMarksResponse {
  success: boolean;
  newBalance: number;
  transaction: Transaction;
}

// Student types
export interface Student {
  id: string;
  userId: string;
  schoolId: string;
  marksBalance: number;
}

// Transaction types
export type TransactionType = 'CREDIT' | 'DEBIT';

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  description: string;
  createdAt: string;
}

export interface DashboardData {
  balance: number;
  transactions: Transaction[];
}

// Voucher types
export interface Voucher {
  id: string;
  name: string;
  description: string;
  marksCost: number;
  providerProductId: string;
  isAvailable: boolean;
}

export interface RedeemVoucherRequest {
  voucherId: string;
}

export interface RedeemVoucherResponse {
  success: boolean;
  voucherCode: string;
  newBalance: number;
  message: string;
}

// API Error types
export interface ApiError {
  error: {
    code: string;
    message: string;
  };
}

// SUPER_ADMIN types
export interface PlatformStats {
  totalSchools: number;
  totalStudents: number;
  totalTransactions: number;
  totalMarksInCirculation: number;
}

export interface School {
  id: string;
  name: string;
  createdAt: string;
}

export interface PlatformStudent {
  id: string;
  name: string;
  email: string;
  schoolName: string;
  marksBalance: number;
  enrollment_id?: string;
  grade?: string;
}

export interface PlatformTransaction {
  id: string;
  date: string;
  studentName: string;
  schoolName: string;
  type: TransactionType;
  amount: number;
  description: string;
}

export interface PaginatedResponse<T> {
  totalCount: number;
  page: number;
  limit: number;
}

export interface PlatformStudentsResponse extends PaginatedResponse<PlatformStudent> {
  students: PlatformStudent[];
}

export interface PlatformTransactionsResponse extends PaginatedResponse<PlatformTransaction> {
  transactions: PlatformTransaction[];
}

export interface VoucherFormData {
  id?: string;
  name: string;
  description: string;
  marksCost: number;
  providerProductId: string;
  isAvailable: boolean;
}

// Student Redemption types
export interface StudentRedemption {
  id: string;
  voucherName: string;
  voucherCode: string | null;
  marksCost: number;
  redeemedAt: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}
