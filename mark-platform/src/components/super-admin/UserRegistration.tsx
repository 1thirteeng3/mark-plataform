import { useState, useEffect } from 'react';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/api';
import { UserPlus, School, Check, AlertTriangle, Loader } from 'lucide-react';

export function UserRegistration() {
    const { token } = useAuthStore();

    // Form State
    const [role, setRole] = useState<'SCHOOL_ADMIN' | 'STUDENT'>('STUDENT');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [schoolId, setSchoolId] = useState('');
    const [grade, setGrade] = useState('');
    const [enrollmentId, setEnrollmentId] = useState('');

    // UI State
    const [schools, setSchools] = useState<{ id: string, name: string }[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [error, setError] = useState('');

    // Load Schools
    useEffect(() => {
        if (token) {
            apiClient.getPlatformSchools(token)
                .then(data => setSchools(data))
                .catch(err => console.error("Failed to load schools", err));
        }
    }, [token]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setIsSuccess(false);
        setIsLoading(true);

        try {
            await apiClient.adminCreateUser(token!, {
                email,
                password,
                role: role === 'SCHOOL_ADMIN' ? 'ADMIN' : 'STUDENT', // Map to DB roles
                schoolId,
                name,
                grade: role === 'STUDENT' ? grade : undefined,
                enrollmentId: role === 'STUDENT' ? enrollmentId : undefined
            });

            setIsSuccess(true);
            // Reset essential fields
            setEmail('');
            setPassword('');
            setName('');
            setEnrollmentId('');
        } catch (err: any) {
            setError(err.message || 'Erro ao criar usuário');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-orange-100 p-6">
                <div className="flex items-center gap-3 mb-6">
                    <div className="p-2 bg-orange-100 rounded-lg text-orange-600">
                        <UserPlus className="w-6 h-6" />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Registro Manual de Usuários</h2>
                        <p className="text-sm text-gray-500">Crie contas para Administradores Escolares ou Alunos</p>
                    </div>
                </div>

                {isSuccess && (
                    <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3 text-green-700 animate-fade-in">
                        <Check className="w-5 h-5" />
                        <div>
                            <p className="font-bold">Usuário criado com sucesso!</p>
                            <p className="text-sm">As credenciais já estão ativas para login.</p>
                        </div>
                    </div>
                )}

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700 animate-fade-in">
                        <AlertTriangle className="w-5 h-5" />
                        <div>
                            <p className="font-bold">Erro ao criar usuário</p>
                            <p className="text-sm">{error}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    {/* Role Selection */}
                    <div className="grid grid-cols-2 gap-4">
                        <button
                            type="button"
                            onClick={() => setRole('STUDENT')}
                            className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${role === 'STUDENT'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                    : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                                }`}
                        >
                            <span className="font-bold">Aluno</span>
                            <span className="text-xs">Requer Turma e ID</span>
                        </button>
                        <button
                            type="button"
                            onClick={() => setRole('SCHOOL_ADMIN')}
                            className={`p-4 border-2 rounded-xl flex flex-col items-center gap-2 transition-all ${role === 'SCHOOL_ADMIN'
                                    ? 'border-orange-500 bg-orange-50 text-orange-700'
                                    : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                                }`}
                        >
                            <span className="font-bold">Administrador Escolar</span>
                            <span className="text-xs">Gerencia uma Escola</span>
                        </button>
                    </div>

                    {/* Common Fields */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Escola</label>
                            <div className="relative">
                                <School className="absolute left-3 top-2.5 text-gray-400 w-5 h-5" />
                                <select
                                    required
                                    value={schoolId}
                                    onChange={(e) => setSchoolId(e.target.value)}
                                    className="w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 appearance-none bg-white"
                                >
                                    <option value="">Selecione uma escola...</option>
                                    {schools.map(s => (
                                        <option key={s.id} value={s.id}>{s.name}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nome Completo</label>
                            <input
                                type="text"
                                required
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                placeholder="Ex: Maria Silva"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email (Login)</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                placeholder="usuario@email.com"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Senha Inicial</label>
                            <input
                                type="text"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500 font-mono"
                                placeholder="Mínimo 6 caracteres"
                            />
                        </div>
                    </div>

                    {/* Student Specific Fields */}
                    {role === 'STUDENT' && (
                        <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 animate-fade-in">
                            <h3 className="font-semibold text-gray-900 mb-3 text-sm">Dados do Aluno</h3>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Turma / Série</label>
                                    <input
                                        type="text"
                                        value={grade}
                                        onChange={(e) => setGrade(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="Ex: 9º Ano A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">ID Matrícula</label>
                                    <input
                                        type="text"
                                        value={enrollmentId}
                                        onChange={(e) => setEnrollmentId(e.target.value)}
                                        className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-orange-500"
                                        placeholder="Ex: 2024-001"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="flex justify-end pt-4">
                        <button
                            type="submit"
                            disabled={isLoading || !schoolId}
                            className="bg-orange-600 text-white px-6 py-2 rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all shadow-md"
                        >
                            {isLoading ? (
                                <>
                                    <Loader className="w-5 h-5 animate-spin" />
                                    <span>Criando...</span>
                                </>
                            ) : (
                                <>
                                    <UserPlus className="w-5 h-5" />
                                    <span>Criar Usuário</span>
                                </>
                            )}
                        </button>
                    </div>

                </form>
            </div>
        </div>
    );
}
