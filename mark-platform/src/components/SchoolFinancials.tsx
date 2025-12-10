import { useQuery } from '@tanstack/react-query';
import { TrendingUp, TrendingDown, Coins, Activity, AlertCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';

export function SchoolFinancials() {
    const { token } = useAuthStore();

    const { data, isLoading, error } = useQuery({
        queryKey: ['school-financials'],
        queryFn: () => apiClient.getSchoolFinancials(token!),
        enabled: !!token,
    });

    const { data: perfData, isLoading: isPerfLoading } = useQuery({
        queryKey: ['school-performance'],
        queryFn: () => apiClient.getSchoolPerformance(token!),
        enabled: !!token,
    });

    if (isLoading || isPerfLoading) {
        return <div className="text-center py-12 text-gray-500">Carregando dados financeiros...</div>;
    }

    if (error) {
        return (
            <div className="bg-red-50 p-4 rounded-lg flex items-center gap-3 text-red-700">
                <AlertCircle className="w-5 h-5" />
                <p>Erro ao carregar dados: {(error as Error).message}</p>
            </div>
        );
    }

    const { financial, metrics, timeline } = data || {};
    const { overview, classPerformance } = perfData || {};

    return (
        <div className="space-y-6">
            <div>
                <h2 className="text-2xl font-bold text-gray-800">Saúde Financeira da Escola</h2>
                <p className="text-gray-600">Visualização em tempo real da economia de Marks</p>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                        <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                            <Coins className="w-6 h-6" />
                        </div>
                        <span className="text-xs font-medium px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            Ativo
                        </span>
                    </div>
                    <p className="text-sm text-gray-500">Marks em Circulação</p>
                    <h3 className="text-2xl font-bold text-gray-900">{financial?.circulatingMarks || 0}</h3>
                    <p className="text-xs text-gray-400 mt-1">Passivo total atual</p>
                </div>

                <h3 className="text-2xl font-bold text-gray-900">{metrics?.burnRate}%</h3>
                <p className="text-xs text-gray-400 mt-1">% de Marks resgatados vs criados</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-purple-100 rounded-lg text-purple-600">
                        <Activity className="w-6 h-6" />
                    </div>
                </div>
                <p className="text-sm text-gray-500">Engajamento (Escola)</p>
                <h3 className="text-2xl font-bold text-gray-900">{overview?.avgEngagement || 0}%</h3>
                <p className="text-xs text-gray-400 mt-1">Média de participação por sala</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-green-100 rounded-lg text-green-600">
                        <TrendingUp className="w-6 h-6" />
                    </div>
                </div>
                <p className="text-sm text-gray-500">Total Emitido (30d)</p>
                <h3 className="text-2xl font-bold text-gray-900">{metrics?.totalMinted || 0}</h3>
                <p className="text-xs text-gray-400 mt-1">Novos Marks gerados</p>
            </div>

            <div className="bg-white p-6 rounded-xl border border-orange-100 shadow-sm">
                <div className="flex justify-between items-start mb-2">
                    <div className="p-2 bg-red-100 rounded-lg text-red-600">
                        <TrendingDown className="w-6 h-6" />
                    </div>
                </div>
                <p className="text-sm text-gray-500">Total Resgatado (30d)</p>
                <h3 className="text-2xl font-bold text-gray-900">{metrics?.totalRedeemed || 0}</h3>
                <p className="text-xs text-gray-400 mt-1">Marks trocados por prêmios</p>
            </div>


            {/* Timeline Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Histórico de Atividade (30 Dias)</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Alunos Ativos</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-green-600 uppercase tracking-wider">Emitidas</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-red-600 uppercase tracking-wider">Resgatadas</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Liquidez</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {timeline?.map((day: any, index: number) => (
                                <tr key={index} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                        {new Date(day.date).toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                        {day.activeStudents}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                                        +{day.minted}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                                        -{day.redeemed}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-500">
                                        {day.minted - day.redeemed}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
            {/* Class Performance Table */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                    <h3 className="text-lg font-semibold text-gray-800">Ranking de Engajamento por Turma</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Alunos</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Com Saldo Ativo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-purple-600 uppercase tracking-wider">Score</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {classPerformance?.map((c: any, index: number) => (
                                <tr key={c.grade} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-bold">
                                        {index + 1}º
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                        {c.grade}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                        {c.totalStudents}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-600">
                                        {c.activeStudents}
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-bold text-purple-600">
                                        {c.engagementScore.toFixed(1)}%
                                    </td>
                                </tr>
                            ))}
                            {(!classPerformance || classPerformance.length === 0) && (
                                <tr>
                                    <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum dado de turma disponível. Adicione a "Turma" aos seus alunos para ver o ranking.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div >
    );
}
