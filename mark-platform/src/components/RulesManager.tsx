import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Check } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';

export function RulesManager() {
  const [showForm, setShowForm] = useState(false);
  const [ruleName, setRuleName] = useState('');
  const [marksToAward, setMarksToAward] = useState('');
  const [targetGrade, setTargetGrade] = useState('');
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: rules, isLoading } = useQuery({
    queryKey: ['school-rules', token],
    queryFn: () => apiClient.listSchoolRules(token!),
    enabled: !!token,
  });

  const createRuleMutation = useMutation({
    mutationFn: (newRule: { ruleName: string; marksToAward: number; targetGrade?: string }) =>
      apiClient.createSchoolRule(token!, newRule),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-rules'] });
      setShowForm(false);
      setRuleName('');
      setMarksToAward('');
      setTargetGrade('');
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const marks = parseInt(marksToAward);
    if (marks > 0) {
      createRuleMutation.mutate({
        ruleName,
        marksToAward: marks,
        targetGrade: targetGrade || undefined
      });
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-600">Carregando regras...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-800">Regras de Conquistas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Defina regras para premiar alunos
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition"
          >
            <Plus className="w-4 h-4" />
            <span>Adicionar Regra</span>
          </button>
        )}
      </div>

      {showForm && (
        <form onSubmit={handleSubmit} className="bg-orange-50 rounded-lg p-4 border border-orange-200">
          <h3 className="text-lg font-medium text-gray-800 mb-4">Criar Nova Regra</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Nome da Regra
              </label>
              <input
                type="text"
                value={ruleName}
                onChange={(e) => setRuleName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="ex: Frequência Perfeita"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Série/Turma Alvo (Opcional)
              </label>
              <input
                type="text"
                value={targetGrade}
                onChange={(e) => setTargetGrade(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="ex: 9A (Deixe vazio para todos)"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Marks a Premiar
              </label>
              <input
                type="number"
                value={marksToAward}
                onChange={(e) => setMarksToAward(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                placeholder="ex: 100"
                min="1"
                required
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button
              type="submit"
              disabled={createRuleMutation.isPending}
              className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition disabled:opacity-50"
            >
              {createRuleMutation.isPending ? 'Criando...' : 'Criar Regra'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowForm(false);
                setRuleName('');
                setMarksToAward('');
                setTargetGrade('');
              }}
              className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition"
            >
              Cancelar
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {rules?.map((rule) => (
          <div
            key={rule.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex justify-between items-start">
                  <h3 className="font-semibold text-gray-800">{rule.ruleName}</h3>
                  {rule.targetGrade && (
                    <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded-full font-medium border border-blue-200">
                      {rule.targetGrade}
                    </span>
                  )}
                </div>
                <p className="text-2xl font-bold text-orange-600 mt-2">
                  {rule.marksToAward} Marks
                </p>
              </div>
              {rule.isActive && (
                <div className="flex items-center gap-1 text-green-600 text-sm ml-2">
                  <Check className="w-4 h-4" />
                  <span className="sr-only">Ativa</span>
                </div>
              )}
            </div>
            <p className="text-xs text-gray-500 mt-3">
              Criada: {new Date(rule.createdAt).toLocaleDateString('pt-BR')}
            </p>
          </div>
        ))}
      </div>

      {rules?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhuma regra criada ainda. Clique em "Adicionar Regra" para criar sua primeira regra de conquista.
        </div>
      )}
    </div>
  );
}
