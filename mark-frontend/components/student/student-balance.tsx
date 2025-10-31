"use client"

import { Card } from "@/components/ui/card"
import type { Student } from "@/lib/store/data"
import { TrendingUp } from "lucide-react"

interface StudentBalanceProps {
  student: Student
}

export function StudentBalance({ student }: StudentBalanceProps) {
  return (
    <Card className="p-8 bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-lg bg-orange-600">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-blue-100 mb-2">Seu Saldo de Marks</p>
          <h2 className="text-5xl font-bold">{student.marksBalance}</h2>
          <p className="text-blue-100 mt-2">Pontos disponíveis para resgate</p>
        </div>
        <div className="bg-white/20 p-4 rounded-full">
          <TrendingUp className="w-12 h-12" />
        </div>
      </div>
    </Card>
  )
}
