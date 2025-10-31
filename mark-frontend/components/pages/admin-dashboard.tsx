"use client"

import { useState } from "react"
import { useAuthStore } from "@/lib/store/auth"
import { useDataStore } from "@/lib/store/data"
import { Button } from "@/components/ui/button"
import { LogOut, Plus, Award } from "lucide-react"
import { RulesManager } from "@/components/admin/rules-manager"
import { AwardMarks } from "@/components/admin/award-marks"
import Image from "next/image"

export function AdminDashboard() {
  const { user, logout } = useAuthStore()
  const { rules } = useDataStore()
  const [activeTab, setActiveTab] = useState<"rules" | "award">("rules")

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
              <p className="text-sm text-gray-600">Painel do Administrador</p>
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
        {/* Tabs */}
        <div className="flex gap-4 mb-8">
          <Button
            variant={activeTab === "rules" ? "default" : "outline"}
            onClick={() => setActiveTab("rules")}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            Gerenciar Conquistas
          </Button>
          <Button
            variant={activeTab === "award" ? "default" : "outline"}
            onClick={() => setActiveTab("award")}
            className="gap-2"
          >
            <Award className="w-4 h-4" />
            Premiar Alunos
          </Button>
        </div>

        {/* Content */}
        {activeTab === "rules" && <RulesManager />}
        {activeTab === "award" && <AwardMarks />}
      </main>
    </div>
  )
}
