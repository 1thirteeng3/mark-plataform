import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Search, Edit2, X, User as UserIcon, Upload, CheckCircle, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';

interface StudentForm {
    id?: string;
    name: string;
    email: string;
    password?: string;
    grade?: string;
    guardianEmail?: string;
    enrollmentId?: string;
}

export function SchoolStudentManager() {
    const { token } = useAuthStore();
    const queryClient = useQueryClient();
    const [page, setPage] = useState(1);
    const [showModal, setShowModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [importJson, setImportJson] = useState('');
    const [importResult, setImportResult] = useState<any>(null);
    const [editingStudent, setEditingStudent] = useState<StudentForm | null>(null);
    const [formData, setFormData] = useState<StudentForm>({ name: '', email: '' });
    const [error, setError] = useState('');

    const limit = 20;

    // Fetch Students
    const { data, isLoading } = useQuery({
        queryKey: ['school-students', page],
        queryFn: () => apiClient.getSchoolStudents(token!, page, limit),
        enabled: !!token,
    });

    // Create & Update Mutations
    const createMutation = useMutation({
        mutationFn: (data: StudentForm) => apiClient.createSchoolStudent(token!, data),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-students'] });
            setShowModal(false);
            resetForm();
        },
        onError: (err: any) => setError(err.message),
    });

    const updateMutation = useMutation({
        mutationFn: (data: StudentForm) => apiClient.updateSchoolStudent(token!, { studentId: data.id, ...data }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['school-students'] });
            setShowModal(false);
            resetForm();
        },
        onError: (err: any) => setError(err.message),
    });

    const importMutation = useMutation({
        mutationFn: (students: any[]) => apiClient.batchImportStudents(token!, students),
        onSuccess: (data) => {
            queryClient.invalidateQueries({ queryKey: ['school-students'] });
            setImportResult(data);
            // Don't close immediately so they can see the result summary
        },
        onError: (err: any) => setError(err.message),
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (editingStudent) {
            updateMutation.mutate({ ...formData, id: editingStudent.id });
        } else {
            if (!formData.password) {
                setError('Senha é obrigatória para criar novo aluno');
                return;
            }
            createMutation.mutate(formData);
        }
    };

    const handleEdit = (student: any) => {
        setEditingStudent({
            id: student.id,
            name: student.name,
            email: student.email,
            grade: student.grade,
            guardianEmail: student.guardian_email,
            enrollmentId: student.enrollment_id
        });
        setFormData({
            name: student.name,
            email: student.email,
            password: '',
            grade: student.grade || '',
            guardianEmail: student.guardian_email || '',
            enrollmentId: student.enrollment_id || ''
        });
        setShowModal(true);
    };

    const handleAddNew = () => {
        setEditingStudent(null);
        resetForm();
        setShowModal(true);
    };

    const resetForm = () => {
        setFormData({ name: '', email: '', password: '', grade: '', guardianEmail: '', enrollmentId: '' });
        setImportJson('');
        setImportResult(null);
        setError('');
    };

    const isLoadingAction = createMutation.isPending || updateMutation.isPending;

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-gray-800">Gerenciar Alunos</h2>
                    <p className="text-gray-600">Adicione e edite os alunos da sua escola</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => { resetForm(); setShowImportModal(true); }}
                        className="flex items-center gap-2 px-4 py-2 border border-orange-200 text-orange-700 rounded-lg hover:bg-orange-50 transition shadow-sm"
                    >
                        <Upload className="w-5 h-5" />
                        <span>Importar Lote</span>
                    </button>
                    <button
                        onClick={handleAddNew}
                        className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition shadow-sm"
                    >
                        <Plus className="w-5 h-5" />
                        <span>Novo Aluno</span>
                    </button>
                </div>
            </div>

            {isLoading ? (
                <div className="text-center py-12 text-gray-500">Carregando alunos...</div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-orange-100 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-orange-50">
                            <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Aluno</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Matrícula</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Turma</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Saldo</th>
                                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {data?.students?.map((student) => (
                                <tr key={student.id} className="hover:bg-gray-50 transition">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <div className="flex items-center">
                                            <div className="h-8 w-8 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mr-3">
                                                <UserIcon className="w-4 h-4" />
                                            </div>
                                            <div className="text-sm font-medium text-gray-900">{student.name}</div>
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.enrollment_id || '-'}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                        <span className="px-2 py-1 bg-gray-100 rounded text-xs font-medium text-gray-600">
                                            {student.grade || 'S/ Turma'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.email}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-bold text-orange-600">{student.marksBalance}</td>
                                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                        <button
                                            onClick={() => handleEdit(student)}
                                            className="text-indigo-600 hover:text-indigo-900 bg-indigo-50 p-2 rounded-lg hover:bg-indigo-100 transition"
                                        >
                                            <Edit2 className="w-4 h-4" />
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data?.students?.length === 0 && (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Nenhum aluno encontrado. Clique em "Novo Aluno" para começar.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    {/* Simple Pagination */}
                    <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50">
                        <span className="text-sm text-gray-600">Página {page}</span>
                        <div className="flex gap-2">
                            <button
                                disabled={page === 1}
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                className="px-3 py-1 border rounded bg-white disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                disabled={!data || data.students.length < limit}
                                onClick={() => setPage(p => p + 1)}
                                className="px-3 py-1 border rounded bg-white disabled:opacity-50"
                            >
                                Próxima
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">
                                {editingStudent ? 'Editar Aluno' : 'Novo Aluno'}
                            </h3>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.name}
                                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="Ex: João Silva"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    required
                                    value={formData.email}
                                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="aluno@escola.com"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Matrícula (ID)</label>
                                    <input
                                        type="text"
                                        value={formData.enrollmentId}
                                        onChange={(e) => setFormData({ ...formData, enrollmentId: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Ex: 2024001"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma</label>
                                    <input
                                        type="text"
                                        value={formData.grade}
                                        onChange={(e) => setFormData({ ...formData, grade: e.target.value })}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                        placeholder="Ex: 9º Ano A"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email do Responsável</label>
                                <input
                                    type="email"
                                    value={formData.guardianEmail}
                                    onChange={(e) => setFormData({ ...formData, guardianEmail: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder="responsavel@email.com"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">
                                    {editingStudent ? 'Nova Senha (Opcional)' : 'Senha'}
                                </label>
                                <input
                                    type="password"
                                    value={formData.password}
                                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                    placeholder={editingStudent ? 'Deixe em branco para manter' : '********'}
                                />
                            </div>

                            <div className="flex gap-3 pt-4">
                                <button
                                    type="button"
                                    onClick={() => setShowModal(false)}
                                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    disabled={isLoadingAction}
                                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition disabled:opacity-50"
                                >
                                    {isLoadingAction ? 'Salvando...' : 'Salvar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
                    <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full p-6">
                        <div className="flex justify-between items-center mb-6">
                            <h3 className="text-xl font-bold text-gray-900">Importação em Lote</h3>
                            <button onClick={() => setShowImportModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {!importResult ? (
                            <div className="space-y-4">
                                <div className="bg-blue-50 p-4 rounded-lg flex gap-3 text-blue-700 text-sm">
                                    <div className="mt-0.5"><AlertTriangle className="w-4 h-4" /></div>
                                    <div>
                                        <p className="font-semibold mb-1">Formato JSON esperado:</p>
                                        <pre className="text-xs bg-blue-100 p-2 rounded overflow-x-auto">
                                            {`[
  {
    "name": "Nome do Aluno",
    "email": "email@aluno.com",
    "grade": "9A",
    "guardianEmail": "pais@email.com",
    "enrollmentId": "MAT123"
  }
]`}
                                        </pre>
                                    </div>
                                </div>

                                {error && (
                                    <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm border border-red-200">
                                        {error}
                                    </div>
                                )}

                                <textarea
                                    value={importJson}
                                    onChange={(e) => setImportJson(e.target.value)}
                                    className="w-full h-64 p-3 border rounded-lg font-mono text-sm focus:ring-2 focus:ring-orange-500"
                                    placeholder="Cole seu JSON aqui..."
                                />

                                <div className="flex justify-end gap-3">
                                    <button
                                        onClick={() => setShowImportModal(false)}
                                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => {
                                            try {
                                                const data = JSON.parse(importJson);
                                                importMutation.mutate(data);
                                            } catch (e) {
                                                setError("JSON inválido. Verifique a formatação.");
                                            }
                                        }}
                                        disabled={importMutation.isPending || !importJson}
                                        className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {importMutation.isPending ? 'Processando...' : 'Importar Alunos'}
                                    </button>
                                </div>
                            </div>
                        ) : (
                            <div className="space-y-6 text-center py-8">
                                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
                                    <CheckCircle className="w-8 h-8" />
                                </div>
                                <div>
                                    <h4 className="text-xl font-bold text-gray-900">Importação Concluída!</h4>
                                    <p className="text-gray-600 mt-2">
                                        {importResult.message}
                                    </p>
                                </div>
                                <div className="bg-gray-50 p-4 rounded-lg text-left text-sm max-h-60 overflow-y-auto">
                                    <h5 className="font-semibold mb-2">Relatório:</h5>
                                    <ul className="space-y-1">
                                        <li>Total: {importResult.summary.total}</li>
                                        <li className="text-green-600">Importados: {importResult.summary.imported}</li>
                                        <li className="text-yellow-600">Ignorados: {importResult.summary.skipped}</li>
                                        <li className="text-red-600">Erros: {importResult.summary.errors}</li>
                                    </ul>
                                    {importResult.errors.length > 0 && (
                                        <div className="mt-3 pt-3 border-t">
                                            <p className="font-semibold text-red-600 mb-1">Detalhes dos Erros:</p>
                                            {importResult.errors.map((e: any, i: number) => (
                                                <div key={i} className="text-xs text-red-500">
                                                    Linha {e.line}: {e.error}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <button
                                    onClick={() => { resetForm(); setShowImportModal(false); }}
                                    className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800"
                                >
                                    Fechar
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}

        </div>
    );
}
