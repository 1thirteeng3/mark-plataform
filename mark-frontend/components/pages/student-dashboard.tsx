"use client"

import { useState } from "react"
import { useAuthStore } from "@/lib/store/auth"
import { useDataStore } from "@/lib/store/data"
import { Button } from "@/components/ui/button"
import { LogOut, TrendingUp, ShoppingBag, History } from "lucide-react"
import { StudentBalance } from "@/components/student/student-balance"
import { StudentTransactions } from "@/components/student/student-transactions"
import { VoucherCatalog } from "@/components/student/voucher-catalog"
import { RedeemedVouchersHistory } from "@/components/student/redeemed-vouchers-history"
import Image from "next/image"

export function StudentDashboard() {
  const { user, logout } = useAuthStore()
  const { getStudent } = useDataStore()
  const [activeTab, setActiveTab] = useState<"balance" | "catalog" | "history">("balance")

  const student = getStudent(user?.id || "")

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 to-orange-100">
      <header className="bg-white border-b border-orange-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          {/* Logo section */}
          <div className="flex items-center gap-3 mb-4">
            <Image
              src="/images/design-mode/MARK%20Logo%20%285%29.png"
              alt="Mark Logo"
              width={40}
              height={40}
              className="w-10 h-10"
            />
            <div>
              <h1 className="text-2xl font-bold text-orange-600">Mark</h1>
              <p className="text-sm text-gray-600">Seu Portal de Recompensas</p>
            </div>
          </div>

          {/* User info and logout */}
          <div className="flex items-center justify-end gap-4">
            <div className="text-right">
              <p className="font-medium text-gray-900">{user?.name}</p>
              <p className="text-sm text-gray-600">{user?.email}</p>
            </div>
            <Button variant="outline" size="sm" onClick={logout} className="gap-2 bg-transparent">
              <LogOut className="w-4 h-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8 bg-[rgba(255,227,186,1)]">
        {/* Balance Card */}
        {student && <StudentBalance student={student} />}

        {/* Tabs */}
        <div className="flex gap-4 mb-8 mt-8">
          <Button
            variant={activeTab === "balance" ? "default" : "outline"}
            onClick={() => setActiveTab("balance")}
            className="gap-2"
          >
            <TrendingUp className="w-4 h-4" />
            Extrato
          </Button>
          <Button
            variant={activeTab === "catalog" ? "default" : "outline"}
            onClick={() => setActiveTab("catalog")}
            className="gap-2"
          >
            <ShoppingBag className="w-4 h-4" />
            Catálogo
          </Button>
          <Button
            variant={activeTab === "history" ? "default" : "outline"}
            onClick={() => setActiveTab("history")}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            Meus Resgates
          </Button>
        </div>

        {/* Content */}
        {activeTab === "balance" && student && <StudentTransactions student={student} />}
        {activeTab === "catalog" && student && <VoucherCatalog student={student} />}
        {activeTab === "history" && student && <RedeemedVouchersHistory student={student} />}
      </main>
    </div>
  )
}
