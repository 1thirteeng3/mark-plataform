import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Award, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';

export function AwardMarks() {
  const [selectedStudent, setSelectedStudent] = useState('');
  const [selectedRule, setSelectedRule] = useState('');
  const [description, setDescription] = useState('');
  const [success, setSuccess] = useState(false);
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: rules } = useQuery({
    queryKey: ['school-rules', token],
    queryFn: () => apiClient.listSchoolRules(token!),
    enabled: !!token,
  });

  const awardMutation = useMutation({
    mutationFn: (award: { studentId: string; ruleId: string; description?: string }) =>
      apiClient.awardMarks(token!, award),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['school-rules'] });
      setSelectedStudent('');
      setSelectedRule('');
      setDescription('');
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedStudent && selectedRule) {
      awardMutation.mutate({
        studentId: selectedStudent,
        ruleId: selectedRule,
        description: description || undefined,
      });
    }
  };

  // Hardcoded student for demo (in production, fetch from API)
  const demoStudent = {
    id: '44444444-4444-4444-4444-444444444444',
    name: 'John Student',
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Premiar Alunos</h2>
        <p className="text-sm text-gray-600 mt-1">
          Selecione um aluno e uma regra de conquista para premiar
        </p>
      </div>

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 flex items-center gap-3">
          <CheckCircle className="w-5 h-5 text-green-600" />
          <div>
            <p className="font-medium text-green-800">Marcações premiadas com sucesso!</p>
            <p className="text-sm text-green-700">
              O saldo do aluno foi atualizado.
            </p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecionar Aluno
            </label>
            <select
              value={selectedStudent}
              onChange={(e) => setSelectedStudent(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Escolha um aluno...</option>
              <option value={demoStudent.id}>{demoStudent.name}</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Regra de Conquista
            </label>
            <select
              value={selectedRule}
              onChange={(e) => setSelectedRule(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              required
            >
              <option value="">Escolha uma regra...</option>
              {rules
                ?.filter((rule) => rule.isActive)
                .map((rule) => (
                  <option key={rule.id} value={rule.id}>
                    {rule.ruleName} ({rule.marksToAward} marks)
                  </option>
                ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Descrição (Opcional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              rows={3}
              placeholder="Adicione contexto adicional para esta premiação..."
            />
          </div>

          <button
            type="submit"
            disabled={awardMutation.isPending || !selectedStudent || !selectedRule}
            className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Award className="w-5 h-5" />
            <span>{awardMutation.isPending ? 'Premiando...' : 'Premiar'}</span>
          </button>
        </div>

        {awardMutation.error && (
          <div className="mt-4 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {awardMutation.error.message}
          </div>
        )}
      </form>
    </div>
  );
}
