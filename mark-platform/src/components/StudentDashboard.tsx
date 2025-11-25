import { useState } from 'react';
import { LogOut, Wallet, Gift, History } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { StudentBalance } from './StudentBalance';
import { VoucherCatalog } from './VoucherCatalog';
import { RedemptionHistory } from './RedemptionHistory';

export function StudentDashboard() {
  const [activeTab, setActiveTab] = useState<'balance' | 'vouchers' | 'redemptions'>('balance');
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/mark-logo.png" alt="MARK" className="h-12 w-12" />
              <div>
                <h1 className="text-2xl font-bold text-orange-600">
                  Plataforma MARK
                </h1>
                <p className="text-sm text-gray-600 mt-1">Bem-vindo(a), {user?.name}!</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 px-4 py-2 text-white bg-orange-600 hover:bg-orange-700 rounded-lg transition"
            >
              <LogOut className="w-4 h-4" />
              <span>Sair</span>
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="bg-white rounded-xl shadow-lg">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('balance')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition ${
                  activeTab === 'balance'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Wallet className="w-5 h-5" />
                <span>Meu Saldo</span>
              </button>
              <button
                onClick={() => setActiveTab('vouchers')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition ${
                  activeTab === 'vouchers'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Gift className="w-5 h-5" />
                <span>Resgatar Vouchers</span>
              </button>
              <button
                onClick={() => setActiveTab('redemptions')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition ${
                  activeTab === 'redemptions'
                    ? 'border-orange-500 text-orange-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <History className="w-5 h-5" />
                <span>Histórico de Resgates</span>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'balance' && <StudentBalance />}
            {activeTab === 'vouchers' && <VoucherCatalog />}
            {activeTab === 'redemptions' && <RedemptionHistory />}
          </div>
        </div>
      </div>
    </div>
  );
}
