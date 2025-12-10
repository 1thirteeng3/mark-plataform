import type {
  LoginRequest,
  LoginResponse,
  CreateRuleRequest,
  SchoolRule,
  AwardMarksRequest,
  AwardMarksResponse,
  DashboardData,
  Voucher,
  RedeemVoucherRequest,
  RedeemVoucherResponse,
  User,
  ApiError,
} from '../types';

const FUNCTIONS_URL = 'https://cqrjiaskaperrmfiuewd.supabase.co/functions/v1';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNxcmppYXNrYXBlcnJtZml1ZXdkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjA1MjkwMDUsImV4cCI6MjA3NjEwNTAwNX0.GbRCx97w6WQEQ4TKozB9tQxhAu6yMVVtFkoDypmlAiY';

class ApiClient {
  private async callFunction(
    endpoint: string,
    options: {
      method?: string;
      body?: any;
      userToken?: string;
    } = {}
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${ANON_KEY}`,
      'apikey': ANON_KEY,
    };

    // Pass user JWT token in custom header
    if (options.userToken) {
      headers['x-user-token'] = options.userToken;
    }

    const response = await fetch(`${FUNCTIONS_URL}/${endpoint}`, {
      method: options.method || 'POST',
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || `HTTP ${response.status}`);
    }

    if (data.error) {
      throw new Error(data.error.message);
    }

    return data;
  }

  async login(credentials: LoginRequest): Promise<LoginResponse> {
    return this.callFunction('auth-login', {
      body: credentials,
    });
  }

  async getCurrentUser(token: string): Promise<User> {
    return this.callFunction('auth-me', {
      method: 'GET',
      userToken: token,
    });
  }

  async listSchoolRules(token: string): Promise<SchoolRule[]> {
    return this.callFunction('schools-rules-list', {
      method: 'GET',
      userToken: token,
    });
  }

  async createSchoolRule(token: string, rule: CreateRuleRequest): Promise<SchoolRule> {
    return this.callFunction('schools-rules-create', {
      body: rule,
      userToken: token,
    });
  }

  async awardMarks(token: string, award: AwardMarksRequest): Promise<AwardMarksResponse> {
    return this.callFunction('awards', {
      body: award,
      userToken: token,
    });
  }

  async getStudentDashboard(token: string): Promise<DashboardData> {
    return this.callFunction('students-dashboard', {
      method: 'GET',
      userToken: token,
    });
  }

  async getVoucherCatalog(token: string): Promise<Voucher[]> {
    return this.callFunction('vouchers-catalog', {
      method: 'GET',
      userToken: token,
    });
  }

  async redeemVoucher(token: string, request: RedeemVoucherRequest): Promise<RedeemVoucherResponse> {
    return this.callFunction('vouchers-redeem', {
      body: request,
      userToken: token,
    });
  }

  // --- SCHOOL ADMIN METHODS ---
  async getSchoolStudents(token: string, page = 1, limit = 20): Promise<import('../types').PlatformStudentsResponse> {
    return this.callFunction(`schools-students-list?page=${page}&limit=${limit}`, {
      method: 'GET',
      userToken: token,
    });
  }

  async createSchoolStudent(token: string, student: any): Promise<any> {
    return this.callFunction('schools-students-create', {
      body: student,
      userToken: token,
    });
  }

  async updateSchoolStudent(token: string, student: any): Promise<any> {
    return this.callFunction('schools-students-update', {
      method: 'POST', // or PUT, function accepts POST
      body: student,
      userToken: token,
    });
  }

  async getSchoolFinancials(token: string): Promise<any> {
    return this.callFunction('schools-analytics-financial', {
      method: 'GET',
      userToken: token,
    });
  }

  // SUPER_ADMIN Platform API endpoints
  async getPlatformStats(token: string): Promise<import('../types').PlatformStats> {
    return this.callFunction('platform-stats', {
      method: 'GET',
      userToken: token,
    });
  }

  async getPlatformSchools(token: string): Promise<import('../types').School[]> {
    return this.callFunction('platform-schools', {
      method: 'GET',
      userToken: token,
    });
  }

  async getPlatformStudents(token: string, page = 1, limit = 20): Promise<import('../types').PlatformStudentsResponse> {
    return this.callFunction(`platform-students?page=${page}&limit=${limit}`, {
      method: 'GET',
      userToken: token,
    });
  }

  async getPlatformTransactions(token: string, page = 1, limit = 50): Promise<import('../types').PlatformTransactionsResponse> {
    return this.callFunction(`platform-transactions?page=${page}&limit=${limit}`, {
      method: 'GET',
      userToken: token,
    });
  }

  async getPlatformVouchers(token: string): Promise<Voucher[]> {
    return this.callFunction('platform-vouchers-list', {
      method: 'GET',
      userToken: token,
    });
  }

  async createPlatformVoucher(token: string, voucher: import('../types').VoucherFormData): Promise<Voucher> {
    return this.callFunction('platform-vouchers-create', {
      body: voucher,
      userToken: token,
    });
  }

  async updatePlatformVoucher(token: string, voucher: import('../types').VoucherFormData): Promise<Voucher> {
    return this.callFunction('platform-vouchers-update', {
      method: 'PUT',
      body: voucher,
      userToken: token,
    });
  }

  async getStudentRedemptions(token: string): Promise<import('../types').StudentRedemption[]> {
    return this.callFunction('student-redemptions', {
      method: 'GET',
      userToken: token,
    });
  }
}


export const apiClient = new ApiClient();
