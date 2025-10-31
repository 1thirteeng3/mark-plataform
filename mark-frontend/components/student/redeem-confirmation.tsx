"use client"

import { useState } from "react"
import { useDataStore, type Student } from "@/lib/store/data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { AlertCircle, Copy, CheckCircle } from "lucide-react"

interface RedeemConfirmationProps {
  voucherId: string
  student: Student
  onClose: () => void
  onSuccess: () => void
}

export function RedeemConfirmation({ voucherId, student, onClose, onSuccess }: RedeemConfirmationProps) {
  const { getVoucherCatalog, redeemVoucher } = useDataStore()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [voucherCode, setVoucherCode] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const voucher = getVoucherCatalog().find((v) => v.id === voucherId)

  if (!voucher) return null

  const handleRedeem = async () => {
    setIsLoading(true)
    setError("")

    try {
      const code = await redeemVoucher(student.id, voucherId)
      setVoucherCode(code)
      onSuccess()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao resgatar voucher")
    } finally {
      setIsLoading(false)
    }
  }

  const handleCopyCode = () => {
    if (voucherCode) {
      navigator.clipboard.writeText(voucherCode)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md p-6">
        {!voucherCode ? (
          <>
            <h2 className="text-xl font-bold mb-4">Confirmar Resgate</h2>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600">Voucher</p>
                <p className="font-semibold text-gray-900">{voucher.name}</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-gray-600">Custo</p>
                  <p className="text-2xl font-bold text-blue-600">{voucher.marksCost}</p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg">
                  <p className="text-sm text-gray-600">Novo Saldo</p>
                  <p className="text-2xl font-bold text-green-600">{student.marksBalance - voucher.marksCost}</p>
                </div>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{error}</span>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <Button variant="outline" onClick={onClose} disabled={isLoading} className="flex-1 bg-transparent">
                Cancelar
              </Button>
              <Button onClick={handleRedeem} disabled={isLoading} className="flex-1 bg-blue-600 hover:bg-blue-700">
                {isLoading ? "Processando..." : "Confirmar Resgate"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <div className="text-center mb-6">
              <div className="flex justify-center mb-4">
                <CheckCircle className="w-12 h-12 text-green-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-900">Resgate Concluído!</h2>
              <p className="text-sm text-gray-600 mt-2">Seu voucher foi gerado com sucesso</p>
            </div>

            <div className="space-y-4 mb-6">
              <div className="p-4 bg-gray-50 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Seu Código</p>
                <div className="flex items-center gap-2">
                  <code className="flex-1 font-mono font-bold text-lg text-gray-900 break-all">{voucherCode}</code>
                  <Button size="sm" variant="outline" onClick={handleCopyCode} className="flex-shrink-0 bg-transparent">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                {copied && <p className="text-xs text-green-600 mt-2">Copiado!</p>}
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <p className="text-sm font-semibold text-gray-900 mb-2">Como usar seu voucher:</p>
                <ol className="text-sm text-gray-700 space-y-1 list-decimal list-inside">
                  <li>Abra o app ou site do parceiro</li>
                  <li>Cole o código no campo de cupom</li>
                  <li>Aproveite sua recompensa!</li>
                </ol>
              </div>
            </div>

            <Button onClick={onClose} className="w-full bg-blue-600 hover:bg-blue-700">
              Fechar
            </Button>
          </>
        )}
      </Card>
    </div>
  )
}
