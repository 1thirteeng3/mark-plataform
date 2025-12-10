import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Coins } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';

export function StudentBalance() {
  const { token } = useAuthStore();

  const { data, isLoading } = useQuery({
    queryKey: ['student-dashboard', token],
    queryFn: () => apiClient.getStudentDashboard(token!),
    enabled: !!token,
    refetchInterval: 30000, // Refetch every 30 seconds
  });

  if (isLoading) {
    return <div className="text-center py-8 text-gray-600">Carregando seus dados...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-2xl p-8 text-white">
        <div className="flex items-center gap-3 mb-4">
          <Coins className="w-8 h-8" />
          <h2 className="text-2xl font-bold">Seu Saldo de Marks</h2>
        </div>
        <div className="text-5xl font-bold mb-2">{data?.balance || 0}</div>
        <p className="text-orange-100">Total de Marks disponíveis</p>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Transações Recentes</h3>
        <div className="space-y-3">
          {data?.transactions?.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              Nenhuma transação ainda. Continue o bom trabalho para ganhar marcações!
            </div>
          ) : (
            data?.transactions?.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white border border-gray-200 rounded-lg p-4 flex items-center justify-between hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`p-2 rounded-full ${transaction.type === 'CREDIT'
                        ? 'bg-green-100 text-green-600'
                        : 'bg-red-100 text-red-600'
                      }`}
                  >
                    {transaction.type === 'CREDIT' ? (
                      <TrendingUp className="w-5 h-5" />
                    ) : (
                      <TrendingDown className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{transaction.description}</p>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.createdAt).toLocaleString('pt-BR')}
                    </p>
                  </div>
                </div>
                <div
                  className={`text-lg font-bold ${transaction.type === 'CREDIT' ? 'text-green-600' : 'text-red-600'
                    }`}
                >
                  {transaction.type === 'CREDIT' ? '+' : '-'}
                  {transaction.amount}
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
