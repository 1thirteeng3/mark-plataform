import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/api';

export function PlatformStats() {
  const { token } = useAuthStore();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['platformStats'],
    queryFn: () => apiClient.getPlatformStats(token!),
    enabled: !!token,
  });

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando estatísticas...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erro ao carregar estatísticas: {(error as Error).message}</p>
      </div>
    );
  }

  const statCards = [
    {
      label: 'Total de Escolas',
      value: stats?.totalSchools || 0,
      bgColor: 'bg-gradient-to-br from-orange-500 to-orange-600',
      icon: '🏫',
    },
    {
      label: 'Total de Alunos',
      value: stats?.totalStudents || 0,
      bgColor: 'bg-gradient-to-br from-amber-500 to-amber-600',
      icon: '👥',
    },
    {
      label: 'Total de Transações',
      value: stats?.totalTransactions || 0,
      bgColor: 'bg-gradient-to-br from-yellow-500 to-yellow-600',
      icon: '📊',
    },
    {
      label: 'Total de Marcações em Circulação',
      value: stats?.totalMarksInCirculation || 0,
      bgColor: 'bg-gradient-to-br from-red-500 to-red-600',
      icon: '⭐',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Estatísticas da Plataforma</h2>
        <p className="text-gray-600">Visão geral de toda a plataforma MARK</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statCards.map((card) => (
          <div
            key={card.label}
            className={`${card.bgColor} rounded-xl p-6 text-white shadow-lg transform hover:scale-105 transition-transform`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-4xl">{card.icon}</div>
              <div className="text-right">
                <div className="text-3xl font-bold">
                  {card.value.toLocaleString()}
                </div>
              </div>
            </div>
            <div className="text-sm font-medium opacity-90">{card.label}</div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-md p-6 mt-8 border border-orange-100">
        <h3 className="text-xl font-semibold text-gray-900 mb-4">Saúde da Plataforma</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <span className="text-gray-700">Status do Sistema</span>
            <span className="text-green-600 font-semibold">Operacional</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-orange-50 rounded-lg">
            <span className="text-gray-700">Média de Marcações por Aluno</span>
            <span className="text-orange-600 font-semibold">
              {stats?.totalStudents ? Math.round((stats.totalMarksInCirculation / stats.totalStudents) * 10) / 10 : 0}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
