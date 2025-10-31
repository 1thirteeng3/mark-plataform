"use client"

import { useState } from "react"
import { useDataStore, type Student } from "@/lib/store/data"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { ShoppingBag, AlertCircle, CheckCircle } from "lucide-react"
import { RedeemConfirmation } from "./redeem-confirmation"

interface VoucherCatalogProps {
  student: Student
}

export function VoucherCatalog({ student }: VoucherCatalogProps) {
  const { getVoucherCatalog } = useDataStore()
  const [selectedVoucher, setSelectedVoucher] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState("")

  const vouchers = getVoucherCatalog()

  const handleRedeemSuccess = () => {
    setSuccessMessage("Voucher resgatado com sucesso!")
    setTimeout(() => {
      setSuccessMessage("")
      setSelectedVoucher(null)
    }, 3000)
  }

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="flex items-center gap-2 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
          <CheckCircle className="w-5 h-5" />
          <span>{successMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {vouchers.map((voucher) => {
          const canAfford = student.marksBalance >= voucher.marksCost
          return (
            <Card
              key={voucher.id}
              className={`p-6 ${!canAfford ? "opacity-60" : ""} hover:shadow-lg transition-shadow`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-gray-900">{voucher.name}</h3>
                  <p className="text-sm text-gray-600 mt-1">{voucher.description}</p>
                </div>
                <ShoppingBag className="w-6 h-6 text-blue-600 flex-shrink-0" />
              </div>

              <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Custo em Marks</p>
                <p className="text-2xl font-bold text-blue-600">{voucher.marksCost}</p>
              </div>

              {!canAfford && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 mb-4">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">Saldo insuficiente</span>
                </div>
              )}

              <Button
                onClick={() => setSelectedVoucher(voucher.id)}
                disabled={!canAfford}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                Resgatar
              </Button>
            </Card>
          )
        })}
      </div>

      {selectedVoucher && (
        <RedeemConfirmation
          voucherId={selectedVoucher}
          student={student}
          onClose={() => setSelectedVoucher(null)}
          onSuccess={handleRedeemSuccess}
        />
      )}
    </div>
  )
}
