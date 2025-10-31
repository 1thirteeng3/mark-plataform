"use client"

import { useDataStore, type Student, type RedeemedVoucher } from "@/lib/store/data"
import { Card } from "@/components/ui/card"
import { CheckCircle, Clock, XCircle, Copy } from "lucide-react"
import { useState } from "react"
import { Button } from "@/components/ui/button"

interface RedeemedVouchersHistoryProps {
  student: Student
}

export function RedeemedVouchersHistory({ student }: RedeemedVouchersHistoryProps) {
  const { getRedeemedVouchers } = useDataStore()
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const redeemed = getRedeemedVouchers(student.id)

  const handleCopyCode = (code: string, id: string) => {
    navigator.clipboard.writeText(code)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2000)
  }

  const getStatusIcon = (status: RedeemedVoucher["status"]) => {
    switch (status) {
      case "COMPLETED":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "PENDING":
        return <Clock className="w-5 h-5 text-yellow-600" />
      case "FAILED":
        return <XCircle className="w-5 h-5 text-red-600" />
    }
  }

  const getStatusLabel = (status: RedeemedVoucher["status"]) => {
    switch (status) {
      case "COMPLETED":
        return "Concluído"
      case "PENDING":
        return "Pendente"
      case "FAILED":
        return "Falhou"
    }
  }

  if (redeemed.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-gray-600">Você ainda não resgatou nenhum voucher</p>
      </Card>
    )
  }

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Meus Resgates</h2>
      <div className="space-y-3">
        {redeemed.map((voucher) => (
          <div
            key={voucher.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-3 flex-1">
              <div>{getStatusIcon(voucher.status)}</div>
              <div className="flex-1">
                <p className="font-semibold text-gray-900">{voucher.voucherName}</p>
                <p className="text-sm text-gray-600">
                  {new Date(voucher.createdAt).toLocaleDateString("pt-BR")} • {voucher.costInMarks} Marks
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <span className="px-3 py-1 bg-gray-200 text-gray-800 rounded-full text-sm font-medium">
                {getStatusLabel(voucher.status)}
              </span>

              {voucher.status === "COMPLETED" && (
                <Button size="sm" variant="outline" onClick={() => handleCopyCode(voucher.voucherCode, voucher.id)}>
                  <Copy className="w-4 h-4" />
                </Button>
              )}
            </div>

            {copiedId === voucher.id && <span className="text-xs text-green-600 ml-2">Copiado!</span>}
          </div>
        ))}
      </div>
    </Card>
  )
}
