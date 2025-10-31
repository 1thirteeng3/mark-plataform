"use client"

import { Card } from "@/components/ui/card"
import type { Student } from "@/lib/store/data"
import { ArrowUp, ArrowDown } from "lucide-react"

interface StudentTransactionsProps {
  student: Student
}

export function StudentTransactions({ student }: StudentTransactionsProps) {
  const sortedTransactions = [...student.transactions].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )

  return (
    <Card className="p-6">
      <h2 className="text-xl font-bold mb-4">Extrato de Transações</h2>
      <div className="space-y-3">
        {sortedTransactions.map((tx) => (
          <div
            key={tx.id}
            className="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200"
          >
            <div className="flex items-center gap-3">
              <div
                className={`p-2 rounded-full ${
                  tx.type === "CREDIT" ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                }`}
              >
                {tx.type === "CREDIT" ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
              </div>
              <div>
                <p className="font-semibold text-gray-900">{tx.description}</p>
                <p className="text-sm text-gray-600">
                  {new Date(tx.createdAt).toLocaleDateString("pt-BR", {
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
            </div>
            <div className={`text-lg font-bold ${tx.type === "CREDIT" ? "text-green-600" : "text-red-600"}`}>
              {tx.type === "CREDIT" ? "+" : "-"}
              {tx.amount}
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
