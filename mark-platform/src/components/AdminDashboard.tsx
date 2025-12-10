import { useState } from 'react';
import { LogOut, Award, Settings, User as UserIcon, TrendingUp } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { RulesManager } from './RulesManager';
import { AwardMarks } from './AwardMarks';
import { SchoolStudentManager } from './SchoolStudentManager';
import { SchoolFinancials } from './SchoolFinancials';

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'rules' | 'awards' | 'students' | 'financials'>('rules');
  const { user, logout } = useAuthStore();

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50">
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <img src="/mark-logo.png" alt="MARK" className="h-12 w-12" />
              <div>
                <h1 className="text-2xl font-bold text-gray-800">Plataforma MARK</h1>
                <p className="text-sm text-gray-600 mt-1">
                  Painel Administrativo - {user?.name}
                </p>
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
        <div className="bg-white rounded-xl shadow-sm">
          <div className="border-b border-gray-200">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('rules')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition ${activeTab === 'rules'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Settings className="w-5 h-5" />
                <span>Regras de Conquistas</span>
                <span>Regras de Conquistas</span>
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition ${activeTab === 'students'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <UserIcon className="w-5 h-5" />
                <span>Alunos</span>
              </button>
              <button
                onClick={() => setActiveTab('financials')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition ${activeTab === 'financials'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <TrendingUp className="w-5 h-5" />
                <span>Financeiro</span>
              </button>
              <button
                onClick={() => setActiveTab('awards')}
                className={`flex items-center gap-2 px-6 py-4 border-b-2 font-medium transition ${activeTab === 'awards'
                  ? 'border-orange-500 text-orange-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
              >
                <Award className="w-5 h-5" />
                <span>Premiar Alunos</span>
              </button>
            </nav>
          </div>

          <div className="p-6">
            {activeTab === 'rules' && <RulesManager />}
            {activeTab === 'students' && <SchoolStudentManager />}
            {activeTab === 'financials' && <SchoolFinancials />}
            {activeTab === 'awards' && <AwardMarks />}
          </div>
        </div>
      </div>
    </div>
  );
}
