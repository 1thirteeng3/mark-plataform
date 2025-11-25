import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../store/authStore';
import { apiClient } from '../../lib/api';
import type { VoucherFormData } from '../../types';

export function VoucherManager() {
  const { token } = useAuthStore();
  const queryClient = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editingVoucher, setEditingVoucher] = useState<VoucherFormData | null>(null);

  const { data: vouchers, isLoading, error } = useQuery({
    queryKey: ['platformVouchers'],
    queryFn: () => apiClient.getPlatformVouchers(token!),
    enabled: !!token,
  });

  const createMutation = useMutation({
    mutationFn: (voucher: VoucherFormData) => apiClient.createPlatformVoucher(token!, voucher),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformVouchers'] });
      setShowForm(false);
      setEditingVoucher(null);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (voucher: VoucherFormData) => apiClient.updatePlatformVoucher(token!, voucher),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['platformVouchers'] });
      setShowForm(false);
      setEditingVoucher(null);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const voucherData: VoucherFormData = {
      name: formData.get('name') as string,
      description: formData.get('description') as string,
      marksCost: parseInt(formData.get('marksCost') as string),
      providerProductId: formData.get('providerProductId') as string,
      isAvailable: formData.get('isAvailable') === 'true',
    };

    if (editingVoucher?.id) {
      voucherData.id = editingVoucher.id;
      updateMutation.mutate(voucherData);
    } else {
      createMutation.mutate(voucherData);
    }
  };

  const handleEdit = (voucher: any) => {
    setEditingVoucher({
      id: voucher.id,
      name: voucher.name,
      description: voucher.description,
      marksCost: voucher.marksCost,
      providerProductId: voucher.providerProductId,
      isAvailable: voucher.isAvailable,
    });
    setShowForm(true);
  };

  const handleToggleAvailability = (voucher: any) => {
    updateMutation.mutate({
      id: voucher.id,
      name: voucher.name,
      description: voucher.description,
      marksCost: voucher.marksCost,
      providerProductId: voucher.providerProductId,
      isAvailable: !voucher.isAvailable,
    });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="text-gray-600">Carregando vouchers...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-800">Erro ao carregar vouchers: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Gerenciamento de Vouchers</h2>
          <p className="text-gray-600">Gerencie o catálogo de vouchers</p>
        </div>
        <button
          onClick={() => {
            setEditingVoucher(null);
            setShowForm(true);
          }}
          className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-medium"
        >
          Criar Novo Voucher
        </button>
      </div>

      {/* Create/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md p-6 border border-orange-100">
          <h3 className="text-xl font-semibold text-gray-900 mb-4">
            {editingVoucher ? 'Editar Voucher' : 'Criar Novo Voucher'}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Voucher
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={editingVoucher?.name}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Custo em Marcações
                </label>
                <input
                  type="number"
                  name="marksCost"
                  required
                  min="1"
                  defaultValue={editingVoucher?.marksCost}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Descrição
              </label>
              <textarea
                name="description"
                required
                rows={3}
                defaultValue={editingVoucher?.description}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                ID do Produto no Fornecedor
              </label>
              <input
                type="text"
                name="providerProductId"
                required
                defaultValue={editingVoucher?.providerProductId}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Disponibilidade
              </label>
              <select
                name="isAvailable"
                defaultValue={editingVoucher?.isAvailable ? 'true' : 'false'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="true">Disponível</option>
                <option value="false">Não Disponível</option>
              </select>
            </div>
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="px-6 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 transition-colors"
              >
                {(createMutation.isPending || updateMutation.isPending) ? 'Salvando...' : 'Salvar Voucher'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setEditingVoucher(null);
                }}
                className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Cancelar
              </button>
            </div>
            {(createMutation.error || updateMutation.error) && (
              <div className="text-red-600 text-sm">
                Erro: {((createMutation.error || updateMutation.error) as Error).message}
              </div>
            )}
          </form>
        </div>
      )}

      {/* Vouchers List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {vouchers && vouchers.length > 0 ? (
          vouchers.map((voucher) => (
            <div
              key={voucher.id}
              className={`bg-white rounded-xl shadow-md p-6 border-2 transition-all ${
                voucher.isAvailable
                  ? 'border-orange-200 hover:border-orange-400'
                  : 'border-gray-200 opacity-60'
              }`}
            >
              <div className="flex justify-between items-start mb-3">
                <h3 className="text-lg font-semibold text-gray-900">{voucher.name}</h3>
                <span
                  className={`px-2 py-1 text-xs font-medium rounded-full ${
                    voucher.isAvailable
                      ? 'bg-green-100 text-green-700'
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {voucher.isAvailable ? 'Disponível' : 'Indisponível'}
                </span>
              </div>
              <p className="text-gray-600 text-sm mb-4">{voucher.description}</p>
              <div className="flex justify-between items-center mb-4">
                <span className="text-2xl font-bold text-orange-600">{voucher.marksCost} Marcações</span>
              </div>
              <div className="text-xs text-gray-500 mb-4 font-mono">
                ID: {voucher.providerProductId}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleEdit(voucher)}
                  className="flex-1 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm font-medium"
                >
                  Editar
                </button>
                <button
                  onClick={() => handleToggleAvailability(voucher)}
                  disabled={updateMutation.isPending}
                  className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium disabled:opacity-50"
                >
                  {voucher.isAvailable ? 'Desativar' : 'Ativar'}
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            Nenhum voucher encontrado. Crie seu primeiro voucher acima.
          </div>
        )}
      </div>
    </div>
  );
}
