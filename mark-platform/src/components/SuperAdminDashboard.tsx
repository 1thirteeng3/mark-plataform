import { useState } from 'react';
import { useAuthStore } from '../store/authStore';
import { PlatformStats } from './super-admin/PlatformStats';
import { SchoolList } from './super-admin/SchoolList';
import { StudentList } from './super-admin/StudentList';
import { TransactionLedger } from './super-admin/TransactionLedger';
import { VoucherManager } from './super-admin/VoucherManager';

type TabType = 'stats' | 'schools' | 'students' | 'transactions' | 'vouchers';

export function SuperAdminDashboard() {
  const { user, logout } = useAuthStore();
  const [activeTab, setActiveTab] = useState<TabType>('stats');

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      {/* Header */}
      <header className="bg-white border-b border-orange-100 shadow-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center gap-4">
              <img src="/mark-logo.png" alt="MARK" className="h-12 w-12" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">Plataforma MARK</h1>
                <p className="text-sm text-gray-600">Painel Super Administrador</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">{user?.name}</div>
                <div className="text-xs text-gray-500">{user?.email}</div>
              </div>
              <button
                onClick={logout}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                Sair
              </button>
            </div>
          </div>

          {/* Tabs */}
          <nav className="flex gap-1 -mb-px">
            {[
              { id: 'stats', label: 'Visão Geral' },
              { id: 'schools', label: 'Escolas' },
              { id: 'students', label: 'Alunos' },
              { id: 'transactions', label: 'Transações' },
              { id: 'vouchers', label: 'Vouchers' },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as TabType)}
                className={`px-6 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-600 hover:text-gray-900 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'stats' && <PlatformStats />}
        {activeTab === 'schools' && <SchoolList />}
        {activeTab === 'students' && <StudentList />}
        {activeTab === 'transactions' && <TransactionLedger />}
        {activeTab === 'vouchers' && <VoucherManager />}
      </main>
    </div>
  );
}
