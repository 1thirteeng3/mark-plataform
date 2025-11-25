import { useQuery } from '@tanstack/react-query';
import { Gift, Copy, CheckCircle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { apiClient } from '../lib/api';
import { useState } from 'react';

export function RedemptionHistory() {
  const { token } = useAuthStore();
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const { data: redemptions, isLoading } = useQuery({
    queryKey: ['student-redemptions', token],
    queryFn: () => apiClient.getStudentRedemptions(token!),
    enabled: !!token,
  });

  const copyToClipboard = (code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  if (isLoading) {
    return <div className="text-center py-8 text-gray-600">Carregando histórico de resgates...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-semibold text-gray-800">Histórico de Resgates</h2>
        <p className="text-sm text-gray-600 mt-1">
          Visualize todos os seus vouchers resgatados e acesse seus códigos
        </p>
      </div>

      <div className="space-y-4">
        {redemptions && redemptions.length > 0 ? (
          redemptions.map((redemption) => (
            <div
              key={redemption.id}
              className="bg-white border border-gray-200 rounded-xl p-6 hover:shadow-md transition"
            >
              <div className="flex items-start gap-4">
                <div className="bg-orange-600 p-3 rounded-lg flex-shrink-0">
                  <Gift className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-gray-800 text-lg">
                        {redemption.voucherName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">
                        Resgatado em {new Date(redemption.redeemedAt).toLocaleString('pt-BR')}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-orange-600 font-bold">{redemption.marksCost} marcações</p>
                      <span
                        className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium mt-1 ${
                          redemption.status === 'COMPLETED'
                            ? 'bg-green-100 text-green-800'
                            : redemption.status === 'PENDING'
                            ? 'bg-yellow-100 text-yellow-800'
                            : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {redemption.status}
                      </span>
                    </div>
                  </div>

                  {redemption.voucherCode && redemption.status === 'COMPLETED' && (
                    <div className="mt-4 bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Seu Código de Voucher:</p>
                          <p className="text-lg font-mono font-bold text-gray-800">
                            {redemption.voucherCode}
                          </p>
                        </div>
                        <button
                          onClick={() => copyToClipboard(redemption.voucherCode!, redemption.id)}
                          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition"
                        >
                          {copiedId === redemption.id ? (
                            <>
                              <CheckCircle className="w-4 h-4" />
                              <span>Copiado!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-4 h-4" />
                              <span>Copiar Código</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 bg-white rounded-xl border border-gray-200">
            <Gift className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Nenhum resgate ainda</p>
            <p className="text-sm text-gray-400 mt-1">
              Comece a resgatar vouchers para ver seu histórico aqui
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
