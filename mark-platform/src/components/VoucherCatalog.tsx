import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Gift, CheckCircle, X } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';
import type { Voucher } from '../types';

export function VoucherCatalog() {
  const [selectedVoucher, setSelectedVoucher] = useState<Voucher | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [redemptionResult, setRedemptionResult] = useState<{
    success: boolean;
    message: string;
    code?: string;
  } | null>(null);
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  const { data: vouchers, isLoading } = useQuery({
    queryKey: ['voucher-catalog', token],
    queryFn: () => apiClient.getVoucherCatalog(token!),
    enabled: !!token,
  });

  const { data: dashboardData } = useQuery({
    queryKey: ['student-dashboard', token],
    queryFn: () => apiClient.getStudentDashboard(token!),
    enabled: !!token,
  });

  const redeemMutation = useMutation({
    mutationFn: (voucherId: string) =>
      apiClient.redeemVoucher(token!, { voucherId }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['student-dashboard'] });
      setRedemptionResult({
        success: true,
        message: data.message,
        code: data.voucherCode,
      });
      setShowModal(false);
    },
    onError: (error: any) => {
      setRedemptionResult({
        success: false,
        message: error.message || 'Redemption failed',
      });
      setShowModal(false);
    },
  });

  const handleRedeem = (voucher: Voucher) => {
    setSelectedVoucher(voucher);
    setShowModal(true);
    setRedemptionResult(null);
  };

  const confirmRedeem = () => {
    if (selectedVoucher) {
      redeemMutation.mutate(selectedVoucher.id);
    }
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-600">Carregando vouchers...</div>;
  }

  const currentBalance = dashboardData?.balance || 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Vouchers Disponíveis</h2>
        <p className="text-sm text-gray-600 mt-1">
          Resgate suas marcações por recompensas incríveis
        </p>
      </div>

      {redemptionResult && (
        <div
          className={`rounded-lg p-4 flex items-start gap-3 ${
            redemptionResult.success
              ? 'bg-green-50 border border-green-200'
              : 'bg-red-50 border border-red-200'
          }`}
        >
          <div className="flex-shrink-0">
            {redemptionResult.success ? (
              <CheckCircle className="w-5 h-5 text-green-600" />
            ) : (
              <X className="w-5 h-5 text-red-600" />
            )}
          </div>
          <div className="flex-1">
            <p
              className={`font-medium ${
                redemptionResult.success ? 'text-green-800' : 'text-red-800'
              }`}
            >
              {redemptionResult.message}
            </p>
            {redemptionResult.code && (
              <div className="mt-2 bg-white rounded p-3 border border-green-300">
                <p className="text-sm text-gray-600">Your voucher code:</p>
                <p className="text-lg font-mono font-bold text-gray-800 mt-1">
                  {redemptionResult.code}
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vouchers?.map((voucher) => {
          const canAfford = currentBalance >= voucher.marksCost;

          return (
            <div
              key={voucher.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-lg transition"
            >
              <div className="flex items-start gap-4">
                <div className="bg-orange-600 p-3 rounded-lg">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-800 text-lg">{voucher.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{voucher.description}</p>

                  <div className="mt-4 flex items-center justify-between">
                    <div>
                      <p className="text-2xl font-bold text-orange-600">
                        {voucher.marksCost} marcações
                      </p>
                      {!canAfford && (
                        <p className="text-xs text-red-600 mt-1">
                          Precisa de {voucher.marksCost - currentBalance} marcações a mais
                        </p>
                      )}
                    </div>
                    <button
                      onClick={() => handleRedeem(voucher)}
                      disabled={!canAfford || redeemMutation.isPending}
                      className={`px-4 py-2 rounded-lg font-medium transition ${
                        canAfford
                          ? 'bg-orange-600 text-white hover:bg-orange-700'
                          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      Resgatar
                    </button>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {showModal && selectedVoucher && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-gray-800 mb-4">Confirmar Resgate</h3>
            <p className="text-gray-600 mb-2">
              Você está prestes a resgatar:
            </p>
            <p className="font-semibold text-lg text-gray-800 mb-4">
              {selectedVoucher.name}
            </p>
            <div className="bg-orange-50 rounded-lg p-4 mb-6">
              <div className="flex justify-between items-center mb-2">
                <span className="text-gray-600">Custo:</span>
                <span className="font-bold text-orange-600">
                  {selectedVoucher.marksCost} marcações
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Seu novo saldo:</span>
                <span className="font-bold text-gray-800">
                  {currentBalance - selectedVoucher.marksCost} marcações
                </span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={confirmRedeem}
                disabled={redeemMutation.isPending}
                className="flex-1 bg-orange-600 text-white py-3 rounded-lg font-semibold hover:bg-orange-700 transition disabled:opacity-50"
              >
                {redeemMutation.isPending ? 'Processando...' : 'Confirmar'}
              </button>
              <button
                onClick={() => setShowModal(false)}
                disabled={redeemMutation.isPending}
                className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-300 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {vouchers?.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          Nenhum voucher disponível no momento. Volte mais tarde!
        </div>
      )}
    </div>
  );
}
